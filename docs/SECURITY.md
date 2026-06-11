# Security Implementation Guide

## Overview
All security measures implemented in this ticketing system following OWASP guidelines and industry best practices.

## 17 Security Measures Implemented

### 1. Password Hashing (bcrypt)
- **Implementation**: `src/controllers/authController.js:17`
- Passwords hashed with bcrypt (salt rounds: 12)
- Never stored in plain text
- Uses `bcryptjs` library

### 2. HTTPS Enforcement
- Configured via `helmet()` middleware in `src/app.js:14`
- HSTS headers set automatically
- Backend behind reverse proxy with SSL termination

### 3. SQL Injection Protection
- **Implementation**: All database queries use parameterized `$1, $2` syntax
- Example: `src/controllers/authController.js:9-11`
- No string concatenation in SQL queries

### 4. Environment Variables
- **File**: `.env` (gitignored)
- Database credentials
- JWT secrets
- Payment API keys
- Email/SMS credentials
- Encryption keys

### 5. Role-Based Authorization
- **Implementation**: `src/middlewares/auth.js:19-24`
- Three roles: `super_admin`, `organizer`, `customer`
- Each role restricted to specific operations
- Granular permission checks on every protected route

### 6. JWT Authentication
- **Implementation**: `src/middlewares/auth.js`
- Tokens expire after configured period (default: 7 days)
- Strong JWT secret stored in environment variable
- Every protected route validates the token
- 401 responses trigger auto-logout on frontend

### 7. Input Validation
- **Implementation**: `src/middlewares/validate.js`
- All inputs validated before processing
- Email format validation
- Phone number format (Zambian format: 0977XXXXXX)
- Password length requirements (8-128 chars)
- Event fields validated (title, date, time, price, quantity)
- XSS prevention via HTML tag stripping

### 8. XSS Protection
- **Implementation**: `src/middlewares/sanitizer.js`
- `helmet()` middleware sets XSS protection headers
- All user input sanitized: HTML tags stripped via regex
- Content-Type headers enforced

### 9. Rate Limiting
- **Implementation**: `src/middlewares/rateLimiter.js`
- Auth endpoints: 5 requests/minute
- General API: 100 requests/minute
- Scanner endpoints: 300 requests/minute
- Prevents brute-force and DoS attacks

### 10. Database Security
- PostgreSQL with parameterized queries
- Separate database user with limited permissions
- Database not exposed publicly (localhost only)
- UUID primary keys prevent ID enumeration
- Prepared statements prevent injection

### 11. Automated Backups
- Daily database backups configured
- Stored in separate secure location
- Backup restoration tested regularly

### 12. Data Encryption
- **Implementation**: `src/utils/encryption.js`
- AES-256-GCM encryption for sensitive data
- Phone numbers and personal data encrypted at rest
- Key derived from ENCRYPTION_KEY via scrypt

### 13. File Upload Security
- File size limited via `express.json({ limit: '1mb' })`
- Only base64 encoded images accepted (no direct file uploads)
- File types restricted through validation

### 14. Dependency Auditing
- Regular `npm audit` runs recommended
- All packages use `^` semver for security patches
- Helmet, express-rate-limit, express-validator added for security

### 15. Security Event Logging
- **Implementation**: `src/utils/auditLogger.js`
- Failed login attempts logged with IP
- Successful logins tracked
- Admin actions audited
- Payment callbacks logged
- Logs stored in `audit_logs` table
- No sensitive data (passwords) ever logged

### 16. QR Code Security
- **Implementation**: `src/utils/ticketCode.js`
- Unique codes: `EVT-2026-XXXXXXXX` (8 random hex chars)
- No PII encoded in QR codes
- Server-side validation on every scan
- Duplicate ticket detection

### 17. Principle of Least Privilege
- Scanner staff: validate tickets only
- Organizers: manage only their events
- Customers: view/purchase only
- Super Admin: platform management

## Additional Security Headers (via Helmet)
- Content Security Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- Referrer-Policy

## Frontend Security
- Input sanitization before sending to API
- JWT stored in localStorage with auto-clear on 401
- No sensitive data in URL parameters
- Error messages don't leak system details

## Payment Security
- MTN, Airtel, Zamtel API keys in environment variables
- Payment callbacks logged and validated
- Transaction references tracked for audit
- No credit card data stored (Mobile Money only)
