import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getPool } from '../../src/config/database.js';
import { tenantsRepository } from '../../src/modules/tenants/tenants.repository.js';
import { widgetsRepository } from '../../src/modules/widgets/widgets.repository.js';

describe('Widgets Config Integration', () => {
  let app: any;
  let testTenant: any;
  let testWidget: any;
  const apiKey = 'tk_widget_config_test_123456';

  beforeAll(async () => {
    app = createApp();
    
    const pool = getPool();
    await pool.query(
      `INSERT INTO tenants (id, name, api_key) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = $2, api_key = $3`,
      ['00000000-0000-0000-0000-000000000002', 'Widget Config Test Tenant', apiKey]
    );
    
    testTenant = await tenantsRepository.findByApiKey(apiKey);
  });

  afterAll(async () => {
    const pool = getPool();
    await pool.query(`DELETE FROM tenants WHERE id = '00000000-0000-0000-0000-000000000002'`);
  });

  beforeEach(async () => {
    const pool = getPool();
    await pool.query(`DELETE FROM widgets WHERE tenant_id = '00000000-0000-0000-0000-000000000002'`);
  });

  it('should return full config with all field types', async () => {
    testWidget = await widgetsRepository.create(testTenant.id, {
      name: 'Full Config Widget',
      type: 'lead-form',
      config_json: {
        title: 'Complete Form',
        fields: [
          { name: 'email', label: 'Email Address', type: 'email', required: true },
          { name: 'name', label: 'Full Name', type: 'text', required: true },
          { name: 'age', label: 'Age', type: 'number', required: false },
          { name: 'bio', label: 'Bio', type: 'textarea', required: false },
          { name: 'plan', label: 'Plan', type: 'select', required: true, options: ['Free', 'Pro', 'Enterprise'] },
        ],
        buttonText: 'Register',
        honeypotFieldName: 'website_field',
      },
      is_active: true,
    });

    const res = await request(app)
      .get(`/api/widgets/${testWidget.id}/config`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.config.fields).toHaveLength(5);
    expect(res.body.data.config.fields[0].type).toBe('email');
    expect(res.body.data.config.fields[4].type).toBe('select');
    expect(res.body.data.config.fields[4].options).toEqual(['Free', 'Pro', 'Enterprise']);
  });

  it('should return 404 for deleted widget', async () => {
    testWidget = await widgetsRepository.create(testTenant.id, {
      name: 'To Delete',
      type: 'lead-form',
      config_json: {
        title: 'Delete Me',
        fields: [{ name: 'email', label: 'Email', type: 'email', required: true }],
        buttonText: 'Submit',
        honeypotFieldName: 'website',
      },
      is_active: true,
    });

    await widgetsRepository.delete(testWidget.id, testTenant.id);

    await request(app)
      .get(`/api/widgets/${testWidget.id}/config`)
      .expect(404);
  });
});