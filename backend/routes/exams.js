const express = require('express');
const {
  createExam,
  updateExam,
  publishExam,
  getExams,
  getExam,
  deleteExam,
} = require('../controllers/examController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

router.use(protect);

router.get('/', getExams);
router.get('/:id', getExam);
router.post('/', roleCheck('faculty'), createExam);
router.put('/:id', roleCheck('faculty'), updateExam);
router.patch('/:id/publish', roleCheck('faculty'), publishExam);
router.delete('/:id', roleCheck('faculty'), deleteExam);

module.exports = router;
