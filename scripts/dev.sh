#!/bin/bash
set -e

# Start API server in background
(cd artifacts/api-server && PORT=8080 pnpm run dev) &
API_PID=$!

# Start frontend (this is the webview)
cd artifacts/fishtokri-admin && PORT=3000 BASE_PATH=/ pnpm run dev

# Cleanup on exit
kill $API_PID 2>/dev/null || true
