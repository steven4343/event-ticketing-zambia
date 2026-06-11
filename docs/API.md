# Event Ticketing System - API Specification

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints except login/register require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Auth Endpoints

### POST /auth/register
Register a new user.

**Request:**
```json
{
  "name": "John Banda",
  "email": "john@example.com",
  "phone": "0977000000",
  "password": "securepass123",
  "role": "customer"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "name": "John Banda",
    "email": "john@example.com",
    "phone": "0977000000",
    "role": "customer"
  },
  "token": "jwt_token_here"
}
```

### POST /auth/login
Authenticate a user.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response (200):**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "name": "John Banda",
    "email": "john@example.com",
    "phone": "0977000000",
    "role": "customer"
  }
}
```

### GET /auth/me
Get current user profile.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "John Banda",
  "email": "john@example.com",
  "phone": "0977000000",
  "role": "customer"
}
```

---

## Event Endpoints

### GET /events
Browse all approved events.

**Query Parameters:**
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `category` (string, optional)
- `date_from` (date, optional)
- `date_to` (date, optional)
- `search` (string, optional - search title/venue)

**Response (200):**
```json
{
  "events": [
    {
      "id": "uuid",
      "title": "UNZA Music Festival",
      "description": "Annual music festival...",
      "venue": "UNZA Great Hall",
      "event_date": "2026-07-15",
      "event_time": "14:00",
      "banner_image": "https://cloudinary.com/...",
      "organizer": {
        "name": "Events Co."
      },
      "ticket_types": [
        {
          "id": "uuid",
          "name": "VIP",
          "price": 500.00,
          "available": 50
        },
        {
          "id": "uuid",
          "name": "Regular",
          "price": 150.00,
          "available": 200
        }
      ]
    }
  ],
  "total": 45,
  "page": 1,
  "pages": 3
}
```

### GET /events/:id
Get event details.

**Response (200):**
```json
{
  "id": "uuid",
  "title": "UNZA Music Festival",
  "description": "Annual music festival...",
  "venue": "UNZA Great Hall",
  "event_date": "2026-07-15",
  "event_time": "14:00",
  "banner_image": "https://cloudinary.com/...",
  "status": "approved",
  "organizer": {
    "id": "uuid",
    "name": "Events Co.",
    "phone": "0977111111"
  },
  "ticket_types": [
    {
      "id": "uuid",
      "name": "VIP",
      "price": 500.00,
      "quantity": 100,
      "available": 50
    },
    {
      "id": "uuid",
      "name": "Regular",
      "price": 150.00,
      "quantity": 500,
      "available": 200
    }
  ]
}
```

### POST /events (Organizer)
Create a new event.

**Request:**
```json
{
  "title": "UNZA Music Festival",
  "description": "Annual music festival featuring top Zambian artists",
  "venue": "UNZA Great Hall, Lusaka",
  "event_date": "2026-07-15",
  "event_time": "14:00",
  "banner_image": "data:image/png;base64,...",
  "ticket_types": [
    {
      "name": "VIP",
      "price": 500.00,
      "quantity": 100,
      "description": "Front row seating + refreshments"
    },
    {
      "name": "Regular",
      "price": 150.00,
      "quantity": 500,
      "description": "Standard entry"
    }
  ]
}
```

**Response (201):**
```json
{
  "message": "Event created successfully",
  "event": {
    "id": "uuid",
    "title": "UNZA Music Festival",
    "status": "pending"
  }
}
```

### PUT /events/:id (Organizer)
Update event details.

### DELETE /events/:id (Organizer)
Cancel an event.

### PATCH /events/:id/approve (Super Admin)
Approve or reject an event.

**Request:**
```json
{
  "status": "approved"
}
```

---

## Ticket Purchase Endpoints

### POST /tickets/purchase
Purchase tickets for an event.

**Request:**
```json
{
  "event_id": "uuid",
  "tickets": [
    {
      "ticket_type_id": "uuid",
      "quantity": 2
    },
    {
      "ticket_type_id": "uuid",
      "quantity": 1
    }
  ],
  "payment_provider": "mtn",
  "phone": "0977000000",
  "discount_code": "WELCOME10"
}
```

