const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', require('../controllers/authController').refresh);
router.get('/me', protect, getMe);
router.post('/consent', protect, require('../controllers/authController').signConsent);

module.exports = router;
