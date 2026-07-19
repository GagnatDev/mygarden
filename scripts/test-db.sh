#!/usr/bin/env bash
#
# Disposable MongoDB for backend integration tests — WITHOUT Testcontainers.
#
# Why this exists: sandboxed/CI-like agent environments block Docker Hub's blob
# CDN, so Testcontainers (and a plain `docker pull mongo`) can't fetch the image.
# This script pulls `mongo` from a Docker Hub *mirror* that is reachable, and
# starts it as a single-node replica set (the app uses multi-document
# transactions, which require a replica set — a standalone mongod is not enough).
#
# The backend test harness (`backend/src/test/mongo-harness.ts`) connects to this
# server when `MONGO_TEST_URI` is set, instead of spinning up Testcontainers.
#
# Usage:
#   scripts/test-db.sh up      # ensure dockerd + mongo are running; print the URI on stdout
#   scripts/test-db.sh down    # remove the mongo container
#   scripts/test-db.sh uri     # print the connection URI without touching anything
#
# All progress/log output goes to stderr so `MONGO_TEST_URI=$(scripts/test-db.sh up)`
# captures only the URI.
#
# Overridable via env:
#   MONGO_TEST_IMAGE      (default: mirror.gcr.io/library/mongo:7)
#   MONGO_TEST_PORT       (default: 27017)
#   MONGO_TEST_CONTAINER  (default: mygarden-test-mongo)
set -euo pipefail

IMAGE="${MONGO_TEST_IMAGE:-mirror.gcr.io/library/mongo:7}"
PORT="${MONGO_TEST_PORT:-27017}"
CONTAINER="${MONGO_TEST_CONTAINER:-mygarden-test-mongo}"
URI="mongodb://127.0.0.1:${PORT}"

log() { echo "[test-db] $*" >&2; }

ensure_dockerd() {
  if docker info >/dev/null 2>&1; then
    return
  fi
  log "Docker daemon not running; starting dockerd in the background..."
  # In these sandboxes the session runs as root; use sudo only if we're not.
  local runner=""
  [ "$(id -u)" -ne 0 ] && runner="sudo"
  $runner sh -c 'dockerd >/tmp/dockerd.log 2>&1 &' || true
  for _ in $(seq 1 30); do
    if docker info >/dev/null 2>&1; then
      log "Docker daemon is up."
      return
    fi
    sleep 1
  done
  log "ERROR: Docker daemon did not come up. See /tmp/dockerd.log"
  exit 1
}

wait_for_mongod() {
  for _ in $(seq 1 60); do
    if docker exec "$CONTAINER" mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null | grep -q 1; then
      return
    fi
    sleep 1
  done
  log "ERROR: mongod did not become reachable in time."
  exit 1
}

wait_for_primary() {
  for _ in $(seq 1 60); do
    local state
    state="$(docker exec "$CONTAINER" mongosh --quiet --eval "try { rs.status().myState } catch (e) { -1 }" 2>/dev/null | tr -d '[:space:]')"
    [ "$state" = "1" ] && return
    sleep 1
  done
  log "ERROR: replica set did not reach PRIMARY in time."
  exit 1
}

up() {
  ensure_dockerd
  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    log "$CONTAINER already running."
    echo "$URI"
    return
  fi
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  log "Pulling $IMAGE (if needed) and starting $CONTAINER on port $PORT ..."
  docker run -d --name "$CONTAINER" -p "${PORT}:27017" "$IMAGE" \
    --replSet rs0 --bind_ip_all >/dev/null
  wait_for_mongod
  log "Initiating single-node replica set..."
  docker exec "$CONTAINER" mongosh --quiet --eval \
    "try { rs.status().ok } catch (e) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] }) }" >/dev/null
  wait_for_primary
  log "MongoDB ready at $URI"
  echo "$URI"
}

down() {
  ensure_dockerd
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  log "Removed $CONTAINER."
}

case "${1:-up}" in
  up) up ;;
  down) down ;;
  uri) echo "$URI" ;;
  *) echo "usage: $0 {up|down|uri}" >&2; exit 2 ;;
esac
