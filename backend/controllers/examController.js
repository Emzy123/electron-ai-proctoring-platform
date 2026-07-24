const Exam = require('../models/Exam');

// Strip correct answers for student view
const sanitizeExamForStudent = (exam) => {
  const obj = exam.toObject ? exam.toObject() : exam;
  return {
    ...obj,
    questions: obj.questions.map((q) => ({
      _id: q._id,
      text: q.text,
      options: q.options,
    })),
  };
};

exports.createExam = async (req, res) => {
  try {
    const { title, courseCode, duration, scheduledDate, questions } = req.body;
    const exam = await Exam.create({
      title,
      courseCode,
      duration,
      scheduledDate,
      questions: questions || [],
      createdBy: req.user._id,
    });
    res.status(201).json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, courseCode, duration, scheduledDate, questions } = req.body;
    if (title) exam.title = title;
    if (courseCode) exam.courseCode = courseCode;
    if (duration) exam.duration = duration;
    if (scheduledDate) exam.scheduledDate = scheduledDate;
    if (questions) exam.questions = questions;

    await exam.save();
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.publishExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    exam.isPublished = req.body.isPublished ?? !exam.isPublished;
    await exam.save();
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExams = async (req, res) => {
  try {
    const filter = req.user.role === 'faculty' ? {} : { isPublished: true };
    const exams = await Exam.find(filter)
      .populate('createdBy', 'name email')
      .sort({ scheduledDate: -1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('createdBy', 'name');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    if (req.user.role === 'student') {
      return res.json(sanitizeExamForStudent(exam));
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    await exam.deleteOne();
    res.json({ message: 'Exam deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
