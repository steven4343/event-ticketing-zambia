# Event Ticketing System - Requirements Specification

## 1. Functional Requirements

### 1.1 User Management
| ID | Requirement | Priority |
|----|------------|----------|
| FR-001 | System shall support three roles: Super Admin, Event Organizer, Customer | High |
| FR-002 | Users shall register with name, email, phone, and password | High |
| FR-003 | Users shall log in using email/phone and password | High |
| FR-004 | Users shall reset their password via email/SMS OTP | Medium |
| FR-005 | Super Admin shall approve/reject organizer registrations | High |
| FR-006 | Organizers shall update their profile and bank details | Low |

### 1.2 Event Management
| ID | Requirement | Priority |
|----|------------|----------|
| FR-007 | Organizer shall create events with title, description, venue, date, time, banner | High |
| FR-008 | Organizer shall define multiple ticket types (VIP, Regular, Early Bird) | High |
| FR-009 | Organizer shall set ticket price, quantity, and availability per ticket type | High |
| FR-010 | Organizer shall edit event details before approval | Medium |
| FR-011 | Organizer shall cancel an event and trigger refunds | Medium |
| FR-012 | Events shall be approved by Super Admin before going live | High |
| FR-013 | Customers shall browse all approved events | High |
| FR-014 | Customers shall filter events by date, category, location | Medium |

### 1.3 Ticket Purchase Flow
| ID | Requirement | Priority |
|----|------------|----------|
| FR-015 | Customer shall select event and ticket type(s) | High |
| FR-016 | Customer shall enter quantity of tickets per type | High |
| FR-017 | System shall calculate total amount (price × quantity + platform fee) | High |
| FR-018 | Customer shall enter phone number for payment | High |
| FR-019 | System shall send Mobile Money payment request to customer's phone | High |
| FR-020 | Customer shall approve payment on their phone | High |
| FR-021 | System shall receive payment callback and verify transaction | High |
| FR-022 | System shall generate unique ticket(s) with QR code on payment success | High |
| FR-023 | System shall send ticket to customer via email and SMS | High |
| FR-024 | Customer shall view all purchased tickets in their dashboard | High |
| FR-025 | Customer shall download tickets as PDF | Medium |

### 1.4 Ticket Types
| ID | Requirement | Priority |
|----|------------|----------|
| FR-026 | Organizer shall define ticket type name, price, quantity | High |
| FR-027 | System shall track available tickets per type | High |
| FR-028 | System shall prevent over-selling beyond available quantity | High |
| FR-029 | Organizer shall set ticket sale start and end dates | Medium |
| FR-030 | Organizer shall enable/disable specific ticket types | Medium |

### 1.5 QR Code & Entry Management
| ID | Requirement | Priority |
|----|------------|----------|
| FR-031 | Each ticket shall have a unique QR code | High |
| FR-032 | QR code shall encode ticket ID, event ID, and unique code | High |
| FR-033 | Scanner app shall scan QR code and send to API for validation | High |
| FR-034 | API shall return ticket status: valid, already used, cancelled, or invalid | High |
| FR-035 | Scanner shall display attendee name and ticket type on valid scan | High |
| FR-036 | System shall mark ticket as used on successful entry | High |
| FR-037 | System shall prevent duplicate entry with the same ticket | High |
| FR-038 | Scanner shall work offline with cached ticket data | Low |

### 1.6 Payment Integration
| ID | Requirement | Priority |
|----|------------|----------|
| FR-039 | System shall integrate with MTN Mobile Money API | High |
| FR-040 | System shall integrate with Airtel Money API | High |
| FR-041 | System shall integrate with Zamtel Kwacha API | High |
| FR-042 | System shall handle payment timeout and retry logic | High |
| FR-043 | System shall store transaction reference for auditing | High |
| FR-044 | System shall support full and partial refunds | Medium |

### 1.7 Organizer Dashboard
| ID | Requirement | Priority |
|----|------------|----------|
| FR-045 | Organizer shall view total tickets sold per event | High |
| FR-046 | Organizer shall view total revenue per event | High |
| FR-047 | Organizer shall view number of check-ins per event | High |
| FR-048 | Organizer shall view tickets remaining per ticket type | High |
| FR-049 | Organizer shall export attendee list as CSV/Excel | Medium |
| FR-050 | Organizer shall view sales graphs over time | Medium |

### 1.8 Super Admin Dashboard
| ID | Requirement | Priority |
|----|------------|----------|
| FR-051 | Super Admin shall view all organizers and events | High |
| FR-052 | Super Admin shall approve/reject new events | High |
| FR-053 | Super Admin shall view platform-wide sales statistics | High |
| FR-054 | Super Admin shall manage commission rates per organizer | Medium |
| FR-055 | Super Admin shall view subscription status of organizers | Medium |

### 1.9 Notifications
| ID | Requirement | Priority |
|----|------------|----------|
| FR-056 | System shall send ticket confirmation via SMS | High |
| FR-057 | System shall send ticket confirmation via email | High |
| FR-058 | System shall send event reminder 24 hours before event | Medium |
| FR-059 | System shall notify organizer of new ticket sales | Low |
| FR-060 | System shall notify organizer of payment failure | Medium |

### 1.10 Discount Codes
| ID | Requirement | Priority |
|----|------------|----------|
| FR-061 | Organizer shall create discount codes for events | Medium |
| FR-062 | Discount shall be percentage-based or fixed amount | Medium |
| FR-063 | Discount code shall have usage limit and expiry date | Medium |
| FR-064 | System shall validate discount code at checkout | Medium |

