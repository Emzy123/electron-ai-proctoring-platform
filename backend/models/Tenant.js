const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  domain: { type: String, unique: true },
  settings: {
    rateLimitQuota: { type: Number, default: 1000 },
    dataRetentionDays: { type: Number, default: 365 },
    monitoringRequired: { type: Boolean, default: true },
  },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Tenant', tenantSchema);
