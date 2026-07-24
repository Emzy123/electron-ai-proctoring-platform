const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { auditLog } = require('../middleware/auditLog');
const adminController = require('../controllers/adminController');

router.get('/audit-logs', protect, roleCheck('admin', 'superadmin'), adminController.getAuditLogs);
router.get('/metrics', protect, roleCheck('admin', 'superadmin', 'faculty'), adminController.getMetrics);
router.get('/face-audits', protect, roleCheck('admin', 'superadmin', 'faculty'), adminController.getFaceAudits);
router.post('/broadcast', protect, roleCheck('admin', 'superadmin'), auditLog('admin:broadcast', 'system'), adminController.broadcast);
router.get('/users/:userId/export', protect, roleCheck('admin', 'superadmin'), adminController.exportUserData);
router.delete('/users/:userId/data', protect, roleCheck('admin', 'superadmin'), auditLog('user:delete', 'user'), adminController.deleteUserData);

module.exports = router;
