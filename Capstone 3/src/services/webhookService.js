import Stripe from 'stripe';
import { env } from '../config/index.js';
import { hasProcessedWebhookEvent, recordWebhookEvent } from '../repositories/webhookRepository.js';
import { handleCheckoutCompleted, handleSubscriptionUpdated, handleSubscriptionDeleted } from './subscriptionService.js';
import { StripeSignatureError } from '../errors/index.js';

const stripe = new Stripe(env.stripe.secretKey, { apiVersion: env.stripe.apiVersion });

export function verifyWebhookSignature(payload, signature) {
  try {
    return stripe.webhooks.constructEvent(payload, signature, env.stripe.webhookSecret);
  } catch (error) {
    throw new StripeSignatureError();
  }
}

export async function processWebhookEvent(event) {
  if (await hasProcessedWebhookEvent(event.id)) {
    return { processed: false, reason: 'duplicate' };
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }

  await recordWebhookEvent(event.id, event.type, event);
  return { processed: true };
}