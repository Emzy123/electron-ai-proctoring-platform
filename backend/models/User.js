const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    matricNo: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    faceDescriptor: { type: [Number], default: [] },
    faceImage: { type: String, default: '' },
    role: {
      type: String,
      enum: ['student', 'faculty', 'proctor', 'admin', 'superadmin'],
      default: 'student',
    },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    permissions: [{ type: String }],
    ssoId: { type: String },
    ssoProvider: { type: String },
    monitoringConsent: {
      signedAt: Date,
      agreementVersion: String,
    },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ tenantId: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);
