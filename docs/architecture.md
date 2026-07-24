# CUSTECH Enterprise Examination System — Architecture

## Overview

Production-grade online examination platform with Electron lockdown client, microservice-ready backend, async ML inference, and enterprise compliance features.

## Components

### Electron Client (`electron-app/`)
- **Main process**: Kiosk mode, keyboard blocking, IPC bridge, system monitoring, auto-updater
- **Renderer**: React 18 UI (migrated from `frontend/`)
- **Preload**: Whitelisted APIs (`examAPI`, `proctorAPI`, `storageAPI`, `networkAPI`, `lockdownAPI`)
- **Proctoring**: Camera capture, frame upload, local face-api pre-filter, environment checks

### Backend (`backend/`)
- **Gateway** (`server.js`): API entry, middleware stack, Socket.io with Redis adapter
- **Auth** (`auth/`): JWT (15min) + refresh tokens (7 days)
- **Exam** (`exam/`): Exam CRUD, session lifecycle
- **Proctoring** (`proctoring/`): Violations, evidence, real-time monitoring
- **Inference** (`inference/`): TF Serving wrapper + async worker
- **Report** (`report/`): PDF/CSV generation worker

### Infrastructure
- MongoDB — primary data store
- Redis — sessions, nonce replay protection, Socket.io adapter, rate limits
- MinIO — evidence storage (S3-compatible)
- RabbitMQ — async frame/violation/report queues
- Prometheus + Grafana — monitoring

## Data Flow

1. Student launches Electron app → kiosk lockdown enabled
2. Login → JWT access + refresh tokens stored in secure storage
3. Exam start → manifest verification, monitoring consent, session salt generated
4. During exam → frames uploaded (signed + nonce), answers encrypted + hash chain updated
5. Inference worker processes frames asynchronously → violations flagged with AI confidence
6. Faculty monitors via WebSocket + live snapshots/WebRTC
7. Submit → hash chain verified server-side, session graded

## Deployment

See [deployment.md](deployment.md) for Docker Compose and production setup.
