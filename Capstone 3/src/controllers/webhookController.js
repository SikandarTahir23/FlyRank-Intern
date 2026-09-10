import { verifyWebhookSignature, processWebhookEvent } from '../services/webhookService.js';

export async function handleStripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;
  try {
    event = verifyWebhookSignature(req.rawBody, signature);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  await processWebhookEvent(event);
  res.json({ received: true });
}