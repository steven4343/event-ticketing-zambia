const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const {
  getDashboardStats, listUsers, updateUserStatus,
  listAllEvents, getCommissions, markCommissionPaid, getPlatformSettings
} = require('../controllers/adminController');

const router = Router();

router.use(authenticate, authorize('super_admin'));

router.get('/stats', getDashboardStats);
router.get('/users', listUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/events', listAllEvents);
router.get('/commissions', getCommissions);
router.patch('/commissions/:id/pay', markCommissionPaid);
router.get('/settings', getPlatformSettings);

module.exports = router;
