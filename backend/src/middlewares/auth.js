const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { checkSessionTimeout, trackActivity } = require('./session');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.', code: 'NO_TOKEN' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'refresh') {
      return res.status(401).json({ error: 'Invalid token type', code: 'TOKEN_TYPE' });
    }

    const result = await pool.query(
      'SELECT id, name, email, phone, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    if (!result.rows[0].is_active) {
      return res.status(401).json({ error: 'Account deactivated', code: 'ACCOUNT_INACTIVE' });
    }

    req.user = result.rows[0];
    req.token = token;

    await checkSessionTimeout(req, res, async () => {
      await trackActivity(req, res, () => {});
      next();
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token.', code: 'INVALID_TOKEN' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.', code: 'FORBIDDEN' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
