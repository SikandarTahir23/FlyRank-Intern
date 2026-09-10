import { Router } from 'express';
import { createUsageEvent, getUsageSummaryHandler } from '../controllers/usageController.js';
import { tenantContextMiddleware, idempotencyMiddleware, quotaEnforcementMiddleware } from '../middleware/index.js';
import { validate, usageEventSchema } from '../utils/validation.js';

const router = Router();

router.use(tenantContextMiddleware);

router.post('/',
  idempotencyMiddleware,
  validate(usageEventSchema),
  quotaEnforcementMiddleware,
  createUsageEvent
);

router.get('/summary',
  getUsageSummaryHandler
);

export default router;