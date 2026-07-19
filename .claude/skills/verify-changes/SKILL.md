---
name: verify-changes
description: Verify code changes in the MyGarden repo — run lint, typecheck, and the frontend + backend test suites, including backend integration tests in sandboxes where Docker Hub is blocked and Testcontainers can't pull an image. Use before committing/opening a PR, whenever an agent needs to confirm the suite is green, or when backend integration tests fail to start MongoDB.
---

# Verify changes (MyGarden)

The repo's definition of done is a **green suite**: `pnpm lint`, `pnpm typecheck`, and
`pnpm test` (frontend + backend) all pass (see `AGENTS.md`). This skill is how an agent
gets there — including the one part that doesn't work out of the box in a sandbox.

## The one gotcha: backend integration tests need MongoDB

Backend integration tests talk to a real MongoDB. By default the harness
(`backend/src/test/mongo-harness.ts`) spins one up with **Testcontainers**, which needs a
Docker daemon that can **pull the `mongo:7` image from Docker Hub**.

In sandboxed agent environments that pull fails: the network policy blocks Docker Hub's
blob CDN (`production.cloudflare.docker.com` → 403), so Testcontainers hangs/errors and
every backend integration file fails in `beforeAll`. MongoDB's own download CDN
(`fastdl.mongodb.org`) and arbitrary GitHub release assets are blocked too, so
`mongodb-memory-server` and apt/manual binary installs don't work either.

**What does work:** `mirror.gcr.io` (Google's Docker Hub mirror) serves the `mongo` image
from a CDN that isn't blocked. So we run MongoDB ourselves from that mirror and point the
tests at it via `MONGO_TEST_URI` — **no Testcontainers involved.**

When `MONGO_TEST_URI` is set, the harness connects to that server and gives each test file
its own throwaway database (mirroring the fresh-container isolation), instead of starting
Testcontainers. When it's unset, the harness behaves exactly as before (Testcontainers),
so **CI on GitHub Actions is unchanged** — that runner has full Docker/network access.

> The server must be a **single-node replica set**, not a standalone `mongod`: the app uses
> multi-document transactions (`garden.service.ts`) which require a replica set. The helper
> script below sets this up.

## Verify a change (sandbox)

Run from the repo root:

```bash
pnpm lint          # 0 errors (a pre-existing frontend warning is fine)
pnpm typecheck
pnpm test:sandbox  # frontend + backend, backend pointed at a mirror-hosted MongoDB
```

`test:sandbox` runs `scripts/test-db.sh up` first, which **starts dockerd if needed**,
pulls `mongo:7` from `mirror.gcr.io`, boots it as a single-node replica set, and exports
its URI as `MONGO_TEST_URI` for the run. The MongoDB container is left running so repeat
runs are fast.

### Scripts

| Command | What it does |
|---|---|
| `pnpm test:backend`  | Ensure MongoDB is up, run **only** the backend suite against it |
| `pnpm test:sandbox`  | Ensure MongoDB is up, run **both** suites (`pnpm -r test`) against it |
| `pnpm test:db:up`    | Just start the MongoDB replica set; prints the URI |
| `pnpm test:db:down`  | Remove the MongoDB container |
| `pnpm test`          | Plain recursive test — backend uses **Testcontainers** (fails in a blocked sandbox) |

Frontend tests (`pnpm --filter frontend test`) use jsdom + fake-indexeddb and need **no**
MongoDB or Docker at all.

### Run the backend suite manually

If you already have a MongoDB replica set somewhere, skip the script:

```bash
MONGO_TEST_URI=mongodb://127.0.0.1:27017 pnpm --filter backend test
```

`scripts/test-db.sh` honors these overrides: `MONGO_TEST_IMAGE`
(default `mirror.gcr.io/library/mongo:7`), `MONGO_TEST_PORT` (default `27017`),
`MONGO_TEST_CONTAINER` (default `mygarden-test-mongo`).

## Node version

The app requires **Node >= 24** at runtime, but a fresh shell often has Node 22 on `PATH`
(`/exec-daemon/node`). The test runner (vitest) runs fine on Node 22 — the
`Unsupported engine` warning during `pnpm install`/test is harmless. If you need Node 24
(e.g. to run the app itself):

```bash
. "$HOME/.nvm/nvm.sh" && nvm install 24 && nvm use 24
export PATH="$HOME/.nvm/versions/node/$(nvm version 24)/bin:$PATH"
```

## Troubleshooting

- **`Cannot connect to the Docker daemon`** — the sandbox doesn't auto-start dockerd, and
  it can be reset between turns. `scripts/test-db.sh up` starts it for you; re-running any
  `test:*` script re-checks and restarts as needed.
- **Backend integration tests hang ~120s then fail in `beforeAll`** — `MONGO_TEST_URI`
  isn't set and Testcontainers is trying (and failing) to pull from Docker Hub. Use
  `pnpm test:backend` / `pnpm test:sandbox` instead of `pnpm test`.
- **`docker pull` of `mongo:7` fails but `mirror.gcr.io/library/mongo:7` works** — expected;
  that's the whole reason the script uses the mirror. Don't switch it back to Docker Hub.
- **Transactions fail (`Transaction numbers are only allowed on a replica set ...`)** — the
  MongoDB you pointed at is a standalone, not a replica set. Use the script, which
  initiates `rs0`.
