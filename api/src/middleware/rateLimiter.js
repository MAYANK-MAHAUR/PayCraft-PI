const cache = require('../config/redis');
const { TooManyRequestsError } = require('../utils/errors');

function rateLimiter(options = {}) {
  const windowSeconds = options.windowSeconds || 60;
  const maxRequests = options.maxRequests || 100;

  return async (req, res, next) => {
    try {
      const identifier = req.apiKey ? req.apiKey.id : req.ip;
      const key = `ratelimit:${identifier}`;

      const count = await cache.incr(key, windowSeconds);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count));

      if (count > maxRequests) {
        res.setHeader('Retry-After', windowSeconds);
        throw new TooManyRequestsError(`Rate limit exceeded (${maxRequests} reqs/${windowSeconds}s).`, windowSeconds);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = rateLimiter;
