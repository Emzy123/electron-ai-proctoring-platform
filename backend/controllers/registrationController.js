const ExamRegistration = require('../models/ExamRegistration');
const Exam = require('../models/Exam');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to sign the secure Admit Token
const generateAdmitToken = (registration) => {
  return jwt.sign(
    {
      registrationId: registration._id,
      studentId: registration.studentId,
      examId: registration.examId,
      slot: registration.slot,
      status: 'approved',
    },
    process.env.JWT_SECRET || 'change-this-to-a-secure-random-string',
    { expiresIn: '30d' }
  );
};

// 1. Student registers for an exam
exports.registerForExam = async (req, res) => {
  try {
    const { examId, slotId } = req.body;
    const studentId = req.user._id;

    // A. Verify exam exists and is published
    const exam = await Exam.findById(examId);
    if (!exam || !exam.isPublished) {
      return res.status(404).json({ message: 'Exam not available for registration.' });
    }

    // B. Check eligibility: biometrics (face profile)
    const student = await User.findById(studentId);
    if (!student || !student.faceDescriptor || student.faceDescriptor.length !== 128) {
      return res.status(400).json({ message: 'Registration locked: Please register your face profile (biometrics) first.' });
    }

    // C. Check eligibility: monitoring consent
    if (!student.monitoringConsent || !student.monitoringConsent.signedAt) {
      return res.status(400).json({ message: 'Registration locked: Please sign the proctoring privacy consent first.' });
    }

    // D. Check if already registered
    const existing = await ExamRegistration.findOne({ studentId, examId });
    if (existing) {
      return res.status(400).json({ message: 'You have already registered for this exam.' });
    }

    // E. Slot allocation & capacity checks
    let selectedSlot = null;
    if (slotId && exam.slots && exam.slots.length > 0) {
      const slotObj = exam.slots.id(slotId);
      if (!slotObj) {
        return res.status(400).json({ message: 'Invalid slot selection.' });
      }

      // Check slot capacity limit
      if (slotObj.capacity > 0) {
        const currentCount = await ExamRegistration.countDocuments({
          examId,
          status: { $ne: 'rejected' },
          'slot.startTime': slotObj.startTime,
          'slot.endTime': slotObj.endTime,
        });
        if (currentCount >= slotObj.capacity) {
          return res.status(400).json({ message: 'This seating/time slot is fully booked. Please choose another.' });
        }
      }
      selectedSlot = { startTime: slotObj.startTime, endTime: slotObj.endTime };
    }

    // F. Verify overall capacity limit
    if (exam.maxCapacity > 0) {
      const currentOverall = await ExamRegistration.countDocuments({
        examId,
        status: { $ne: 'rejected' },
      });
      if (currentOverall >= exam.maxCapacity) {
        return res.status(400).json({ message: 'This exam has reached its maximum enrollment capacity.' });
      }
    }

    // G. Create registration
    const registration = await ExamRegistration.create({
      studentId,
      examId,
      status: 'pending',
      slot: selectedSlot,
    });

    res.status(201).json({
      message: 'Registration request submitted successfully.',
      registration,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Student retrieves their registered exams
exports.getMyRegistrations = async (req, res) => {
  try {
    const registrations = await ExamRegistration.find({ studentId: req.user._id })
      .populate('examId', 'title courseCode duration scheduledDate')
      .sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Faculty views requests for a specific exam
exports.getRegistrationsForExam = async (req, res) => {
  try {
    const registrations = await ExamRegistration.find({ examId: req.params.examId })
      .populate('studentId', 'name email matricNo')
      .sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Faculty approves/rejects registration
exports.reviewRegistration = async (req, res) => {
  try {
    const { registrationId, status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status review action.' });
    }

    const registration = await ExamRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration request not found.' });
    }

    registration.status = status;
    registration.approvedBy = req.user._id;

    if (status === 'approved') {
      registration.admitToken = generateAdmitToken(registration);
    } else {
      registration.admitToken = '';
    }

    await registration.save();
    res.json({ message: `Registration successfully ${status}.`, registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. Faculty bulk enrolls students (instant approval)
exports.bulkEnrollStudents = async (req, res) => {
  try {
    const { examId, matricNumbers, slotId } = req.body;
    if (!Array.isArray(matricNumbers) || matricNumbers.length === 0) {
      return res.status(400).json({ message: 'Array of matric numbers is required.' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    // Resolve slot if chosen
    let selectedSlot = null;
    if (slotId && exam.slots && exam.slots.length > 0) {
      const slotObj = exam.slots.id(slotId);
      if (slotObj) {
        selectedSlot = { startTime: slotObj.startTime, endTime: slotObj.endTime };
      }
    }

    const enrolled = [];
    const skipped = [];

    for (const matric of matricNumbers) {
      const trimmedMatric = matric.trim();
      const student = await User.findOne({ matricNo: trimmedMatric, role: 'student' });
      
      if (!student) {
        skipped.push({ matric: trimmedMatric, reason: 'Matriculation number not found.' });
        continue;
      }

      // Check if already registered
      const existing = await ExamRegistration.findOne({ studentId: student._id, examId });
      if (existing) {
        skipped.push({ matric: trimmedMatric, reason: 'Already registered.' });
        continue;
      }

      // Create pre-approved registration
      const newReg = new ExamRegistration({
        studentId: student._id,
        examId,
        status: 'approved',
        slot: selectedSlot,
        approvedBy: req.user._id,
      });
      newReg.admitToken = generateAdmitToken(newReg);
      await newReg.save();

      enrolled.push({
        matric: trimmedMatric,
        name: student.name,
        registrationId: newReg._id,
      });
    }

    res.json({
      message: 'Bulk enrollment process completed.',
      enrolledCount: enrolled.length,
      skippedCount: skipped.length,
      enrolled,
      skipped,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
