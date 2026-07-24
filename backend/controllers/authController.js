const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

const generateAccessToken = (userId, role, tenantId) =>
  jwt.sign({ userId, role, tenantId }, process.env.JWT_SECRET, { expiresIn: '15m' });

const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId, token, expiresAt });
  return token;
};

exports.register = async (req, res) => {
  try {
    const { name, email, matricNo, password, faceDescriptor, faceImage } = req.body;

    if (!name || !email || !matricNo || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ message: 'Valid face descriptor (128 floats) is required' });
    }

    const existing = await User.findOne({ $or: [{ email }, { matricNo }] });
    if (existing) {
      return res.status(400).json({ message: 'Email or matric number already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      matricNo,
      passwordHash,
      faceDescriptor,
      faceImage: faceImage || '',
      role: 'student',
    });

    const accessToken = generateAccessToken(user._id, user.role, user.tenantId);
    const refreshToken = await generateRefreshToken(user._id);

    res.status(201).json({
      token: accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        matricNo: user.matricNo,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { matricNo: identifier }],
      deletedAt: null,
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user._id, user.role, user.tenantId);
    const refreshToken = await generateRefreshToken(user._id);

    res.json({
      token: accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        matricNo: user.matricNo,
        role: user.role,
        faceDescriptor: user.role === 'student' ? user.faceDescriptor : undefined,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    const stored = await RefreshToken.findOne({ token: refreshToken, revoked: false });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(stored.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    stored.revoked = true;
    await stored.save();

    const accessToken = generateAccessToken(user._id, user.role, user.tenantId);
    const newRefreshToken = await generateRefreshToken(user._id);

    res.json({ token: accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    matricNo: req.user.matricNo,
    role: req.user.role,
    faceDescriptor: req.user.role === 'student' ? req.user.faceDescriptor : undefined,
    monitoringConsent: req.user.role === 'student' ? req.user.monitoringConsent : undefined,
  });
};

exports.signConsent = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.monitoringConsent = {
      signedAt: new Date(),
      agreementVersion: req.body.agreementVersion || '1.0',
    };
    await user.save();
    res.json({
      message: 'Proctoring privacy consent signed successfully.',
      monitoringConsent: user.monitoringConsent,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateAccessToken = generateAccessToken;
