const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const securityController = require('../controllers/securityController');

router.post('/verify-manifest', protect, validate(schemas.verifyManifest), securityController.verifyManifest);
router.post('/submit-hashchain', protect, validate(schemas.submitHashChain), securityController.submitHashChain);
router.get('/verify-integrity/:id', protect, securityController.verifyIntegrity);
router.post('/consent', protect, securityController.recordConsent);
router.get('/manifest/:examId', protect, securityController.generateManifest);

module.exports = router;
