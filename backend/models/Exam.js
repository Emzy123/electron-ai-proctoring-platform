const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true },
});

const slotSchema = new mongoose.Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  capacity: { type: Number, default: 0 }, // 0 means unlimited
}, { _id: true });

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    courseCode: { type: String, required: true, trim: true },
    duration: { type: Number, required: true }, // minutes
    scheduledDate: { type: Date, required: true },
    slots: [slotSchema],
    maxCapacity: { type: Number },
    questions: [questionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exam', examSchema);
