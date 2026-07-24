const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { validate, schemas } = require('../middleware/validate');
const evidenceController = require('../controllers/evidenceController');

router.post('/:id/evidence/frame', protect, validate(schemas.evidenceFrame), evidenceController.uploadFrame);
router.post('/:id/evidence/violation', protect, evidenceController.uploadViolationEvidence);
router.get('/:id/evidence/:studentId', protect, roleCheck('faculty', 'proctor', 'admin', 'superadmin'), evidenceController.getEvidence);
router.get('/:id/forensic-package/:studentId', protect, roleCheck('faculty', 'admin', 'superadmin'), evidenceController.getForensicPackage);

module.exports = router;
