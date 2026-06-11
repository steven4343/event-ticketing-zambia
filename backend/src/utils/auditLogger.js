const pool = require('../config/database');

const logSecurityEvent = async (eventType, userId, details, ip) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (event_type, user_id, details, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [eventType, userId, JSON.stringify(details), ip]
    );
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
};

const logFailedLogin = (email, ip) =>
  logSecurityEvent('failed_login', null, { email }, ip);

const logSuccessfulLogin = (userId, ip) =>
  logSecurityEvent('successful_login', userId, {}, ip);

const logPasswordChange = (userId, ip) =>
  logSecurityEvent('password_change', userId, {}, ip);

const logAdminAction = (userId, action, details, ip) =>
  logSecurityEvent('admin_action', userId, { action, details }, ip);

const logPaymentCallback = (orderId, status, provider, ip) =>
  logSecurityEvent('payment_callback', null, { orderId, status, provider }, ip);

module.exports = { logFailedLogin, logSuccessfulLogin, logPasswordChange, logAdminAction, logPaymentCallback };
