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

Applies to Cursor Cloud agent VMs. The startup update script already runs `pnpm install` under Node 24 (via nvm) with pnpm 9.15.9 activated via corepack. See `README.md` and `.cursor/skills/cursor-cloud-environment/SKILL.md` for the standard dev commands and the invite-only registration / garden-creation payload details.

- **Node 24 is shadowed in fresh shells.** A system `node` at `/exec-daemon/node` (v22) precedes nvm on `PATH`, so `nvm use 24` alone does not change `node`. To actually run with Node 24, prepend the nvm bin: `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"` (after `. "$HOME/.nvm/nvm.sh"`). The app requires Node >= 24 at runtime; `pnpm install` itself tolerates the v22 shim.
- **Docker is not auto-started.** Start it once per session with `sudo dockerd` (run in the background, e.g. a tmux session). The `ubuntu` user is in the `docker` group, so `docker` works without sudo once the daemon is up. Docker is needed for the MongoDB dev container and for backend integration tests (`@testcontainers/mongodb`).
- **Backend integration tests need the Docker socket** reachable as `ubuntu` (group membership is already configured); if a fresh shell predates the group change, run them via `sg docker -c "…"`.
- **Known pre-existing failing test (not an environment issue):** `planning.integration.test.ts > activity logs … PATCH LWW rejects stale clientTimestamp` uses hardcoded 2026-06 dates but `patchNote` compares `clientTimestamp` against the DB-assigned `updatedAt` (server `now`). It passes only while wall-clock time is before the hardcoded dates; it 409s afterward. Do not "fix" it as part of environment setup.
