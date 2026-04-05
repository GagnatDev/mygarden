# MyGarden (minhage)

Monorepo for the MyGarden garden planning PWA: React frontend, Express/MongoDB backend, Docker image for production.

## Requirements

- Node.js 24+ and [pnpm](https://pnpm.io) 9+
- Docker and Docker Compose (for local full stack)

## Development

Install dependencies from the repository root:

```bash
pnpm install
```

### Run with Docker Compose

```bash
docker compose up --build
```

- App: [http://localhost:8080](http://localhost:8080)
- Health: [http://localhost:8080/health](http://localhost:8080/health)
- MinIO console: [http://localhost:9001](http://localhost:9001) (see `docker-compose.yml` for dev credentials)

Hot-reload development overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Run without Docker

```bash
# Terminal 1 — backend (default port 3000)
pnpm --filter backend dev

# Terminal 2 — frontend (Vite; proxies API in dev)
pnpm --filter frontend dev
```

Backend expects `MONGODB_URI`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` (see [`docs/deployment.md`](docs/deployment.md)). For local scripts, use a `.env` file in `backend/` or export variables.

### Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Production Docker image

Build from the repo root:

```bash
docker build -f docker/Dockerfile -t mygarden:local .
```

The image listens on port **8080** by default (`PORT`).

## Deployment

- **Scaleway + GitHub Actions:** see [`docs/deployment.md`](docs/deployment.md) for secrets, workflow behavior, and first-time setup.
- **Compose example:** [`docker-compose.prod.yml`](docker-compose.prod.yml).

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — system design
- [`docs/deployment.md`](docs/deployment.md) — env vars, CI/CD, self-hosted Compose

## License

Private / as specified by the project owner.
