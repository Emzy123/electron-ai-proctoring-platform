# CUSTECH Osara — Enterprise Online Examination System

Production-grade exam platform with Electron lockdown client, AI proctoring, and enterprise backend services.

## Features

- **Electron kiosk client** — real lockdown, keyboard blocking, secure IPC
- **AI proctoring** — face detection, gaze estimation, object detection (async inference)
- **Exam integrity** — encrypted answers, hash chain verification, signed manifests
- **CBT Exam Registration & Slots** — Biometric-gated workflow, seating/lab time-slot capacities, bulk faculty CSV enrollments, printable JWT-signed Admit Cards
- **Faculty dashboard** — live monitoring, batch violation review, forensic export, slot configuration
- **Premium Landing Portal** — High-performance interactive landing portal guiding users to active dashboards
- **Enterprise** — multi-tenancy, RBAC, SSO/LTI stubs, audit logs, NDPR compliance

## Recent Developments

### 1. Advanced AI Proctoring & Computer Vision Pipeline
- **3D Head Pose & EAR/MAR Tracking**: Calculates Yaw, Pitch, and Roll angles alongside Eye Aspect Ratio (EAR) and Mouth Aspect Ratio (MAR) from 68 facial landmarks to detect head turns and eye gaze shifts.
- **Active Anti-Spoofing Liveness Challenge**: Interactive challenge engine (`blink`, `turn_left`, `turn_right`, `smile`) for biometric identity verification to prevent photo and video playback spoofing.
- **Spectral Audio Voice Monitoring**: Web Audio API BiquadFilter bandpass (300 Hz – 3400 Hz) isolating human speech and tracking sustained vocal energy.
- **Visual Object & Screen Glare Analyzer**: Edge margin luminance and contrast reflection filter detecting mobile devices or secondary display glares.

### 2. Security & Kiosk Lockdown Hardening
- **Comprehensive Shortcut Interception**: Blocks `F1`–`F12`, `Alt+Space`, `Alt+Escape`, `Control+Escape`, `Super+Tab`, `Super+L`, `Super+E`, `Super+P`, `Ctrl+Shift+Esc`, and clipboard shortcuts.
- **AI & Threat Process Blacklisting**: Scans running processes for desktop AI assistants (`chatgpt`, `claude`, `copilot`, `ollama`), packet sniffers (`wireshark`, `fiddler`), and remote desktop software (`vnc`, `splashtop`, `rdpclip`).
- **Hypervisor & Screen Capture Protection**: Detects VM environments (`systemd-detect-virt`, QEMU, KVM, Hyper-V) and enforces Electron window content protection (`setContentProtection(true)`) to block background screen recorders (OBS, Game Bar).

### 3. Real-Time Streaming & Enterprise LMS Integrations
- **WebRTC Peer-to-Peer Live Proctoring**: Socket.io WebRTC signaling (`webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`) and client peer connection manager for live camera streams.
- **LTI 1.3 LMS Integration & Grade Passback**: Complete LTI 1.3 claim validator, `/api/lti/jwks` public key endpoint, and `/api/lti/grades` Assignment & Grade Services (AGS) score passback for Canvas, Moodle, and Blackboard.
- **Microservice Queue & Storage Resilience**: MinIO S3 evidence object uploader and RabbitMQ event queue publisher with automatic inline data URL fallbacks.

### 4. Automated Testing & High-Concurrency Performance Benchmarking
- **Automated E2E Lockdown Test Suite**: Run `node scripts/test-e2e-lockdown.js` to validate LTI 1.3 JWKS, claim validation, storage resilience, shortcut filters, and threat process blacklists.
- **High-Concurrency Virtual Student Simulator**: Run `node scripts/load-test.js --students=50 --duration=10` to benchmark API throughput and latency distribution (p50, p95, p99).

### 5. CBT Exam Registration & Seating Slot Workflow
- **Eligibility Gates**: Students register their face profile (biometrics) and accept privacy consent before registering.
- **Lab Seating Slots**: Time-slot capacities (e.g., *Lab A - 09:00 AM*) that prevent over-booking.
- **Faculty Approvals & Bulk Enroll**: Bulk pre-approved enrollment by matriculation number list.
- **Admit Tokens**: Approved registrations generate a JWT `admitToken` embedded into printable Admit Cards.
- **Entrance Guard**: Backend `startSession` validation blocking unregistered or out-of-window attempts.

### 6. Standalone Database Services
- **MongoDB & Redis**: Configured for standalone daemons (`mongod` on `27017` and `redis-server` on `6379`).
- **Security & Reliability**: Redis request nonces preventing replay attacks, and rate limiters protecting API endpoints.

## Architecture

```
electron-app/     Electron client (React renderer + main process)
backend/          API gateway + microservice entry points
infrastructure/   Monitoring, K8s manifests
scripts/          Setup, build, security tests, deploy
docs/             Architecture, security, deployment guides
frontend/         Legacy browser SPA (superseded by electron-app)
```

## Quick Start (Linux/macOS)

```bash
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh

# Infrastructure
cd backend && docker compose up -d mongodb redis

# Backend
cd backend && npm run dev

# Electron app
cd electron-app && npm run dev
```

## Quick Start (Windows)

You need **three separate terminals** (Command Prompt, PowerShell, or Windows Terminal) for a full local dev stack.

