import Redis from 'ioredis';
import { getConfig } from './index.js';

let redisClient: Redis | null = null;

/**
 * Creates a Redis client with connection pooling and retry strategy.
 */
export function createRedisClient(): Redis {
  const config = getConfig();
  
  const client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) {
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
  });

  client.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  client.on('connect', () => {
    console.debug('Redis connected');
  });

  return client;
}

/**
 * Returns the singleton Redis client.
 * Creates it on first access.
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

/**
 * Gracefully closes the Redis connection.
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}