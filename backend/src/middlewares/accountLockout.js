const pool = require('../config/database');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const checkLockout = async (req, res, next) => {
  try {
    if (!req.body.email) return next();

    const result = await pool.query(
      'SELECT failed_login_attempts, locked_until FROM users WHERE email = $1',
      [req.body.email]
    );

    if (result.rows.length === 0) return next();

    const { failed_login_attempts, locked_until } = result.rows[0];

    if (locked_until && new Date(locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(locked_until) - new Date()) / 60000);
      return res.status(423).json({
        error: `Account locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    if (locked_until && new Date(locked_until) <= new Date()) {
      await pool.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = $1',
        [req.body.email]
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

const recordFailedAttempt = async (email) => {
  try {
    const result = await pool.query(
      `UPDATE users SET
        failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE
          WHEN failed_login_attempts + 1 >= $1 THEN NOW() + INTERVAL '15 minutes'
          ELSE locked_until
        END
      WHERE email = $2
      RETURNING failed_login_attempts, locked_until`,
      [MAX_FAILED_ATTEMPTS, email]
    );

    if (result.rows.length > 0 && result.rows[0].locked_until) {
      console.warn(`Account locked: ${email} after ${result.rows[0].failed_login_attempts} attempts`);
    }
  } catch (error) {
    console.error('Failed to record failed attempt:', error.message);
  }
};

const resetLockout = async (email) => {
  try {
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE email = $1',
      [email]
    );
  } catch (error) {
    console.error('Failed to reset lockout:', error.message);
  }
};

module.exports = { checkLockout, recordFailedAttempt, resetLockout };