### 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | 18+ (LTS recommended) | Includes `npm`. Verify with `node -v` and `npm -v`. |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | Runs MongoDB and Redis locally. Enable **WSL 2 backend** when prompted during install. |
| [Git for Windows](https://git-scm.com/) | Optional | Useful for cloning the repo and running shell scripts in Git Bash. |

**Alternative to Docker for MongoDB:** use a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster and set `MONGODB_URI` in `backend\.env` to your Atlas connection string. Redis is still required for the backend — run it via Docker (`redis` service below) or install [Memurai](https://www.memurai.com/) (Redis-compatible for Windows).

### 2. Clone the Repository

```cmd
git clone <your-repo-url> custech-exam
cd custech-exam
```

Or download and extract the project ZIP, then open a terminal in the project root folder.

### 3. Configure Environment Files

Copy the example env files from the **project root**:

**Command Prompt (`cmd`):**

```cmd
copy backend\.env.example backend\.env
```

**PowerShell:**

```powershell
Copy-Item backend\.env.example backend\.env
```

Create the Electron client env file (same values as the legacy browser frontend):

**Command Prompt:**

```cmd
(
echo VITE_API_URL=http://localhost:5000/api
echo VITE_SOCKET_URL=http://localhost:5000
) > electron-app\.env
```

**PowerShell:**

```powershell
@"
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
"@ | Set-Content electron-app\.env
```

Edit `backend\.env` if needed. Defaults work for local Docker:

```env
MONGODB_URI=mongodb://localhost:27017/custech-exam
JWT_SECRET=change-me-in-production-use-long-random-string
PORT=5000
CLIENT_URL=http://localhost:5173,app://.
NODE_ENV=development
REDIS_URL=redis://localhost:6379
```

For **MongoDB Atlas**, replace `MONGODB_URI` with your Atlas connection string and whitelist your IP under Network Access in the Atlas dashboard.

### 4. Install Dependencies and Seed Data

```cmd
cd backend
npm install
npm run seed
cd ..\electron-app
npm install
npm run download-models
cd ..
```

`npm run seed` creates test faculty/student accounts and a sample exam (see [Test Credentials](#test-credentials) below).

`npm run download-models` fetches face-api.js weights into `electron-app\resources\models\`. Re-run it if proctoring reports missing model files.

### 5. Start Infrastructure (Terminal 1)

Open **Docker Desktop** and wait until it shows **Running**, then:

```cmd
cd backend
docker compose up -d mongodb redis
```

Optional services for full enterprise features (evidence storage, async inference):

```cmd
docker compose up -d minio rabbitmq
```

Verify containers are up:

```cmd
docker compose ps
```

### 6. Start Backend API (Terminal 2)

```cmd
cd backend
npm run dev
```

Expected output:

```
MongoDB connected: ...
CUSTECH Gateway running on port 5000
```

Confirm the API is healthy:

```cmd
curl http://localhost:5000/api/health
```

Or open `http://localhost:5000/api/health` in a browser — you should see a JSON `"status":"ok"` response.

### 7. Start Electron Client (Terminal 3)

```cmd
cd electron-app
npm run dev
```

This starts the Vite dev server on `http://localhost:5173` and launches the Electron lockdown client. Allow **camera** and **microphone** permissions when Windows prompts you.

### 8. Run Automated Test Suites & Load Tests (Terminal 4 / Optional)

Validate lockdown integrity and API load performance on Windows:

```cmd
# Run E2E Lockdown & Proctoring Test Suite
node scripts\test-e2e-lockdown.js

# Run High-Concurrency Student Load Simulator
node scripts\load-test.js --students=50 --duration=10
```

### 9. Test the System

1. **Faculty:** log in with `faculty@custech.edu` / `Faculty@123` → open **Live Monitor**.
2. **Student:** register a new account (webcam face capture) or log in with `student@custech.edu` / `Student@123` → start exam **CSC101**.
3. Confirm faculty **Live Monitor** shows active session, WebRTC video stream, and real-time proctoring alerts.

### Windows Troubleshooting & Setup Tips

| Issue | Cause | Recommended Fix |
|-------|-------|-----------------|
| `npm` scripts blocked in PowerShell | PowerShell execution policy restriction | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once in PowerShell as Administrator. |
| `docker compose` not found | Docker Desktop not in PATH or not started | Start Docker Desktop; ensure WSL 2 backend is enabled. |
| Camera / Microphone permission error | Windows privacy settings blocking Electron | Go to **Windows Settings → Privacy & Security → Camera / Microphone** and enable *Allow desktop apps to access your camera/microphone*. |
| `MaxRetriesPerRequestError` (Redis) | Redis service not running | Run `docker compose up -d redis` in `backend\`, or install [Memurai](https://www.memurai.com/). |
| Port 5000 / 5173 conflict | Port in use by IIS or hypervisor service | Change `PORT` in `backend\.env` and update `VITE_API_URL` / `VITE_SOCKET_URL` in `electron-app\.env`. |
| Face models fail to load | Missing `face-api.js` model weights | Re-run `npm run download-models` inside `electron-app\`. |

### Legacy Browser Client (Optional)

The `frontend\` folder is a browser-only SPA (superseded by `electron-app\`). To run it instead:

```cmd
copy frontend\.env.example frontend\.env
cd frontend
npm install
npm run download-models
npm run dev
```

Open `http://localhost:5173` in Chrome or Edge.


## Docker (Full Stack)

```bash
cd backend && docker compose up --build -d
```

## Documentation

- [Architecture](docs/architecture.md)
- [Security Model](docs/security.md)
- [Deployment Guide](docs/deployment.md)
- [Setup Guide](docs/SETUP.md)
- [AI Proctoring](docs/AI_PROCTORING.md)
- [API Spec](docs/api/openapi.yaml)

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Faculty | `faculty@custech.edu` | `Faculty@123` |
| Student | `student@custech.edu` | `Student@123` |

## License

Academic project — CUSTECH Osara Final Year Project.
