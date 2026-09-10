import { createCheckoutSession, createBillingPortalSession } from '../services/subscriptionService.js';
import { findTenantById } from '../repositories/tenantRepository.js';
import { getActiveSubscription } from '../services/subscriptionService.js';
import { getAllPlans } from '../repositories/planRepository.js';
import { NotFoundError } from '../errors/index.js';

export async function getSubscription(req, res) {
  const subscription = await getActiveSubscription(req.tenantId);
  if (!subscription) {
    throw new NotFoundError('Subscription');
  }
  res.json({
    id: subscription.id,
    plan: {
      key: subscription.key,
      name: subscription.name
    },
    status: subscription.status,
    currentPeriod: {
      start: subscription.current_period_start,
      end: subscription.current_period_end
    },
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });
}

export async function listPlans(req, res) {
  const plans = await getAllPlans();
  res.json(plans.map(p => ({
    key: p.key,
    name: p.name,
    description: p.description,
    monthlyPriceCents: p.monthly_price_cents,
    limits: {
      monthlyTokens: p.monthly_token_limit,
      monthlyRequests: p.monthly_request_limit
    },
    pricing: {
      inputTokens: p.price_input_tokens_cents,
      cachedInputTokens: p.price_cached_input_tokens_cents,
      outputTokens: p.price_output_tokens_cents,
      reasoningTokens: p.price_reasoning_tokens_cents
    }
  })));
}

export async function createCheckout(req, res) {
  const { planKey, successUrl, cancelUrl } = req.validatedBody;
  const { sessionId, url } = await createCheckoutSession(req.tenantId, planKey, successUrl, cancelUrl);
  res.json({ sessionId, url });
}

export async function createPortal(req, res) {
  const tenant = await findTenantById(req.tenantId);
  if (!tenant) throw new NotFoundError('Tenant');

  const returnUrl = req.validatedBody?.returnUrl ?? `${process.env.APP_URL}/billing`;
  const { url } = await createBillingPortalSession(req.tenantId, returnUrl);
  res.json({ url });
}