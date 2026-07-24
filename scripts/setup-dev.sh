#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> CUSTECH Enterprise Exam System — Dev Setup"

# Backend
echo "==> Setting up backend..."
cd "$ROOT/backend"
cp -n .env.example .env 2>/dev/null || true
npm install

# Electron app
echo "==> Setting up Electron app..."
cd "$ROOT/electron-app"
npm install
chmod +x scripts/download-models.sh 2>/dev/null || true
npm run download-models 2>/dev/null || echo "Warning: face models download skipped (no network)"

# Migration script
chmod +x "$ROOT/scripts/migrate-to-electron.sh"

echo ""
echo "==> Setup complete!"
echo ""
echo "Start infrastructure (optional):"
echo "  cd backend && docker compose up -d mongodb redis minio rabbitmq"
echo ""
echo "Start backend:"
echo "  cd backend && npm run dev"
echo ""
echo "Start Electron app:"
echo "  cd electron-app && npm run dev"
echo ""
echo "Seed database:"
echo "  cd backend && npm run seed"
