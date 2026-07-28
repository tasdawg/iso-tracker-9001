# iso-tracker

A single-process ISO tracking application with an embedded Vite frontend and Express API server backed by Prisma/SQLite.

## Quick start

```bash
npm install
npx prisma migrate dev    # create the database (prisma/dev.db)
npm run dev                # starts on http://localhost:3000
```

No separate `vite dev` step — `npm run dev` serves both the React UI and REST API from one process via `tsx server.ts`.

## Prerequisites

- Node.js (LTS)
- `GEMINI_API_KEY` in `.env.local` for AI features

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Generate the database schema and run migrations**
   ```bash
   npx prisma migrate dev
   ```
   This creates `prisma/dev.db` (SQLite) from `prisma/schema.prisma`.

3. **Seed data (optional)**
   The first run auto-seeds default Users, Stations, and the hospital template client (`CLI-2026-0004`) via `prisma/seed.sql`. To seed manually:
   ```bash
   npx prisma db seed
   ```

4. **Set environment variables**
   Copy `.env.example` to `.env.local` and add your `GEMINI_API_KEY`:
   ```bash
   cp .env.example .env.local
   # edit .env.local with your Gemini API key
   ```

## Running the app

| Mode | Command | Description |
|------|---------|-------------|
| Dev | `npm run dev` | tsx + Vite middleware on :3000 (HMR enabled) |
| Build | `npm run build` | prisma generate → vite build → esbuild server.ts → dist/server.cjs |
| Prod | `npm run start` | node dist/server.cjs |

## Architecture

| Layer | File(s) | Role |
|-------|---------|------|
| Server | `server.ts` | Express + embedded Vite, Prisma client, REST endpoints (`/api/data`, `/api/sync`, `/api/users`, `/api/station`) |
| Frontend | `src/App.tsx` | Single React component with tab navigation; state in React state + localStorage cache + DB sync via `/api/sync` |
| Database | `prisma/schema.prisma` → `prisma/dev.db` | SQLite, Prisma ORM |
| Types | `src/types.ts` | Shared TypeScript types |
| Seed data | `src/data.ts` | Initial users/clients/materials/items/projects/logs |

## Key behaviors

- **Serialized JSON columns** — `Item` and `Project` store complex structures (`materials`, `cutList`, `processes`, etc.) as JSON in the DB. The server deserializes on read and re-serializes on write.
- **Soft deletes** — Projects use `notVisible: 1`; Stations use `isActive: false`. Clients/Materials/Items have an `isDeleted` flag in TS (not yet at DB level).
- **ID format** — All record IDs follow `PREFIX-YEAR-NNNN` (`PRJ`, `CLI`, `MAT`, `ITM`, `LOG`). Use `generateNextId()` from `src/utils.ts`; never hardcode.
- **Sync model** — Every state mutation calls `persistState()`, writing to localStorage and POSTing `/api/sync`. Upserts are individual (not transactional), so a failed sync leaves localStorage ahead of the DB.
- **Operator flow** — App starts at a login/induction screen (`PrePage`). Workers with an `activeProjectId` skip straight to the run-card view; others land on the dashboard with Projects tab only. Operator state is persisted in localStorage keys prefixed `operator_`.
- **Seed on first run** — On startup, missing Users/Stations and the hospital template client (`CLI-2026-0004`) are auto-seeded from `prisma/seed.sql`.

## Gotchas

- User deletion fails if any process in any project still references them via `assignedUserId`.
- Station deletion is soft-delete only — it sets `isActive: false`, never removes the row.

## Docker Deployment

A production-ready Docker Compose setup with **auto-update from GitHub**, **database backup before every update**, and **schema migration support**.

### Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build (builder → runtime) using `node:20-slim` (Debian) for Prisma OpenSSL 3 compatibility. Final image contains only compiled artifacts + prod deps. |
| `docker-compose.yml` | Service definition with persistent volumes, healthcheck, restart policy, and `iso-tracker_app` network for Cloudflare proxy routing. |
| `entrypoint.sh` | Startup script: fresh deployment detection, version tracking, git updates, DB backup, migration detection, rebuild. |
| `.dockerignore` | Excludes source/dev files from build context to keep image small. |

