require('dotenv').config();
const express = require('express');
const { register, login, refresh, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const connectDB = require('../config/db');

connectDB();

const app = express();
app.use(express.json());
app.use(authLimiter);

app.post('/register', register);
app.post('/login', login);
app.post('/refresh', refresh);
app.get('/me', protect, getMe);

const PORT = process.env.AUTH_PORT || 5001;
app.listen(PORT, () => console.log(`Auth service on ${PORT}`));
