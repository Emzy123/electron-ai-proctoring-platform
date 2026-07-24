const express = require('express');
const {
  startSession,
  saveAnswer,
  syncAnswers,
  submitSession,
  getSession,
  getMySessions,
  getActiveSessions,
  verifyFace,
  releaseScore,
} = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

router.use(protect);

router.get('/my', getMySessions);
router.get('/active', roleCheck('faculty'), getActiveSessions);
router.post('/start/:examId', roleCheck('student'), startSession);
router.get('/:id', getSession);
router.patch('/:id/answer', saveAnswer);
router.post('/:id/sync', syncAnswers);
router.post('/:id/submit', submitSession);
router.post('/:id/verify-face', roleCheck('student'), verifyFace);
router.patch('/:id/release', roleCheck('faculty'), releaseScore);

module.exports = router;
