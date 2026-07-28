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

# ---- Step 0: Validate and initialize database schema ----
log "[DB] Validating database schema..."

# Required tables for the application
REQUIRED_TABLES="Client Material Item Project InventoryLog User Station Setting"

if [ -f "$DB_PATH" ]; then
  # Enable WAL mode on existing database
  log "[DB] Enabling WAL mode on existing database..."
  sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=30000;"
  
  # ALWAYS run prisma migrate deploy to ensure all schema changes are applied
  log "[DB] Running prisma migrate deploy to apply all pending migrations..."
  npx prisma migrate deploy 2>&1 || {
    log "[DB] ERROR: Migration failed! Attempting to recreate database..."
    rm -f "$DB_PATH"
    npx prisma migrate deploy 2>&1 || {
      log "[DB] FATAL: Cannot create database. Exiting."
      exit 1
    }
  }
  
  # Check if all required tables exist after migration
  MISSING_TABLES=""
  for table in $REQUIRED_TABLES; do
    TABLE_EXISTS=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='$table';" 2>/dev/null)
    if [ "$TABLE_EXISTS" != "1" ]; then
      MISSING_TABLES="$MISSING_TABLES $table"
    fi
  done
  
  if [ -n "$MISSING_TABLES" ]; then
    log "[DB] ERROR: Missing tables after migration:$MISSING_TABLES"
    log "[DB] Attempting to force schema sync..."
    npx prisma db push 2>&1 || {
      log "[DB] FATAL: Cannot sync schema. Exiting."
      exit 1
    }
  else
    # Check if global Setting record exists
    SETTING_EXISTS=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM Setting WHERE id='global';" 2>/dev/null)
    if [ "$SETTING_EXISTS" != "1" ]; then
      log "[DB] Global setting record missing — server will seed on first startup."
    else
      log "[DB] Database schema validated successfully."
    fi
  fi
else
  log "[DB] No database found — creating fresh database with schema..."
  npx prisma migrate deploy 2>&1 || {
    log "[DB] ERROR: Schema creation failed!"
    exit 1
  }
fi

