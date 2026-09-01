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
PRISMA_BIN="./node_modules/.bin/prisma"

# Ensure prisma binary exists (fallback to npx with pinned version if local install missing)
if [ ! -f "$PRISMA_BIN" ]; then
  PRISMA_BIN="npx prisma@5.22.0"
fi

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# ============================================================
# DB safety helpers — never destroy data; always back up first
# ============================================================

LATEST_BACKUP=""

# Keep only the newest $MAX_BACKUPS backup files in $BACKUP_DIR.
rotate_backups() {
  ( cd "$BACKUP_DIR" 2>/dev/null && ls -t *.bck 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) ) | xargs rm -f 2>/dev/null || true
}

# Create a consistent backup of $DB_PATH. sqlite3 .backup is WAL-safe (unlike cp,
# which can miss uncheckpointed writes). Sets LATEST_BACKUP on success.
backup_database() {
  local file size n=1 ts
  mkdir -p "$BACKUP_DIR"
  ts=$(date '+%Y%m%d-%H%M%S')
  file="$BACKUP_DIR/dev.db-${ts}.bck"
  while [ -f "$file" ]; do
    n=$((n + 1))
    file="$BACKUP_DIR/dev.db-${ts}-${n}.bck"
  done
  if ! sqlite3 "$DB_PATH" ".backup '$file'" 2>/dev/null; then
    log "[BACKUP] ERROR: sqlite backup failed. Aborting to protect data."
    return 1
  fi
  size=$(stat -c%s "$file" 2>/dev/null || echo "0")
  if [ ! -f "$file" ] || [ "$size" = "0" ]; then
    log "[BACKUP] ERROR: Backup is empty or missing. Aborting to protect data."
    rm -f "$file"
    return 1
  fi
  LATEST_BACKUP="$file"
  rotate_backups
}

# Restore $DB_PATH from a backup file (clears stale WAL files, re-enables WAL).
restore_db_to() {
  local f="$1"
  if [ ! -f "$f" ]; then
    log "[RESTORE] ERROR: Backup not found: $f"
    return 1
  fi
  if ! cp "$f" "$DB_PATH"; then
    log "[RESTORE] ERROR: Failed to copy backup over database."
    return 1
  fi
  rm -f "${DB_PATH}-wal" "${DB_PATH}-shm"
  sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=30000;" >/dev/null 2>&1 || true
  log "[RESTORE] Database restored from: $(basename "$f")"
}

# Print what the live DB is missing compared to prisma/schema.prisma — i.e. new
# fields/tables that have not been applied yet: "TABLE:<name>" per missing table,
# "<Model>.<column>" per missing column. Empty output = database up to date.
schema_diff() {
  local out="" model dbcols cols col
  for model in $(grep -E '^model [A-Za-z0-9_]+' prisma/schema.prisma | awk '{print $2}'); do
    if [ "$(sqlite3 "$DB_PATH" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='$model';" 2>/dev/null)" != "1" ]; then
      out="$out TABLE:$model"
      continue
    fi
    dbcols=$(sqlite3 "$DB_PATH" "PRAGMA table_info($model);" 2>/dev/null | cut -d'|' -f2)
    cols=$(awk "/^model $model \{/,/^\}$/" prisma/schema.prisma | grep -vE '^[[:space:]]*$|@@|^model|^\}' | awk '{print $1}')
    for col in $cols; do
      case " $dbcols " in
        *" $col "*) ;;
        *) out="$out $model.$col" ;;
      esac
    done
  done
  echo "$out"
}

