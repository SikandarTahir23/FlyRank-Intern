import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getPool } from '../../src/config/database.js';
import { widgetsRepository } from '../../src/modules/widgets/widgets.repository.js';

describe('Probe 1: Multi-Origin Submissions', () => {
  let app: any;
  let widgetId: string;

  beforeAll(async () => {
    app = createApp();
    
    // Use existing seed widget
    const widget = await widgetsRepository.findById('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    if (!widget) {
      throw new Error('Seed widget not found - run migrations first');
    }
    widgetId = widget.id;
  });

  it('should accept submission from any origin (CORS)', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('Origin', 'https://example.com')
      .set('X-Widget-Id', widgetId)
      .send({ email: 'probe1@example.com', name: 'Probe 1 Test' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('should accept submission from another origin', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('Origin', 'https://another-site.org')
      .set('X-Widget-Id', widgetId)
      .send({ email: 'probe1b@example.com', name: 'Probe 1 Test B' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('should handle OPTIONS preflight', async () => {
    const res = await request(app)
      .options('/api/submissions')
      .set('Origin', 'https://example.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, X-Widget-Id')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-headers']).toContain('X-Widget-Id');
  });

  it('should accept submission from localhost (dev)', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('Origin', 'http://localhost:8080')
      .set('X-Widget-Id', widgetId)
      .send({ email: 'probe1c@example.com', name: 'Probe 1 Test C' })
      .expect(201);

    expect(res.body.success).toBe(true);
  });
});