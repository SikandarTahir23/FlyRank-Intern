import { z } from 'zod';
import { Variant, Platform, VariantStatus } from '@prisma/client';
import { PublishAttempt, TimeSlot } from '@prisma/client';

export const generateVariantsSchema = z.object({
  platforms: z.array(z.enum(['DISCORD', 'TWITTER', 'LINKEDIN', 'INSTAGRAM'])).min(1),
});

export const updateVariantSchema = z.object({
  content: z.string().min(1).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const scheduleVariantSchema = z.object({
  slotId: z.string().cuid(),
});

export type GenerateVariantsInput = z.infer<typeof generateVariantsSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type ScheduleVariantInput = z.infer<typeof scheduleVariantSchema>;

export interface VariantWithRelations extends Variant {
  attempts: PublishAttempt[];
  slots: TimeSlot[];
  post: { title: string; sourceMarkdown: string | null };
}