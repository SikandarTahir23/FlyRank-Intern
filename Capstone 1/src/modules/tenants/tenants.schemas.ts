import { z } from 'zod';

/**
 * Tenant schemas for validation and type safety.
 */
export const tenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  api_key: z.string().min(1).max(64),
  created_at: z.date(),
});

export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
});

export const tenantResponseSchema = tenantSchema.omit({ api_key: true }).extend({
  api_key: z.string(), // Include in response for creation
});

export type Tenant = z.infer<typeof tenantSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type TenantResponse = z.infer<typeof tenantResponseSchema>;

/**
 * Generates a secure API key for a tenant.
 * Format: tk_{prefix}_{random}
 */
export function generateApiKey(prefix: string): string {
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `tk_${prefix}_${randomPart}`;
}