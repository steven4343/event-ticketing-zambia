-- Event reminders tracking table
-- Prevents duplicate reminders for the same event on the same day

CREATE TABLE IF NOT EXISTS event_reminders (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_reminders_event_date ON event_reminders(event_id, DATE(sent_at));
