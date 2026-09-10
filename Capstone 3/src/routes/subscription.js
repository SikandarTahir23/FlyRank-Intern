import { Router } from 'express';
import { getSubscription, listPlans, createCheckout, createPortal } from '../controllers/subscriptionController.js';
import { tenantContextMiddleware } from '../middleware/index.js';
import { validate, checkoutSessionSchema } from '../utils/validation.js';

const router = Router();

router.use(tenantContextMiddleware);

router.get('/', getSubscription);
router.get('/plans', listPlans);
router.post('/checkout', validate(checkoutSessionSchema), createCheckout);
router.post('/portal', createPortal);

export default router;