### Important notes

- **Base image**: Uses `node:20-slim` (Debian) instead of Alpine for Prisma query engine compatibility with OpenSSL 3.
- **Prisma binary targets**: Schema.prisma includes `debian-openssl-3.0.x` in binaryTargets for Debian OpenSSL 3 support.
- **Fresh deployments**: First-time installs skip git operations; database seeding happens via server.ts on first startup.
- **Rebuilds**: Use `docker compose build --no-cache` to force complete rebuild without cached layers.

### Quick start

```bash
# 1. Edit docker-compose.yml — set your actual GitHub repo URL (GIT_REPO)
#    For private repos, add GITHUB_TOKEN to environment section:
#      - GITHUB_TOKEN=ghp_your_token_here
#    If using Cloudflare proxy, ensure the network name matches your setup
# 2. Build and launch
docker compose up -d --build

# 3. Watch logs for update/migration output
docker compose logs -f iso-tracker

# 4. Access the app at http://localhost:3000 (or via Cloudflare proxy)
```

### Public URL configuration

When deploying behind a reverse proxy (e.g., Cloudflare), uploaded files need full public URLs to render correctly in drawing links. Configure this in the Settings panel under "SaaS":

- **Public URL of Installation**: Set to your domain (e.g., `https://yourdomain.com`)
- Relative paths like `/uploads/drawings/file.pdf` are automatically resolved to `https://yourdomain.com/uploads/drawings/file.pdf`
- Leave blank for localhost/dev deployments — links stay as relative paths

### Startup flow

```
Container starts → entrypoint.sh runs
        │
        ├─ 1. Enable SQLite WAL mode (if DB exists)
        │     → prevents "database is locked" errors under concurrent reads
        │
        ├─ 2. Check if GIT_REPO is configured
        │     └─ If not set → skip updates, start server immediately
        │
        ├─ 3. Initialize .container-version file (first-run tracking)
        │
        ├─ 4. git fetch origin main
        │     ├─ FAIL (network down, repo unreachable) → log warning, run current code
        │     └─ SUCCESS → compare commit hash vs stored version
        │
        ├─ 5. Version comparison
        │     ├─ SAME → no update needed, start server immediately
        │     └─ DIFFERENT → full update sequence:
        │
        ├─ 6a. BACKUP database (before ANY changes)
        │       ├── Copy dev.db → backups/dev.db-YYYYMMDD-HHMMSS.bck
        │       ├── Verify backup is non-empty; if empty, ABORT update
        │       └── Rotate old backups — keep last 14, delete the rest
        │
        ├─ 6a. BACKUP local database changes (before git pull)
        │       ├── Copy modified .db files (test.db, etc.) → backups/
        │       ├── Remove blocking untracked backup files temporarily
        │       └── Restore after successful pull to preserve local state
        │
        ├─ 6b. git pull origin main
        │     ├─ FAIL → restore DB from backup, exit with error code 1
        │     └─ SUCCESS → continue (local databases restored)
        │
        ├─ 6c. Detect schema changes (md5 of prisma/schema.prisma)
        │     ├─ Changed + migrations exist → prisma migrate deploy
        │     │   └─ FAIL → restore DB from backup, exit with error code 1
        │     ├─ Changed + no migrations → warn user, attempt direct alter
        │     └─ Unchanged → skip migration entirely
        │
        ├─ 6d. Rebuild application
        │       ├── npm ci --omit=dev (fresh prod deps)
        │       ├── prisma generate (regenerate client for new schema)
        │       ├── vite build + esbuild server.ts → dist/server.cjs
        │       └─ Any FAIL → restore DB from backup, exit with error code 1
        │
        ├─ 7. Update .container-version with new commit hash
        │
        └─ 8. exec node dist/server.cjs (replaces shell process for signal handling)
```

### Failure modes and solutions

