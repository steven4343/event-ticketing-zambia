const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const { paymentCallback } = require('../controllers/ticketController');

const router = Router();

router.post('/complete-payment/:order_id', authenticate, async (req, res, next) => {
  req.body = {
    transaction_id: `DEV-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    status: 'completed',
    provider: 'dev',
    order_id: req.params.order_id,
  };
  paymentCallback(req, res, next);
});

module.exports = router;
