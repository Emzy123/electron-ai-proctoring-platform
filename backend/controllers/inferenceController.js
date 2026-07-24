const { publishToQueue } = require('../shared/queue');

// Inference REST wrapper — delegates to TensorFlow Serving or returns graceful fallback
const INFERENCE_URL = process.env.INFERENCE_URL || 'http://localhost:8501';

const callInference = async (endpoint, payload) => {
  try {
    const res = await fetch(`${INFERENCE_URL}/v1/models/${endpoint}:predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instances: [payload] }),
    });
    if (!res.ok) throw new Error('Inference unavailable');
    return res.json();
  } catch {
    return { fallback: true, confidence: 0, detected: false };
  }
};

exports.detectFace = async (req, res) => {
  const { image, sessionId } = req.body;
  const result = await callInference('face_detection', { image, sessionId });
  await publishToQueue('frame_queue', { type: 'face', sessionId, result });
  res.json(result);
};

exports.detectObject = async (req, res) => {
  const { image, sessionId } = req.body;
  const result = await callInference('object_detection', { image, sessionId });
  res.json(result);
};

exports.estimateGaze = async (req, res) => {
  const { image, sessionId } = req.body;
  const result = await callInference('gaze_estimation', { image, sessionId });
  res.json(result);
};

exports.detectAudio = async (req, res) => {
  const { audio, sessionId } = req.body;
  const result = await callInference('audio_detection', { audio, sessionId });
  res.json(result);
};
