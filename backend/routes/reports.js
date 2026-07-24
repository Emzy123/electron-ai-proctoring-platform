const express = require('express');
const {
  exportCSV,
  exportPDF,
  getExamResults,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

router.use(protect);
router.use(roleCheck('faculty'));

router.get('/exam/:examId/results', getExamResults);
router.get('/session/:sessionId/csv', exportCSV);
router.get('/session/:sessionId/pdf', exportPDF);

module.exports = router;
