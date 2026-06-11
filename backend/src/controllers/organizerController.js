const pool = require('../config/database');

const getStats = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM events WHERE organizer_id = $1) as total_events,
        (SELECT COUNT(*) FROM events WHERE organizer_id = $1 AND status = 'approved') as approved_events,
        (SELECT COUNT(*) FROM tickets t JOIN events e ON t.event_id = e.id WHERE e.organizer_id = $1 AND t.status = 'active') as tickets_sold,
        (SELECT COUNT(*) FROM tickets t JOIN events e ON t.event_id = e.id WHERE e.organizer_id = $1 AND t.status = 'used') as checked_in,
        (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o JOIN events e ON o.event_id = e.id WHERE e.organizer_id = $1 AND o.payment_status = 'completed') as total_revenue
    `, [req.user.id]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const exportAttendees = async (req, res, next) => {
  try {
    const { event_id } = req.params;

    const eventCheck = await pool.query(
      'SELECT id, title FROM events WHERE id = $1 AND organizer_id = $2',
      [event_id, req.user.id]
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const result = await pool.query(`
      SELECT t.ticket_code, u.name, u.email, u.phone, tt.name as ticket_type,
             t.status, t.checked_in_at, t.created_at as purchase_date
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      WHERE t.event_id = $1
      ORDER BY t.created_at
    `, [event_id]);

    const header = 'Ticket Code,Name,Email,Phone,Ticket Type,Status,Checked In At,Purchase Date\n';
    const csv = header + result.rows.map(r =>
      `"${r.ticket_code}","${r.name}","${r.email}","${r.phone}","${r.ticket_type}","${r.status}","${r.checked_in_at || ''}","${r.purchase_date}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendees-${eventCheck.rows[0].title}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

const getSalesReport = async (req, res, next) => {
  try {
    const { event_id } = req.params;
    const { period = 'daily' } = req.query;

    let interval;
    if (period === 'hourly') interval = "HH24";
    else if (period === 'daily') interval = "YYYY-MM-DD";
    else interval = "YYYY-MM";

    const result = await pool.query(`
      SELECT
        TO_CHAR(o.created_at, $1) as period,
        COUNT(*) as orders,
        SUM(o.total_amount) as revenue,
        COUNT(t.id) as tickets
      FROM orders o
      JOIN events e ON o.event_id = e.id
      LEFT JOIN tickets t ON t.order_id = o.id
      WHERE e.id = $2 AND e.organizer_id = $3 AND o.payment_status = 'completed'
      GROUP BY TO_CHAR(o.created_at, $1)
      ORDER BY period
    `, [interval, event_id, req.user.id]);

    res.json({ sales: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats, exportAttendees, getSalesReport };
