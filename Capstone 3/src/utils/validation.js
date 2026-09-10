import { z } from 'zod';

export const idempotencyKeySchema = z.string().uuid({ message: 'Idempotency-Key must be a valid UUID' });

export const usageEventSchema = z.object({
  eventType: z.enum(['token_usage', 'api_request']),
  inputTokens: z.number().int().nonnegative().default(0),
  cachedInputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  reasoningTokens: z.number().int().nonnegative().default(0),
  requestId: z.string().max(255).optional(),
  model: z.string().max(100).optional(),
  endpoint: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).default({})
}).refine(
  data => data.cachedInputTokens <= data.inputTokens,
  { message: 'Cached input tokens cannot exceed total input tokens', path: ['cachedInputTokens'] }
);

export const checkoutSessionSchema = z.object({
  planKey: z.enum(['free', 'pro']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
});

export const tenantSlugSchema = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.flatten().fieldErrors;
      return next(new ValidationError('Invalid request body', details));
    }
    req.validatedBody = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = result.error.flatten().fieldErrors;
      return next(new ValidationError('Invalid query parameters', details));
    }
    req.validatedQuery = result.data;
    next();
  };
}