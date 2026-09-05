import { z } from 'zod';

/**
 * Standardized geo response schema.
 * All providers must return data in this format.
 */
export const geoResponseSchema = z.object({
  country: z.string().length(2).nullable(), // ISO 3166-1 alpha-2
  city: z.string().nullable(),
});

export type GeoResponse = z.infer<typeof geoResponseSchema>;

/**
 * Null/empty geo response for fallback.
 */
export const NULL_GEO: GeoResponse = {
  country: null,
  city: null,
};

/**
 * Provider configuration schema.
 */
export const geoProviderConfigSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  timeoutMs: z.number().int().positive(),
  mockFailure: z.boolean().default(false),
});

export type GeoProviderConfig = z.infer<typeof geoProviderConfigSchema>;