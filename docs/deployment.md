# Deployment

MyGarden ships as a single Docker image (see [`docker/Dockerfile`](../docker/Dockerfile)): the backend serves the built React app from `/public` and the API under `/api/v1`.

## Runtime environment (application)

These variables are validated at backend startup ([`backend/src/config/env.ts`](../backend/src/config/env.ts)).

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | Use `production` in production (default `development` if unset). |
| `PORT` | No | HTTP listen port (default `3000`; Docker image defaults to `8080`). |
| `MONGODB_URI` | Yes | MongoDB connection string (e.g. Scaleway Managed MongoDB). |
| `JWT_SECRET` | Yes | Signing key for access tokens (minimum 32 characters). |
| `JWT_REFRESH_SECRET` | Yes | Signing key for refresh tokens (minimum 32 characters). |
| `ADMIN_EMAIL` | No | If set, this email is treated as the app owner for admin routes. |
| `ACCESS_TOKEN_EXPIRES` | No | Default `15m`. |
| `REFRESH_TOKEN_EXPIRES` | No | Default `7d`. |
| `BCRYPT_ROUNDS` | No | Default `12`. |

Object Storage keys below are injected by the Scaleway deploy workflow for future file-upload features; they are not required by the current env schema unless you add usage in code:

| Variable | Notes |
|----------|--------|
| `S3_ENDPOINT` | Scaleway Object Storage endpoint URL. |
| `S3_BUCKET` | Bucket name. |
| `S3_ACCESS_KEY` | API access key. |
| `S3_SECRET_KEY` | API secret key. |

## GitHub Actions — Scaleway deploy

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). It runs **after** [CI](../.github/workflows/ci.yml) completes successfully on `main` (via `workflow_run`).

### Repository secrets (infrastructure)

| Secret | Purpose |
|--------|---------|
| `SCW_SECRET_KEY` | Scaleway API secret key (`registry-login` + `container-manage`). |
| `SCW_REGISTRY_NAMESPACE` | Container Registry namespace name. |
| `SCW_CONTAINER_NAMESPACE_ID` | Serverless Containers namespace UUID (required for **create**). |
| `SCW_CONTAINER_ID` | Existing serverless container UUID. Leave **unset** until after the first deploy; then set from the Scaleway console so later runs use **update**. |

### Repository secrets (application → container)

GitHub secret names use an `APP_` prefix; the workflow maps them to container environment variable names **without** the prefix.

| GitHub secret | Container env var |
|---------------|---------------------|
| `APP_MONGODB_URI` | `MONGODB_URI` |
| `APP_JWT_SECRET` | `JWT_SECRET` |
| `APP_JWT_REFRESH_SECRET` | `JWT_REFRESH_SECRET` |
| `APP_ADMIN_EMAIL` | `ADMIN_EMAIL` |
| `APP_S3_ENDPOINT` | `S3_ENDPOINT` |
| `APP_S3_BUCKET` | `S3_BUCKET` |
| `APP_S3_ACCESS_KEY` | `S3_ACCESS_KEY` |
| `APP_S3_SECRET_KEY` | `S3_SECRET_KEY` |

Uses [GagnatDev/scaleway-gh-action](https://github.com/GagnatDev/scaleway-gh-action): `registry-login` and `container-manage`.

### First-time deploy checklist

1. Create a Container Registry namespace; note its **name** for `SCW_REGISTRY_NAMESPACE`.
2. Create a Serverless Containers namespace; note its **ID** for `SCW_CONTAINER_NAMESPACE_ID`.
3. Provision Managed MongoDB and Object Storage as needed.
4. Create an API key with permissions for Registry, Serverless Containers, and related products.
5. Add all secrets above in the GitHub repository settings. Omit `SCW_CONTAINER_ID` for the first run.
6. Push to `main`. After success, open Scaleway → Serverless Containers → **mygarden**, copy the container ID, and add `SCW_CONTAINER_ID` in GitHub. Subsequent pushes will **update** that container.

Image name in the registry: `mygarden` (tags: commit SHA and `latest`).

## Self-hosted Compose

See [`docker-compose.prod.yml`](../docker-compose.prod.yml). Provide at least `MONGODB_URI`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` (e.g. via a local `.env` file).

```bash
export MONGODB_URI='mongodb://...'
export JWT_SECRET='...'   # 32+ chars
export JWT_REFRESH_SECRET='...'  # 32+ chars
docker compose -f docker-compose.prod.yml up --build
```

Health check: `GET http://localhost:8080/health`.
