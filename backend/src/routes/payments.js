const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const { requestPayment, getPaymentStatus } = require('../controllers/paymentController');

const router = Router();

router.post('/request', authenticate, requestPayment);
router.get('/status/:order_id', authenticate, getPaymentStatus);

module.exports = router;
