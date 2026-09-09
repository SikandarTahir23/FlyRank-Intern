import Redis from 'ioredis';
import { env } from './env.js';

export const bullRedis = new Redis.default({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

bullRedis.on('error', (err: Error) => {
  console.error('BullMQ Redis connection error:', err);
});

bullRedis.on('connect', () => {
  console.log('BullMQ Redis connected');
});

export const redis = bullRedis;

export async function connectRedis(): Promise<void> {
  await bullRedis.connect();
}

export async function disconnectRedis(): Promise<void> {
  await bullRedis.quit();
}