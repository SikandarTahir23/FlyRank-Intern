import { getSecondsUntil } from '../utils/helpers.js';
import { RateLimitError, QuotaExceededError, SubscriptionInactiveError } from '../errors/index.js';

export function checkQuota(subscription, plan, usage, estimatedTokens = 0) {
  if (!subscription) {
    throw new SubscriptionInactiveError();
  }

  if (plan.monthly_request_limit && usage.requestCount >= plan.monthly_request_limit) {
    const retryAfter = getSecondsUntil(subscription.current_period_end);
    throw new RateLimitError(
      `Monthly request limit of ${plan.monthly_request_limit} reached. Upgrade to Pro for higher limits.`,
      retryAfter,
      plan.monthly_request_limit,
      usage.requestCount
    );
  }

  if (plan.monthly_token_limit && usage.totalTokens + estimatedTokens > plan.monthly_token_limit) {
    const retryAfter = getSecondsUntil(subscription.current_period_end);
    throw new QuotaExceededError(
      `Monthly token limit of ${plan.monthly_token_limit} would be exceeded. Upgrade to Pro for higher limits.`,
      retryAfter,
      plan.monthly_token_limit,
      usage.totalTokens
    );
  }
}

export function buildRateLimitHeaders(plan, usage, periodEnd) {
  const headers = {
    'X-RateLimit-Limit-Requests': plan.monthly_request_limit?.toString() ?? 'unlimited',
    'X-RateLimit-Limit-Tokens': plan.monthly_token_limit?.toString() ?? 'unlimited',
    'X-RateLimit-Reset': Math.ceil(new Date(periodEnd).getTime() / 1000).toString()
  };

  if (plan.monthly_request_limit) {
    headers['X-RateLimit-Remaining-Requests'] = Math.max(0, plan.monthly_request_limit - usage.requestCount).toString();
  }
  if (plan.monthly_token_limit) {
    headers['X-RateLimit-Remaining-Tokens'] = Math.max(0, plan.monthly_token_limit - usage.totalTokens).toString();
  }

  return headers;
}