const pool = require('../config/database');
const { invalidateCache } = require('../config/redis');
const { emitToUser } = require('../config/socket');

const crypto = require('crypto');

/* ============= WAITLIST ============= */

const joinWaitlist = async (req, res, next) => {
  try {
    const { event_id, ticket_type_id, quantity = 1 } = req.body;
    if (!event_id || !ticket_type_id) {
      return res.status(400).json({ error: 'event_id and ticket_type_id are required' });
    }

    const exists = await pool.query(
      'SELECT id, status FROM waitlist WHERE event_id = $1 AND ticket_type_id = $2 AND user_id = $3',
      [event_id, ticket_type_id, req.user.id]
    );

    if (exists.rows.length > 0) {
      if (exists.rows[0].status === 'waiting') {
        return res.status(409).json({ error: 'Already on the waitlist for this ticket type' });
      }
      await pool.query("UPDATE waitlist SET status = 'waiting', quantity = $1 WHERE id = $2",
        [quantity, exists.rows[0].id]);
      return res.json({ message: 'Rejoined waitlist' });
    }

    await pool.query(
      'INSERT INTO waitlist (event_id, ticket_type_id, user_id, quantity) VALUES ($1, $2, $3, $4)',
      [event_id, ticket_type_id, req.user.id, quantity]
    );

    res.status(201).json({ message: 'Added to waitlist' });
  } catch (error) { next(error); }
};

const leaveWaitlist = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE waitlist SET status = 'expired' WHERE id = $1 AND user_id = $2",
      [id, req.user.id]);
    res.json({ message: 'Removed from waitlist' });
  } catch (error) { next(error); }
};

const getMyWaitlist = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT w.id, w.quantity, w.status, w.created_at,
              e.title as event_title, e.event_date, e.venue,
              tt.name as ticket_type_name
       FROM waitlist w
       JOIN events e ON e.id = w.event_id
       JOIN ticket_types tt ON tt.id = w.ticket_type_id
       WHERE w.user_id = $1 AND w.status = 'waiting'
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json({ waitlist: result.rows });
  } catch (error) { next(error); }
};

/* ============= AFFILIATE / REFERRAL ============= */

const getMyAffiliate = async (req, res, next) => {
  try {
    let aff = await pool.query('SELECT * FROM affiliates WHERE user_id = $1', [req.user.id]);
    if (aff.rows.length === 0) {
      const code = req.user.name?.substring(0, 4).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();
      aff = await pool.query(
        'INSERT INTO affiliates (user_id, referral_code) VALUES ($1, $2) RETURNING *',
        [req.user.id, code]
      );
    }
    res.json(aff.rows[0]);
  } catch (error) { next(error); }
};

const getAffiliateOrders = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ao.*, o.total_amount, e.title as event_title
       FROM affiliate_orders ao
       JOIN orders o ON o.id = ao.order_id
       JOIN events e ON e.id = o.event_id
       WHERE ao.affiliate_id = (SELECT id FROM affiliates WHERE user_id = $1)
       ORDER BY ao.created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: result.rows });
  } catch (error) { next(error); }
};

/* ============= SUBSCRIPTIONS ============= */

const getMySubscription = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE organizer_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (error) { next(error); }
};

const subscribe = async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!['basic', 'professional'].includes(plan)) {
      return res.status(400).json({ error: 'Plan must be basic or professional' });
    }

    const settings = await pool.query(
      `SELECT setting_value FROM platform_settings WHERE setting_key = $1`,
      [`${plan}_plan_price`]
    );
    const amount = parseFloat(settings.rows[0]?.setting_value || (plan === 'basic' ? 100 : 300));

    await pool.query(
      "UPDATE subscriptions SET status = 'expired' WHERE organizer_id = $1 AND status = 'active'",
      [req.user.id]
    );

    const result = await pool.query(
      `INSERT INTO subscriptions (organizer_id, plan, amount, start_date, end_date, status)
       VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'active')
       RETURNING *`,
      [req.user.id, plan, amount]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
};

const cancelSubscription = async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE subscriptions SET status = 'cancelled' WHERE organizer_id = $1 AND status = 'active'",
      [req.user.id]
    );
    res.json({ message: 'Subscription cancelled' });
  } catch (error) { next(error); }
};

/* ============= REFUNDS ============= */

