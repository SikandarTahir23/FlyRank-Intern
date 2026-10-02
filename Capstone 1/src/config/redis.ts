import Redis from 'ioredis';
import { getConfig } from './index.js';

let redisClient: Redis | null = null;

export function createRedisClient(): Redis {
  const config = getConfig();
  const client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => times > 3 ? null : Math.min(times * 100, 3000),
    lazyConnect: true,
  });
  client.on('error', (err) => console.error('Redis client error:', err));
  client.on('connect', () => console.debug('Redis connected'));
  return client;
}

export function getRedisClient(): Redis {
  if (!redisClient) redisClient = createRedisClient();
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) { await redisClient.quit(); redisClient = null; }
}