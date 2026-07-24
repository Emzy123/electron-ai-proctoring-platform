const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const tenantController = require('../controllers/tenantController');

router.post('/', protect, roleCheck('superadmin', 'admin'), tenantController.createTenant);
router.get('/', protect, roleCheck('superadmin', 'admin'), tenantController.listTenants);
router.get('/:id', protect, roleCheck('superadmin', 'admin'), tenantController.getTenant);
router.patch('/:tenantId/users/:userId', protect, roleCheck('superadmin', 'admin'), tenantController.assignUserToTenant);

module.exports = router;
