const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const registrationController = require('../controllers/registrationController');

router.post('/register', protect, roleCheck('student'), registrationController.registerForExam);
router.get('/my-registrations', protect, roleCheck('student'), registrationController.getMyRegistrations);
router.get('/exam/:examId', protect, roleCheck('faculty', 'admin', 'superadmin'), registrationController.getRegistrationsForExam);
router.post('/review', protect, roleCheck('faculty', 'admin', 'superadmin'), registrationController.reviewRegistration);
router.post('/bulk-enroll', protect, roleCheck('faculty', 'admin', 'superadmin'), registrationController.bulkEnrollStudents);

module.exports = router;
