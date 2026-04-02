#!/bin/bash

# Load all credentials from ecosystem.config.cjs automatically
eval $(node -e "
const config = require('./ecosystem.config.cjs');
const env = config.apps[0].env;
const skip = new Set(['NODE_ENV', 'PORT']);
Object.entries(env).forEach(([k, v]) => {
  if (!skip.has(k) && v !== undefined && v !== null) {
    const val = String(v).replace(/'/g, \"'\\\\''\");
    process.stdout.write('export ' + k + \"='\" + val + \"'\\n\");
  }
});
")

# Start API server in background
(cd artifacts/api-server && PORT=8080 pnpm run dev) &
API_PID=$!

# Wait for API to be ready before starting frontend
echo "Waiting for API server to be ready..."
until curl -sf http://localhost:8080/api/healthz > /dev/null 2>&1; do
  sleep 1
done
echo "API server ready."

# Start frontend (webview)
cd artifacts/fishtokri-admin && PORT=5000 BASE_PATH=/ pnpm run dev

# Cleanup on exit
kill $API_PID 2>/dev/null || true
