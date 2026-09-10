import Stripe from 'stripe';
import { env } from '../config/index.js';
import { findPlanByKey, findPlanByStripePriceId } from '../repositories/planRepository.js';
import { findActiveSubscriptionByTenantId, createSubscription, updateSubscription, cancelSubscription, findSubscriptionByStripeId } from '../repositories/subscriptionRepository.js';
import { findTenantById, updateTenantStripeCustomerId } from '../repositories/tenantRepository.js';
import { SubscriptionInactiveError } from '../errors/index.js';

const stripe = new Stripe(env.stripe.secretKey, { apiVersion: env.stripe.apiVersion });

export async function getActiveSubscription(tenantId) {
  return await findActiveSubscriptionByTenantId(tenantId);
}

export async function ensureActiveSubscription(tenantId) {
  const subscription = await getActiveSubscription(tenantId);
  if (!subscription) {
    throw new SubscriptionInactiveError();
  }
  return subscription;
}

export async function createCheckoutSession(tenantId, planKey, successUrl, cancelUrl) {
  const tenant = await findTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const plan = await findPlanByKey(planKey);
  if (!plan || !plan.stripe_price_id) {
    throw new Error('Plan not configured for billing');
  }

  let customerId = tenant.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { tenantId },
      name: tenant.name
    });
    customerId = customer.id;
    await updateTenantStripeCustomerId(tenantId, customerId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { tenantId },
    subscription_data: { metadata: { tenantId } }
  });

  return { sessionId: session.id, url: session.url };
}

export async function createBillingPortalSession(tenantId, returnUrl) {
  const tenant = await findTenantById(tenantId);
  if (!tenant?.stripe_customer_id) {
    throw new Error('No Stripe customer found');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: returnUrl
  });

  return { url: session.url };
}

export async function handleCheckoutCompleted(session) {
  const tenantId = session.metadata?.tenantId;
  if (!tenantId) throw new Error('Missing tenantId in session metadata');

  const subscriptionId = session.subscription;
  const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
  const plan = await findPlanByStripePriceId(stripeSub.items.data[0].price.id);

  await createSubscription({
    tenantId,
    planId: plan.id,
    stripeSubscriptionId: stripeSub.id,
    stripeCustomerId: session.customer,
    status: stripeSub.status,
    currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end
  });
}

export async function handleSubscriptionUpdated(stripeSub) {
  const plan = await findPlanByStripePriceId(stripeSub.items.data[0].price.id);

  await updateSubscription(stripeSub.id, {
    plan_id: plan.id,
    status: stripeSub.status,
    current_period_start: new Date(stripeSub.current_period_start * 1000),
    current_period_end: new Date(stripeSub.current_period_end * 1000),
    cancel_at_period_end: stripeSub.cancel_at_period_end,
    canceled_at: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null
  });
}

export async function handleSubscriptionDeleted(stripeSub) {
  await cancelSubscription(stripeSub.id);
}