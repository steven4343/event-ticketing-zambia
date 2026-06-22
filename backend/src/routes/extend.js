const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const {
  joinWaitlist, leaveWaitlist, getMyWaitlist,
  getMyAffiliate, getAffiliateOrders,
  getMySubscription, subscribe, cancelSubscription,
  requestRefund, processRefund, listRefunds,
  listPendingOrganizers, reviewOrganizer,
  updateMyProfile,
  updateOrganizerCommission,
  updatePlatformSettings,
  toggleTicketType,
} = require('../controllers/extendController');

const router = Router();

/* Waitlist */
router.post('/waitlist', authenticate, joinWaitlist);
router.delete('/waitlist/:id', authenticate, leaveWaitlist);
router.get('/waitlist', authenticate, getMyWaitlist);

/* Affiliate */
router.get('/affiliate', authenticate, getMyAffiliate);
router.get('/affiliate/orders', authenticate, getAffiliateOrders);

/* Subscriptions */
router.get('/subscription', authenticate, authorize('organizer'), getMySubscription);
router.post('/subscription', authenticate, authorize('organizer'), subscribe);
router.delete('/subscription', authenticate, authorize('organizer'), cancelSubscription);

/* Refunds */
router.post('/refunds', authenticate, requestRefund);
router.get('/refunds', authenticate, authorize('super_admin'), listRefunds);
router.patch('/refunds/:id', authenticate, authorize('super_admin'), processRefund);

/* Organizer approval (FR-005) */
router.get('/admin/organizers', authenticate, authorize('super_admin'), listPendingOrganizers);
router.patch('/admin/organizers/:id/review', authenticate, authorize('super_admin'), reviewOrganizer);

/* Organizer profile / bank details (FR-006) */
router.put('/profile', authenticate, updateMyProfile);
router.get('/profile', authenticate, async (req, res) => {
  const pool = require('../config/database');
  const user = await pool.query('SELECT id, name, email, phone, role, organizer_status FROM users WHERE id = $1', [req.user.id]);
  const bank = await pool.query('SELECT * FROM bank_details WHERE user_id = $1', [req.user.id]);
  res.json({ user: user.rows[0], bank_details: bank.rows[0] || null });
});

/* Per-organizer commission (FR-054) */
router.patch('/admin/organizers/:id/commission', authenticate, authorize('super_admin'), updateOrganizerCommission);

/* Platform settings update */
router.put('/admin/settings', authenticate, authorize('super_admin'), updatePlatformSettings);

/* Ticket type toggle (FR-030) */
router.patch('/ticket-types/:id/toggle', authenticate, authorize('organizer'), toggleTicketType);

module.exports = router;
