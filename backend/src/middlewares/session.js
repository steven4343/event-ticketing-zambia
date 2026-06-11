const pool = require('../config/database');
const crypto = require('crypto');

const SESSION_TIMEOUT_MINUTES = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 60;

const trackActivity = async (req, res, next) => {
  if (!req.user) return next();

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next();

    const tokenSha = crypto.createHash('sha256').update(token).digest('hex');

    await pool.query(
      `UPDATE sessions SET last_activity = CURRENT_TIMESTAMP
       WHERE token_sha = $1 AND is_active = true`,
      [tokenSha]
    );
  } catch {}
  next();
};

const checkSessionTimeout = async (req, res, next) => {
  if (!req.user) return next();

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next();

    const tokenSha = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      `SELECT last_activity FROM sessions
       WHERE token_sha = $1 AND is_active = true`,
      [tokenSha]
    );

    if (result.rows.length > 0) {
      const lastActivity = new Date(result.rows[0].last_activity);
      const now = new Date();
      const diffMinutes = (now - lastActivity) / (1000 * 60);

      if (diffMinutes > SESSION_TIMEOUT_MINUTES) {
        await pool.query(
          "UPDATE sessions SET is_active = false WHERE token_sha = $1",
          [tokenSha]
        );
        return res.status(401).json({
          error: 'Session expired due to inactivity',
          code: 'SESSION_TIMEOUT',
        });
      }
    }
  } catch {}
  next();
};

const createSession = async (userId, token, ip, userAgent) => {
  const tokenSha = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO sessions (user_id, token_sha, ip_address, user_agent, last_activity, expires_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)`,
    [userId, tokenSha, ip, userAgent, expiresAt]
  );
};

const revokeSession = async (token) => {
  const tokenSha = crypto.createHash('sha256').update(token).digest('hex');
  await pool.query(
    "UPDATE sessions SET is_active = false WHERE token_sha = $1",
    [tokenSha]
  );
};

module.exports = { trackActivity, checkSessionTimeout, createSession, revokeSession, SESSION_TIMEOUT_MINUTES };
