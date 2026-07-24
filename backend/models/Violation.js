const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    type: {
      type: String,
      enum: [
        'face_missing', 'multiple_faces', 'gaze_away', 'tab_switch',
        'copy_paste', 'fullscreen_exit', 'face_verify_failed',
        'security_check_failed', 'object_detected', 'speech_detected',
      ],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    snapshot: { type: String },
    evidenceUrl: { type: String },
    frameTimestamps: [{ type: Date }],
    aiConfidence: { type: Number, min: 0, max: 1 },
    warningShown: { type: Boolean, default: false },
    facultyReviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'dismissed'],
      default: 'pending',
    },
    facultyComment: { type: String, default: '' },
    reviewBatchId: { type: String },
  },
  { timestamps: true }
);

violationSchema.index({ sessionId: 1, timestamp: -1 });
violationSchema.index({ tenantId: 1, facultyReviewStatus: 1 });

module.exports = mongoose.model('Violation', violationSchema);