# Bring the database in line with prisma/schema.prisma without ever losing data:
# detect drift (missing tables/columns = new fields) -> back up first -> prisma
# migrate deploy -> fall back to db push for schema changes that lack committed
# migration files -> verify the result -> restore from backup and exit on failure.
# $1 = optional existing backup file to reuse instead of creating a fresh one.
migrate_database_safely() {
  local diff backup="${1:-}" table missing=""

  if [ ! -f "$DB_PATH" ]; then
    log "[MIGRATE] No database present — creating fresh schema..."
    $PRISMA_BIN migrate deploy 2>&1 || { log "[MIGRATE] FATAL: Schema creation failed."; exit 1; }
    return 0
  fi

  diff="$(schema_diff)"
  if [ -n "$diff" ]; then
    log "[MIGRATE] Database does NOT match the latest schema (older version detected):"
    for item in $diff; do
      case "$item" in
        TABLE:*) log "[MIGRATE]   missing table: ${item#TABLE:}" ;;
        *)       log "[MIGRATE]   missing column: $item" ;;
      esac
    done
  else
    log "[MIGRATE] Database already matches the latest schema."
  fi

  if [ -z "$backup" ] || [ ! -f "$backup" ]; then
    backup_database || { log "[MIGRATE] FATAL: Could not create backup — aborting to protect data."; exit 1; }
    backup="$LATEST_BACKUP"
    log "[MIGRATE] Backup created before migration: $(basename "$backup")"
  else
    log "[MIGRATE] Reusing existing pre-migration backup: $(basename "$backup")"
  fi

  if ! $PRISMA_BIN migrate deploy 2>&1; then
    log "[MIGRATE] ERROR: prisma migrate deploy failed. Restoring database from backup."
    restore_db_to "$backup" || { log "[MIGRATE] FATAL: Restore failed."; exit 1; }
    exit 1
  fi

  # If the schema has changes that lack committed migration files, migrate deploy
  # will not apply them — fall back to db push. We only ever detect *missing*
  # tables/columns here (DB behind schema), so this is additive and preserves data.
  diff="$(schema_diff)"
  if [ -n "$diff" ]; then
    log "[MIGRATE] Migrations did not cover all changes — running prisma db push as fallback..."
    if ! $PRISMA_BIN db push --skip-generate 2>&1; then
      log "[MIGRATE] ERROR: db push failed. Restoring database from backup."
      restore_db_to "$backup" || { log "[MIGRATE] FATAL: Restore failed."; exit 1; }
      exit 1
    fi
    diff="$(schema_diff)"
  fi

  if [ -n "$diff" ]; then
    log "[MIGRATE] ERROR: Database still out of sync after migration:$diff Restoring backup."
    restore_db_to "$backup" || { log "[MIGRATE] FATAL: Restore failed."; exit 1; }
    exit 1
  fi

  for table in $REQUIRED_TABLES; do
    if [ "$(sqlite3 "$DB_PATH" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='$table';" 2>/dev/null)" != "1" ]; then
      missing="$missing $table"
    fi
  done
  if [ -n "$missing" ]; then
    log "[MIGRATE] ERROR: Missing required tables after migration:$missing Restoring backup."
    restore_db_to "$backup" || { log "[MIGRATE] FATAL: Restore failed."; exit 1; }
    exit 1
  fi

  SETTING_EXISTS=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM Setting WHERE id='global';" 2>/dev/null)
  if [ "$SETTING_EXISTS" != "1" ]; then
    log "[MIGRATE] Global setting record missing — server will seed on first startup."
  else
    log "[MIGRATE] Database in sync with latest schema. Backup kept at: $(basename "$backup")"
  fi
}

# ---- Step 0: Validate and initialize database schema ----
log "[DB] Validating database schema..."

# Required tables for the application
REQUIRED_TABLES="Client Material Item Project InventoryLog User Station Setting"

if [ -f "$DB_PATH" ]; then
  # Enable WAL mode on existing database
  log "[DB] Enabling WAL mode on existing database..."
  sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=30000;" >/dev/null 2>&1 || true

  # Compare the live DB against the latest prisma schema (missing tables/columns =
  # new fields), back up first, then migrate — existing data is never destroyed.
  migrate_database_safely
