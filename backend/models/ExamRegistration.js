const mongoose = require('mongoose');

const examRegistrationSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    slot: {
      startTime: { type: Date },
      endTime: { type: Date },
    },
    assignedProctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    admitToken: { type: String, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

examRegistrationSchema.index({ studentId: 1, examId: 1 }, { unique: true });

module.exports = mongoose.model('ExamRegistration', examRegistrationSchema);
