import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getPool } from '../../src/config/database.js';

describe('Tenants CRUD Integration', () => {
  let app: any;
  let testApiKey = 'tk_crud_test_1234567890';
  let createdTenantId: string;

  beforeAll(async () => {
    app = createApp();
  });

  afterAll(async () => {
    const pool = getPool();
    await pool.query(`DELETE FROM tenants WHERE api_key = $1`, [testApiKey]);
    if (createdTenantId) {
      await pool.query(`DELETE FROM tenants WHERE id = $1`, [createdTenantId]);
    }
  });

  it('should create a new tenant', async () => {
    const res = await request(app)
      .post('/api/tenants')
      .set('X-Api-Key', testApiKey) // Using existing admin key for auth
      .send({ name: 'CRUD Test Tenant' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('CRUD Test Tenant');
    expect(res.body.data.api_key).toBeDefined();
    expect(res.body.data.id).toBeDefined();
    
    createdTenantId = res.body.data.id;
  });

  it('should list tenants', async () => {
    const res = await request(app)
      .get('/api/tenants')
      .set('X-Api-Key', testApiKey)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((t: any) => t.id === createdTenantId)).toBe(true);
  });

  it('should get tenant by ID', async () => {
    const res = await request(app)
      .get(`/api/tenants/${createdTenantId}`)
      .set('X-Api-Key', testApiKey)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdTenantId);
    expect(res.body.data.name).toBe('CRUD Test Tenant');
  });

  it('should update tenant name', async () => {
    const res = await request(app)
      .put(`/api/tenants/${createdTenantId}`)
      .set('X-Api-Key', testApiKey)
      .send({ name: 'Updated Tenant Name' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Tenant Name');
  });

  it('should delete tenant', async () => {
    await request(app)
      .delete(`/api/tenants/${createdTenantId}`)
      .set('X-Api-Key', testApiKey)
      .expect(200);

    // Verify deleted
    await request(app)
      .get(`/api/tenants/${createdTenantId}`)
      .set('X-Api-Key', testApiKey)
      .expect(404);
    
    createdTenantId = '';
  });

  it('should reject duplicate tenant names', async () => {
    // Create first tenant
    const res1 = await request(app)
      .post('/api/tenants')
      .set('X-Api-Key', testApiKey)
      .send({ name: 'Duplicate Name' })
      .expect(201);
    
    const tenantId = res1.body.data.id;

    // Try to create another with same name
    await request(app)
      .post('/api/tenants')
      .set('X-Api-Key', testApiKey)
      .send({ name: 'Duplicate Name' })
      .expect(409);

    // Cleanup
    await request(app)
      .delete(`/api/tenants/${tenantId}`)
      .set('X-Api-Key', testApiKey);
  });
});