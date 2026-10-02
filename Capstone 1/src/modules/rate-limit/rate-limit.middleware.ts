import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../../config/redis.js';
import { getConfig } from '../../config/index.js';
import { OperationalError } from '../../middleware/error.middleware.js';

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const config = getConfig();
  const redis = getRedisClient();
  const clientIpAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const widgetId = req.headers['x-widget-id'] as string;
  if (!widgetId) { next(); return; }
  const key = `rl:submissions:${widgetId}:${clientIpAddress}`;
  const now = Date.now();
  const windowStart = now - config.RATE_LIMIT_WINDOW_MS;
  try {
    await redis.zadd(key, now.toString(), `${now}-${Math.random()}`);
    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);
    await redis.expire(key, Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000) + 1);
    const remaining = Math.max(0, config.RATE_LIMIT_MAX - count);
    res.setHeader('X-RateLimit-Limit', config.RATE_LIMIT_MAX);
    res.setHeader('X-RateLimit-Remaining', remaining);
    if (count > config.RATE_LIMIT_MAX) {
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const retryAfter = oldest.length >= 2 ? Math.ceil((parseInt(oldest[1], 10) + config.RATE_LIMIT_WINDOW_MS - now) / 1000) : Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000);
      res.setHeader('Retry-After', retryAfter);
      throw new OperationalError('Rate limit exceeded', 429, 'RATE_LIMITED');
    }
    next();
  } catch (error) { if (error instanceof OperationalError) throw error; console.error('Rate limiter error:', error); next(); }
}

export async function adminRateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const redis = getRedisClient();
  const apiKey = req.headers['x-api-key'] as string;
  const clientIpAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const identifier = apiKey ? `apikey:${apiKey}` : `ip:${clientIpAddress}`;
  const key = `rl:admin:${identifier}`;
  const now = Date.now();
  const windowStart = now - 60000;
  const maxRequests = 100;
  try {
    await redis.zadd(key, now.toString(), `${now}-${Math.random()}`);
    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);
    await redis.expire(key, 61);
    const remaining = Math.max(0, maxRequests - count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    if (count > maxRequests) { res.setHeader('Retry-After', 60); throw new OperationalError('Admin rate limit exceeded', 429, 'RATE_LIMITED'); }
    next();
  } catch (error) { if (error instanceof OperationalError) throw error; console.error('Admin rate limiter error:', error); next(); }
}