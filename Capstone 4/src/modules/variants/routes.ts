import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { generateVariants, getVariantById, updateVariant, submitForReview, approveVariant, rejectVariant, requestChanges, scheduleVariant, publishVariant, getPublishHistory } from './service.js';
import { generateVariantsSchema, updateVariantSchema, scheduleVariantSchema } from './types.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { authenticate, requireApprover } from '../../middleware/auth.js';
import { requireApproved } from '../../middleware/requireApproved.js';

const router = Router();

router.post('/posts/:postId/variants', authenticate, async (req: Request, res: Response) => {
  const parsed = generateVariantsSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
  }
  const variants = await generateVariants(req.params.postId, parsed.data, req.user!.id);
  res.status(201).json(variants);
});

router.get('/variants/:id', authenticate, async (req: Request, res: Response) => {
  const variant = await getVariantById(req.params.id);
  if (!variant) throw new NotFoundError('Variant', req.params.id);
  res.json(variant);
});

router.patch('/variants/:id', authenticate, async (req: Request, res: Response) => {
  const parsed = updateVariantSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
  }
  const variant = await updateVariant(req.params.id, parsed.data, req.user!.id);
  res.json(variant);
});

router.post('/variants/:id/submit', authenticate, async (req: Request, res: Response) => {
  const variant = await submitForReview(req.params.id, req.user!.id);
  res.json(variant);
});

router.post('/variants/:id/approve', authenticate, requireApprover, async (req: Request, res: Response) => {
  const variant = await approveVariant(req.params.id, req.user!.id);
  res.json(variant);
});

router.post('/variants/:id/reject', authenticate, requireApprover, async (req: Request, res: Response) => {
  const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
  const variant = await rejectVariant(req.params.id, req.user!.id, reason);
  res.json(variant);
});

router.post('/variants/:id/request-changes', authenticate, requireApprover, async (req: Request, res: Response) => {
  const { comment } = z.object({ comment: z.string().min(1) }).parse(req.body);
  const variant = await requestChanges(req.params.id, req.user!.id, comment);
  res.json(variant);
});

router.post('/variants/:id/schedule', authenticate, requireApproved, async (req: Request, res: Response) => {
  const parsed = scheduleVariantSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
  }
  const result = await scheduleVariant(req.params.id, parsed.data);
  res.json(result);
});

router.post('/variants/:id/publish', authenticate, requireApproved, async (req: Request, res: Response) => {
  const result = await publishVariant(req.params.id);
  res.json(result);
});

router.get('/variants/:id/attempts', authenticate, async (req: Request, res: Response) => {
  const attempts = await getPublishHistory(req.params.id);
  res.json(attempts);
});

export default router;