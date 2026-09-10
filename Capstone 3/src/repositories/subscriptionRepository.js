import { query, transaction } from '../db/pool.js';
import { generateId } from '../utils/helpers.js';

export async function findActiveSubscriptionByTenantId(tenantId) {
  const result = await query(
    `SELECT s.*, p.* 
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.tenant_id = $1 
       AND s.status IN ('trialing', 'active', 'past_due')
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [tenantId]
  );
  return result.rows[0] ?? null;
}

export async function findSubscriptionById(id) {
  const result = await query(
    `SELECT s.*, p.* 
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findSubscriptionByStripeId(stripeSubscriptionId) {
  const result = await query(
    `SELECT s.*, p.* 
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.stripe_subscription_id = $1`,
    [stripeSubscriptionId]
  );
  return result.rows[0] ?? null;
}

export async function createSubscription({
  tenantId,
  planId,
  stripeSubscriptionId,
  stripeCustomerId,
  status,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd = false
}) {
  return await transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO subscriptions (
        id, tenant_id, plan_id, stripe_subscription_id, stripe_customer_id,
        status, current_period_start, current_period_end, cancel_at_period_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (stripe_subscription_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        version = subscriptions.version + 1,
        updated_at = NOW()
      RETURNING *`,
      [
        generateId(), tenantId, planId, stripeSubscriptionId, stripeCustomerId,
        status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd
      ]
    );
    return result.rows[0];
  });
}

export async function updateSubscription(stripeSubscriptionId, updates) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'plan_id', 'status', 'current_period_start', 'current_period_end',
    'cancel_at_period_end', 'canceled_at'
  ];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) return null;

  fields.push('version = version + 1');
  fields.push('updated_at = NOW()');
  values.push(stripeSubscriptionId);

  const result = await query(
    `UPDATE subscriptions SET ${fields.join(', ')} WHERE stripe_subscription_id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function cancelSubscription(stripeSubscriptionId) {
  const result = await query(
    `UPDATE subscriptions 
     SET status = 'canceled', canceled_at = NOW(), version = version + 1, updated_at = NOW()
     WHERE stripe_subscription_id = $1
     RETURNING *`,
    [stripeSubscriptionId]
  );
  return result.rows[0] ?? null;
}