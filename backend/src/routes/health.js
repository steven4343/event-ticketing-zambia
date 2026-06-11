const express = require('express');
const router = express.Router();
const pool = require('../config/database');

let redisClient;
try { redisClient = require('../config/redis'); } catch { }

router.get('/', async (req, res) => {
  const status = { status: 'ok', timestamp: new Date().toISOString(), services: {} };

  try {
    await pool.query('SELECT 1');
    status.services.database = { status: 'ok', latency: null };
  } catch (error) {
    status.status = 'degraded';
    status.services.database = { status: 'error', message: error.message };
  }

  if (redisClient) {
    try {
      const start = Date.now();
      await redisClient.redis.ping();
      status.services.redis = { status: 'ok', latency: Date.now() - start };
    } catch (error) {
      status.status = 'degraded';
      status.services.redis = { status: 'error', message: error.message };
    }
  }

  const httpCode = status.status === 'ok' ? 200 : 503;
  res.status(httpCode).json(status);
});

module.exports = router;
