const pool = require('../config/database');
const { generateTicketCode } = require('../utils/ticketCode');
const { generateQRCode } = require('../utils/qrGenerator');
const { sendTicketEmail } = require('../services/email');
const { sendTicketSMS } = require('../services/sms');
const { processMTNPayment } = require('../services/mtn');
const { processAirtelPayment } = require('../services/airtel');
const { processZamtelPayment } = require('../services/zamtel');
const { emitToUser, emitToEvent } = require('../config/socket');
const { invalidateCache } = require('../config/redis');
const { createNotification } = require('./notificationController');

const purchase = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { event_id, tickets, payment_provider, phone, discount_code } = req.body;

    await client.query('BEGIN');

    const eventResult = await client.query(
      'SELECT id, title, event_date, event_time, venue, organizer_id FROM events WHERE id = $1 AND status = $2',
      [event_id, 'approved']
    );
    if (eventResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found or not available' });
    }
    const event = eventResult.rows[0];

    let totalAmount = 0;
    const ticketDetails = [];

    for (const item of tickets) {
      const ttResult = await client.query(
        'SELECT id, name, price, available, sale_start, sale_end, max_per_order FROM ticket_types WHERE id = $1 AND event_id = $2 FOR UPDATE',
        [item.ticket_type_id, event_id]
      );
      if (ttResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Ticket type ${item.ticket_type_id} not found` });
      }

      const ticketType = ttResult.rows[0];
      if (ticketType.available < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Not enough ${ticketType.name} tickets available` });
      }

      if (ticketType.sale_start && new Date(ticketType.sale_start) > new Date()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Sales for ${ticketType.name} have not started yet` });
      }

      if (ticketType.sale_end && new Date(ticketType.sale_end) < new Date()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Sales for ${ticketType.name} have ended` });
      }

      if (item.quantity > (ticketType.max_per_order || 10)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Max ${ticketType.max_per_order || 10} tickets per order for ${ticketType.name}` });
      }

      const subtotal = ticketType.price * item.quantity;
      totalAmount += subtotal;
      ticketDetails.push({ ...ticketType, quantity: item.quantity, subtotal });
    }

    if (discount_code) {
      const discResult = await client.query(
        `SELECT * FROM discount_codes
         WHERE code = $1 AND (event_id IS NULL OR event_id = $2)
         AND is_active = true AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
         AND (max_uses IS NULL OR current_uses < max_uses)`,
        [discount_code, event_id]
      );
      if (discResult.rows.length > 0) {
        const discount = discResult.rows[0];
        if (discount.discount_type === 'percentage') {
          totalAmount -= (totalAmount * discount.discount_value / 100);
        } else {
          totalAmount -= discount.discount_value;
        }
        await client.query(
          'UPDATE discount_codes SET current_uses = current_uses + 1 WHERE id = $1',
          [discount.id]
        );
      }
    }

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, event_id, total_amount, payment_status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [req.user.id, event_id, totalAmount]
    );
    const orderId = orderResult.rows[0].id;

    for (const detail of ticketDetails) {
      await client.query(
        'INSERT INTO order_items (order_id, ticket_type_id, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5)',
        [orderId, detail.id, detail.quantity, detail.price, detail.subtotal]
      );
    }

    await client.query('COMMIT');

    const reference = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    let paymentResult;

    if (payment_provider === 'mtn') {
      paymentResult = await processMTNPayment(phone, totalAmount, reference);
    } else if (payment_provider === 'airtel') {
      paymentResult = await processAirtelPayment(phone, totalAmount, reference);
    } else if (payment_provider === 'zamtel') {
      paymentResult = await processZamtelPayment(phone, totalAmount, reference);
    } else {
      return res.status(400).json({ error: 'Invalid payment provider' });
    }

    emitToEvent(event_id, 'ticket-purchase-started', { orderId, userId: req.user.id });

    res.status(201).json({
      message: 'Payment request sent. Approve on your phone.',
      order_id: orderId,
      total_amount: totalAmount,
      transaction_reference: reference,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const paymentCallback = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { transaction_id, status, provider, order_id } = req.body;

    await client.query('BEGIN');

    const amountResult = await client.query('SELECT total_amount FROM orders WHERE id = $1', [order_id]);
    if (amountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    await client.query(
      `INSERT INTO payments (order_id, provider, amount, transaction_id, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [order_id, provider, amountResult.rows[0].total_amount, transaction_id, status]
    );

    if (status === 'completed') {
      await client.query(
        "UPDATE orders SET payment_status = 'completed', transaction_reference = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [transaction_id, order_id]
      );

      const orderResult = await client.query(
        'SELECT user_id, event_id FROM orders WHERE id = $1',
        [order_id]
      );
      const { user_id, event_id } = orderResult.rows[0];

      const [eventResult, userResult] = await Promise.all([
        client.query('SELECT title, event_date, venue, organizer_id FROM events WHERE id = $1', [event_id]),
        client.query('SELECT name, email, phone FROM users WHERE id = $1', [user_id]),
      ]);
      const event = eventResult.rows[0];
      const user = userResult.rows[0];

      const itemsResult = await client.query(
        `SELECT oi.*, tt.name as ticket_type_name, tt.price
         FROM order_items oi JOIN ticket_types tt ON tt.id = oi.ticket_type_id
         WHERE oi.order_id = $1`,
        [order_id]
      );

      const generatedTickets = [];

      for (const item of itemsResult.rows) {
        for (let i = 0; i < item.quantity; i++) {
          const ticketCode = generateTicketCode();
          const qrData = { ticket_code: ticketCode, event_id, order_id };
          const qrCode = await generateQRCode(qrData);

          const ticketResult = await client.query(
            `INSERT INTO tickets (order_id, event_id, ticket_type_id, user_id, ticket_code, qr_code)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, ticket_code, qr_code`,
            [order_id, event_id, item.ticket_type_id, user_id, ticketCode, qrCode]
          );

          generatedTickets.push({
            ticket_code: ticketCode,
            qr_code: qrCode,
            ticket_type: item.ticket_type_name,
          });

          await client.query(
            'UPDATE ticket_types SET available = available - 1 WHERE id = $1',
            [item.ticket_type_id]
          );
        }
      }

      const ticketInfo = {
        eventTitle: event.title,
        eventDate: event.event_date,
        venue: event.venue,
        ticketCode: generatedTickets[0]?.ticket_code,
        ticketType: generatedTickets[0]?.ticket_type,
        qrCode: generatedTickets[0]?.qr_code,
      };

      const settingsResult = await client.query(
        "SELECT setting_value FROM platform_settings WHERE setting_key = 'commission_percentage'"
      );
      const commissionPercentage = parseFloat(settingsResult.rows[0]?.setting_value || 5);

      const commissionAmount = (amountResult.rows[0].total_amount * commissionPercentage) / 100;
      if (commissionAmount > 0) {
        await client.query(
          `INSERT INTO commissions (order_id, organizer_id, amount, status)
           VALUES ($1, $2, $3, 'pending')`,
          [order_id, event.organizer_id, commissionAmount]
        );
      }

      await Promise.allSettled([
        sendTicketEmail(user.email, ticketInfo),
        sendTicketSMS(user.phone, ticketInfo),
      ]);

      await client.query('COMMIT');

      await invalidateCache(`event:stats:${event_id}`);
      await invalidateCache(`event:${event_id}`);
      await invalidateCache('events:*');

      await createNotification(user_id, 'Tickets Confirmed', `Your tickets for ${event.title} are ready!`, 'ticket_sold', 'event', event_id);
      await createNotification(event.organizer_id, 'New Ticket Sale', `${generatedTickets.length} ticket(s) sold for ${event.title}`, 'ticket_sold', 'order', order_id);

      emitToUser(user_id, 'payment-confirmed', { order_id, tickets: generatedTickets });
      emitToEvent(event_id, 'ticket-sold', { count: generatedTickets.length });

      res.json({ message: 'Payment confirmed. Tickets generated.', tickets: generatedTickets });
    } else {
      await client.query(
        "UPDATE orders SET payment_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [order_id]
      );
      await client.query('COMMIT');

      emitToUser(
        (await client.query('SELECT user_id FROM orders WHERE id = $1', [order_id])).rows[0]?.user_id,
        'payment-failed', { order_id }
      );

      res.json({ message: 'Payment failed' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const getMyTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT t.id, t.ticket_code, t.qr_code, t.status, t.checked_in_at, t.created_at,
              e.title as event_title, e.event_date, e.venue, e.event_time,
              tt.name as ticket_type_name, tt.price
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM tickets WHERE user_id = $1', [req.user.id]);

    res.json({
      tickets: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { purchase, paymentCallback, getMyTickets };
