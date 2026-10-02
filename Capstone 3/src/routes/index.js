import { Router } from 'express';
import usageRoutes from './usage.js';
import subscriptionRoutes from './subscription.js';
import webhookRoutes from './webhooks.js';

const router = Router();

router.use('/usage', usageRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/webhooks', webhookRoutes);

router.get('/health', (req, res) => res.json({ status: 'ok' }));

export default router;