# ---- Step 1: Check if FORCE_UPDATE mode is enabled ----
if [ "$FORCE_UPDATE" = "1" ]; then
  log "[FORCE] FORCE_UPDATE=1 detected — running full reset procedure..."
  
  # Backup current database before destructive operations
  mkdir -p "$BACKUP_DIR"
  TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
  BACKUP_FILE="$BACKUP_DIR/dev.db-${TIMESTAMP}.bck"
  
  if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_FILE"
    log "[FORCE] Database backed up to: $(basename $BACKUP_FILE)"
  else
    log "[FORCE] No existing database — nothing to back up."
  fi
  
  # Remove untracked backup files that would block git operations
  if ls prisma/database-ISO-9001-*.bck 1>/dev/null 2>&1; then
    log "[FORCE] Removing untracked backup files..."
    rm -f prisma/database-ISO-9001-*.bck
  fi
  
  # Back up any other local .db files (test.db, etc.)
  for db_file in prisma/*.db; do
    if [ -f "$db_file" ] && ! git ls-files --error-unmatch "$db_file" >/dev/null 2>&1; then
      log "[FORCE] Backing up untracked database: $(basename $db_file)"
      cp "$db_file" "$BACKUP_DIR/$(basename $db_file)-${TIMESTAMP}.bck"
    fi
  done
  
  # Force reset to discard ALL local changes
  log "[FORCE] Forcing git reset to remote state..."
  if ! git fetch origin "${GIT_BRANCH:-main}" 2>&1; then
    log "[FORCE] ERROR: git fetch failed. Restoring database and exiting."
    if [ -f "$BACKUP_FILE" ]; then
      cp "$BACKUP_FILE" "$DB_PATH"
    fi
    exit 1
  fi
  
  git reset --hard "origin/${GIT_BRANCH:-main}" 2>&1 || {
    log "[FORCE] ERROR: git reset failed. Restoring database and exiting."
    if [ -f "$BACKUP_FILE" ]; then
      cp "$BACKUP_FILE" "$DB_PATH"
    fi
    exit 1
  }
  
  # Pull latest code (safe after hard reset)
  log "[FORCE] Pulling fresh code from remote..."
  if ! git pull --force-with-lease origin "${GIT_BRANCH:-main}" 2>&1; then
    log "[FORCE] ERROR: git pull failed. Restoring database and exiting."
    if [ -f "$BACKUP_FILE" ]; then
      cp "$BACKUP_FILE" "$DB_PATH"
    fi
    exit 1
  fi
  
  # Rebuild application from scratch
  log "[FORCE] Rebuilding application..."
  npm ci --omit=dev 2>&1 || {
    log "[FORCE] ERROR: npm ci failed. Restoring database and exiting."
    if [ -f "$BACKUP_FILE" ]; then
      cp "$BACKUP_FILE" "$DB_PATH"
    fi
    exit 1
  }
  
  npx prisma generate 2>&1 || {
    log "[FORCE] ERROR: prisma generate failed. Restoring database and exiting."
    if [ -f "$BACKUP_FILE" ]; then
      cp "$BACKUP_FILE" "$DB_PATH"
    fi
    exit 1
  }
  
  npm run build 2>&1 || {
    log "[FORCE] ERROR: Build failed. Restoring database and exiting."
    if [ -f "$BACKUP_FILE" ]; then
      cp "$BACKUP_FILE" "$DB_PATH"
    fi
    exit 1
  }
  
  # Restore database from backup (preserves local data)
  log "[FORCE] Restoring database from backup..."
  if [ -f "$BACKUP_FILE" ]; then
    cp "$BACKUP_FILE" "$DB_PATH"
    log "[FORCE] Database restored successfully."
  fi
  
  # Restore any other backed-up databases
  for backup_file in "$BACKUP_DIR"/*.db-${TIMESTAMP}.bck; do
    if [ -f "$backup_file" ]; then
      db_name=$(echo "$(basename $backup_file)" | sed "s/-${TIMESTAMP}\.bck//")
      if [ "$db_name" != "dev.db" ] && [ -f "prisma/$db_name" ]; then
        log "[FORCE] Restoring: prisma/$db_name"
        cp "$backup_file" "prisma/$db_name"
      fi
    fi
  done
  
  # Update version tracking
  LATEST_COMMIT=$(git rev-parse HEAD)
  echo "$LATEST_COMMIT" > "$VERSION_FILE"
  log "[FORCE] Version updated to $LATEST_COMMIT"
  
  # Enable WAL mode on restored database
  if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=30000;"
  fi
  
  log "[FORCE] Full reset complete. Starting server..."
  exec node dist/server.cjs
fi

# ---- Step 2: Check if git repo is configured ----
if [ -z "$GIT_REPO" ]; then
  log "[UPDATE] GIT_REPO not set — skipping auto-update. Running current code."
  exec node dist/server.cjs
fi

log "[UPDATE] Tracking repository: $GIT_REPO (branch: ${GIT_BRANCH:-main})"

# ---- Step 2: Initialize version tracking file if missing ----
if [ ! -f "$VERSION_FILE" ]; then
  log "[VERSION] No stored version — first run. Initializing..."
  
  # Clone the repo to get current commit hash for tracking
  if git clone --depth 1 "$GIT_REPO" /tmp/iso-tracker-temp 2>&1; then
    CURRENT_COMMIT=$(cd /tmp/iso-tracker-temp && git rev-parse HEAD)
    rm -rf /tmp/iso-tracker-temp
    echo "$CURRENT_COMMIT" > "$VERSION_FILE"
    log "[VERSION] Initialized with commit: $CURRENT_COMMIT"
  else
    # If clone fails, mark as fresh deployment and skip git operations
    echo "fresh-deploy-$(date +%s)" > "$VERSION_FILE"
    log "[VERSION] Fresh deployment — git unavailable. Starting server."
    exec node dist/server.cjs
  fi
else
  STORED_VERSION=$(cat "$VERSION_FILE" 2>/dev/null || echo "")
  
  # Skip git operations on fresh deployments (container isn't a git repo)
  if echo "$STORED_VERSION" | grep -q "^fresh-deploy-"; then
    log "[UPDATE] Fresh deployment detected — skipping git operations."
    log "[UPDATE] Starting server with seeded database."
    exec node dist/server.cjs
  fi
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

# ---- Step 5.5: Handle local database changes before pull ----
log "[UPDATE] Checking for local database changes..."

# Check if dev.db has been modified locally (not tracked by git)
if [ -f "$DB_PATH" ] && ! git ls-files --error-unmatch prisma/dev.db >/dev/null 2>&1; then
  log "[UPDATE] Local dev.db detected — backing up before pull."
  LOCAL_DB_BACKUP="$BACKUP_DIR/local-dev.db-${TIMESTAMP}.bck"
  cp "$DB_PATH" "$LOCAL_DB_BACKUP"
  log "[UPDATE] Local database backed up to: $(basename $LOCAL_DB_BACKUP)"
fi

# Remove untracked backup files that would block the pull
if ls prisma/database-ISO-9001-*.bck 1>/dev/null 2>&1; then
  log "[UPDATE] Removing untracked backup files that would block merge..."
  rm -f prisma/database-ISO-9001-*.bck
fi

# Check for other untracked .db files (like test.db) and back them up
for db_file in prisma/*.db; do
  if [ -f "$db_file" ] && ! git ls-files --error-unmatch "$db_file" >/dev/null 2>&1; then
    log "[UPDATE] Backing up untracked database: $(basename $db_file)"
    cp "$db_file" "$BACKUP_DIR/$(basename $db_file)-${TIMESTAMP}.bck"
  fi
done

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

# ---- Step 6b.5: Restore local databases if they were backed up ----
log "[UPDATE] Restoring any locally-modified databases..."
for backup_file in "$BACKUP_DIR"/*-dev.db-${TIMESTAMP}.bck; do
  if [ -f "$backup_file" ] && [ "$backup_file" != "$BACKUP_FILE" ]; then
    log "[UPDATE] Restoring local database from: $(basename $backup_file)"
    cp "$backup_file" "$DB_PATH"
  fi
done

for backup_file in "$BACKUP_DIR"/*.db-${TIMESTAMP}.bck; do
  if [ -f "$backup_file" ]; then
    db_name=$(echo "$(basename $backup_file)" | sed "s/-${TIMESTAMP}\.bck//")
    if [ "$db_name" != "dev.db" ] && [ -f "$DB_PATH" ]; then
      log "[UPDATE] Restoring: prisma/$db_name"
      cp "$backup_file" "prisma/$db_name"
    fi
  fi
done

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

# ---- Step 6d: Rebuild application (always rebuild on update) ----
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

# Rebuild frontend + bundle server (ALWAYS rebuild when code changes)
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