**Response (201):**
```json
{
  "message": "Payment request sent. Approve on your phone.",
  "order_id": "uuid",
  "total_amount": 650.00,
  "transaction_reference": "REF-2026-ABCD"
}
```

### POST /tickets/payment-callback
Callback endpoint for payment providers.

**Request (provider-dependent):**
```json
{
  "transaction_id": "MTN-REF-2026-ABCD",
  "status": "completed",
  "provider": "mtn"
}
```

**Response (200):**
```json
{
  "message": "Payment confirmed. Tickets generated.",
  "tickets": [
    {
      "ticket_code": "EVT-2026-ABCD1234",
      "qr_code": "data:image/png;base64,...",
      "ticket_type": "VIP"
    }
  ]
}
```

### GET /tickets/my-tickets (Customer)
Get all tickets for the logged-in customer.

**Response (200):**
```json
{
  "tickets": [
    {
      "id": "uuid",
      "ticket_code": "EVT-2026-ABCD1234",
      "status": "active",
      "event": {
        "title": "UNZA Music Festival",
        "date": "2026-07-15",
        "venue": "UNZA Great Hall"
      },
      "ticket_type": {
        "name": "VIP"
      },
      "qr_code": "data:image/png;base64,..."
    }
  ]
}
```

---

## Scanner Endpoints

### POST /scanner/validate
Validate a ticket by scanning QR code.

**Request:**
```json
{
  "ticket_code": "EVT-2026-ABCD1234"
}
```

**Response (200 - Valid):**
```json
{
  "valid": true,
  "ticket": {
    "ticket_code": "EVT-2026-ABCD1234",
    "attendee_name": "John Banda",
    "event_title": "UNZA Music Festival",
    "ticket_type": "VIP",
    "status": "active"
  },
  "message": "Valid ticket. Entry allowed."
}
```

**Response (200 - Already Used):**
```json
{
  "valid": false,
  "ticket": {
    "ticket_code": "EVT-2026-ABCD1234",
    "attendee_name": "John Banda",
    "checked_in_at": "2026-07-15T14:30:00Z"
  },
  "message": "Ticket already used."
}
```

**Response (200 - Invalid):**
```json
{
  "valid": false,
  "message": "Invalid ticket code."
}
```

### POST /scanner/check-in
Check in an attendee (mark ticket as used).

**Request:**
```json
{
  "ticket_code": "EVT-2026-ABCD1234"
}
```

**Response (200):**
```json
{
  "message": "Check-in successful",
  "attendee_name": "John Banda",
  "ticket_type": "VIP"
}
```

---

## Organizer Dashboard Endpoints

### GET /organizer/stats/:event_id
Get sales statistics for an event.

**Response (200):**
```json
{
  "event_title": "UNZA Music Festival",
  "total_tickets_sold": 523,
  "total_revenue": 52300.00,
  "checked_in": 412,
  "tickets_remaining": 77,
  "sales_by_type": [
    {
      "type": "VIP",
      "sold": 50,
      "revenue": 25000.00
    },
    {
      "type": "Regular",
      "sold": 473,
      "revenue": 70950.00
    }
  ]
}
```

### GET /organizer/export/:event_id
Export attendee list.

**Response (200):** CSV file with headers:
```
Ticket Code, Attendee Name, Email, Phone, Ticket Type, Status, Checked In At
```

---

## Payment Endpoints

### POST /payments/request
Initiate a mobile money payment request.

**Request:**
```json
{
  "order_id": "uuid",
  "provider": "mtn",
  "amount": 650.00,
  "phone": "0977000000"
}
```

**Response (200):**
```json
{
  "message": "Payment request sent",
  "transaction_id": "MTN-REF-2026-ABCD"
}
```

### GET /payments/status/:order_id
Check payment status.

**Response (200):**
```json
{
  "order_id": "uuid",
  "payment_status": "completed",
  "transaction_reference": "MTN-REF-2026-ABCD"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": [
    { "field": "email", "message": "Valid email is required" }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Access denied. No token provided."
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden. Insufficient permissions."
}
```

### 404 Not Found
```json
{
  "error": "Event not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## HTTP Status Codes Used

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (e.g., over-selling) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |
