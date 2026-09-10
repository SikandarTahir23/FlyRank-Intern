import { checkQuota, buildRateLimitHeaders } from '../services/quota.js';
import { getCurrentPeriodUsage } from '../repositories/usageRepository.js';
import { ensureActiveSubscription } from '../services/subscriptionService.js';

export async function quotaEnforcementMiddleware(req, res, next) {
  try {
    const subscription = await ensureActiveSubscription(req.tenantId);
    const plan = subscription;
    const usage = await getCurrentPeriodUsage(subscription.id, subscription.current_period_start);

    const estimatedTokens = req.validatedBody?.inputTokens + req.validatedBody?.cachedInputTokens +
                           req.validatedBody?.outputTokens + req.validatedBody?.reasoningTokens ?? 0;

    checkQuota(subscription, plan, usage, estimatedTokens);

    const headers = buildRateLimitHeaders(plan, usage, subscription.current_period_end);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

    req.subscription = subscription;
    req.usage = usage;
    next();
  } catch (error) {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      res.setHeader('Retry-After', error.details.retryAfter);
    }
    next(error);
  }
}