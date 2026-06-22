require('dotenv').config();
const http = require('http');
const cron = require('node-cron');
const app = require('./src/app');
const pool = require('./src/config/database');
const { initSocket } = require('./src/config/socket');
const { redis } = require('./src/config/redis');
const { sendEventReminders } = require('./src/services/reminder');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initSocket(server);

pool.connect()
  .then((client) => {
    console.log('Connected to PostgreSQL');
    client.release();

    redis.connect().then(() => {
      console.log('Redis connected');
    }).catch(() => {
      console.warn('Redis unavailable - caching disabled');
    });

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    cron.schedule('0 * * * *', () => {
      sendEventReminders();
    });
    console.log('Event reminder cron scheduled (hourly)');
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await pool.end();
  try { redis.disconnect(); } catch {}
  server.close(() => process.exit(0));
});