const requestRefund = async (req, res, next) => {
  try {
    const { order_id, reason } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id is required' });

    const order = await pool.query(
      "SELECT id, user_id, total_amount, payment_status FROM orders WHERE id = $1",
      [order_id]
    );
    if (order.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (order.rows[0].user_id !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (!['completed', 'partial_refund'].includes(order.rows[0].payment_status)) {
      return res.status(400).json({ error: 'Order is not eligible for refund' });
    }

    const result = await pool.query(
      `INSERT INTO refunds (order_id, amount, reason, status) VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [order_id, order.rows[0].total_amount, reason || 'Customer request']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
};

const processRefund = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body;

    await client.query('BEGIN');

    const refund = await client.query('SELECT * FROM refunds WHERE id = $1', [id]);
    if (refund.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Refund not found' }); }

    if (status === 'approved') {
      const orderId = refund.rows[0].order_id;
      const order = await client.query('SELECT total_amount, payment_status FROM orders WHERE id = $1', [orderId]);

      const newStatus = order.rows[0].payment_status === 'partial_refund' ? 'partial_refund' : 'refunded';
      await client.query("UPDATE orders SET payment_status = $1 WHERE id = $2", [newStatus, orderId]);

      await client.query("UPDATE tickets SET status = 'cancelled' WHERE order_id = $1 AND status = 'active'", [orderId]);

      await client.query(
        `UPDATE refunds SET status = 'processed', processed_by = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [req.user.id, id]
      );
    } else {
      await client.query("UPDATE refunds SET status = 'rejected', processed_by = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2",
        [req.user.id, id]);
    }

    await client.query('COMMIT');
    res.json({ message: `Refund ${status}` });
  } catch (error) { await client.query('ROLLBACK'); next(error); }
  finally { client.release(); }
};

const listRefunds = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.*, o.total_amount as order_total, u.name as user_name, e.title as event_title
       FROM refunds r
       JOIN orders o ON o.id = r.order_id
       JOIN users u ON u.id = o.user_id
       JOIN events e ON e.id = o.event_id
       ORDER BY r.created_at DESC`
    );
    res.json({ refunds: result.rows });
  } catch (error) { next(error); }
};

/* ============= ORGANIZER APPROVAL (FR-005) ============= */

const listPendingOrganizers = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, organizer_status, created_at
       FROM users WHERE role = 'organizer' ORDER BY created_at DESC`
    );
    res.json({ organizers: result.rows });
  } catch (error) { next(error); }
};

const reviewOrganizer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const result = await pool.query(
      `UPDATE users SET organizer_status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND role = 'organizer' RETURNING id, name, email, organizer_status`,
      [status, req.user.id, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Organizer not found' });

    emitToUser(id, 'organizer-status', { organizer_status: status });
    res.json({ message: `Organizer ${status}`, user: result.rows[0] });
  } catch (error) { next(error); }
};

/* ============= ORGANIZER PROFILE / BANK DETAILS (FR-006) ============= */

const updateMyProfile = async (req, res, next) => {
  try {
    const { name, phone, bank_details } = req.body;
    const updates = [];
    const params = [];
    let idx = 1;

    if (name) { updates.push(`name = $${idx++}`); params.push(name); }
    if (phone) {
      const phoneExists = await pool.query('SELECT id FROM users WHERE phone = $1 AND id != $2', [phone, req.user.id]);
      if (phoneExists.rows.length > 0) return res.status(409).json({ error: 'Phone already in use' });
      updates.push(`phone = $${idx++}`); params.push(phone);
    }
    params.push(req.user.id);

    if (updates.length > 0) {
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, params);
    }

    if (bank_details) {
      await pool.query(
        `INSERT INTO bank_details (user_id, bank_name, account_name, account_number, branch)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           bank_name = EXCLUDED.bank_name, account_name = EXCLUDED.account_name,
           account_number = EXCLUDED.account_number, branch = EXCLUDED.branch,
           updated_at = CURRENT_TIMESTAMP`,
        [req.user.id, bank_details.bank_name, bank_details.account_name, bank_details.account_number, bank_details.branch]
      );
    }

    const user = await pool.query(
      'SELECT id, name, email, phone, role, organizer_status FROM users WHERE id = $1',
      [req.user.id]
    );
    const bank = await pool.query('SELECT * FROM bank_details WHERE user_id = $1', [req.user.id]);

    res.json({ user: user.rows[0], bank_details: bank.rows[0] || null });
  } catch (error) { next(error); }
};

/* ============= PER-ORGANIZER COMMISSION (FR-054) ============= */

const updateOrganizerCommission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { commission_rate } = req.body;

    if (commission_rate < 0 || commission_rate > 100) {
      return res.status(400).json({ error: 'Commission rate must be 0-100' });
    }

    const result = await pool.query(
      'UPDATE users SET commission_override = $1 WHERE id = $2 AND role = $3 RETURNING id, name, commission_override',
      [commission_rate, id, 'organizer']
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Organizer not found' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
};

/* ============= PLATFORM SETTINGS UPDATE ============= */

const updatePlatformSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object is required' });
    }

    const allowed = ['commission_percentage', 'basic_plan_price', 'professional_plan_price', 'platform_name', 'support_email'];
    for (const [key, value] of Object.entries(settings)) {
      if (allowed.includes(key)) {
        await pool.query(
          `INSERT INTO platform_settings (setting_key, setting_value) VALUES ($1, $2)
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP`,
          [key, String(value)]
        );
      }
    }

    const result = await pool.query('SELECT * FROM platform_settings');
    const updated = {};
    result.rows.forEach(r => { updated[r.setting_key] = r.setting_value; });

    invalidateCache('platform:settings');
    res.json({ message: 'Settings updated', settings: updated });
  } catch (error) { next(error); }
};

/* ============= TICKET TYPE TOGGLE (FR-030) ============= */

const toggleTicketType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(
      `UPDATE ticket_types SET is_active = $1
       FROM events e WHERE ticket_types.id = $2 AND ticket_types.event_id = e.id AND e.organizer_id = $3
       RETURNING ticket_types.id, ticket_types.name, ticket_types.is_active`,
      [is_active, id, req.user.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket type not found or not authorized' });

    await invalidateCache(`event:*`);
    res.json(result.rows[0]);
  } catch (error) { next(error); }
};

module.exports = {
  joinWaitlist, leaveWaitlist, getMyWaitlist,
  getMyAffiliate, getAffiliateOrders,
  getMySubscription, subscribe, cancelSubscription,
  requestRefund, processRefund, listRefunds,
  listPendingOrganizers, reviewOrganizer,
  updateMyProfile,
  updateOrganizerCommission,
  updatePlatformSettings,
  toggleTicketType,
};
