import { z } from 'zod';

export const widgetConfigSchema = z.object({
  title: z.string().min(1).max(255),
  fields: z.array(z.object({ name: z.string().min(1).max(100), label: z.string().min(1).max(255), type: z.enum(['text', 'email', 'textarea', 'number', 'select']), required: z.boolean().default(false), options: z.array(z.string()).optional() })).min(1).max(20),
  buttonText: z.string().min(1).max(100).default('Submit'),
  honeypotFieldName: z.string().min(1).max(50).default('website'),
});

export const widgetSchema = z.object({ id: z.string().uuid(), tenant_id: z.string().uuid(), name: z.string().min(1).max(255), type: z.enum(['lead-form', 'contact', 'newsletter', 'custom']), config_json: widgetConfigSchema, is_active: z.boolean(), created_at: z.date() });
export const createWidgetSchema = z.object({ name: z.string().min(1).max(255), type: z.enum(['lead-form', 'contact', 'newsletter', 'custom']).default('lead-form'), config_json: widgetConfigSchema, is_active: z.boolean().default(true) });
export const updateWidgetSchema = createWidgetSchema.partial();
export const publicWidgetConfigSchema = z.object({ id: z.string().uuid(), name: z.string(), type: z.string(), config: widgetConfigSchema });

export type Widget = z.infer<typeof widgetSchema>;
export type CreateWidgetInput = z.infer<typeof createWidgetSchema>;
export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>;
export type WidgetConfig = z.infer<typeof widgetConfigSchema>;
export type PublicWidgetConfig = z.infer<typeof publicWidgetConfigSchema>;