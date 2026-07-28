#!/bin/sh
set -e

# ============================================================
# iso-tracker Docker Entrypoint
# Handles: version tracking, git updates, DB backup, migrations
# ============================================================

DB_PATH="/app/prisma/dev.db"
BACKUP_DIR="/app/prisma/backups"
VERSION_FILE="/app/.container-version"
SCHEMA_VERSION_FILE="/app/.schema-version"
MAX_BACKUPS=14

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# ---- Step 0: Enable SQLite WAL mode for better concurrency ----
if [ -f "$DB_PATH" ]; then
  log "[DB] Enabling WAL mode on existing database..."
  sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=30000;"
fi

# ---- Step 1: Check if git repo is configured ----
if [ -z "$GIT_REPO" ]; then
  log "[UPDATE] GIT_REPO not set — skipping auto-update. Running current code."
  exec node dist/server.cjs
fi

log "[UPDATE] Tracking repository: $GIT_REPO (branch: ${GIT_BRANCH:-main})"

# ---- Step 2: Initialize version tracking file if missing ----
if [ ! -f "$VERSION_FILE" ]; then
  log "[VERSION] No stored version — first deployment."
  
  # Check if database exists and has tables
  if [ -f "$DB_PATH" ] && [ "$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null)" -gt 0 ]; then
    log "[VERSION] Existing database with tables found — treating as update deployment."
    # Try to get the commit hash from git if available, otherwise use timestamp
    CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "deploy-$(date +%Y%m%d%H%M%S)")
    echo "$CURRENT_COMMIT" > "$VERSION_FILE"
  else
    log "[VERSION] No existing database or empty schema — fresh deployment."
    # Ensure database schema exists (create tables if missing)
    if [ ! -f "$DB_PATH" ]; then
      log "[VERSION] Creating new database with schema..."
      npx prisma migrate deploy 2>&1 || log "[VERSION] WARNING: Schema migration failed, server will attempt to create tables."
    else
      log "[VERSION] Database exists but has no tables — running migration to create schema..."
      npx prisma migrate deploy 2>&1 || log "[VERSION] WARNING: Schema migration failed, server will attempt to create tables."
    fi
    # Use a placeholder that forces update check on next restart
    echo "fresh-deploy-$(date +%Y%m%d%H%M%S)" > "$VERSION_FILE"
  fi
fi

STORED_VERSION=$(cat "$VERSION_FILE" 2>/dev/null || echo "")

# ---- Step 3: Fetch latest from remote ----
# Skip git operations on fresh deployments (container isn't a git repo)
if echo "$STORED_VERSION" | grep -q "^fresh-deploy-"; then
  log "[UPDATE] Fresh deployment detected — skipping git operations."
  log "[UPDATE] Starting server with seeded database."
  exec node dist/server.cjs
fi

log "[UPDATE] Fetching latest from $GIT_REPO $GIT_BRANCH..."
if ! git fetch origin "${GIT_BRANCH:-main}" 2>&1; then
  log "[UPDATE] WARNING: git fetch failed (network issue or repo unreachable)."
  log "[UPDATE] Continuing with currently deployed code."
  exec node dist/server.cjs
fi

# ---- Step 4: Compare versions ----
LATEST_COMMIT=$(git rev-parse "origin/${GIT_BRANCH:-main}" 2>/dev/null || echo "")

if [ "$LATEST_COMMIT" = "$STORED_VERSION" ] || [ -z "$LATEST_COMMIT" ]; then
  log "[UPDATE] No new commits detected. Skipping update."
  exec node dist/server.cjs
fi

log "[UPDATE] New version available!"
log "[UPDATE] Current: $STORED_VERSION → Latest: $LATEST_COMMIT"

# ---- Step 5: BACKUP database BEFORE any changes ----
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
BACKUP_FILE="$BACKUP_DIR/dev.db-${TIMESTAMP}.bck"

if [ -f "$DB_PATH" ]; then
  cp "$DB_PATH" "$BACKUP_FILE"
  BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "0")
  if [ "$BACKUP_SIZE" -eq 0 ]; then
    log "[BACKUP] ERROR: Backup file is empty! Aborting update to prevent data loss."
    rm -f "$BACKUP_FILE"
    exec node dist/server.cjs
  fi
  log "[BACKUP] Database backed up to: $(basename $BACKUP_FILE) ($BACKUP_SIZE bytes)"
