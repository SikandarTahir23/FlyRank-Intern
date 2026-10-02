import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { widgetsRepository } from '../../src/modules/widgets/widgets.repository.js';
import { getRedisClient } from '../../src/config/redis.js';

describe('Probe 3: Rate Limit Burst (429s)', () => {
  let app: any;
  let widgetId: string;
  let redis: any;

  beforeAll(async () => {
    app = createApp();
    redis = getRedisClient();
    await redis.connect();
    
    const widget = await widgetsRepository.findById('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    if (!widget) {
      throw new Error('Seed widget not found - run migrations first');
    }
    widgetId = widget.id;
    
    // Clear any existing rate limit keys for this widget
    const keys = await redis.keys(`rl:submissions:${widgetId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  afterAll(async () => {
    // Clean up
    const keys = await redis.keys(`rl:submissions:${widgetId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  it('should allow up to 5 requests per 30 seconds', async () => {
    // Make 5 requests rapidly
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/submissions')
        .set('X-Widget-Id', widgetId)
        .send({ email: `ratelimit${i}@test.com` });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.headers['x-ratelimit-limit']).toBe('5');
      expect(parseInt(res.headers['x-ratelimit-remaining'], 10)).toBe(4 - i);
    }
  });

  it('should return 429 on 6th request', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widgetId)
      .send({ email: 'ratelimit6@test.com' })
      .expect(429);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
    expect(parseInt(res.headers['retry-after'], 10)).toBeGreaterThan(0);
  });

  it('should return 429 on subsequent requests', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widgetId)
      .send({ email: 'ratelimit7@test.com' })
      .expect(429);

    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('should track rate limit per widget per IP', async () => {
    // Use a different widget ID - should have separate counter
    const otherWidget = await widgetsRepository.findById('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    if (!otherWidget) {
      throw new Error('Second seed widget not found');
    }

    // Should be able to make requests to different widget
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', otherWidget.id)
      .send({ email: 'differentwidget@test.com' })
      .expect(201);

    expect(res.body.success).toBe(true);
  });
});