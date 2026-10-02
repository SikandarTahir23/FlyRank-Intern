import { query } from '../db/pool.js';

export async function findPlanByKey(key) {
  const result = await query(
    `SELECT * FROM plans WHERE key = $1 AND is_active = true`,
    [key]
  );
  return result.rows[0] ?? null;
}

export async function findPlanById(id) {
  const result = await query(
    `SELECT * FROM plans WHERE id = $1 AND is_active = true`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findPlanByStripePriceId(stripePriceId) {
  const result = await query(
    `SELECT * FROM plans WHERE stripe_price_id = $1 AND is_active = true`,
    [stripePriceId]
  );
  return result.rows[0] ?? null;
}

export async function getAllPlans() {
  const result = await query(
    `SELECT * FROM plans WHERE is_active = true ORDER BY monthly_price_cents ASC`
  );
  return result.rows;
}