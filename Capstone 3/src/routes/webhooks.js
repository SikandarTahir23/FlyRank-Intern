import { Router } from 'express';
import { handleStripeWebhook } from '../controllers/webhookController.js';
import { rawBodyMiddleware } from '../middleware/index.js';

const router = Router();

router.post('/stripe', rawBodyMiddleware, handleStripeWebhook);

export default router;