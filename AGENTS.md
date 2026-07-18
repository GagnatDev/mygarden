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

## Cursor Cloud agents

Cursor Cloud agents (isolated VMs only — not local development) should follow `.cursor/skills/cursor-cloud-environment/SKILL.md`.
