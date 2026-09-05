import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getPool } from '../../src/config/database.js';
import { tenantsRepository } from '../../src/modules/tenants/tenants.repository.js';
import { widgetsRepository } from '../../src/modules/widgets/widgets.repository.js';

describe('Integration Tests', () => {
  let app: any;
  let testTenant: any;
  let testWidget: any;
  const apiKey = 'tk_test_integration_123456';

  beforeAll(async () => {
    app = createApp();
    
    // Create test tenant directly in DB
    const pool = getPool();
    await pool.query(
      `INSERT INTO tenants (id, name, api_key) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = $2, api_key = $3`,
      ['00000000-0000-0000-0000-000000000001', 'Integration Test Tenant', apiKey]
    );
    
    testTenant = await tenantsRepository.findByApiKey(apiKey);
  });

  afterAll(async () => {
    const pool = getPool();
    await pool.query(`DELETE FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001'`);
  });

  beforeEach(async () => {
    // Clean up widgets
    const pool = getPool();
    await pool.query(`DELETE FROM widgets WHERE tenant_id = '00000000-0000-0000-0000-000000000001'`);
  });

  describe('Admin API - Tenant Isolation', () => {
    it('should reject requests without API key', async () => {
      await request(app)
        .get('/api/tenants')
        .expect(401);
    });

    it('should reject requests with invalid API key', async () => {
      await request(app)
        .get('/api/tenants')
        .set('X-Api-Key', 'invalid_key')
        .expect(401);
    });

    it('should allow valid API key', async () => {
      const res = await request(app)
        .get('/api/tenants')
        .set('X-Api-Key', apiKey)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should isolate tenants - cannot access other tenant widgets', async () => {
      // Create widget for test tenant
      testWidget = await widgetsRepository.create(testTenant.id, {
        name: 'Test Widget',
        type: 'lead-form',
        config_json: {
          title: 'Test',
          fields: [{ name: 'email', label: 'Email', type: 'email', required: true }],
          buttonText: 'Submit',
          honeypotFieldName: 'website',
        },
        is_active: true,
      });

      // Try to access with different (non-existent) tenant
      await request(app)
        .get(`/api/widgets/${testWidget.id}`)
        .set('X-Api-Key', 'tk_other_tenant_123456')
        .expect(404); // Should be 404 (not found) not 403
    });

    it('should allow access to own widgets', async () => {
      testWidget = await widgetsRepository.create(testTenant.id, {
        name: 'Test Widget 2',
        type: 'lead-form',
        config_json: {
          title: 'Test',
          fields: [{ name: 'email', label: 'Email', type: 'email', required: true }],
          buttonText: 'Submit',
          honeypotFieldName: 'website',
        },
        is_active: true,
      });

      const res = await request(app)
        .get(`/api/widgets/${testWidget.id}`)
        .set('X-Api-Key', apiKey)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testWidget.id);
    });
  });

  describe('Widget Config Endpoint (Public)', () => {
    beforeEach(async () => {
      testWidget = await widgetsRepository.create(testTenant.id, {
        name: 'Public Config Widget',
        type: 'lead-form',
        config_json: {
          title: 'Public Form',
          fields: [
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'name', label: 'Name', type: 'text', required: true },
          ],
          buttonText: 'Send',
          honeypotFieldName: 'website_url',
        },
        is_active: true,
      });
    });

    it('should return widget config without auth', async () => {
      const res = await request(app)
        .get(`/api/widgets/${testWidget.id}/config`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.config.title).toBe('Public Form');
      expect(res.body.data.config.honeypotFieldName).toBe('website_url');
    });

    it('should return 404 for inactive widget', async () => {
      await widgetsRepository.update(testWidget.id, testTenant.id, { is_active: false });
      
      await request(app)
        .get(`/api/widgets/${testWidget.id}/config`)
        .expect(404);
    });

    it('should return 404 for non-existent widget', async () => {
      await request(app)
        .get('/api/widgets/00000000-0000-0000-0000-000000000000/config')
        .expect(404);
    });

    it('should have cache headers', async () => {
      const res = await request(app)
        .get(`/api/widgets/${testWidget.id}/config`)
        .expect(200);
      
      expect(res.headers['cache-control']).toContain('max-age=60');
    });
  });

  describe('Submissions Ingestion', () => {
    beforeEach(async () => {
      testWidget = await widgetsRepository.create(testTenant.id, {
        name: 'Submission Test Widget',
        type: 'lead-form',
        config_json: {
          title: 'Submit Test',
          fields: [
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'message', label: 'Message', type: 'textarea', required: false },
          ],
          buttonText: 'Submit',
          honeypotFieldName: 'website',
        },
        is_active: true,
      });
    });

    it('should accept valid submission', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('X-Widget-Id', testWidget.id)
        .send({ email: 'test@example.com', message: 'Hello' })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.geo).toBeDefined();
    });

    it('should reject submission without widget ID', async () => {
      await request(app)
        .post('/api/submissions')
        .send({ email: 'test@example.com' })
        .expect(400);
    });

    it('should reject submission for non-existent widget', async () => {
      await request(app)
        .post('/api/submissions')
        .set('X-Widget-Id', '00000000-0000-0000-0000-000000000000')
        .send({ email: 'test@example.com' })
        .expect(404);
    });

    it('should reject submission for inactive widget', async () => {
      await widgetsRepository.update(testWidget.id, testTenant.id, { is_active: false });
      
      await request(app)
        .post('/api/submissions')
        .set('X-Widget-Id', testWidget.id)
        .send({ email: 'test@example.com' })
        .expect(403);
    });

    it('should handle honeypot detection', async () => {
      // Submit with honeypot field filled
      const res = await request(app)
        .post('/api/submissions')
        .set('X-Widget-Id', testWidget.id)
        .send({ 
          email: 'spam@example.com', 
          website: 'http://spam.com' // honeypot field
        })
        .expect(201);
      
      // Should succeed but mark as spam
      expect(res.body.success).toBe(true);
      // Note: is_spam is not in response but stored in DB
    });

    it('should enforce payload size limit', async () => {
      const largePayload = { email: 'a'.repeat(60000) + '@test.com' };
      
      await request(app)
        .post('/api/submissions')
        .set('X-Widget-Id', testWidget.id)
        .send(largePayload)
        .expect(413);
    });
  });
});