else
  log "[BACKUP] No existing database — nothing to back up (first deployment)."
fi

# ---- Step 6a: Rotate old backups (keep last 14) ----
log "[BACKUP] Rotating old backups (keeping last $MAX_BACKUPS)..."
cd "$BACKUP_DIR"
ls -t *.bck 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f 2>/dev/null || true
cd /app
log "[BACKUP] Rotation complete."

# ---- Step 6b: git pull origin main ----
log "[UPDATE] Pulling latest code..."
if ! git pull origin "${GIT_BRANCH:-main}" 2>&1; then
  log "[UPDATE] ERROR: git pull failed! Restoring database from backup..."
  if [ -f "$BACKUP_FILE" ]; then
    cp "$BACKUP_FILE" "$DB_PATH"
    log "[UPDATE] Database restored. Exiting to prevent corrupted state."
    exit 1
  fi
  exec node dist/server.cjs
fi

# ---- Step 6c: Detect schema changes & run migrations ----
NEW_SCHEMA_HASH=$(md5sum prisma/schema.prisma 2>/dev/null | cut -d' ' -f1 || echo "unknown")
STORED_SCHEMA_HASH=$(cat "$SCHEMA_VERSION_FILE" 2>/dev/null || echo "")

if [ "$NEW_SCHEMA_HASH" != "$STORED_SCHEMA_HASH" ]; then
  log "[MIGRATE] Schema changed! Checking for pending migrations..."

  # Check if migration directory exists with files
  if ls prisma/migrations/*/migration.sql 1>/dev/null 2>&1; then
    log "[MIGRATE] Running prisma migrate deploy..."
    if ! npx prisma migrate deploy 2>&1; then
      log "[MIGRATE] ERROR: Migration failed! Restoring database from backup..."
      if [ -f "$BACKUP_FILE" ]; then
        cp "$BACKUP_FILE" "$DB_PATH"
      fi
      log "[MIGRATE] Database restored. Exiting."
      exit 1
    fi
    log "[MIGRATE] Migrations applied successfully."
  else
    log "[MIGRATE] WARNING: No migration files found in prisma/migrations/."
    log "[MIGRATE] Schema.prisma was changed but no formal migrations exist."
    log "[MIGRATE] Prisma will attempt to alter tables directly — this may cause data loss."
    log "[MIGRATE] For safe migrations, run: npx prisma migrate dev --name <description>"
    log "[MIGRATE] Continuing anyway..."
  fi

  echo "$NEW_SCHEMA_HASH" > "$SCHEMA_VERSION_FILE"
else
  log "[MIGRATE] Schema unchanged. Skipping migration."
fi

# ---- Step 6d: Rebuild application ----
log "[BUILD] Rebuilding application..."

# Reinstall production dependencies (catches package.json changes)
if [ -f package-lock.json ]; then
  npm ci --omit=dev 2>&1 || log "[BUILD] WARNING: npm ci failed, continuing with existing modules."
fi

# Regenerate Prisma client (required if schema changed)
npx prisma generate 2>&1 || {
  log "[BUILD] ERROR: prisma generate failed! Restoring from backup..."
  if [ -f "$BACKUP_FILE" ]; then
    cp "$BACKUP_FILE" "$DB_PATH"
  fi
  exit 1
}

# Rebuild frontend + bundle server
npm run build 2>&1 || {
  log "[BUILD] ERROR: Build failed! Restoring from backup..."
  if [ -f "$BACKUP_FILE" ]; then
    cp "$BACKUP_FILE" "$DB_PATH"
  fi
  exit 1
}

log "[BUILD] Build complete."

# ---- Step 7: Update version tracking & start server ----
echo "$LATEST_COMMIT" > "$VERSION_FILE"
log "[UPDATE] Version updated to $LATEST_COMMIT"

# Enable WAL mode on potentially modified database
if [ -f "$DB_PATH" ]; then
  sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=30000;"
fi

log "[START] Starting iso-tracker server..."
exec node dist/server.cjs
