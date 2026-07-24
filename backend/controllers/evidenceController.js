const Evidence = require('../models/Evidence');
const Violation = require('../models/Violation');
const Session = require('../models/Session');
const { signPayload, verifyPayloadSignature } = require('../shared/crypto');
const { uploadEvidence, getEvidenceUrl } = require('../shared/storage');
const { publishToQueue } = require('../shared/queue');

exports.uploadFrame = async (req, res) => {
  try {
    const { sessionId, frame, timestamp, signature, nonce } = req.body;
    const examId = req.params.id;

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const payload = { sessionId, frame: '[redacted]', timestamp };
    if (signature && !verifyPayloadSignature({ sessionId, frame, timestamp }, signature)) {
      return res.status(403).json({ message: 'Invalid frame signature' });
    }

    const storageKey = `evidence/${examId}/${sessionId}/${Date.now()}.jpg`;
    await uploadEvidence(storageKey, Buffer.from(frame.replace(/^data:image\/\w+;base64,/, ''), 'base64'));

    const evidence = await Evidence.create({
      examId,
      sessionId,
      studentId: req.user._id,
      type: 'frame',
      storageKey,
      timestamp: new Date(timestamp),
      signature,
      nonce,
    });

    await publishToQueue('frame_queue', {
      evidenceId: evidence._id,
      examId,
      sessionId,
      storageKey,
    });

    res.status(201).json({ id: evidence._id, storageKey });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadViolationEvidence = async (req, res) => {
  try {
    const { sessionId, type, snapshot, timestamp, signature, nonce } = req.body;
    const examId = req.params.id;

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const payload = { sessionId, type, snapshot: '[redacted]', timestamp };
    if (signature && !verifyPayloadSignature({ sessionId, type, snapshot, timestamp }, signature)) {
      return res.status(403).json({ message: 'Invalid violation signature' });
    }

    let storageKey = '';
    if (snapshot) {
      storageKey = `evidence/${examId}/${sessionId}/violation-${Date.now()}.jpg`;
      await uploadEvidence(storageKey, Buffer.from(snapshot.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
    }

    const violation = await Violation.create({
      sessionId,
      studentId: session.studentId,
      examId,
      type,
      snapshot: snapshot ? storageKey : '',
      evidenceUrl: storageKey,
      timestamp: new Date(timestamp || Date.now()),
    });

    await Evidence.create({
      examId,
      sessionId,
      studentId: session.studentId,
      type: 'violation',
      storageKey: storageKey || `violation-${violation._id}`,
      timestamp: new Date(timestamp || Date.now()),
      signature,
      nonce,
      metadata: { violationId: violation._id, type },
    });

    await publishToQueue('violation_queue', {
      violationId: violation._id,
      examId,
      sessionId,
      type,
      storageKey,
    });

    res.status(201).json({ violation, storageKey });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEvidence = async (req, res) => {
  try {
    const { id: examId, studentId } = req.params;
    const evidence = await Evidence.find({ examId, studentId }).sort({ timestamp: -1 });
    const withUrls = await Promise.all(
      evidence.map(async (e) => ({
        ...e.toObject(),
        url: e.storageKey ? await getEvidenceUrl(e.storageKey) : null,
      }))
    );
    res.json(withUrls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getForensicPackage = async (req, res) => {
  try {
    const { id: examId, studentId } = req.params;
    const evidence = await Evidence.find({ examId, studentId });
    const violations = await Violation.find({ examId, studentId });
    const sessions = await Session.find({ examId, studentId });

    res.json({
      examId,
      studentId,
      exportedAt: new Date().toISOString(),
      evidence,
      violations,
      sessions: sessions.map((s) => ({
        id: s._id,
        status: s.status,
        integrityVerified: s.integrityVerified,
        finalIntegrityHash: s.finalIntegrityHash,
        monitoringConsent: s.monitoringConsent,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
