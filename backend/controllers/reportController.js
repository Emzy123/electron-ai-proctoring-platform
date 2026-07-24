const Session = require('../models/Session');
const Exam = require('../models/Exam');
const Violation = require('../models/Violation');
const { generateSessionCSV } = require('../utils/csvExport');
const { generateSessionPDF } = require('../utils/pdfExport');

exports.exportCSV = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate('studentId', 'name matricNo');
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const exam = await Exam.findById(session.examId);
    const violations = await Violation.find({ sessionId: session._id });

    const csv = generateSessionCSV(session, exam, violations);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=report-${session._id}.csv`
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.exportPDF = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate('studentId', 'name matricNo');
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const exam = await Exam.findById(session.examId);
    const violations = await Violation.find({ sessionId: session._id });

    const pdfBuffer = generateSessionPDF(session, exam, violations);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=report-${session._id}.pdf`
    );
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExamResults = async (req, res) => {
  try {
    const sessions = await Session.find({
      examId: req.params.examId,
      status: 'submitted',
    })
      .populate('studentId', 'name matricNo email')
      .sort({ score: -1 });

    const results = await Promise.all(
      sessions.map(async (s) => {
        const violationCount = await Violation.countDocuments({ sessionId: s._id });
        const flaggedCount = await Violation.countDocuments({
          sessionId: s._id,
          facultyReviewStatus: 'approved',
        });
        return {
          session: s,
          violationCount,
          flaggedCount,
        };
      })
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
