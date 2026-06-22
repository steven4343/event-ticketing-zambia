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

/* ============= DISCOUNT CODES (FR-061/062/063) ============= */

const listDiscountCodes = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT dc.*, e.title as event_title FROM discount_codes dc
       LEFT JOIN events e ON e.id = dc.event_id
       WHERE dc.event_id IN (SELECT id FROM events WHERE organizer_id = $1) OR dc.event_id IS NULL
       ORDER BY dc.created_at DESC`,
      [req.user.id]
    );
    res.json({ codes: result.rows });
  } catch (error) { next(error); }
};

const createDiscountCode = async (req, res, next) => {
  try {
    const { event_id, code, discount_type, discount_value, max_uses, expires_at } = req.body;
    if (!code || !discount_type || discount_value === undefined) {
      return res.status(400).json({ error: 'code, discount_type, and discount_value are required' });
    }
    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({ error: 'discount_type must be percentage or fixed' });
    }

    if (event_id) {
      const ev = await pool.query('SELECT id FROM events WHERE id = $1 AND organizer_id = $2', [event_id, req.user.id]);
      if (ev.rows.length === 0) return res.status(404).json({ error: 'Event not found or not yours' });
    }

    const result = await pool.query(
      `INSERT INTO discount_codes (event_id, code, discount_type, discount_value, max_uses, expires_at)
       VALUES ($1, UPPER($2), $3, $4, $5, $6) RETURNING *`,
      [event_id || null, code, discount_type, discount_value, max_uses || null, expires_at || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Code already exists' });
    next(error);
  }
};

const updateDiscountCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active, max_uses, expires_at } = req.body;

    const result = await pool.query(
      `UPDATE discount_codes SET
        is_active = COALESCE($1, is_active),
        max_uses = COALESCE($2, max_uses),
        expires_at = COALESCE($3, expires_at)
       WHERE id = $4 AND event_id IN (SELECT id FROM events WHERE organizer_id = $5)
       RETURNING *`,
      [is_active, max_uses, expires_at, id, req.user.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Discount code not found' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
};

const deleteDiscountCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM discount_codes WHERE id = $1 AND event_id IN (SELECT id FROM events WHERE organizer_id = $2) RETURNING id`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Discount code not found' });
    res.json({ message: 'Discount code deleted' });
  } catch (error) { next(error); }
};

/* ============= SUBSCRIPTION ADMIN VIEW (FR-055) ============= */

const listAllSubscriptions = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name as organizer_name, u.email as organizer_email
       FROM subscriptions s
       JOIN users u ON u.id = s.organizer_id
       ORDER BY s.created_at DESC`
    );
    res.json({ subscriptions: result.rows });
  } catch (error) { next(error); }
};

/* ============= OFFLINE SCANNER SYNC (FR-038) ============= */

const syncEventTickets = async (req, res, next) => {
  try {
    const { event_id } = req.params;

    const eventCheck = await pool.query(
      'SELECT id, title, event_date FROM events WHERE id = $1', [event_id]
    );
    if (eventCheck.rows.length === 0) return res.status(404).json({ error: 'Event not found' });

    const tickets = await pool.query(
      `SELECT t.id, t.ticket_code, t.qr_code, t.status, t.checked_in_at,
              u.name as attendee_name, tt.name as ticket_type_name
       FROM tickets t
       JOIN users u ON u.id = t.user_id
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
       WHERE t.event_id = $1
       ORDER BY t.created_at`,
      [event_id]
    );

    res.json({
      event: eventCheck.rows[0],
      tickets: tickets.rows,
      synced_at: new Date().toISOString(),
    });
  } catch (error) { next(error); }
};

const bulkCheckIn = async (req, res, next) => {
  try {
    const { check_ins } = req.body;
    if (!Array.isArray(check_ins)) return res.status(400).json({ error: 'check_ins array required' });

    const results = [];
    for (const { ticket_code } of check_ins) {
      const result = await pool.query(
        `UPDATE tickets SET status = 'used', checked_in_at = CURRENT_TIMESTAMP
         WHERE ticket_code = $1 AND status = 'active'
         RETURNING id, ticket_code`,
        [ticket_code]
      );
      results.push({
        ticket_code,
        success: result.rows.length > 0,
      });
    }

    res.json({ results });
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
  listDiscountCodes, createDiscountCode, updateDiscountCode, deleteDiscountCode,
  listAllSubscriptions,
  syncEventTickets, bulkCheckIn,
};
