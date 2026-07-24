const mongoose = require('mongoose');

const faceAuditLogSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    actionType: { type: String, enum: ['pre_exam_verify', 'live_proctor'], required: true },
    distance: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    snapshot: { type: String, default: '' }, // Contains base64 image or file reference
  },
  { timestamps: true }
);

faceAuditLogSchema.index({ studentId: 1, examId: 1 });

module.exports = mongoose.model('FaceAuditLog', faceAuditLogSchema);
