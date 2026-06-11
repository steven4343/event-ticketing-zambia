const pool = require('../config/database');
const { invalidateCache } = require('../config/redis');

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'organizer') as total_organizers,
        (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM events WHERE status = 'approved') as approved_events,
        (SELECT COUNT(*) FROM events WHERE status = 'pending') as pending_events,
        (SELECT COUNT(*) FROM tickets WHERE status = 'active') as active_tickets,
        (SELECT COUNT(*) FROM tickets WHERE status = 'used') as checked_in_tickets,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'completed') as total_revenue,
        (SELECT COALESCE(SUM(amount), 0) FROM commissions WHERE status = 'paid') as total_commissions
    `);

    const salesByDay = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total_amount) as revenue
      FROM orders WHERE payment_status = 'completed' AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY date
    `);

    const userGrowth = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY date
    `);

    const eventGrowth = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM events WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY date
    `);

    const topEvents = await pool.query(`
      SELECT e.id, e.title, COUNT(t.id) as tickets_sold,
        COALESCE(SUM(o.total_amount), 0) FILTER (WHERE o.payment_status = 'completed') as revenue
      FROM events e
      LEFT JOIN tickets t ON t.event_id = e.id
      LEFT JOIN orders o ON o.event_id = e.id
      GROUP BY e.id
      ORDER BY tickets_sold DESC LIMIT 5
    `);

    res.json({
      ...stats.rows[0],
      sales_by_day: salesByDay.rows,
      user_growth: userGrowth.rows,
      event_growth: eventGrowth.rows,
      top_events: topEvents.rows,
    });
  } catch (error) {
    next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search, status } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (role) {
      query += ` AND role = $${paramIdx++}`;
      params.push(role);
    }
    if (search) {
      query += ` AND (name ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (status === 'active') {
      query += ' AND is_active = true';
    } else if (status === 'inactive') {
      query += ' AND is_active = false';
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM users');

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, role, is_active',
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!is_active) {
      await pool.query(
        "UPDATE sessions SET is_active = false WHERE user_id = $1",
        [id]
      );
    }

    await invalidateCache('user:*');
    res.json({ message: `User ${is_active ? 'activated' : 'deactivated'}`, user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const listAllEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*, u.name as organizer_name,
        (SELECT COUNT(*) FROM tickets WHERE event_id = e.id) as tickets_sold,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE event_id = e.id AND payment_status = 'completed') as revenue
      FROM events e JOIN users u ON e.organizer_id = u.id WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (status) {
      query += ` AND e.status = $${paramIdx++}`;
      params.push(status);
    }
    if (search) {
      query += ` AND (e.title ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    query += ` ORDER BY e.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM events');

    res.json({
      events: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (error) {
    next(error);
  }
};

const getCommissions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT c.*, u.name as organizer_name, e.title as event_title
      FROM commissions c
      JOIN users u ON c.organizer_id = u.id
      JOIN orders o ON c.order_id = o.id
      JOIN events e ON o.event_id = e.id
      ORDER BY c.created_at DESC LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) FROM commissions');

    res.json({
      commissions: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (error) {
    next(error);
  }
};

const markCommissionPaid = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE commissions SET status = 'paid' WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    res.json({ message: 'Commission marked as paid' });
  } catch (error) {
    next(error);
  }
};

const getPlatformSettings = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT setting_value FROM platform_settings WHERE setting_key = 'commission_percentage') as commission_percentage,
        (SELECT setting_value FROM platform_settings WHERE setting_key = 'basic_plan_price') as basic_plan_price,
        (SELECT setting_value FROM platform_settings WHERE setting_key = 'professional_plan_price') as professional_plan_price
    `);
    res.json(result.rows[0] || {});
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats, listUsers, updateUserStatus, listAllEvents, getCommissions, markCommissionPaid, getPlatformSettings };
