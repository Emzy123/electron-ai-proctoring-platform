const crypto = require('crypto');
const Session = require('../models/Session');
const Exam = require('../models/Exam');
const {
  verifyManifestSignature,
  verifyHashChain,
  generateSessionSalt,
  signManifest,
} = require('../shared/crypto');

exports.verifyManifest = async (req, res) => {
  try {
    const { manifest, signature, sessionId } = req.body;
    const valid = verifyManifestSignature(manifest, signature);
    if (!valid) {
      return res.status(403).json({ message: 'Invalid exam manifest signature' });
    }

    if (sessionId) {
      const session = await Session.findById(sessionId);
      if (session && session.studentId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      if (session) {
        session.manifestSignature = signature;
        session.sessionSalt = session.sessionSalt || generateSessionSalt();
        await session.save();
      }
    }

    res.json({
      valid: true,
      sessionSalt: sessionId ? (await Session.findById(sessionId))?.sessionSalt : generateSessionSalt(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitHashChain = async (req, res) => {
  try {
    const { sessionId, hashChain, finalHash } = req.body;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    session.answerHashChain = hashChain;
    session.finalIntegrityHash = finalHash;
    await session.save();

    res.json({ message: 'Hash chain submitted', finalHash });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyIntegrity = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isOwner = session.studentId.toString() === req.user._id.toString();
    if (!isOwner && !['faculty', 'admin', 'superadmin', 'proctor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!session.finalIntegrityHash || !session.sessionSalt) {
      return res.json({ verified: false, message: 'No integrity data' });
    }

    const answers = session.answers.map((a) => ({
      questionId: a.questionId.toString(),
      selectedOption: a.selectedOption,
    }));

    const verified = verifyHashChain(
      answers,
      session.sessionSalt,
      session.answerHashChain,
      session.finalIntegrityHash
    );

    session.integrityVerified = verified;
    await session.save();

    res.json({ verified, finalHash: session.finalIntegrityHash });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.recordConsent = async (req, res) => {
  try {
    const { sessionId, agreementVersion } = req.body;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    session.monitoringConsent = {
      signedAt: new Date(),
      ipAddress: req.ip,
      agreementVersion: agreementVersion || '1.0',
    };
    await session.save();
    res.json({ message: 'Monitoring consent recorded' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateManifest = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const manifest = {
      examId: exam._id,
      title: exam.title,
      questionCount: exam.questions.length,
      duration: exam.duration,
      generatedAt: new Date().toISOString(),
    };

    const signature = signManifest(manifest);

    res.json({ manifest, signature });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
