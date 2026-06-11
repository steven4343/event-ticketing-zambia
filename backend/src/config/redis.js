const Redis = require('ioredis');

let retryCount = 0;
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryStrategy: (times) => {
    retryCount++;
    if (retryCount > 5) {
      console.warn('Redis unavailable - caching disabled permanently for this session');
      return null;
    }
    return Math.min(times * 200, 3000);
  },
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  lazyConnect: true,
});

redis.on('error', () => {});

redis.on('connect', () => {
  console.log('Redis connected');
  retryCount = 0;
});

const CACHE_TTL = {
  EVENTS_LIST: 60,
  EVENT_DETAIL: 120,
  STATS: 30,
  USER: 300,
};

const getOrSetCache = async (key, ttl, fetchFn) => {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch {}
  const data = await fetchFn();
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch {}
  return data;
};

const invalidateCache = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {}
};

module.exports = { redis, getOrSetCache, invalidateCache, CACHE_TTL };
