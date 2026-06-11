const pool = require('../config/database');
const { processMTNPayment } = require('../services/mtn');
const { processAirtelPayment } = require('../services/airtel');
const { processZamtelPayment } = require('../services/zamtel');

const requestPayment = async (req, res, next) => {
  try {
    const { order_id, provider, amount, phone } = req.body;

    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    let result;
    if (provider === 'mtn') {
      result = await processMTNPayment(phone, amount, reference);
    } else if (provider === 'airtel') {
      result = await processAirtelPayment(phone, amount, reference);
    } else if (provider === 'zamtel') {
      result = await processZamtelPayment(phone, amount, reference);
    } else {
      return res.status(400).json({ error: 'Invalid payment provider' });
    }

    if (result.success) {
      res.json({ message: 'Payment request sent', transaction_id: result.transactionId });
    } else {
      res.status(500).json({ error: 'Payment request failed' });
    }
  } catch (error) {
    next(error);
  }
};

const getPaymentStatus = async (req, res, next) => {
  try {
    const { order_id } = req.params;

    const result = await pool.query(
      'SELECT id, payment_status, transaction_reference FROM orders WHERE id = $1',
      [order_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

module.exports = { requestPayment, getPaymentStatus };
