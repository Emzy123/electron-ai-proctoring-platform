const Violation = require('../models/Violation');

exports.createViolations = async (req, res) => {
  try {
    const { violations } = req.body;
    if (!Array.isArray(violations) || violations.length === 0) {
      return res.status(400).json({ message: 'Violations array required' });
    }

    const Session = require('../models/Session');
    const enriched = [];

    for (const v of violations) {
      const session = await Session.findById(v.sessionId);
      if (!session) continue;
      enriched.push({
        sessionId: v.sessionId,
        studentId: session.studentId,
        examId: session.examId,
        type: v.type,
        timestamp: v.timestamp || new Date(),
        snapshot: v.snapshot || '',
        warningShown: true,
      });
    }

    const created = enriched.length ? await Violation.insertMany(enriched) : [];
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createViolation = async (req, res) => {
  try {
    const Session = require('../models/Session');
    const { sessionId, type, snapshot, timestamp } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const violation = await Violation.create({
      sessionId,
      studentId: session.studentId,
      examId: session.examId,
      type,
      snapshot: snapshot || '',
      timestamp: timestamp || new Date(),
      warningShown: true,
    });
    res.status(201).json(violation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSessionViolations = async (req, res) => {
  try {
    const violations = await Violation.find({ sessionId: req.params.sessionId })
      .populate('studentId', 'name matricNo')
      .sort({ timestamp: -1 });
    res.json(violations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllViolations = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.facultyReviewStatus = req.query.status;
    const violations = await Violation.find(filter)
      .populate('studentId', 'name matricNo')
      .populate('examId', 'title courseCode')
      .sort({ timestamp: -1 });
    res.json(violations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.batchReview = async (req, res) => {
  try {
    const { ids, status, comment, reviewBatchId } = req.body;
    if (!Array.isArray(ids) || !status) {
      return res.status(400).json({ message: 'ids array and status required' });
    }

    const batchId = reviewBatchId || `batch-${Date.now()}`;
    const result = await Violation.updateMany(
      { _id: { $in: ids } },
      { facultyReviewStatus: status, facultyComment: comment || '', reviewBatchId: batchId }
    );

    res.json({ modified: result.modifiedCount, reviewBatchId: batchId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reviewViolation = async (req, res) => {
  try {
    const { status, comment } = req.body;
    const violation = await Violation.findById(req.params.id);
    if (!violation) return res.status(404).json({ message: 'Violation not found' });

    violation.facultyReviewStatus = status;
    violation.facultyComment = comment || '';
    await violation.save();
    res.json(violation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
