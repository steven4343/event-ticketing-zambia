-- Seed data for development and testing

-- Insert Super Admin
INSERT INTO users (name, email, phone, password, role)
VALUES ('System Admin', 'admin@eventhub.zm', '0977000000',
        '$2a$12$LJ3m4ys3Lg3YOCwKkCqOcOX5hqFzJ0Yx6n1q8Wv9b7c2d3e4f5g6h7i8', -- password: Admin@123
        'super_admin');

-- Insert Organizer
INSERT INTO users (name, email, phone, password, role)
VALUES ('Events Co. Zambia', 'organizer@eventhub.zm', '0977111111',
        '$2a$12$LJ3m4ys3Lg3YOCwKkCqOcOX5hqFzJ0Yx6n1q8Wv9b7c2d3e4f5g6h7i8', -- password: Organizer@123
        'organizer');

-- Insert Customer
INSERT INTO users (name, email, phone, password, role)
VALUES ('John Banda', 'john@example.com', '0977222222',
        '$2a$12$LJ3m4ys3Lg3YOCwKkCqOcOX5hqFzJ0Yx6n1q8Wv9b7c2d3e4f5g6h7i8', -- password: Customer@123
        'customer');

-- Create Events
INSERT INTO events (title, description, venue, event_date, event_time, organizer_id, status)
VALUES
('UNZA Music Festival 2026', 'Annual music festival featuring top Zambian artists including Macky 2, Slapdee, and Chef 187. Food, drinks, and great vibes!', 'UNZA Great Hall, Lusaka', '2026-08-15', '14:00',
 (SELECT id FROM users WHERE email = 'organizer@eventhub.zm'), 'approved'),

('ZITF Business Conference', 'A gathering of Zambia''s top business minds discussing innovation, entrepreneurship, and economic growth.', 'Mulungushi International Conference Centre, Lusaka', '2026-09-10', '09:00',
 (SELECT id FROM users WHERE email = 'organizer@eventhub.zm'), 'approved'),

('Cavendish University Sports Day', 'Inter-university sports competition featuring football, basketball, netball, and athletics.', 'Cavendish University Grounds, Lusaka', '2026-07-20', '08:00',
 (SELECT id FROM users WHERE email = 'organizer@eventhub.zm'), 'approved'),

('Zambia Gospel Concert', 'An evening of worship and praise with Zambia''s leading gospel artists.', 'Bible Gospel Church in Africa, Ndola', '2026-10-05', '16:00',
 (SELECT id FROM users WHERE email = 'organizer@eventhub.zm'), 'pending');

-- Insert Ticket Types
INSERT INTO ticket_types (event_id, name, description, price, quantity, available)
SELECT e.id, 'VIP', 'Front row seating, meet & greet, refreshments', 500.00, 100, 100
FROM events e WHERE e.title = 'UNZA Music Festival 2026';

INSERT INTO ticket_types (event_id, name, description, price, quantity, available)
SELECT e.id, 'Regular', 'Standard entry', 150.00, 500, 500
FROM events e WHERE e.title = 'UNZA Music Festival 2026';

INSERT INTO ticket_types (event_id, name, description, price, quantity, available)
SELECT e.id, 'Early Bird', 'Limited early bird discount', 100.00, 200, 200
FROM events e WHERE e.title = 'UNZA Music Festival 2026';

INSERT INTO ticket_types (event_id, name, description, price, quantity, available)
SELECT e.id, 'Standard', 'Conference entry', 200.00, 300, 300
FROM events e WHERE e.title = 'ZITF Business Conference';

INSERT INTO ticket_types (event_id, name, description, price, quantity, available)
SELECT e.id, 'Student', 'Discounted entry for students', 50.00, 200, 200
FROM events e WHERE e.title = 'Cavendish University Sports Day';

INSERT INTO ticket_types (event_id, name, description, price, quantity, available)
SELECT e.id, 'Regular', 'General admission', 100.00, 1000, 1000
FROM events e WHERE e.title = 'Cavendish University Sports Day';

INSERT INTO ticket_types (event_id, name, description, price, quantity, available)
SELECT e.id, 'VIP', 'Premium seating + dinner', 300.00, 50, 50
FROM events e WHERE e.title = 'Zambia Gospel Concert';

INSERT INTO ticket_types (event_id, name, description, price, quantity, available)
SELECT e.id, 'Regular', 'Standard entry', 100.00, 300, 300
FROM events e WHERE e.title = 'Zambia Gospel Concert';

-- Insert a Discount Code
INSERT INTO discount_codes (event_id, code, discount_type, discount_value, max_uses, expires_at)
SELECT e.id, 'WELCOME10', 'percentage', 10.00, 100, '2026-12-31'
FROM events e WHERE e.title = 'UNZA Music Festival 2026';
