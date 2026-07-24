const express = require('express');
const {
  createViolations,
  createViolation,
  getSessionViolations,
  getAllViolations,
  reviewViolation,
} = require('../controllers/violationController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

router.use(protect);

router.post('/', createViolation);
router.post('/batch', createViolations);
router.get('/', roleCheck('faculty'), getAllViolations);
router.get('/session/:sessionId', getSessionViolations);
router.patch('/batch-review', roleCheck('faculty', 'admin', 'superadmin'), require('../controllers/violationController').batchReview);
router.patch('/:id/review', roleCheck('faculty'), reviewViolation);

module.exports = router;
