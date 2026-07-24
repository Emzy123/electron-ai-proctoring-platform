# Benchmark Methodology — 1000 Concurrent Students

## Test Environment

| Spec | Value |
|------|-------|
| VM | 8 vCPU, 32GB RAM |
| OS | Ubuntu 22.04 |
| Stack | Docker Compose full stack |

## Test Scenarios

### 1. API Gateway Throughput
- Tool: k6
- Target: 500 req/s sustained for 5 minutes
- Endpoints: `/api/health`, `/api/sessions/:id/answer`

### 2. Frame Upload (1 fps × 1000 students)
- Tool: k6 with base64 payloads
- Target: p95 latency < 2s
- Endpoint: `POST /api/exams/:id/evidence/frame`

### 3. WebSocket Connections
- Tool: socket.io load test
- Target: 1000 concurrent connections
- Events: heartbeat, snapshot

### 4. Inference Backlog
- Metric: RabbitMQ queue depth
- Target: drain within 30s at 1000 frames/min

## Results Template

| Test | Target | Actual | Pass |
|------|--------|--------|------|
| API throughput | 500 req/s | _TBD_ | _ |
| Frame upload p95 | < 2s | _TBD_ | _ |
| WS connections | 1000 | _TBD_ | _ |
| Inference drain | < 30s | _TBD_ | _ |

Run benchmarks after deployment with:
```bash
k6 run infrastructure/benchmarks/load-test.js
```
