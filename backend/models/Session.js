const mongoose = require('mongoose');

const hashChainEntrySchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  hash: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const monitoringConsentSchema = new mongoose.Schema({
  signedAt: { type: Date },
  ipAddress: { type: String },
  agreementVersion: { type: String, default: '1.0' },
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedOption: { type: Number },
  isCorrect: { type: Boolean },
  encryptedPayload: { type: String },
});

const sessionSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'flagged', 'auto-submitted'],
      default: 'in-progress',
    },
    shuffledQuestionOrder: [{ type: mongoose.Schema.Types.ObjectId }],
    answers: [answerSchema],
    score: { type: Number },
    scoreReleased: { type: Boolean, default: false },
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'offline'],
      default: 'synced',
    },
    lastHeartbeat: { type: Date },
    lastSnapshot: { type: String },
    answerHashChain: [hashChainEntrySchema],
    finalIntegrityHash: { type: String },
    manifestSignature: { type: String },
    sessionSalt: { type: String },
    monitoringConsent: monitoringConsentSchema,
    encryptedAnswersBlob: { type: String },
    integrityVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

sessionSchema.index({ studentId: 1, examId: 1 });
sessionSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
