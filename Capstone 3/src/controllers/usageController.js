import { recordUsage } from '../services/usageService.js';
import { getUsageSummary } from '../repositories/usageRepository.js';

export async function createUsageEvent(req, res) {
  const result = await recordUsage(
    req.tenantId,
    req.subscription,
    req.idempotencyKey,
    req.validatedBody
  );

  res.status(result.isDuplicate ? 200 : 201).json({
    id: result.event.id,
    costCents: result.costCents,
    isDuplicate: result.isDuplicate
  });
}

export async function getUsageSummaryHandler(req, res) {
  const subscription = req.subscription;
  const periodStart = subscription.current_period_start;
  const periodEnd = subscription.current_period_end;

  const summary = await getUsageSummary(req.tenantId, periodStart, periodEnd);
  res.json({
    period: { start: periodStart, end: periodEnd },
    ...summary
  });
}