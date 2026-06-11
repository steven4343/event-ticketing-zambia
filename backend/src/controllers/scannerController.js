const pool = require('../config/database');

const validateTicket = async (req, res, next) => {
  try {
    const { ticket_code } = req.body;

    const result = await pool.query(
      `SELECT t.ticket_code, t.status, t.checked_in_at, t.created_at as ticket_created,
              u.name as attendee_name, u.email, u.phone,
              e.title as event_title, e.event_date, e.venue,
              tt.name as ticket_type
       FROM tickets t
       JOIN users u ON u.id = t.user_id
       JOIN events e ON e.id = t.event_id
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
       WHERE t.ticket_code = $1`,
      [ticket_code]
    );

    if (result.rows.length === 0) {
      return res.json({ valid: false, message: 'Invalid ticket code.' });
    }

    const ticket = result.rows[0];

    if (ticket.status === 'used') {
      return res.json({
        valid: false,
        ticket: {
          ticket_code: ticket.ticket_code,
          attendee_name: ticket.attendee_name,
          checked_in_at: ticket.checked_in_at,
        },
        message: 'Ticket already used.',
      });
    }

    if (ticket.status === 'cancelled') {
      return res.json({
        valid: false,
        ticket: {
          ticket_code: ticket.ticket_code,
          attendee_name: ticket.attendee_name,
        },
        message: 'Ticket has been cancelled.',
      });
    }

    res.json({
      valid: true,
      ticket: {
        ticket_code: ticket.ticket_code,
        attendee_name: ticket.attendee_name,
        event_title: ticket.event_title,
        ticket_type: ticket.ticket_type,
        status: ticket.status,
      },
      message: 'Valid ticket. Entry allowed.',
    });
  } catch (error) {
    next(error);
  }
};

const checkIn = async (req, res, next) => {
  try {
    const { ticket_code } = req.body;

    const result = await pool.query(
      `UPDATE tickets SET status = 'used', checked_in_at = CURRENT_TIMESTAMP
       WHERE ticket_code = $1 AND status = 'active'
       RETURNING id`,
      [ticket_code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Ticket not found or already used' });
    }

    const ticketInfo = await pool.query(
      `SELECT u.name as attendee_name, tt.name as ticket_type
       FROM tickets t
       JOIN users u ON u.id = t.user_id
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.json({
      message: 'Check-in successful',
      attendee_name: ticketInfo.rows[0].attendee_name,
      ticket_type: ticketInfo.rows[0].ticket_type,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { validateTicket, checkIn };
