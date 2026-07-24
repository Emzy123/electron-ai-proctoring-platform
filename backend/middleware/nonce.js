const Redis = require('ioredis');

let redis = null;

const getRedis = () => {
  if (redis) return redis;
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  redis = new Redis(url, { maxRetriesPerRequest: 3 });
  redis.on('error', (err) => console.warn('Redis error:', err.message));
  return redis;
};

const nonceCheck = async (req, res, next) => {
  const nonce = req.headers['x-request-nonce'];
  if (!nonce) {
    return res.status(400).json({ message: 'Missing request nonce' });
  }

  try {
    const client = getRedis();
    const key = `nonce:${nonce}`;
    const exists = await client.get(key);
    if (exists) {
      return res.status(409).json({ message: 'Replay attack detected' });
    }
    await client.setex(key, 300, '1');
    next();
  } catch {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ message: 'Security service unavailable' });
    }
    next();
  }
};

module.exports = { getRedis, nonceCheck };
