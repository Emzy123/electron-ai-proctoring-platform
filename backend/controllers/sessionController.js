const Exam = require('../models/Exam');
const Session = require('../models/Session');
const Violation = require('../models/Violation');
const User = require('../models/User');
const FaceAuditLog = require('../models/FaceAuditLog');
const ExamRegistration = require('../models/ExamRegistration');
const { generateSessionSalt, computeHashChain } = require('../shared/crypto');

// Fisher-Yates shuffle for per-student question order
const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const gradeSession = (exam, session) => {
  let correct = 0;
  const answers = session.answers.map((ans) => {
    const question = exam.questions.id(ans.questionId);
    const isCorrect = question && ans.selectedOption === question.correctAnswer;
    if (isCorrect) correct++;
    return { ...ans.toObject(), isCorrect };
  });
  const score = exam.questions.length
    ? Math.round((correct / exam.questions.length) * 100)
    : 0;
  return { answers, score };
};

exports.startSession = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam || !exam.isPublished) {
      return res.status(404).json({ message: 'Exam not available' });
    }

    // Verify student is registered and approved for this exam
    const registration = await ExamRegistration.findOne({
      studentId: req.user._id,
      examId: exam._id,
      status: 'approved',
    });

    if (!registration) {
      return res.status(403).json({
        message: 'Access denied: You must register and be approved by faculty to take this exam.',
      });
    }

    // Check slot time window if registration has an assigned slot
    if (registration.slot && registration.slot.startTime && registration.slot.endTime) {
      const nowTime = new Date();
      if (nowTime < new Date(registration.slot.startTime) || nowTime > new Date(registration.slot.endTime)) {
        return res.status(403).json({
          message: `Access denied: Your assigned exam slot is from ${new Date(registration.slot.startTime).toLocaleTimeString()} to ${new Date(registration.slot.endTime).toLocaleTimeString()}.`,
        });
      }
    }

    const { faceDescriptor, faceImage } = req.body;
    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ message: 'Face descriptor (128 floats) is required to start the exam.' });
    }

    const student = await User.findById(req.user._id);
    if (!student || !student.faceDescriptor || student.faceDescriptor.length !== 128) {
      return res.status(400).json({ message: 'No stored face profile found. Please register your face.' });
    }

    // Server-side Euclidean distance calculation
    let sum = 0;
    for (let i = 0; i < 128; i++) {
      sum += Math.pow(student.faceDescriptor[i] - faceDescriptor[i], 2);
    }
    const distance = Math.sqrt(sum);
    const passed = distance < 0.6; // FACE_MATCH_THRESHOLD

    // Record verification attempt in FaceAuditLog
    await FaceAuditLog.create({
      studentId: req.user._id,
      examId: exam._id,
      actionType: 'pre_exam_verify',
      distance,
      passed,
      snapshot: faceImage || '',
    });

    if (!passed) {
      // Record face verification failure as a violation
      await Violation.create({
        studentId: req.user._id,
        examId: exam._id,
        type: 'face_verify_failed',
        timestamp: new Date(),
        facultyReviewStatus: 'pending',
      });
      return res.status(403).json({ message: `Face verification failed (distance: ${distance.toFixed(2)}). Access denied.` });
    }

    const now = new Date();
    if (now < new Date(exam.scheduledDate)) {
      return res.status(400).json({ message: 'Exam has not started yet' });
    }

    const existing = await Session.findOne({
      studentId: req.user._id,
      examId: exam._id,
      status: 'in-progress',
    });
    if (existing) {
      const questions = existing.shuffledQuestionOrder.map((qId) => {
        const q = exam.questions.id(qId);
        return { _id: q._id, text: q.text, options: q.options };
      });
      return res.json({ session: existing, questions });
    }

    const questionIds = exam.questions.map((q) => q._id);
    const shuffled = shuffleArray(questionIds);

    const session = await Session.create({
      studentId: req.user._id,
      examId: exam._id,
      shuffledQuestionOrder: shuffled,
      lastHeartbeat: now,
      sessionSalt: generateSessionSalt(),
    });

    const questions = shuffled.map((qId) => {
      const q = exam.questions.id(qId);
      return { _id: q._id, text: q.text, options: q.options };
    });

    res.status(201).json({ session, questions, duration: exam.duration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.saveAnswer = async (req, res) => {
  try {
    const { questionId, selectedOption, encryptedPayload } = req.body;
    const session = await Session.findById(req.params.id);

    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.status !== 'in-progress') {
      return res.status(400).json({ message: 'Session already submitted' });
    }
    if (session.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const idx = session.answers.findIndex(
      (a) => a.questionId.toString() === questionId
    );
    if (idx >= 0) {
      session.answers[idx].selectedOption = selectedOption;
      if (encryptedPayload) session.answers[idx].encryptedPayload = encryptedPayload;
    } else {
      session.answers.push({ questionId, selectedOption, encryptedPayload });
    }

    if (session.sessionSalt) {
      const { chain, finalHash } = computeHashChain(
        session.answers.map((a) => ({
          questionId: a.questionId.toString(),
          selectedOption: a.selectedOption,
        })),
        session.sessionSalt
      );
      session.answerHashChain = chain;
      session.finalIntegrityHash = finalHash;
    }

    session.syncStatus = 'synced';
    await session.save();

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.syncAnswers = async (req, res) => {
  try {
    const { answers } = req.body;
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    for (const ans of answers) {
      const idx = session.answers.findIndex(
        (a) => a.questionId.toString() === ans.questionId
      );
      if (idx >= 0) {
        session.answers[idx].selectedOption = ans.selectedOption;
      } else {
        session.answers.push(ans);
      }
    }
    session.syncStatus = 'synced';
    await session.save();
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (session.status === 'submitted') {
      return res.json(session);
    }

    const exam = await Exam.findById(session.examId);
    const { answers, score } = gradeSession(exam, session);

    session.answers = answers;
    session.score = score;
    session.status = 'submitted';
    session.endTime = new Date();
    session.syncStatus = 'synced';
    await session.save();

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('studentId', 'name email matricNo')
      .populate('examId', 'title courseCode duration questions');

    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isOwner = session.studentId._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Hide score if not released for students
    const result = session.toObject();
    if (isOwner && !session.scoreReleased && req.user.role === 'student') {
      delete result.score;
      result.answers = result.answers.map((a) => ({
        questionId: a.questionId,
        selectedOption: a.selectedOption,
      }));
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({ studentId: req.user._id })
      .populate('examId', 'title courseCode')
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getActiveSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ status: 'in-progress' })
      .populate('studentId', 'name matricNo')
      .populate('examId', 'title courseCode duration');
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyFace = async (req, res) => {
  try {
    const { distance, passed } = req.body;
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (!passed) {
      await Violation.create({
        sessionId: session._id,
        studentId: session.studentId,
        examId: session.examId,
        type: 'face_verify_failed',
        warningShown: true,
      });
      return res.status(403).json({ message: 'Face verification failed', distance });
    }

    res.json({ message: 'Face verified', distance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.releaseScore = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    session.scoreReleased = req.body.release ?? true;
    await session.save();
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
