import { createUsageEvent, getCurrentPeriodUsage, upsertUsageAggregate } from '../repositories/usageRepository.js';
import { calculateTokenCost } from './pricing.js';
import { IdempotencyError } from '../errors/index.js';

export async function recordUsage(tenantId, subscription, idempotencyKey, eventData) {
  const { eventType, inputTokens, cachedInputTokens, outputTokens, reasoningTokens, requestId, model, endpoint, metadata } = eventData;

  const costCents = calculateTokenCost(
    { inputTokens, cachedInputTokens, outputTokens, reasoningTokens },
    subscription
  );

  const existingEvent = await createUsageEvent({
    tenantId,
    subscriptionId: subscription.id,
    idempotencyKey,
    eventType,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningTokens,
    costCents,
    requestId,
    model,
    endpoint,
    metadata
  });

  const isNewEvent = existingEvent.idempotency_key === idempotencyKey && existingEvent.created_at === existingEvent.updated_at;
  
  if (isNewEvent) {
    await upsertUsageAggregate(
      subscription.id,
      subscription.current_period_start,
      subscription.current_period_end,
      {
        inputTokens,
        cachedInputTokens,
        outputTokens,
        reasoningTokens,
        costCents,
        requestCount: 1
      }
    );
  }

  return {
    event: existingEvent,
    costCents,
    isDuplicate: !isNewEvent
  };
}