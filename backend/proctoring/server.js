require('dotenv').config();
const express = require('express');
const http = require('http');
const connectDB = require('../config/db');
const violationRoutes = require('../routes/violations');
const evidenceRoutes = require('../routes/evidence');
const { protect } = require('../middleware/auth');
const { setupExamMonitor } = require('../socket/examMonitor');
const { Server } = require('socket.io');

connectDB();

const app = express();
const server = http.createServer(app);
app.use(express.json({ limit: '10mb' }));

const io = new Server(server, { cors: { origin: '*' } });
setupExamMonitor(io);

app.use('/violations', protect, violationRoutes);
app.use('/exams', protect, evidenceRoutes);

const PORT = process.env.PROCTORING_PORT || 5003;
server.listen(PORT, () => console.log(`Proctoring service on ${PORT}`));
