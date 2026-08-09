const cache = require('../config/redis');

async function idempotency(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    return next();
  }

  const merchantId = req.merchant ? req.merchant.id : 'anon';
  const cacheKey = `idempotency:${merchantId}:${idempotencyKey}`;

  try {
    const cachedResponse = await cache.get(cacheKey);

    if (cachedResponse) {
      const parsed = JSON.parse(cachedResponse);
      res.setHeader('X-Idempotent-Replay', 'true');
      return res.status(parsed.statusCode).json(parsed.body);
    }

    // Intercept res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, JSON.stringify({
          statusCode: res.statusCode,
          body,
        }), 86400).catch(err => console.warn('Failed to cache idempotency response:', err));
      }
      return originalJson(body);
    };

    req.idempotencyKey = idempotencyKey;
    next();
  } catch (err) {
    console.warn('Idempotency middleware error, proceeding standard execution:', err);
    next();
  }
}

module.exports = idempotency;
