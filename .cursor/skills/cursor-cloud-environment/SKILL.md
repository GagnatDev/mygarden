---
name: cursor-cloud-environment
description: MyGarden dev environment setup for Cursor Cloud agents (isolated VM). Use ONLY when running as a Cursor Cloud agent — cloud mode, cursor.com/agents, GitHub @cursor, or a repo with .cursor/environment.json — not for local Cursor Desktop/CLI on the developer machine.
compatibility: Cursor Cloud agent VMs only.
---

# Cursor Cloud environment

## When to apply

Apply this skill **only** in a **Cursor Cloud agent** session (isolated Ubuntu VM). **Do not** apply it for local development on the user's machine.

## Overview

MyGarden is a pnpm monorepo with two workspace packages: `backend/` (Express + MongoDB) and `frontend/` (React + Vite). See `README.md` for the standard dev commands (`pnpm lint`, `pnpm typecheck`, `pnpm test`, etc.).

The startup update script already runs `pnpm install` under Node 24 (via nvm) with pnpm 9.15.9 activated via corepack.

## Environment requirements

- **Node.js >= 24** (use `nvm install 24 && nvm use 24`). pnpm 9.15.9 is declared via corepack (`corepack enable && corepack prepare pnpm@9.15.9 --activate`).
- **Docker** is required for two things: running MongoDB (the backend's datastore) and running backend integration tests (which use `@testcontainers/mongodb` to spin up disposable MongoDB instances).

### Node 24 is shadowed in fresh shells

A system `node` at `/exec-daemon/node` (v22) precedes nvm on `PATH`, so `nvm use 24` alone does not change `node`. To actually run with Node 24, prepend the nvm bin: `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"` (after `. "$HOME/.nvm/nvm.sh"`). The app requires Node >= 24 at runtime; `pnpm install` itself tolerates the v22 shim.

### Docker is not auto-started

Start Docker once per session with `sudo dockerd` (run in the background, e.g. a tmux session). The `ubuntu` user is in the `docker` group, so `docker` works without sudo once the daemon is up.

Backend integration tests need the Docker socket reachable as `ubuntu` (group membership is already configured); if a fresh shell predates the group change, run them via `sg docker -c "…"`.

## Running services

1. **MongoDB**: `docker run -d --name mongodb -p 27017:27017 mongo:7`. Verify with `docker exec mongodb mongosh --eval "db.runCommand({ping:1})" --quiet`.
2. **Backend**: `pnpm --filter backend dev` (port 3000). Requires a `backend/.env` file with at minimum:
   ```
   MONGODB_URI=mongodb://localhost:27017/mygarden
   JWT_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
   JWT_REFRESH_SECRET=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
   ```
3. **Frontend**: `pnpm --filter frontend dev` (port 5173, proxies `/api` and `/health` to `localhost:3000`).

## Gotchas

- The app uses invite-only registration. Before registering a user, you must seed an allowed email: `ALLOWED_EMAIL=user@example.com pnpm --filter backend seed`.
- Registration payload uses `displayName` (not `name`): `{ "email": "...", "password": "...", "displayName": "..." }`.
- Garden creation requires grid dimensions: `{ "name": "...", "gridWidth": 10, "gridHeight": 8, "cellSizeMeters": 1 }`.
- Backend integration tests use testcontainers and need Docker running; they spin up their own MongoDB instances and do **not** need the standalone MongoDB container.
- Frontend tests use jsdom + fake-indexeddb and do **not** require Docker or a running backend.
