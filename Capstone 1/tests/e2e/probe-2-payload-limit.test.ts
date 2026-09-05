import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { widgetsRepository } from '../../src/modules/widgets/widgets.repository.js';

describe('Probe 2: Payload Size Limit', () => {
  let app: any;
  let widgetId: string;

  beforeAll(async () => {
    app = createApp();
    
    const widget = await widgetsRepository.findById('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    if (!widget) {
      throw new Error('Seed widget not found - run migrations first');
    }
    widgetId = widget.id;
  });

  it('should accept payload under 50KB limit', async () => {
    // ~10KB payload
    const payload = { 
      email: 'test@example.com', 
      message: 'x'.repeat(10000) 
    };

    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widgetId)
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  it('should reject payload over 50KB limit with 413', async () => {
    // ~60KB payload (over 50KB limit)
    const largeMessage = 'x'.repeat(60000);
    const payload = { 
      email: 'test@example.com', 
      message: largeMessage 
    };

    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widgetId)
      .send(payload)
      .expect(413);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(res.body.error.details.maxBytes).toBe(51200);
    expect(res.body.error.details.receivedBytes).toBeGreaterThan(51200);
  });

  it('should reject exactly at limit boundary', async () => {
    // 51200 bytes = 50KB exactly
    // JSON overhead + field names means slightly less content
    const exactPayload = { 
      email: 'test@example.com', 
      data: 'x'.repeat(50000) 
    };

    // This might pass or fail depending on JSON encoding overhead
    // The important thing is it doesn't 500
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widgetId)
      .send(exactPayload);

    // Either 201 (under) or 413 (over) - both are valid, not 500
    expect([201, 413]).toContain(res.status);
    if (res.status === 413) {
      expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    }
  });
});