| Scenario | What happens | Recovery |
|----------|-------------|----------|
| **Network down during `git fetch`** | Fetch fails, logs warning, skips update | No data loss — runs currently deployed code. Features won't be new until network returns. |
| **Git pull fails (merge conflict / auth)** | Pull fails, DB restored from backup, container exits with code 1 | Docker `restart: unless-stopped` restarts it next cycle. Fix the git issue and redeploy. |
| **Schema migration fails** (`prisma migrate deploy`) | Migration error detected, DB restored from pre-update backup, exit code 1 | DB is intact at pre-migration state. Create proper migrations locally with `npx prisma migrate dev`, push to repo, container picks them up on next restart. |
| **Build fails** (esbuild / vite / prisma generate) | Build error detected, DB restored from backup, exit code 1 | DB intact. Fix the build issue in your code, push to repo, redeploy. |
| **Backup file is empty** (disk full / permission issue) | Detected by size check, update aborted before any code changes | No partial state — container continues with previous working version. |
| **Container killed mid-update** | Partial state possible on disk | Next restart detects version mismatch, backs up current (possibly partial) DB, retries from backup. |
| **SQLite "database is locked"** | WAL mode + 30s busy_timeout prevents this at both runtime and entrypoint level | Concurrent reads work fine. Single-writer design means writes are serialized naturally. |
| **Stale node_modules after update** | `npm ci --omit=dev` always runs on every update, reinstalling from lockfile | Fresh, deterministic deps every time. No drift between containers. |
| **Prisma client/schema mismatch** | `prisma generate` always runs after schema change or full rebuild | Client is regenerated to match the current schema.prisma before server starts. |
| **First run (no .container-version file)** | Initializes version tracking, skips git comparison on truly first boot | No unnecessary network calls on initial deployment. |
| **Private repo authentication** | HTTPS clone fails without credentials | Mount SSH key or pass `GITHUB_TOKEN` env var (see below). |
| **Local database files block git pull** | Untracked .db files in prisma/ cause merge conflicts during auto-update | Pre-pull backup logic automatically backs up local databases, removes blocking files temporarily, and restores them after successful pull — no manual intervention needed. |
| **Horizontal scaling (multiple containers)** | SQLite doesn't support concurrent writes from multiple processes | Single-container design. For scaling, migrate to PostgreSQL (requires schema changes). |

### Running and maintenance

```bash
# Trigger an update manually (container will check on restart)
docker compose restart iso-tracker

# View database backups inside the container
docker exec iso-tracker ls -la /app/prisma/backups/

# Restore from a specific backup if needed
docker exec iso-tracker cp /app/prisma/backups/dev.db-20260727-120000.bck /app/prisma/dev.db
docker compose restart iso-tracker

# View update/migration logs
docker compose logs -f iso-tracker | grep -E "UPDATE|BACKUP|MIGRATE|BUILD"

# Check current deployed version
docker exec iso-tracker cat /app/.container-version
```

### Manual full reset (when auto-update is stuck or corrupted)

Use this procedure if the container fails to update, enters a broken state, or you need to force-clean everything:

```bash
cd E:\Docker\iso-tracker-9001

# 1. Stop and remove container + volumes (destroys local DB copies in volumes)
docker compose down -v

# 2. Remove the cached image to force fresh build
docker rmi iso-tracker:latest

# 3. Fetch latest from remote without modifying working tree
git fetch origin main

# 4. Discard ALL local changes — staged, unstaged, untracked files
git reset --hard origin/main

# 5. Pull and merge (safe after hard reset)
git pull --force-with-lease origin main

# 6. Rebuild image from scratch (no cached layers)
docker compose build --no-cache

# 7. Start fresh container with clean volumes
docker compose up -d
```

**When to use:**
- Container stuck in restart loop after failed update
- Git merge conflicts blocking auto-update cycle
- Corrupted node_modules or prisma client state
- Need to wipe local database copies and start fresh from remote

**Note:** `docker compose down -v` removes named volumes. If you have important data in volumes (not bind mounts), backup first with `docker run --rm -v iso-tracker_prisma:/data -v /tmp:/backup alpine tar czf /backup/prisma.tar.gz -C /data .`

### Force update mode (automatic on restart)

For a **non-destructive force update** that preserves your database, set `FORCE_UPDATE=1` in docker-compose.yml:

```yaml
environment:
  - GIT_REPO=https://github.com/tasdawg/iso-tracker-9001.git
  - GITHUB_TOKEN=ghp_your_token_here
  - FORCE_UPDATE=1  # Enable force update mode
```

