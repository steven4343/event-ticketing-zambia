const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middlewares/errorHandler');
const { sanitizeInput } = require('./middlewares/sanitizer');
const { apiLimiter, authLimiter, scannerLimiter } = require('./middlewares/rateLimiter');
const { setCsrfCookie, csrfProtection } = require('./middlewares/csrf');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const ticketRoutes = require('./routes/tickets');
const paymentRoutes = require('./routes/payments');
const scannerRoutes = require('./routes/scanner');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const organizerRoutes = require('./routes/organizer');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use(setCsrfCookie);
app.use('/api', apiLimiter);

app.use('/api/health', healthRoutes);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/scanner', scannerLimiter, scannerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/organizer', organizerRoutes);

app.use(errorHandler);

module.exports = app;
