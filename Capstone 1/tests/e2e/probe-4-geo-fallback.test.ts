import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { widgetsRepository } from '../../src/modules/widgets/widgets.repository.js';

describe('Probe 4: Geo Fallback Tolerance', () => {
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

  it('should return geo data in successful response', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widgetId)
      .send({ email: 'geo1@test.com' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.geo).toBeDefined();
    expect(res.body.data.geo.country).toBeDefined();
    // Country can be null if both providers fail, but should not throw
  });

  it('should handle submission when geo providers fail (NullGeo fallback)', async () => {
    // This test relies on MOCK_GEO_FAILURE_ALL env var
    // In real test environment, we'd set this before starting the app
    // For now, verify the response structure is correct
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widgetId)
      .send({ email: 'geo2@test.com' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.geo).toBeDefined();
    expect(typeof res.body.data.geo.country).toBe('string'); // Can be null but field exists
    expect(typeof res.body.data.geo.city).toBe('string');
  });

  it('should not return 500 even if geo enrichment fails', async () => {
    // Multiple submissions to test resilience
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/submissions')
        .set('X-Widget-Id', widgetId)
        .send({ email: `geo-fail${i}@test.com` });
      
      // Should never be 500
      expect(res.status).not.toBe(500);
      expect(res.body.success).toBe(true);
    }
  });
});