### 1.11 Affiliate / Referral System
| ID | Requirement | Priority |
|----|------------|----------|
| FR-065 | Customers shall receive a unique referral code | Low |
| FR-066 | Referrer shall earn commission on referred ticket sales | Low |
| FR-067 | Referral commission shall be configurable per organizer | Low |

## 2. Non-Functional Requirements

| ID | Requirement | Category |
|----|------------|----------|
| NFR-001 | System shall handle 1,000+ concurrent users | Performance |
| NFR-002 | API response time shall be < 500ms for 95% of requests | Performance |
| NFR-003 | QR code scan validation shall complete in < 1 second | Performance |
| NFR-004 | System shall be available 99.9% of the time | Reliability |
| NFR-005 | All API endpoints shall require authentication (except public browse) | Security |
| NFR-006 | Passwords shall be hashed using bcrypt | Security |
| NFR-007 | JWT tokens shall expire after 7 days | Security |
| NFR-008 | Payment callbacks shall validate HMAC signatures | Security |
| NFR-009 | System shall prevent SQL injection via parameterized queries | Security |
| NFR-010 | System shall rate-limit API requests to prevent abuse | Security |
| NFR-011 | System shall log all payment transactions for audit | Security |
| NFR-012 | Mobile Money API keys shall be stored in environment variables | Security |
| NFR-013 | System shall be scalable horizontally for growing user base | Scalability |
| NFR-014 | Frontend shall work on mobile browsers (responsive design) | Usability |
| NFR-015 | Scanner interface shall work on any device with a camera | Usability |

## 3. Hardware / Infrastructure Requirements

| Component | Requirement |
|-----------|------------|
| Server | VPS with at least 2 vCPUs, 4GB RAM, 50GB SSD |
| Database | PostgreSQL 14+ with 2GB+ memory allocation |
| Storage | Cloudinary or similar CDN for event banners and ticket images |
| Backup | Daily automated database backups |
| Domain | SSL certificate required for HTTPS |
| SMS Gateway | Africa's Talking, Twilio, or local provider |
| Email Service | SMTP server or SendGrid/Mailgun |

## 4. Mobile Money Integration Requirements

### MTN MoMo
- Register as a developer on MTN MoMo API
- Obtain API key and API secret
- Configure callback URL for payment notifications
- Support collection requests (request to pay)
- Handle transaction status callbacks

### Airtel Money
- Register as a developer on Airtel Money API
- Obtain client ID and client secret
- Configure webhook URL for payment notifications
- Support payment requests
- Handle IPN (Instant Payment Notification)

### Zamtel Kwacha
- Register as a developer on Zamtel payment API
- Obtain API credentials
- Configure callback endpoint
- Support payment initiation and verification

## 5. Workflow Requirements

### 5.1 Event Approval Workflow
```
Organizer Creates Event
        ↓
Super Admin Reviews Event
        ↓
  ┌─────┴─────┐
  │            │
Approved    Rejected
  │            │
  ↓            ↓
Event       Organizer
Goes Live   Edits & Resubmits
```

### 5.2 Ticket Purchase Workflow
```
Customer Browses Events
        ↓
Customer Selects Event
        ↓
Customer Chooses Ticket Type & Quantity
        ↓
Customer Enters Phone Number
        ↓
System Sends Payment Request via Mobile Money
        ↓
Customer Approves on Phone
        ↓
  ┌─────┴─────┐
  │            │
Success      Failed
  │            │
  ↓            ↓
Generate    Show Error
QR Tickets  & Retry
  │
  ↓
Send Tickets via Email & SMS
```

### 5.3 Entry Scanning Workflow
```
Attendant Presents QR Code
        ↓
Staff Opens Scanner App
        ↓
Staff Scans QR Code
        ↓
API Validates Ticket
        ↓
  ┌─────┴─────┐
  │            │
Valid       Invalid
  │            │
  ↓            ↓
Show:       Show:
✓ Name      ✗ Used/Cancelled
✓ Ticket    or Invalid
Allow Entry Reject Entry
        │
        ↓
Mark Ticket as Used
```

## 6. Data Requirements

| Data Entity | Required Fields | Storage |
|-------------|----------------|---------|
| User | name, email, phone, password, role | Database |
| Event | title, description, venue, date, time, organizer | Database + Cloudinary |
| Ticket Type | event_id, name, price, quantity, available | Database |
| Order | user_id, event_id, total, payment_status | Database |
| Ticket | order_id, ticket_code, qr_code, status | Database + Base64 |
| Payment | order_id, provider, amount, transaction_id, status | Database |
| Commission | order_id, organizer_id, amount, percentage | Database |
| Subscription | organizer_id, plan, amount, start/end dates | Database |

## 7. Revenue Model Requirements

### Commission Per Ticket
- Platform fee: K2–K10 per ticket (configurable)
- Fee deducted at point of sale
- Organizer receives ticket price minus platform fee
- Monthly settlement to organizer's mobile money or bank account

### Monthly Subscription
- Basic Plan: K100/month (up to 5 events, 500 tickets/event)
- Professional Plan: K300/month (unlimited events, unlimited tickets)
- Includes premium features: analytics, CSV export, discount codes

### Setup Fee (Optional Service)
- Basic Setup: K500 (event configuration, ticket types, go-live)
- Premium Setup: K2,000 (includes banner design, promo setup, staff training)
