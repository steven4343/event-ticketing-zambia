-- Migration v2: Enterprise features - lockout, waitlist, drafts, templates, sale periods

-- Users: account lockout & password tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Events: drafts, scheduling, templates
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS clone_source_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled', 'completed'));

-- Ticket types: sale periods & limits
ALTER TABLE ticket_types ADD COLUMN IF NOT EXISTS sale_start TIMESTAMP;
ALTER TABLE ticket_types ADD COLUMN IF NOT EXISTS sale_end TIMESTAMP;
ALTER TABLE ticket_types ADD COLUMN IF NOT EXISTS max_per_order INT DEFAULT 10;

-- Waitlist
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'fulfilled', 'expired')),
    notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id, ticket_type_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_event ON waitlist(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);

-- Password history
CREATE TABLE IF NOT EXISTS password_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);

-- Activity log for user sessions
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);

-- Better indexes
CREATE INDEX IF NOT EXISTS idx_events_organizer_status ON events(organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_events_draft ON events(is_draft) WHERE is_draft = true;
CREATE INDEX IF NOT EXISTS idx_tickets_event_user ON tickets(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_payment ON orders(user_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_users_locked ON users(locked_until) WHERE locked_until IS NOT NULL;

-- View: event sales summary
CREATE OR REPLACE VIEW event_sales_summary AS
SELECT
  e.id as event_id,
  e.title as event_title,
  e.organizer_id,
  COUNT(DISTINCT o.id) FILTER (WHERE o.payment_status = 'completed') as total_orders,
  COUNT(t.id) FILTER (WHERE t.status IN ('active', 'used')) as tickets_sold,
  COUNT(t.id) FILTER (WHERE t.status = 'used') as checked_in,
  COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'completed'), 0) as revenue,
  COALESCE(AVG(o.total_amount) FILTER (WHERE o.payment_status = 'completed'), 0) as avg_order_value,
  COUNT(DISTINCT o.user_id) FILTER (WHERE o.payment_status = 'completed') as unique_buyers
FROM events e
LEFT JOIN orders o ON o.event_id = e.id
LEFT JOIN tickets t ON t.event_id = e.id
GROUP BY e.id;
