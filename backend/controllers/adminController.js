const AuditLog = require('../models/AuditLog');
const Session = require('../models/Session');
const Violation = require('../models/Violation');
const User = require('../models/User');
const FaceAuditLog = require('../models/FaceAuditLog');
const { getRedis } = require('../middleware/nonce');

exports.getAuditLogs = async (req, res) => {
  try {
    const filter = {};
    if (req.user.tenantId) filter.tenantId = req.user.tenantId;
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 100)
      .populate('userId', 'name email role');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMetrics = async (req, res) => {
  try {
    const [activeSessions, pendingViolations, totalUsers] = await Promise.all([
      Session.countDocuments({ status: 'in-progress' }),
      Violation.countDocuments({ facultyReviewStatus: 'pending' }),
      User.countDocuments({ deletedAt: null }),
    ]);

    res.json({
      activeSessions,
      pendingViolations,
      totalUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.broadcast = async (req, res) => {
  try {
    const { message, type = 'alert' } = req.body;
    const io = req.app.get('io');
    if (io) {
      io.emit('admin:broadcast', { message, type, timestamp: new Date().toISOString() });
    }

    const redis = getRedis();
    await redis.connect().catch(() => {});
    await redis.publish('admin:broadcast', JSON.stringify({ message, type }));

    res.json({ message: 'Broadcast sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.exportUserData = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const sessions = await Session.find({ studentId: user._id });
    const violations = await Violation.find({ studentId: user._id });

    res.json({
      user,
      sessions,
      violations,
      exportedAt: new Date().toISOString(),
      regulation: 'NDPR',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUserData = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.deletedAt = new Date();
    user.email = `deleted-${user._id}@anonymized.local`;
    user.name = 'Deleted User';
    user.faceDescriptor = [];
    user.faceImage = '';
    await user.save();

    res.json({ message: 'User data anonymized per NDPR request' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFaceAudits = async (req, res) => {
  try {
    const filter = {};
    if (req.query.studentId) filter.studentId = req.query.studentId;
    if (req.query.examId) filter.examId = req.query.examId;

    const audits = await FaceAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .populate('studentId', 'name email matricNo')
      .populate('examId', 'title courseCode');

    res.json(audits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
