const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['frame', 'violation', 'screen', 'audio'], required: true },
  storageKey: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  signature: { type: String },
  nonce: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

evidenceSchema.index({ examId: 1, studentId: 1, timestamp: -1 });

module.exports = mongoose.model('Evidence', evidenceSchema);
