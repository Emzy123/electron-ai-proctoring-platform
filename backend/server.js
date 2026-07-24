require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { setupExamMonitor } = require('./socket/examMonitor');
const { globalLimiter, authLimiter, examLimiter } = require('./middleware/rateLimit');
const { nonceCheck } = require('./middleware/nonce');
const { startWorkers } = require('./workers');
const { ensureBucket } = require('./shared/storage');

const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exams');
const sessionRoutes = require('./routes/sessions');
const violationRoutes = require('./routes/violations');
const reportRoutes = require('./routes/reports');
const securityRoutes = require('./routes/security');
const evidenceRoutes = require('./routes/evidence');
const inferenceRoutes = require('./routes/inference');
const adminRoutes = require('./routes/admin');
const registrationRoutes = require('./routes/registrations');

connectDB();
ensureBucket().catch(() => {});

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .concat(['app://.', 'file://', 'null']);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some((o) => origin.startsWith(o.replace(/\.$/, '')))) {
      callback(null, true);
    } else {
      callback(null, process.env.NODE_ENV !== 'production');
    }
  },
  credentials: true,
};

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { getRedis } = require('./middleware/nonce');

const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

(async () => {
  try {
    const pubClient = getRedis();
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  } catch {
    console.warn('Redis adapter unavailable, using in-memory adapter');
  }
})();

setupExamMonitor(io);
app.set('io', io);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(globalLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CUSTECH Exam API running', version: '2.0.0' });
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# HELP custech_up Service status\n custech_up 1\n');
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/exams', examLimiter, nonceCheck, examRoutes);
app.use('/api/exams', examLimiter, nonceCheck, evidenceRoutes);
app.use('/api/sessions', examLimiter, nonceCheck, sessionRoutes);
app.use('/api/sessions', securityRoutes);
app.use('/api/violations', examLimiter, nonceCheck, violationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/inference', examLimiter, inferenceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/registrations', examLimiter, nonceCheck, registrationRoutes);
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/sso', require('./auth/sso'));
app.use('/api/lti', require('./lti/routes'));

startWorkers(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`CUSTECH Gateway running on port ${PORT}`);
});

module.exports = { app, server, io };
