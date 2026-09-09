import { z } from 'zod';

export const createSubmissionSchema = z.object({}).passthrough();
export const submissionSchema = z.object({ id: z.string().uuid(), widget_id: z.string().uuid(), tenant_id: z.string().uuid(), payload_json: z.record(z.any()), ip_address: z.string(), geo_country: z.string().nullable(), geo_city: z.string().nullable(), is_spam: z.boolean(), created_at: z.date() });
export const submissionResponseSchema = z.object({ id: z.string().uuid(), widget_id: z.string().uuid(), created_at: z.date(), geo: z.object({ country: z.string().nullable(), city: z.string().nullable() }) });
export const listSubmissionsQuerySchema = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(100).default(20), is_spam: z.coerce.boolean().optional(), start_date: z.string().datetime().optional(), end_date: z.string().datetime().optional() });

export type Submission = z.infer<typeof submissionSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type SubmissionResponse = z.infer<typeof submissionResponseSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;