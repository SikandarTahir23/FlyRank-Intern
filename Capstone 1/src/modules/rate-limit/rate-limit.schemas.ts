import { z } from 'zod';

/**
 * Rate limit configuration schema.
 * Used for validating rate limit settings.
 */
export const rateLimitConfigSchema = z.object({
  maxRequests: z.number().int().positive(),
  windowMs: z.number().int().positive(),
  keyPrefix: z.string().default('rl'),
});

export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;