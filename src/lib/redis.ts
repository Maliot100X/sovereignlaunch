import { Redis } from 'ioredis';

// Redis connection for Linode 2 server
const redisUrl = process.env.REDIS_URL || 'redis://192.155.85.109:6379';

let redis: Redis;

if (typeof window === 'undefined') {
  // Server-side only
  redis = new Redis(redisUrl, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redis.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });

  redis.on('error', (err) => {
    console.error('[Redis] Error:', err.message);
  });
} else {
  // Client-side placeholder (should never be used)
  redis = new Redis();
}

export default redis;
