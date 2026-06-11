const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const { purchase, paymentCallback, getMyTickets } = require('../controllers/ticketController');

const router = Router();

router.post('/purchase', authenticate, purchase);
router.post('/payment-callback', paymentCallback);
router.get('/my-tickets', authenticate, getMyTickets);

module.exports = router;
