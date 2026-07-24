require('dotenv').config();
const express = require('express');
const connectDB = require('../config/db');
const examRoutes = require('../routes/exams');
const sessionRoutes = require('../routes/sessions');
const { protect } = require('../middleware/auth');
const { examLimiter } = require('../middleware/rateLimit');
const { nonceCheck } = require('../middleware/nonce');

connectDB();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(examLimiter);
app.use(nonceCheck);

app.use('/exams', protect, examRoutes);
app.use('/sessions', protect, sessionRoutes);

const PORT = process.env.EXAM_PORT || 5002;
app.listen(PORT, () => console.log(`Exam service on ${PORT}`));
