const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const inferenceController = require('../controllers/inferenceController');

router.post('/face', protect, inferenceController.detectFace);
router.post('/object', protect, inferenceController.detectObject);
router.post('/gaze', protect, inferenceController.estimateGaze);
router.post('/audio', protect, inferenceController.detectAudio);

module.exports = router;
