import { query, transaction } from '../db/pool.js';
import { generateId } from '../utils/helpers.js';

export async function findUsageEventByIdempotencyKey(tenantId, idempotencyKey) {
  const result = await query(
    `SELECT * FROM usage_events WHERE tenant_id = $1 AND idempotency_key = $2`,
    [tenantId, idempotencyKey]
  );
  return result.rows[0] ?? null;
}

export async function createUsageEvent({
  tenantId,
  subscriptionId,
  idempotencyKey,
  eventType,
  inputTokens = 0,
  cachedInputTokens = 0,
  outputTokens = 0,
  reasoningTokens = 0,
  costCents = 0,
  requestId = null,
  model = null,
  endpoint = null,
  metadata = {}
}) {
  return await transaction(async (client) => {
    const existing = await client.query(
      `SELECT * FROM usage_events WHERE tenant_id = $1 AND idempotency_key = $2 FOR UPDATE`,
      [tenantId, idempotencyKey]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const result = await client.query(
      `INSERT INTO usage_events (
        id, tenant_id, subscription_id, idempotency_key, event_type,
        input_tokens, cached_input_tokens, output_tokens, reasoning_tokens,
        cost_cents, request_id, model, endpoint, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
      RETURNING *`,
      [
        generateId(), tenantId, subscriptionId, idempotencyKey, eventType,
        inputTokens, cachedInputTokens, outputTokens, reasoningTokens,
        costCents, requestId, model, endpoint, JSON.stringify(metadata)
      ]
    );

    if (result.rows.length === 0) {
      const retry = await client.query(
        `SELECT * FROM usage_events WHERE tenant_id = $1 AND idempotency_key = $2`,
        [tenantId, idempotencyKey]
      );
      return retry.rows[0];
    }

    return result.rows[0];
  });
}

export async function getUsageAggregate(subscriptionId, periodStart) {
  const result = await query(
    `SELECT * FROM usage_aggregates 
     WHERE subscription_id = $1 AND period_start = $2`,
    [subscriptionId, periodStart]
  );
  return result.rows[0] ?? null;
}

export async function upsertUsageAggregate(subscriptionId, periodStart, periodEnd, increments) {
  const result = await query(
    `INSERT INTO usage_aggregates (
      subscription_id, period_start, period_end,
      total_input_tokens, total_cached_input_tokens,
      total_output_tokens, total_reasoning_tokens,
      total_cost_cents, request_count
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (subscription_id, period_start) DO UPDATE SET
      total_input_tokens = usage_aggregates.total_input_tokens + EXCLUDED.total_input_tokens,
      total_cached_input_tokens = usage_aggregates.total_cached_input_tokens + EXCLUDED.total_cached_input_tokens,
      total_output_tokens = usage_aggregates.total_output_tokens + EXCLUDED.total_output_tokens,
      total_reasoning_tokens = usage_aggregates.total_reasoning_tokens + EXCLUDED.total_reasoning_tokens,
      total_cost_cents = usage_aggregates.total_cost_cents + EXCLUDED.total_cost_cents,
      request_count = usage_aggregates.request_count + EXCLUDED.request_count,
      updated_at = NOW()
    RETURNING *`,
    [
      subscriptionId, periodStart, periodEnd,
      increments.inputTokens ?? 0,
      increments.cachedInputTokens ?? 0,
      increments.outputTokens ?? 0,
      increments.reasoningTokens ?? 0,
      increments.costCents ?? 0,
      increments.requestCount ?? 0
    ]
  );
  return result.rows[0];
}

export async function getCurrentPeriodUsage(subscriptionId, periodStart) {
  const aggregate = await getUsageAggregate(subscriptionId, periodStart);
  if (!aggregate) {
    return {
      totalInputTokens: 0,
      totalCachedInputTokens: 0,
      totalOutputTokens: 0,
      totalReasoningTokens: 0,
      totalCostCents: 0,
      requestCount: 0,
      totalTokens: 0
    };
  }
  return {
    totalInputTokens: Number(aggregate.total_input_tokens),
    totalCachedInputTokens: Number(aggregate.total_cached_input_tokens),
    totalOutputTokens: Number(aggregate.total_output_tokens),
    totalReasoningTokens: Number(aggregate.total_reasoning_tokens),
    totalCostCents: Number(aggregate.total_cost_cents),
    requestCount: Number(aggregate.request_count),
    totalTokens: Number(aggregate.total_input_tokens) + Number(aggregate.total_cached_input_tokens) +
                 Number(aggregate.total_output_tokens) + Number(aggregate.total_reasoning_tokens)
  };
}

export async function getUsageSummary(tenantId, periodStart, periodEnd) {
  const result = await query(
    `SELECT 
       SUM(input_tokens) as total_input_tokens,
       SUM(cached_input_tokens) as total_cached_input_tokens,
       SUM(output_tokens) as total_output_tokens,
       SUM(reasoning_tokens) as total_reasoning_tokens,
       SUM(cost_cents) as total_cost_cents,
       COUNT(*) as request_count
     FROM usage_events
     WHERE tenant_id = $1 AND created_at >= $2 AND created_at < $3`,
    [tenantId, periodStart, periodEnd]
  );
  const row = result.rows[0];
  return {
    totalInputTokens: Number(row.total_input_tokens ?? 0),
    totalCachedInputTokens: Number(row.total_cached_input_tokens ?? 0),
    totalOutputTokens: Number(row.total_output_tokens ?? 0),
    totalReasoningTokens: Number(row.total_reasoning_tokens ?? 0),
    totalCostCents: Number(row.total_cost_cents ?? 0),
    requestCount: Number(row.request_count ?? 0)
  };
}