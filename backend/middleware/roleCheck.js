const ROLE_PERMISSIONS = {
  superadmin: ['*'],
  admin: ['tenant:manage', 'user:manage', 'exam:*', 'violation:*', 'report:*', 'audit:read'],
  faculty: ['exam:create', 'exam:update', 'exam:publish', 'violation:review', 'report:read', 'monitor:live'],
  proctor: ['monitor:live', 'violation:view', 'student:warn'],
  student: ['exam:take', 'session:own'],
};

const roleCheck = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (roles.includes(req.user.role)) return next();
  return res.status(403).json({ message: 'Insufficient permissions' });
};

const permissionCheck = (permission) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  const perms = ROLE_PERMISSIONS[req.user.role] || req.user.permissions || [];
  if (perms.includes('*') || perms.includes(permission)) return next();
  const wildcard = permission.split(':')[0] + ':*';
  if (perms.includes(wildcard)) return next();
  return res.status(403).json({ message: 'Insufficient permissions' });
};

module.exports = roleCheck;
module.exports.roleCheck = roleCheck;
module.exports.permissionCheck = permissionCheck;
module.exports.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
