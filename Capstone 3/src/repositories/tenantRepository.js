import { query, transaction } from '../db/pool.js';
import { generateId } from '../utils/helpers.js';

export async function findTenantById(id) {
  const result = await query(
    `SELECT * FROM tenants WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findTenantBySlug(slug) {
  const result = await query(
    `SELECT * FROM tenants WHERE slug = $1 AND deleted_at IS NULL`,
    [slug]
  );
  return result.rows[0] ?? null;
}

export async function findTenantByStripeCustomerId(stripeCustomerId) {
  const result = await query(
    `SELECT * FROM tenants WHERE stripe_customer_id = $1 AND deleted_at IS NULL`,
    [stripeCustomerId]
  );
  return result.rows[0] ?? null;
}

export async function createTenant({ name, slug, stripeCustomerId = null }) {
  const result = await query(
    `INSERT INTO tenants (id, name, slug, stripe_customer_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [generateId(), name, slug, stripeCustomerId]
  );
  return result.rows[0];
}

export async function updateTenantStripeCustomerId(tenantId, stripeCustomerId) {
  const result = await query(
    `UPDATE tenants SET stripe_customer_id = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [stripeCustomerId, tenantId]
  );
  return result.rows[0] ?? null;
}