require('dotenv').config();
const express = require('express');
const inferenceController = require('../controllers/inferenceController');
const { protect } = require('../middleware/auth');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/face', protect, inferenceController.detectFace);
app.post('/object', protect, inferenceController.detectObject);
app.post('/gaze', protect, inferenceController.estimateGaze);
app.post('/audio', protect, inferenceController.detectAudio);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'inference' }));

const PORT = process.env.INFERENCE_PORT || 8502;
app.listen(PORT, () => console.log(`Inference wrapper on ${PORT}`));
