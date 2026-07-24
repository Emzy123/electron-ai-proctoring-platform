#!/usr/bin/env bash
# Migrate existing React frontend into electron-app renderer structure
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"
ELECTRON="$ROOT/electron-app"

echo "==> Migrating frontend to electron-app..."

mkdir -p "$ELECTRON/src/renderer" "$ELECTRON/resources/models" "$ELECTRON/scripts"

if [ -d "$FRONTEND/src" ]; then
  rsync -a --delete "$FRONTEND/src/" "$ELECTRON/src/renderer/"
fi

if [ -d "$FRONTEND/public" ]; then
  rsync -a "$FRONTEND/public/" "$ELECTRON/resources/"
fi

if [ -f "$FRONTEND/index.html" ]; then
  cp "$FRONTEND/index.html" "$ELECTRON/src/renderer/index.html"
  node -e "const fs = require('fs'); const file = '$ELECTRON/src/renderer/index.html'; fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('/src/main.jsx', '/main.jsx'));"
fi

if [ -f "$FRONTEND/scripts/download-models.sh" ]; then
  cp "$FRONTEND/scripts/download-models.sh" "$ELECTRON/scripts/"
  chmod +x "$ELECTRON/scripts/download-models.sh"
fi

echo "==> Migration complete."
echo "    Renderer: $ELECTRON/src/renderer"
echo "    Models:   $ELECTRON/resources/models"
echo "    Run: cd electron-app && npm install && npm run download-models"
