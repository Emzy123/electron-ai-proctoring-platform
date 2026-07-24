const rateLimit = require('express-rate-limit');
const { getRedis } = require('./nonce');

const createRateLimiter = (windowMs, max, keyGenerator) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator: keyGenerator || ((req) => req.user?._id?.toString() || req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later' },
  });

const globalLimiter = createRateLimiter(15 * 60 * 1000, 1000);
const authLimiter = createRateLimiter(15 * 60 * 1000, 20, (req) => req.ip);
const examLimiter = createRateLimiter(60 * 1000, 120);

const tenantRateLimit = async (req, res, next) => {
  if (!req.user?.tenantId) return next();
  try {
    const redis = getRedis();
    const key = `tenant:${req.user.tenantId}:rate`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    const quota = req.tenantQuota || 1000;
    if (count > quota) {
      return res.status(429).json({ message: 'Tenant rate limit exceeded' });
    }
    next();
  } catch {
    next();
  }
};

module.exports = { globalLimiter, authLimiter, examLimiter, tenantRateLimit, createRateLimiter };
