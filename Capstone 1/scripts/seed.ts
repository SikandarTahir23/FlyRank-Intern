import { getPool, query, closePool } from '../src/config/database.js';
import { tenantsRepository } from '../src/modules/tenants/tenants.repository.js';
import { widgetsRepository } from '../src/modules/widgets/widgets.repository.js';

/**
 * Seed script for deterministic test data.
 * Creates known tenants and widgets for evaluation probes.
 */
async function seed(): Promise<void> {
  console.log('🌱 Seeding database with test data...');
  
  try {
    const pool = getPool();
    
    // Test connection
    await pool.query('SELECT 1');
    
    // Seed tenants (using deterministic UUIDs)
    const tenants = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Tenant Alpha',
        api_key: 'tk_alpha_abcdef123456',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Tenant Beta',
        api_key: 'tk_beta_ghijkl789012',
      },
    ];

    for (const tenant of tenants) {
      await query(
        `INSERT INTO tenants (id, name, api_key) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET name = $2, api_key = $3`,
        [tenant.id, tenant.name, tenant.api_key]
      );
      console.log(`  ✅ Tenant: ${tenant.name} (${tenant.api_key})`);
    }

    // Seed widgets for Tenant Alpha
    const alphaWidgets = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        tenant_id: '11111111-1111-1111-1111-111111111111',
        name: 'Alpha Lead Form',
        type: 'lead-form',
        config_json: {
          title: 'Get in Touch',
          fields: [
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'message', label: 'Message', type: 'textarea', required: false },
          ],
          buttonText: 'Submit',
          honeypotFieldName: 'website_url',
        },
        is_active: true,
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        tenant_id: '11111111-1111-1111-1111-111111111111',
        name: 'Alpha Newsletter',
        type: 'newsletter',
        config_json: {
          title: 'Subscribe to Updates',
          fields: [
            { name: 'email', label: 'Email', type: 'email', required: true },
          ],
          buttonText: 'Subscribe',
          honeypotFieldName: 'website',
        },
        is_active: true,
      },
    ];

    // Seed widgets for Tenant Beta
    const betaWidgets = [
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        tenant_id: '22222222-2222-2222-2222-222222222222',
        name: 'Beta Contact Form',
        type: 'contact',
        config_json: {
          title: 'Contact Us',
          fields: [
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'subject', label: 'Subject', type: 'text', required: true },
            { name: 'message', label: 'Message', type: 'textarea', required: true },
          ],
          buttonText: 'Send Message',
          honeypotFieldName: 'url',
        },
        is_active: true,
      },
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        tenant_id: '22222222-2222-2222-2222-222222222222',
        name: 'Beta Feedback',
        type: 'lead-form',
        config_json: {
          title: 'Feedback Form',
          fields: [
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'rating', label: 'Rating (1-5)', type: 'number', required: true },
            { name: 'comments', label: 'Comments', type: 'textarea', required: false },
          ],
          buttonText: 'Submit Feedback',
          honeypotFieldName: 'website_field',
        },
        is_active: true,
      },
    ];

    const allWidgets = [...alphaWidgets, ...betaWidgets];

    for (const widget of allWidgets) {
      await query(
        `INSERT INTO widgets (id, tenant_id, name, type, config_json, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           tenant_id = $2,
           name = $3,
           type = $4,
           config_json = $5,
           is_active = $6`,
        [
          widget.id,
          widget.tenant_id,
          widget.name,
          widget.type,
          JSON.stringify(widget.config_json),
          widget.is_active,
        ]
      );
      console.log(`  ✅ Widget: ${widget.name} (${widget.id})`);
    }

    console.log('✅ Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

seed();