else
  log "[DB] No database found — creating fresh database with schema..."
  $PRISMA_BIN migrate deploy 2>&1 || {
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
    sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'" || {
      log "[FORCE] ERROR: Database backup failed. Aborting to protect data."
      exit 1
    }
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
    restore_db_to "$BACKUP_FILE" || true
    exit 1
  fi
  
  git reset --hard "origin/${GIT_BRANCH:-main}" 2>&1 || {
    log "[FORCE] ERROR: git reset failed. Restoring database and exiting."
    restore_db_to "$BACKUP_FILE" || true
    exit 1
  }
  
  # Pull latest code (safe after hard reset)
  log "[FORCE] Pulling fresh code from remote..."
  if ! git pull --force-with-lease origin "${GIT_BRANCH:-main}" 2>&1; then
    log "[FORCE] ERROR: git pull failed. Restoring database and exiting."
    restore_db_to "$BACKUP_FILE" || true
    exit 1
  fi
  
  # Rebuild application from scratch
  log "[FORCE] Rebuilding application..."
  npm ci --omit=dev 2>&1 || {
    log "[FORCE] ERROR: npm ci failed. Restoring database and exiting."
    restore_db_to "$BACKUP_FILE" || true
    exit 1
  }
  
  $PRISMA_BIN generate 2>&1 || {
    log "[FORCE] ERROR: prisma generate failed. Restoring database and exiting."
    restore_db_to "$BACKUP_FILE" || true
    exit 1
  }
  
  npm run build 2>&1 || {
    log "[FORCE] ERROR: Build failed. Restoring database and exiting."
    restore_db_to "$BACKUP_FILE" || true
    exit 1
  }
  
  # Restore database from backup (preserves local data)
  log "[FORCE] Restoring database from backup..."
  restore_db_to "$BACKUP_FILE" || true
  
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
  # sqlite3 .backup takes a consistent WAL-safe snapshot (plain cp can miss uncheckpointed writes)
  if ! sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'" 2>/dev/null; then
    log "[BACKUP] ERROR: sqlite backup failed! Aborting update to prevent data loss."
    exec node dist/server.cjs
  fi
  BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "0")
  if [ ! -f "$BACKUP_FILE" ] || [ "$BACKUP_SIZE" = "0" ]; then
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
  sqlite3 "$DB_PATH" ".backup '$LOCAL_DB_BACKUP'" 2>/dev/null || true
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
rotate_backups
log "[BACKUP] Rotation complete."

# ---- Step 6b: git pull origin main ----
log "[UPDATE] Pulling latest code..."
if ! git pull origin "${GIT_BRANCH:-main}" 2>&1; then
  log "[UPDATE] ERROR: git pull failed! Restoring database from backup..."
  if [ -f "$BACKUP_FILE" ]; then
    restore_db_to "$BACKUP_FILE" || true
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
    restore_db_to "$backup_file" || true
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

# ---- Step 6c: Detect schema changes & run migrations safely ----
NEW_SCHEMA_HASH=$(md5sum prisma/schema.prisma 2>/dev/null | cut -d' ' -f1 || echo "unknown")
STORED_SCHEMA_HASH=$(cat "$SCHEMA_VERSION_FILE" 2>/dev/null || echo "")

if [ "$NEW_SCHEMA_HASH" != "$STORED_SCHEMA_HASH" ]; then
  log "[MIGRATE] Schema changed after pull — checking database against the latest version..."
  # Reuses the pre-pull backup from Step 5 when one exists; backs up first if not.
  migrate_database_safely "${BACKUP_FILE:-}"
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
$PRISMA_BIN generate 2>&1 || {
  log "[BUILD] ERROR: prisma generate failed! Restoring from backup..."
  restore_db_to "$BACKUP_FILE" || true
  exit 1
}

# Rebuild frontend + bundle server (ALWAYS rebuild when code changes)
npm run build 2>&1 || {
  log "[BUILD] ERROR: Build failed! Restoring from backup..."
  restore_db_to "$BACKUP_FILE" || true
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
