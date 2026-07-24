const AuditLog = require('../models/AuditLog');

const auditLog = (action, resource) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      AuditLog.create({
        tenantId: req.user?.tenantId,
        userId: req.user?._id,
        action,
        resource,
        resourceId: req.params.id || req.params.examId || req.params.sessionId,
        metadata: { method: req.method, path: req.originalUrl },
        ipAddress: req.ip,
      }).catch(() => {});
    }
    return originalJson(body);
  };
  next();
};

module.exports = { auditLog };
