# EventHub Zambia — Event Ticketing System

A full-stack event ticketing platform built for the Zambian market. Supports MTN MoMo, Airtel Money, and Zamtel Kwacha as payment providers. Features role-based access (super_admin / organizer / customer), QR ticketing, PDF ticket downloads, real-time updates via Socket.IO, offline scanner support, and enterprise-grade security.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 20, Express 4 — hosted on [Render](https://render.com) |
| **Frontend** | Next.js 14, React 18, Tailwind CSS 3 — hosted on [Vercel](https://vercel.com) |
| **Database** | PostgreSQL 16 (Neon Serverless) |
| **Cache** | Redis 7 (optional — degrades gracefully) |
| **Real-time** | Socket.IO 4 |
| **Auth** | JWT (access 10min + refresh 7d) + Google OAuth (Firebase), bcryptjs, CSRF double-submit cookie |
| **Media** | [Cloudinary](https://cloudinary.com) (image upload, CDN, auto-format & quality) |
| **Payments** | MTN MoMo / Airtel Money / Zamtel Kwacha (stub — needs live API keys) |

---

## Architecture

```
event-ticketing/
├── backend/
│   ├── src/
│   │   ├── config/          # database, redis, socket.io
│   │   ├── controllers/     # auth, event, ticket, admin, organizer, scanner, payment, extend
│   │   ├── middlewares/      # auth, session, csrf, rateLimiter, sanitizer, validate, accountLockout, errorHandler
│   │   ├── routes/          # auth, events, tickets, payments, scanner, admin, organizer, notifications, health, extend
│   │   ├── services/        # email (Brevo), sms (stub), reminder (cron)
│   │   ├── utils/           # qrGenerator, ticketCode, encryption, auditLogger
│   │   ├── models/          # (reserved)
│   │   └── app.js           # Express app setup
│   ├── server.js            # Entry point
│   └── migrate.js           # Migration runner
├── frontend/
│   └── src/
│       ├── pages/           # Next.js pages (see Routes below)
│       ├── components/      # Breadcrumbs, ConfirmDialog, EmptyState, EventCard, NotificationBell, SessionWarning
│       ├── context/         # AuthContext (login, logout, token refresh, inactivity timeout)
│       ├── services/        # api.js (axios), socket.js (Socket.IO client)
│       └── styles/          # Tailwind globals
├── database/
│   ├── schema.sql           # Base schema (12 tables + indexes)
│   └── migrations/
│       ├── 001_security_and_realtime.sql  # refresh_tokens, sessions, categories, notifications, full-text search
│       ├── 002_enterprise_features.sql    # account lockout, password_history, waitlist, drafts, sale periods, activity_log
│       ├── 003_password_reset.sql         # password_reset_tokens table
│       ├── 004_event_reminders.sql        # event_reminders table
│       └── 005_features.sql              # waitlist notified_at, affiliates, bank_details, refunds, location, toggles, commissions, organizer_status
├── docs/
│   └── REQUIREMENTS.md       # Full feature requirements
└── start.bat                # Launch both servers
```

---

## Database Schema (20+ tables + 1 view)

### Base Tables (schema.sql)
| Table | Purpose |
|-------|---------|
| `users` | Auth + profile (name, email, phone, bcrypt password, role) |
| `events` | Event details (title, date, venue, status, organizer FK) |
| `ticket_types` | Pricing tiers per event (price, quantity, available) |
| `orders` | Purchase transactions (total, payment_status, reference) |
| `order_items` | Line items within an order (ticket_type, qty, price) |
| `tickets` | Individual tickets (unique ticket_code, QR data URL, status, check-in) |
| `payments` | Payment records per order (provider, amount, status) |
| `commissions` | Platform fees per order (amount, percentage, status) |
| `discount_codes` | Promo codes (percentage/fixed, max uses, expiry) |
| `affiliates` | Referral tracking (referral_code, commission_rate, earnings) |
| `subscriptions` | Organizer plans (basic/professional, start/end dates) |
| `audit_logs` | Security event log (event_type, user_id, JSONB details, ip) |

### Migration 001 — Security & Realtime
| Table/Feature | Purpose |
|--------------|---------|
| `refresh_tokens` | JWT rotation (token hash, expiry, revoke flag) |
| `sessions` | Active sessions with last_activity + timeout tracking |
| `categories` | Event categories (music, conference, sports, church, community, workshop) |
| `notifications` | In-app notifications (type, is_read, reference_type/id) |
| `platform_settings` | Key-value config (commission %, plan pricing, platform name) |
| Full-text search | `tsvector` column + GIN index on events (title, description, venue) |
| `updated_at` triggers | Auto-update on users, events, orders, payments |

### Migration 002 — Enterprise Features
| Table/Feature | Purpose |
|--------------|---------|
| `users.*` | `failed_login_attempts`, `locked_until`, `password_changed_at`, `last_login_at` |
| `events.*` | `is_draft`, `scheduled_at`, `is_template`, `clone_source_id` |
| `ticket_types.*` | `sale_start`, `sale_end`, `max_per_order` |
| `waitlist` | Notification queue for sold-out events (status: waiting → notified → fulfilled) |
| `password_history` | Previous password hashes (enables "can't reuse last N passwords") |
| `activity_log` | Audit trail per user action (action, entity_type/id, JSONB details) |
| `event_sales_summary` | Materialized view — total_orders, tickets_sold, checked_in, revenue, avg_order_value, unique_buyers |

### Migration 003 — Password Reset
| Table/Feature | Purpose |
|--------------|---------|
| `password_reset_tokens` | Crypto-random reset tokens (SHA-256 hashed, 1-hour expiry) |

### Migration 004 — Event Reminders
| Table/Feature | Purpose |
|--------------|---------|
| `event_reminders` | Tracks sent reminders per user+event to prevent duplicates |

### Migration 005 — All Features
| Table/Feature | Purpose |
|--------------|---------|
| `waitlist.*` | `notified_at` column for tracking waitlist notification timing |
| `affiliate_orders` | Referral commission tracking per order |
| `bank_details` | Organizer bank info (bank_name, account_name, account_number, branch) |
| `refunds` | Full/partial refund requests and approvals (status, reason, processed_by) |
| `events.*` | `city`, `region` columns for location-based filtering |
| `ticket_types.*` | `is_active` column to enable/disable ticket types |
| `users.*` | `commission_override`, `organizer_status`, `reviewed_by`, `reviewed_at` for organizer approval workflow |

---

## Security Features

| Layer | Implementation | File / Mechanism |
|-------|---------------|------------------|
| **Password hashing** | bcryptjs with 12 salt rounds | `authController.js:register` |
| **JWT auth** | Access token (10min) + refresh token (7d) | `middlewares/auth.js` |
| **Token refresh** | /api/auth/refresh expires old refresh token | `authController.js:refresh` |
| **Session tracking** | SHA256 token hash in `sessions` table; last_activity updated per request | `middlewares/session.js` |
| **Inactivity timeout** | 10 min session timeout; 423 returned on expiry | `middlewares/session.js:checkSessionTimeout` |
| **Account lockout** | 5 failed logins → 15-min lock; auto-reset on success | `middlewares/accountLockout.js` |
| **Password history** | Old hash stored on change in `password_history` | `authController.js:changePassword` |
| **Rate limiting** | Auth 5/min, API 100/min, Scanner 300/min | `middlewares/rateLimiter.js` |
| **CSRF protection** | Double-submit cookie pattern (`x-csrf-token` header matches `csrf-token` cookie) | `middlewares/csrf.js` |
| **Input sanitization** | Strip HTML tags + trim all string inputs | `middlewares/sanitizer.js` |
| **Validation** | express-validator: email, phone (Zambian `0977...`), password length, event fields | `middlewares/validate.js` |
| **Helmet headers** | Security headers (CSP, X-Frame-Options, HSTS, etc.) | `app.js:helmet()` |
| **CORS** | Whitelist `FRONTEND_URL` only, credentials: true | `app.js:cors()` |
| **SQL injection** | Parameterized queries via `pg` (no raw string interpolation) | All queries |
| **PII encryption** | AES-256-GCM via `crypto.scryptSync` derived key | `utils/encryption.js` |
| **Audit logging** | All security events in `audit_logs` (failed/successful login, password change, admin action, system errors) | `utils/auditLogger.js` |
| **QR tickets** | Real `qrcode` npm package → base64 PNG data URL | `utils/qrGenerator.js` |
| **Concurrent purchase** | `SELECT ... FOR UPDATE` row lock on `ticket_types.available` | `ticketController.js:purchase` |
| **Sale period validation** | `sale_start` / `sale_end` / `max_per_order` checked per ticket type | `ticketController.js:purchase` |
| **Commission auto-calc** | Percentage from `platform_settings` on payment completion | `ticketController.js:paymentCallback` |
| **Socket.IO auth** | JWT verification in middleware; rooms per user (`user:{id}`) and event (`event:{id}`) | `config/socket.js` |
| **Graceful Redis degradation** | No crash if Redis unavailable; caching silently disabled | `config/redis.js`, `server.js` |

---

## API Routes

### Public
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | DB + Redis status with latency |
| GET | `/api/events` | Browse events (search, category filter, pagination) |
| GET | `/api/events/categories` | List categories |
| GET | `/api/events/:id` | Event detail + ticket types |

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | — | Register (customer/organizer) |
| POST | `/api/auth/login` | — | Login (rate limited, lockout-aware) |
| POST | `/api/auth/refresh` | — | Rotate refresh token |
| POST | `/api/auth/logout` | Bearer | Revoke session |
| GET | `/api/auth/me` | Bearer | Current user profile |
| PUT | `/api/auth/password` | Bearer | Change password (stores history) |
| POST | `/api/auth/forgot-password` | — | Send reset email with crypto token (Brevo) |
| POST | `/api/auth/reset-password` | — | Reset password using valid token |

### Events (Organizer)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/events/my-events` | organizer | List own events |
| POST | `/api/events` | organizer | Create event (with ticket types) |
| PUT | `/api/events/:id` | organizer | Update event |
| DELETE | `/api/events/:id` | organizer | Cancel event |
| POST | `/api/events/:id/clone` | organizer | Clone event as draft |
| PATCH | `/api/events/:id/publish` | organizer | Submit draft for approval |
| GET | `/api/events/:id/stats` | organizer/admin | Sales stats |

### Admin
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/admin/stats` | super_admin | Dashboard stats + growth + top 5 events |
| GET | `/api/admin/users` | super_admin | List users (search, role filter) |
| PATCH | `/api/admin/users/:id/status` | super_admin | Activate / deactivate user |
| GET | `/api/admin/events` | super_admin | List all events (status filter) |
| PATCH | `/api/events/:id/approve` | super_admin | Approve / reject event |
| GET | `/api/admin/commissions` | super_admin | List commissions |
| PATCH | `/api/admin/commissions/:id/pay` | super_admin | Mark commission paid |
| GET | `/api/admin/settings` | super_admin | Platform settings |
| PUT | `/api/admin/settings` | super_admin | Update platform settings |
| GET | `/api/admin/organizers` | super_admin | List all organizers (pending/approved/rejected) |
| PATCH | `/api/admin/organizers/:id/review` | super_admin | Approve / reject organizer registration |
| PATCH | `/api/admin/organizers/:id/commission` | super_admin | Set per-organizer commission override |
| GET | `/api/admin/subscriptions` | super_admin | View all organizer subscriptions |

### Tickets
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/tickets/purchase` | Bearer | Purchase (row-locks availability, validates sale period) |
| POST | `/api/tickets/payment-callback` | — | Payment webhook (generates tickets + QR + notification) |
| GET | `/api/tickets/my-tickets` | Bearer | User's tickets with QR codes |
| GET | `/api/tickets/download/:id` | Bearer | Download ticket as PDF (pdfkit, QR code, event details) |

### Organizer
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/organizer/stats` | organizer | Aggregate stats across events |
| GET | `/api/organizer/export/:event_id` | organizer | CSV attendee export with check-in data |
| GET | `/api/organizer/sales/:event_id` | organizer | Sales-over-time report |

### Scanner
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/scanner/validate` | Bearer | Validate ticket code + check-in |
| POST | `/api/scanner/check-in` | Bearer | Mark ticket as used |
| GET | `/api/scanner/sync/:event_id` | Bearer | Export all tickets for offline caching |
| POST | `/api/scanner/bulk-checkin` | Bearer | Sync batch of offline check-ins |

### Upload
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/upload` | organizer/super_admin | Upload image (JPEG/PNG/GIF/WebP, max 10MB) → returns Cloudinary secure URL |

### Notifications
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/notifications` | Bearer | List notifications (paginated) |
| PATCH | `/api/notifications/:id/read` | Bearer | Mark single as read |
| POST | `/api/notifications/read-all` | Bearer | Mark all as read |
| POST | `/api/notifications` | Bearer | Create notification |

### Extended Features (all via /api)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/events` | — | Browse events (add ?city= and ?region= for location filter) |
| POST | `/api/waitlist` | Bearer | Join waitlist for sold-out event |
| DELETE | `/api/waitlist/:id` | Bearer | Leave waitlist |
| GET | `/api/waitlist` | Bearer | Get my waitlist entries |
| GET | `/api/affiliate` | Bearer | Get referral code + earnings |
| GET | `/api/affiliate/orders` | Bearer | Get referral-linked orders |
| GET | `/api/subscription` | Bearer | Get my subscription |
| POST | `/api/subscription` | Bearer | Create subscription (basic/professional) |
| DELETE | `/api/subscription` | Bearer | Cancel subscription |
| POST | `/api/refunds` | Bearer | Request refund for an order |
| GET | `/api/refunds` | Bearer | Get my refund requests |
| PATCH | `/api/refunds/:id` | super_admin | Approve / reject / process refund |
| GET | `/api/profile` | Bearer | Get profile + bank details |
| PUT | `/api/profile` | Bearer | Update profile + bank details |
| GET | `/api/discount-codes` | organizer | List organizer's discount codes |
| POST | `/api/discount-codes` | organizer | Create discount code |
| PATCH | `/api/discount-codes/:id` | organizer | Update discount code |
| DELETE | `/api/discount-codes/:id` | organizer | Delete discount code |
| PATCH | `/api/ticket-types/:id/toggle` | organizer | Enable / disable ticket type |

---

## Frontend Routes

| Path | Page | Role |
|------|------|------|
| `/` | Home — search, category filter, location filter (city + region), paginated events | All |
| `/login` | Login with lockout message | All |
| `/register` | Registration | All |
| `/forgot-password` | Enter email to receive reset link | All |
| `/reset-password` | Set new password using token from URL | All |
| `/events/[id]` | Event detail, ticket type selection, discount code input, waitlist join, purchase with ConfirmDialog | All |
| `/tickets` | My tickets with expandable QR codes, PDF download, pagination, empty state | Customer |
| `/profile` | Profile + bank details + password change + notification bell | All |
| `/scanner` | Dark themed scanner — validate + check-in, offline mode with localStorage caching, bulk sync | Organizer/Admin |
| `/organizer/dashboard` | Stats cards, real-time ticket/event updates, revenue chart, status filter, draft creation, discounts link | Organizer |
| `/organizer/create` | Create/edit event form, category dropdown, multi-ticket type, city/region, sale period fields | Organizer |
| `/organizer/stats/[id]` | Sales report table + CSV export, recharts bar/pie charts (Revenue Over Time, Ticket Breakdown, Sold vs Available) | Organizer |
| `/organizer/discount-codes` | CRUD discount codes (create, activate/deactivate, delete) | Organizer |
| `/admin/dashboard` | 8 stat cards, top 5 events table, growth charts | Super Admin |
| `/admin/users` | User management — search, role filter, activate/deactivate | Super Admin |
| `/admin/events` | Event management — approve/reject, status filter, draft visibility | Super Admin |
| `/admin/organizers` | Approve/reject organizer registrations | Super Admin |
| `/admin/subscriptions` | View all organizer subscriptions (plan, amount, dates, status) | Super Admin |
| `/admin/settings` | Platform settings editor (commission %, plan pricing, etc.) | Super Admin |
| `/404` | Custom 404 page | All |

---

## How to Run

### Prerequisites
- Node.js 20+
- PostgreSQL 16 (or [Neon](https://neon.tech) serverless — free 500MB)
- Redis 7 (optional — server works without it)

### 1. Clone and install
```bash
cd event-ticketing
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Configure environment

**backend/.env** (see `.env.example` for template):
```
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
JWT_SECRET=<64-char hex>
SESSION_SECRET=<64-char hex>
CSRF_SECRET=<64-char hex>
ENCRYPTION_KEY=<32-char base64>
FRONTEND_URL=http://localhost:3000
PORT=5000
```

**frontend/.env.local**:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Create database tables
```bash
cd database
psql "$DATABASE_URL" -f schema.sql
psql "$DATABASE_URL" -f migrations/001_security_and_realtime.sql
psql "$DATABASE_URL" -f migrations/002_enterprise_features.sql
psql "$DATABASE_URL" -f seed.sql   # optional sample data
```

### 4. Run the app
```bash
# Option A: start.bat (Windows — opens two terminal windows)
start.bat

# Option B: manually
cd backend && node server.js    # http://localhost:5000
cd frontend && npm run dev      # http://localhost:3000
```

### 5. Verify
```bash
curl http://localhost:5000/api/health
# {"status":"degraded","services":{"database":{"status":"ok"},"redis":{"status":"error"}}}
```
Redis shows "error" if not running — this is safe and expected.

---

## Database Migrations

Run via the migrate runner:
```bash
cd backend
node migrate.js   # Reads from database/migrations/*.sql
```

Migration files must be numbered sequentially (`001_`, `002_`). A `migrations` table tracks which have been applied.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| JWT split (10min access + 7d refresh) | Short access tokens enforce session timeout without server-side state; refresh rotates on use |
| Sessions in PostgreSQL (not Redis) | Audit trail, durability, no extra infra dependency |
| Token SHA256 in DB | Raw token never persisted — hash stored for lookup |
| CSRF double-submit cookie | Stateless, horizontally scalable |
| `FOR UPDATE` row lock | Prevents overselling without pessimistic locking overhead |
| Socket.IO rooms per user & per event | Targeted real-time push without broadcasting |
| Graceful Redis degradation | Caching is a perf optimization, not a requirement |
| AES-256-GCM for PII | Authenticated encryption prevents tampering |
| PDFKit for ticket PDFs | Zero headless-browser dependency; simpler deployment than Puppeteer |
| Recharts for sales charts | React-native component model, easy tooltip/label support |
| Single migration + controller for feature batch | All 11 nice-to-have features in one `005_features.sql` migration and one `extendController.js` to avoid file sprawl |
| Scanner offline uses localStorage | Simpler than IndexedDB; syncs all event tickets in one request |
| Discount codes case-insensitive | `UPPER()` on insert so codes match regardless of case |
| Polling-first Socket.IO transport | Render free tier blocks WebSocket upgrade; falls back to polling |

---

## Real-Time Events (Socket.IO)

| Event | Direction | Description |
|-------|-----------|-------------|
| `notification` | Server → User | New in-app notification |
| `payment:completed` | Server → User | Purchase confirmed, ticket ready |
| `event:status_changed` | Server → Event room | Event approved/rejected/cancelled |
| `ticket_sold` | Server → Event room | Live ticket sale counter update |
| `organizer-status` | Server → User | Organizer registration approved/rejected |
| `event-status` | Server → User | Event approved/rejected by admin |
| `payment-failed` | Server → User | Payment processing failed |

---

## Known Gaps

- **Mobile Money APIs** — MTN/Airtel/Zamtel are stubbed (return `{ success: true }`). No real payment requests are sent. Callback endpoint (`POST /api/tickets/payment-callback`) is ready but never triggered. Tickets won't auto-generate until live API keys are configured.
- **QR camera scanning** — Scanner page uses manual text input only. Camera integration (`navigator.mediaDevices.getUserMedia`) is not implemented.
- **Payment timeout & retry** — No retry logic for failed/timeout payment requests.
- **SMS delivery** — `backend/src/services/sms.js` logs to console only. Needs Africa's Talking or Twilio API key.
- **Payment failure notification** — Organizer is not persistently notified on payment failure (only transient socket event to buyer).
- **Banner image upload** — Cloudinary upload endpoint (`POST /api/upload`) is wired. Frontend upload UI is in the create/edit event form.
- **Seed users** — Bcrypt hashes in `seed.sql` are hardcoded placeholders. Register fresh accounts instead.
- **Redis** — Optional. Server runs fine without it; caching is disabled.
