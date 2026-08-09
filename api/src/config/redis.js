const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL;

let redisClient = null;

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) {
          console.warn('Redis reconnection retries exhausted. Running in fallback mode.');
          return null;
        }
        return Math.min(times * 100, 2000);
      },
    });

    redisClient.on('connect', () => console.log('Connected to Valkey/Redis'));
    redisClient.on('error', (err) => console.warn('Valkey/Redis warning:', err.message));
  } catch (err) {
    console.warn('Failed to initialize Redis client:', err.message);
  }
}

// In-memory fallback if Redis is unavailable during local dev
const memoryStore = new Map();

const cache = {
  async get(key) {
    if (redisClient && redisClient.status === 'ready') {
      try {
        return await redisClient.get(key);
      } catch (err) {
        console.warn('Redis get error, falling back:', err.message);
      }
    }
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key, value, ttlSeconds = 86400) {
    if (redisClient && redisClient.status === 'ready') {
      try {
        return await redisClient.set(key, value, 'EX', ttlSeconds);
      } catch (err) {
        console.warn('Redis set error, falling back:', err.message);
      }
    }
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    memoryStore.set(key, { value, expiry });
    return 'OK';
  },

  async del(key) {
    if (redisClient && redisClient.status === 'ready') {
      try {
        return await redisClient.del(key);
      } catch (err) {
        console.warn('Redis del error:', err.message);
      }
    }
    return memoryStore.delete(key) ? 1 : 0;
  },

  async incr(key, ttlSeconds = 60) {
    if (redisClient && redisClient.status === 'ready') {
      try {
        const multi = redisClient.multi();
        multi.incr(key);
        multi.expire(key, ttlSeconds);
        const results = await multi.exec();
        return results[0][1];
      } catch (err) {
        console.warn('Redis incr error:', err.message);
      }
    }
    const item = memoryStore.get(key);
    let val = 1;
    let expiry = Date.now() + ttlSeconds * 1000;
    if (item && Date.now() <= item.expiry) {
      val = parseInt(item.value, 10) + 1;
      expiry = item.expiry;
    }
    memoryStore.set(key, { value: val.toString(), expiry });
    return val;
  }
};

module.exports = cache;
