const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { redis } = require('../config/redis');
const { logSuccessfulLogin, logFailedLogin } = require('../utils/auditLogger');
const { createSession, revokeSession } = require('../middlewares/session');
const { recordFailedAttempt, resetLockout } = require('../middlewares/accountLockout');

const ACCESS_TOKEN_EXPIRY = '10m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
  const refreshToken = jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
  return { accessToken, refreshToken };
};

const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email or phone already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, role, created_at`,
      [name, email, phone, hashedPassword, role || 'customer']
    );

    const user = result.rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, crypto.createHash('sha256').update(refreshToken).digest('hex'),
       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );

    const ip = req.ip || req.connection.remoteAddress;
    await createSession(user.id, accessToken, ip, req.headers['user-agent']);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      accessToken,
      refreshToken,
      expiresIn: 600,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    const result = await pool.query(
      'SELECT id, name, email, phone, password, role, is_active FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      await logFailedLogin(email, ip);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      await logFailedLogin(email, ip);
      return res.status(401).json({ error: 'Account deactivated. Contact support.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await recordFailedAttempt(email);
      await logFailedLogin(email, ip);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await resetLockout(email);

    const { accessToken, refreshToken } = generateTokens(user.id);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, crypto.createHash('sha256').update(refreshToken).digest('hex'),
       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );

    await createSession(user.id, accessToken, ip, req.headers['user-agent']);
    await logSuccessfulLogin(user.id, ip);

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      token: accessToken,
      refreshToken,
      expiresIn: 600,
      user: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await pool.query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND revoked = false AND expires_at > NOW()',
      [hashedToken, decoded.id]
    );
    if (stored.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token revoked or expired' });
    }

    await pool.query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [stored.rows[0].id]);

    const tokens = generateTokens(decoded.id);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [decoded.id, crypto.createHash('sha256').update(tokens.refreshToken).digest('hex'),
       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 600,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired', code: 'TOKEN_EXPIRED' });
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      await revokeSession(authHeader.split(' ')[1]);
    }

    const { refreshToken } = req.body;
    if (refreshToken) {
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await pool.query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [hashedToken]);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
        [req.user.id, user.password]
      );

      await client.query(
        'UPDATE users SET password = $1, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, req.user.id]
      );

      await client.query(
        "UPDATE sessions SET is_active = false WHERE user_id = $1",
        [req.user.id]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ message: 'Password changed. Please login again.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refresh, logout, getMe, changePassword };
