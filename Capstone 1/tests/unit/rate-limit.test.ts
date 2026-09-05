import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';

// Mock Redis
vi.mock('ioredis', () => {
  const mRedis = {
    zadd: vi.fn().mockResolvedValue(1),
    zremrangebyscore: vi.fn().mockResolvedValue(0),
    zcard: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    zrange: vi.fn().mockResolvedValue([]),
    quit: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
  };
  return { default: vi.fn(() => mRedis) };
});

import { getRedisClient } from '../../src/config/redis.js';

describe('Rate Limiter', () => {
  let redis: any;

  beforeEach(() => {
    vi.clearAllMocks();
    redis = getRedisClient();
  });

  it('should allow requests under limit', async () => {
    redis.zcard.mockResolvedValueOnce(1); // First request
    
    const { rateLimitMiddleware } = await import('../../src/modules/rate-limit/rate-limit.middleware.js');
    
    const mockReq = {
      ip: '192.168.1.1',
      headers: { 'x-widget-id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    } as any;
    
    const mockRes = {
      setHeader: vi.fn(),
    } as any;
    
    const mockNext = vi.fn();
    
    await rateLimitMiddleware(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith();
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
  });

  it('should reject requests over limit', async () => {
    redis.zcard.mockResolvedValueOnce(6); // Over limit
    
    const { rateLimitMiddleware } = await import('../../src/modules/rate-limit/rate-limit.middleware.js');
    
    const mockReq = {
      ip: '192.168.1.1',
      headers: { 'x-widget-id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    } as any;
    
    const mockRes = {
      setHeader: vi.fn(),
    } as any;
    
    const mockNext = vi.fn();
    
    // The middleware throws an OperationalError when rate limited
    await expect(rateLimitMiddleware(mockReq, mockRes, mockNext)).rejects.toThrow('Rate limit exceeded');
    
    expect(mockRes.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });
});