#!/bin/bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT="${API_PORT:-8080}"
WEB_PORT="${PORT:-5000}"
API_PID=""

cleanup() {
  if [ -n "$API_PID" ]; then
    kill "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if curl -sf "http://localhost:${API_PORT}/api/healthz" > /dev/null 2>&1; then
  echo "API server already running on port ${API_PORT}."
else
  (cd "$ROOT_DIR/artifacts/api-server" && PORT="$API_PORT" pnpm run dev) &
  API_PID=$!
fi

echo "Waiting for API server to be ready..."
until curl -sf "http://localhost:${API_PORT}/api/healthz" > /dev/null 2>&1; do
  sleep 1
done
echo "API server ready."

if curl -sf "http://localhost:${WEB_PORT}/" > /dev/null 2>&1; then
  echo "Frontend already running on port ${WEB_PORT}."
  while sleep 3600; do :; done
else
  cd "$ROOT_DIR/artifacts/fishtokri-admin" && PORT="$WEB_PORT" BASE_PATH=/ pnpm run dev
fi