**What happens:**
1. Backs up current database before any changes
2. Forces `git reset --hard origin/main` to discard ALL local code changes
3. Pulls fresh code from remote with `--force-with-lease`
4. Rebuilds application (npm ci, prisma generate, vite build)
5. Restores database from backup after successful update

**When to use:**
- Git merge conflicts blocking auto-update cycle
- Corrupted node_modules or prisma client state
- Need to force-sync code without manual intervention
- Automated deployments where you want guaranteed fresh code

**Note:** Database is preserved via automatic backup/restore. Local .db files (test.db, etc.) are also backed up and restored after update.

### Version tracking and backup rotation

- **Version file**: `.container-version` stores the last successfully deployed commit hash. On startup, entrypoint compares this against `origin/main` to detect updates.
- **Backup retention**: Keeps the last 14 database backups in `/app/prisma/backups/`. Older backups are automatically deleted during each update cycle.
- **Network isolation**: The container runs on a dedicated Docker network (`iso-tracker_app`) that enables internal service access for Cloudflare proxy routing without exposing ports externally.

### For private repositories (optional)

**Option A — GitHub Token (simplest):**
Add to `docker-compose.yml` environment section:
```yaml
- GITHUB_TOKEN=ghp_your_token_here
```

**Option B — SSH key (more secure, recommended for teams):**
```yaml
volumes:
  - ./ssh/id_ed25519:/root/.ssh/id_ed25519:ro
environment:
  GIT_REPO: git@github.com:YOUR_USERNAME/iso-tracker.git
```

### Schema migrations best practice

For safe schema changes between versions, always create formal Prisma migrations before deploying:

```bash
# Locally, before pushing to GitHub:
npx prisma migrate dev --name add_your_change_description
```

This creates migration files in `prisma/migrations/` that the Docker entrypoint will automatically detect and apply on the next container restart. Without these files, Prisma attempts direct table alterations which may cause data loss.

### Database Management

The application supports multiple SQLite databases stored in the `prisma/` directory. Use this feature to maintain separate environments (dev, staging, production) or keep backup copies for quick switching.

#### Available Databases

| File | Purpose |
|------|---------|
| `prisma/dev.db` | Current active database (always used by Prisma client) |
| `prisma/test.db` | Test/staging environment copy |
| `prisma/*.bck` | Automatic backups created before updates or fresh installs |

#### Switching Databases via UI

1. Navigate to **Settings → Active Node Integrity Console**
2. Scroll to **Database Selection** panel
3. Select target database from dropdown (lists all `.db` files in `prisma/`)
4. Enter authorization password (`startagain`)
5. Click **Switch to Selected Database**
6. Application reloads with the new database

**Important:** Switching databases automatically creates a backup of the current `dev.db` before replacing it.

#### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/databases` | GET | List all available databases with size and last modified timestamp |
| `/api/databases/switch` | POST | Switch to a different database (requires password `startagain`) |

**POST Body for switch:**
```json
{
  "databaseName": "test.db",
  "password": "startagain"
}
```

#### Fresh Install with Admin Users

The **Fresh Database Install** feature (Settings → CRITICAL: Fresh Database Install) resets the database to factory defaults and seeds admin users for immediate Manager mode access:

- **Authorization password:** `startagain`
- **Seeded users:** Robert Vance (Admin), Amelia Sterling (Production Manager), plus 5 worker accounts
- **Seeded stations:** Lathe, Milling, Pressbrake, Bandsaw, Finishing/Polishing, Welding/Fabrication, Powder coating, Assembly
- **Backup created** before reset in `prisma/database-ISO-9001-YYYY-MM-DD.bck`

#### Prisma Version Requirements

- **Minimum:** Prisma 5.22.0+ (fixes SQLite upsert panic on Windows/Node.js v22)
- **Docker runtime:** Uses Debian base image (`node:20-slim`) for OpenSSL 3 compatibility with Prisma query engine
- **Binary targets:** Schema.prisma includes `debian-openssl-3.0.x` for Docker deployments

```bash
# Verify installed version
npm list prisma @prisma/client

# Upgrade if needed
npm install prisma@latest @prisma/client@latest --save-dev
npx prisma generate
```
