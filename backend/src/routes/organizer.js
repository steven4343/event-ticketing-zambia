const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const { getStats, exportAttendees, getSalesReport } = require('../controllers/organizerController');

const router = Router();

router.use(authenticate, authorize('organizer'));

router.get('/stats', getStats);
router.get('/export/:event_id', exportAttendees);
router.get('/sales/:event_id', getSalesReport);

module.exports = router;
