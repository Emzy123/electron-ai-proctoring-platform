const { consumeQueue } = require('../shared/queue');
const Violation = require('../models/Violation');
const INFERENCE_URL = process.env.INFERENCE_URL || 'http://localhost:8501';

const runInference = async (model, payload) => {
  try {
    const res = await fetch(`${INFERENCE_URL}/v1/models/${model}:predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instances: [payload] }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
};

const startInferenceWorker = () => {
  consumeQueue('frame_queue', async (data) => {
    const result = await runInference('face_detection', { storageKey: data.storageKey });
    if (result?.predictions?.[0]?.violation) {
      await Violation.create({
        sessionId: data.sessionId,
        examId: data.examId,
        studentId: data.studentId,
        type: result.predictions[0].violation,
        aiConfidence: result.predictions[0].confidence || 0.5,
        facultyReviewStatus: 'pending',
      }).catch(() => {});
    }
  });
};

if (require.main === module) {
  require('dotenv').config();
  require('../config/db')();
  startInferenceWorker();
  console.log('Inference worker started');
}

module.exports = { startInferenceWorker };
