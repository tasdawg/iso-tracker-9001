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

- HMR is disabled when `DISABLE_HMR=true` (set by AI Studio). If edits don't hot-reload, check that env var.
- User deletion fails if any process in any project still references them via `assignedUserId`.
- Station deletion is soft-delete only — it sets `isActive: false`, never removes the row.
