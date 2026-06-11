const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const { getMyNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');

const router = Router();

router.use(authenticate);

router.get('/', getMyNotifications);
router.patch('/:id/read', markAsRead);
router.post('/read-all', markAllAsRead);

module.exports = router;
