#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Building all services..."

cd "$ROOT/backend"
npm install
echo "Backend ready."

cd "$ROOT/electron-app"
npm install
npm run build
echo "Electron renderer built."

echo "==> Build complete."
echo "Package Electron: cd electron-app && npm run build:electron"
echo "Docker stack:     cd backend && docker compose up --build -d"
