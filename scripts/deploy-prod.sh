#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Deploying CUSTECH production stack..."
cd "$ROOT/backend"

docker compose pull
docker compose up --build -d

echo "==> Waiting for gateway..."
sleep 10
curl -sf http://localhost:5000/api/health || echo "Warning: gateway not ready yet"

echo "==> Production stack deployed."
echo "  API:        http://localhost:5000"
echo "  MinIO:      http://localhost:9001 (minioadmin/minioadmin)"
echo "  RabbitMQ:   http://localhost:15672 (guest/guest)"
echo "  Grafana:    http://localhost:3000 (admin/admin)"
echo "  Prometheus: http://localhost:9090"
