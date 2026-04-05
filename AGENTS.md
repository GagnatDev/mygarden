# Agent and contributor notes

## Commits

When committing work, use [Conventional Commits](https://www.conventionalcommits.org/).

- Format: `type(scope): subject` (scope optional).
- Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- Use the imperative mood in the subject (e.g. “add login”, not “added” or “adds”).
- Put breaking changes in the body with `BREAKING CHANGE:` or append `!` after the type (e.g. `feat!: …`).

Examples:

- `feat(garden): add plant search`
- `fix(api): handle empty plot list`
- `docs: update architecture diagram`

## Planning and testing discipline

When writing or executing implementation plans (roadmaps, phased work, Cursor plans):

- **Tests with the code, not after.** For each module or feature slice in a plan, add or update tests in the same stretch of work before moving on. Do not defer a dedicated “testing phase” after implementation.
- **Completion means green tests.** A milestone or phase is done only when the full suite passes: `pnpm test` at the repo root (backend and frontend).
- **Plans should name coverage.** Spell out what to test (unit vs integration, critical paths, CI gates) per task or phase so expectations are explicit, not implied.
- **Commits stay green.** Commit whenever a sensible unit of work is finished (e.g. a module plus its tests). Never commit with failing tests.

## Cursor Cloud specific instructions

### Overview

MyGarden is a pnpm monorepo with two workspace packages: `backend/` (Express + MongoDB) and `frontend/` (React + Vite). See `README.md` for the standard dev commands (`pnpm lint`, `pnpm typecheck`, `pnpm test`, etc.).

### Environment requirements

- **Node.js >= 24** (use `nvm install 24 && nvm use 24`). pnpm 9.15.9 is declared via corepack (`corepack enable && corepack prepare pnpm@9.15.9 --activate`).
- **Docker** is required for two things: running MongoDB (the backend's datastore) and running backend integration tests (which use `@testcontainers/mongodb` to spin up disposable MongoDB instances).

### Running services

1. **MongoDB**: `docker run -d --name mongodb -p 27017:27017 mongo:7`. Verify with `docker exec mongodb mongosh --eval "db.runCommand({ping:1})" --quiet`.
2. **Backend**: `pnpm --filter backend dev` (port 3000). Requires a `backend/.env` file with at minimum:
   ```
   MONGODB_URI=mongodb://localhost:27017/mygarden
   JWT_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
   JWT_REFRESH_SECRET=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
   ```
3. **Frontend**: `pnpm --filter frontend dev` (port 5173, proxies `/api` and `/health` to `localhost:3000`).

### Gotchas

- The app uses invite-only registration. Before registering a user, you must seed an allowed email: `ALLOWED_EMAIL=user@example.com pnpm --filter backend seed`.
- Registration payload uses `displayName` (not `name`): `{ "email": "...", "password": "...", "displayName": "..." }`.
- Garden creation requires grid dimensions: `{ "name": "...", "gridWidth": 10, "gridHeight": 8, "cellSizeMeters": 1 }`.
- Backend integration tests use testcontainers and need Docker running; they spin up their own MongoDB instances and do **not** need the standalone MongoDB container.
- Frontend tests use jsdom + fake-indexeddb and do **not** require Docker or a running backend.
