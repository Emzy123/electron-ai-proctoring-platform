# CUSTECH Osara Exam System — Setup Guide

## Step 1: Install Prerequisites

1. Install [Node.js 18+](https://nodejs.org/)
2. Install [MongoDB](https://www.mongodb.com/try/download/community) locally **OR** create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

## Step 2: MongoDB Atlas Setup (Recommended)

1. Sign up at https://www.mongodb.com/atlas
2. Create a free M0 cluster
3. Database Access → Add user with password
4. Network Access → Add IP `0.0.0.0/0` (allow from anywhere)
5. Connect → Get connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/custech-exam
   ```

## Step 3: Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
MONGODB_URI=mongodb+srv://your-user:your-password@cluster0.xxxxx.mongodb.net/custech-exam
JWT_SECRET=my-super-secret-jwt-key-change-in-production
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

```bash
npm install
npm run seed
npm run dev
```

Expected output:
```
MongoDB connected: ...
Server running on port 5000
```

## Step 4: Frontend Setup

```bash
cd frontend
cp .env.example .env
```

Edit `.env` (defaults work for local dev):

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

```bash
npm install
npm run download-models
npm run dev
```

Open http://localhost:5173

## Step 5: Download Face-API Models

The `download-models.sh` script fetches model weights into `frontend/public/models/`:

```bash
cd frontend
chmod +x scripts/download-models.sh
npm run download-models
```

Required models:
- `tiny_face_detector` — fast face detection
- `face_landmark_68` — facial landmarks for gaze
- `face_recognition` — 128-d face descriptors

## Step 6: Test the System

### Faculty flow
1. Login: `faculty@custech.edu` / `Faculty@123`
2. View the pre-seeded exam "Introduction to Computer Science"
3. Open **Live Monitor** tab (empty until a student starts)

### Student flow
1. Go to **Register** and create account with webcam face capture
2. Login with new credentials
3. Click **Start Exam** on CSC101
4. Complete pre-exam face verification
5. Take exam in lockdown mode
6. Submit or wait for timer expiry

### Faculty monitoring
1. While student is in exam, faculty **Live Monitor** shows:
   - Student name, exam, timer
   - Periodic webcam snapshots (~8s)
   - Violation count
2. Faculty can send warnings and review violations

## Troubleshooting

### Camera not working
- Allow browser camera permission
- Use HTTPS in production (localhost is exempt)
- Check no other app is using the webcam

### Face models failed to load
```bash
cd frontend && npm run download-models
```
Verify `frontend/public/models/` contains three subdirectories with `.json` and shard files.

### CORS errors
- Ensure `CLIENT_URL` in backend `.env` matches your frontend URL exactly
- Restart backend after changing `.env`

### MongoDB connection failed
- Check Atlas IP whitelist includes `0.0.0.0/0`
- Verify username/password in connection string (URL-encode special chars)
- For local MongoDB: `MONGODB_URI=mongodb://localhost:27017/custech-exam`

### Socket.io not connecting
- Verify `VITE_SOCKET_URL` points to backend (no `/api` suffix)
- Check browser console for WebSocket errors
- Render: ensure both services use HTTPS URLs

## Render Deployment

### API Service
| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `node server.js` |

### Static Site
| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run download-models && npm run build` |
| Publish Directory | `dist` |

After deploy, run `node utils/seed.js` in the API service shell.

## Screenshots for FYP Report

Capture screenshots of:
1. Registration with face capture
2. Pre-exam face verification modal
3. Lockdown exam interface with timer
4. Violation warning toast
5. Faculty live monitor with snapshots
6. Violations review table
7. Results with CSV/PDF export
