import { z } from 'zod';

export const geoResponseSchema = z.object({ country: z.string().length(2).nullable(), city: z.string().nullable() });
export type GeoResponse = z.infer<typeof geoResponseSchema>;
export const NULL_GEO: GeoResponse = { country: null, city: null };
export const geoProviderConfigSchema = z.object({ name: z.string(), url: z.string().url(), timeoutMs: z.number().int().positive(), mockFailure: z.boolean().default(false) });
export type GeoProviderConfig = z.infer<typeof geoProviderConfigSchema>;