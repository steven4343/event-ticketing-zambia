const pool = require('../config/database');
const { emitToUser } = require('../config/socket');

const createNotification = async (userId, title, message, type, referenceType, referenceId) => {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, message, type, is_read, created_at`,
      [userId, title, message, type, referenceType, referenceId]
    );

    emitToUser(userId, 'notification', result.rows[0]);

    return result.rows[0];
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};

const getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const unreadCount = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );

    res.json({
      notifications: result.rows,
      unread_count: parseInt(unreadCount.rows[0].count),
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createNotification, getMyNotifications, markAsRead, markAllAsRead };
