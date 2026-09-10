import { query, transaction } from '../db/pool.js';
import { generateId } from '../utils/helpers.js';

export async function hasProcessedWebhookEvent(stripeEventId) {
  const result = await query(
    `SELECT 1 FROM stripe_webhook_events WHERE stripe_event_id = $1`,
    [stripeEventId]
  );
  return result.rows.length > 0;
}

export async function recordWebhookEvent(stripeEventId, eventType, payload) {
  return await transaction(async (client) => {
    await client.query(
      `INSERT INTO stripe_webhook_events (stripe_event_id, event_type, payload)
       VALUES ($1, $2, $3)
       ON CONFLICT (stripe_event_id) DO NOTHING`,
      [stripeEventId, eventType, JSON.stringify(payload)]
    );
  });
}