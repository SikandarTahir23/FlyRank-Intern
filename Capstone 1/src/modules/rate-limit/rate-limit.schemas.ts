import { z } from 'zod';

export const rateLimitConfigSchema = z.object({ maxRequests: z.number().int().positive(), windowMs: z.number().int().positive(), keyPrefix: z.string().default('rl') });
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;