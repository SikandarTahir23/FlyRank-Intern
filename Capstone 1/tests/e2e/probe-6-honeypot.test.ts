import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { widgetsRepository } from '../../src/modules/widgets/widgets.repository.js';
import { getPool } from '../../src/config/database.js';

describe('Probe 6: Honeypot Trapping', () => {
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

  it('should accept submission without honeypot filled (normal)', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widgetId)
      .send({ 
        email: 'normal@test.com', 
        name: 'Normal User',
        // honeypot field 'website' NOT included
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  });

  it('should accept submission with empty honeypot (normal)', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widgetId)
      .send({ 
        email: 'emptyhoneypot@test.com', 
        name: 'Empty Honeypot',
        website: '', // honeypot field present but empty
      })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  it('should mark as spam when honeypot is filled (but still return 201)', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widgetId)
      .send({ 
        email: 'spam@test.com', 
        name: 'Spam Bot',
        website: 'http://spam-site.com', // honeypot field FILLED
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    // Note: is_spam flag is stored in DB but not returned in public response
    // This is by design - don't reveal spam detection to bots
  });

  it('should store is_spam=true in database for honeypot submissions', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widgetId)
      .send({ 
        email: 'spamdb@test.com', 
        website: 'http://another-spam.com',
      })
      .expect(201);

    const submissionId = res.body.data.id;

    // Verify directly in database
    const pool = getPool();
    const result = await pool.query(
      'SELECT is_spam FROM submissions WHERE id = $1',
      [submissionId]
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].is_spam).toBe(true);
  });

  it('should store is_spam=false for normal submissions', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widgetId)
      .send({ 
        email: 'normaldb@test.com', 
        name: 'Normal User',
      })
      .expect(201);

    const submissionId = res.body.data.id;

    const pool = getPool();
    const result = await pool.query(
      'SELECT is_spam FROM submissions WHERE id = $1',
      [submissionId]
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].is_spam).toBe(false);
  });

  it('should work with different honeypot field names per widget', async () => {
    // Widget 2 (newsletter) has honeypotFieldName: 'website'
    const widget2 = await widgetsRepository.findById('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    if (!widget2) {
      throw new Error('Newsletter widget not found');
    }

    const res = await request(app)
      .post('/api/submissions')
      .set('X-Widget-Id', widget2.id)
      .send({ 
        email: 'newsletter@test.com',
        website: 'http://spam.com', // honeypot for newsletter widget
      })
      .expect(201);

    const submissionId = res.body.data.id;

    const pool = getPool();
    const result = await pool.query(
      'SELECT is_spam FROM submissions WHERE id = $1',
      [submissionId]
    );

    expect(result.rows[0].is_spam).toBe(true);
  });
});