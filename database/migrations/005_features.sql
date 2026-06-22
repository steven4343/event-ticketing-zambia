-- Migration v5: Waitlist, affiliates, subscriptions, refunds, organizer approval, bank details, location, ticket type toggles, commission overrides

-- Waitlist: add notified column for batch notifications
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP;

-- Affiliates: add referred orders tracking
CREATE TABLE IF NOT EXISTS affiliate_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  commission_earned DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(affiliate_id, order_id)
);

-- Organizer approval status
ALTER TABLE users ADD COLUMN IF NOT EXISTS organizer_status VARCHAR(20) DEFAULT 'pending' CHECK (organizer_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

-- Organizer bank details
CREATE TABLE IF NOT EXISTS bank_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  bank_name VARCHAR(255),
  account_name VARCHAR(255),
  account_number VARCHAR(50),
  branch VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event location fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE events ADD COLUMN IF NOT EXISTS region VARCHAR(100);

-- Ticket type enable/disable
ALTER TABLE ticket_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Per-organizer commission override
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS organizer_commission_rate DECIMAL(5, 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_override DECIMAL(5, 2);

-- Refunds
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Allow refunded payment status
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'partial_refund'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_notified ON waitlist(notified_at) WHERE notified_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_affiliate_orders_affiliate ON affiliate_orders(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_region ON events(region);
