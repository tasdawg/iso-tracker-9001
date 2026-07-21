# AGENTS.md — iso-tracker

## Run & Verify

```
npm run dev        # tsx server.ts (Vite middleware + Express on :3000)
npm run build      # prisma generate && vite build && esbuild server.ts → dist/server.cjs
npm run start      # node dist/server.cjs
npm run lint       # tsc --noEmit
```

`npm run dev` serves both the Vite frontend and Express API from a single process. No separate `vite dev` step needed.

## Architecture (one-line map)

- **Server**: `server.ts` — Express + embedded Vite, Prisma client, REST endpoints (`/api/data`, `/api/sync`, `/api/users`, `/api/station`)
- **Frontend**: `src/App.tsx` — single React component with tab navigation; all state lives in local React state + localStorage cache + DB sync via `/api/sync`
- **DB**: Prisma SQLite (`prisma/dev.db`), schema at `prisma/schema.prisma`
- **Types**: `src/types.ts`; seed data: `src/data.ts` (initial users/clients/materials/items/projects/logs)

## Data model quirks

- **Serialized JSON columns** in DB for `Item` and `Project`: `materials`, `cutList`, `processes`, `drawings`, `subItems`, `subProjects`, `includeStockItems`. Server deserializes on read (`/api/data`) and re-serializes on write (`/api/sync`).
- **Soft deletes**: Projects use `notVisible: 1`; Stations use `isActive: false`; Clients/Materials/Items have an `isDeleted` flag in the TS type (not yet enforced at DB level).
- **User deletion** is blocked if any process in any project has `assignedUserId` pointing to that user.
- **Station deletion** is soft-delete only (sets `isActive: false`).

## ID conventions

All IDs follow `PREFIX-YEAR-NNNN`: `PRJ`, `CLI`, `MAT`, `ITM`, `LOG`. Generator lives in `src/utils.ts::generateNextId`. Use it when creating new records — don't hardcode.

## Operator flow (non-obvious)

1. App always starts at `PrePage` (login/induction screen).
2. After induction, **Workers** with an `activeProjectId` go straight to `SimpleProjectPage` (run card view), bypassing the planner.
3. Workers without an active project fall back to the main dashboard but can only see the Projects tab.
4. Operator state persists in localStorage keys: `operator_id`, `operator_inducted`, `operator_active_stage`, `operator_project_id`.

## Sync behavior

Every state mutation calls `persistState()` which writes to both localStorage and POSTs `/api/sync` (upsert-based). The server uses individual upserts per record — not transactions. If the sync fails, localStorage is still updated; DB may be out of date.

## Seed on first run

On startup, `server.ts::seedDatabaseIfEmpty()` runs:
1. Ensures a `Setting` row exists (id: `'global'`).
2. Seeds default Users and Stations if empty.
3. If no Clients exist or the hospital template client (`CLI-2026-0004`) is missing, executes `prisma/seed.sql` via `$executeRawUnsafe`.

## HMR gotcha

Vite HMR is disabled when `DISABLE_HMR=true` (set by AI Studio to prevent flickering during agent edits). Don't fight this — if edits don't hot-reload, check whether that env var is set.

## Build output

Production build bundles the server with esbuild into `dist/server.cjs`. The Vite frontend is built separately by `vite build` into `dist/`. Production Express serves static files from `dist/` and falls back to `index.html` for SPA routing.
