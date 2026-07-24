const Tenant = require('../models/Tenant');
const User = require('../models/User');

exports.createTenant = async (req, res) => {
  try {
    const { name, domain, settings } = req.body;
    const tenant = await Tenant.create({ name, domain, settings });
    res.status(201).json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find({ active: true });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.assignUserToTenant = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { tenantId: req.params.tenantId },
      { new: true }
    ).select('-passwordHash');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
