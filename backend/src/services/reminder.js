const pool = require('../config/database');

const sendEventReminders = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const eventsResult = await pool.query(
      `SELECT id, title, event_date, event_time, venue FROM events
       WHERE status = 'approved' AND event_date BETWEEN $1 AND $2
       AND id NOT IN (SELECT event_id FROM event_reminders WHERE DATE(sent_at) = CURRENT_DATE)`,
      [tomorrowStart, tomorrowEnd]
    );

    if (eventsResult.rows.length === 0) return;

    for (const event of eventsResult.rows) {
      const ticketsResult = await pool.query(
        `SELECT DISTINCT u.id, u.name, u.email
         FROM tickets t
         JOIN users u ON u.id = t.user_id
         WHERE t.event_id = $1 AND t.status = 'active'`,
        [event.id]
      );

      for (const user of ticketsResult.rows) {
        try {
          const { sendTicketEmail } = require('./email');
          await sendTicketEmail(user.email, {
            eventTitle: event.title,
            eventDate: event.event_date,
            venue: event.venue,
            ticketCode: 'Event Reminder',
            ticketType: 'N/A',
            qrCode: '',
          });

          try {
            const { sendTicketSMS } = require('./sms');
            await sendTicketSMS(user.phone, {
              eventTitle: event.title,
              eventDate: event.event_date,
              venue: event.venue,
              ticketCode: '',
              ticketType: '',
              qrCode: '',
            });
          } catch {}
        } catch (err) {
          console.error(`Reminder failed for ${user.email}:`, err.message);
        }
      }

      await pool.query(
        'INSERT INTO event_reminders (event_id) VALUES ($1)',
        [event.id]
      );
    }

    console.log(`Reminders sent for ${eventsResult.rows.length} event(s)`);
  } catch (error) {
    console.error('Reminder cron error:', error.message);
  }
};

module.exports = { sendEventReminders };
