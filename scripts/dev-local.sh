#!/usr/bin/env bash
# Local dev: MongoDB + MinIO (Compose), optional backend/.env, then backend + frontend.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Starting MongoDB and MinIO (docker compose)..."
docker compose up -d mongodb minio

echo "Waiting for MongoDB to accept connections..."
until docker compose exec -T mongodb mongosh --eval "db.runCommand({ping:1})" --quiet >/dev/null 2>&1; do
  sleep 0.5
done

ENV_FILE="$ROOT/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  cat >"$ENV_FILE" <<'EOF'
MONGODB_URI=mongodb://127.0.0.1:27017/mygarden
JWT_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
JWT_REFRESH_SECRET=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
NODE_ENV=development
EOF
  echo "Created backend/.env with local defaults."
fi

exec pnpm exec concurrently -k \
  -n backend,frontend \
  -c blue,green \
  "pnpm --filter backend dev" \
  "pnpm --filter frontend dev"
