# Deployment Guide

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- 8GB RAM minimum for full stack

## Quick Start (Development)

```bash
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh

# Start infrastructure
cd backend && docker compose up -d mongodb redis minio rabbitmq

# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Electron
cd electron-app && npm run dev
```

## Docker Compose (Full Stack)

```bash
cd backend
cp .env.example .env
# Edit JWT_SECRET and other secrets
docker compose up --build -d
```

Services:
| Service | Port | Purpose |
|---------|------|---------|
| gateway | 5000 | API + WebSocket |
| mongodb | 27017 | Database |
| redis | 6379 | Cache/sessions |
| minio | 9000/9001 | Evidence storage |
| rabbitmq | 5672/15672 | Message queue |
| prometheus | 9090 | Metrics |
| grafana | 3000 | Dashboards |

## Production (Self-Hosted)

```bash
./scripts/deploy-prod.sh
```

Recommended VM: 8 vCPU, 32GB RAM, 200GB SSD

## Electron Distribution

```bash
cd electron-app
npm run build
npm run build:electron
```

Artifacts in `electron-app/dist/`.

## Environment Variables

See `backend/.env.example` for all configuration options.

Key production settings:
- `JWT_SECRET` — strong random string
- `SUPERVISOR_HASH` — SHA-256 hash of supervisor exit password
- `FRAME_SIGNING_SECRET` — HMAC key for frame signatures
- `CERT_PIN_SHA256` — TLS certificate pin for Electron
