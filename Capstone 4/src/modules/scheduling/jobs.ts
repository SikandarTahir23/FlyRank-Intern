import { publishQueue } from './queue.js';
import { generateIdempotencyKey } from './idempotency.js';
import { prisma } from '../../db/prisma.js';
import { Variant, TimeSlot, Platform } from '@prisma/client';
import { UnapprovedVariantError } from '../../utils/errors.js';
import { registry } from '../publishing/registry.js';
import { Prisma } from '@prisma/client';

export async function scheduleVariantJob(variant: Variant, slot: TimeSlot): Promise<{ jobId: string; scheduledAt: Date }> {
  if (!['APPROVED', 'SCHEDULED'].includes(variant.status)) {
    throw new UnapprovedVariantError(variant.status);
  }

  const idempotencyKey = generateIdempotencyKey(variant.id, slot.id, 1);
  const delay = Math.max(0, slot.scheduledAt.getTime() - Date.now());

  await publishQueue.add('publish', {
    idempotencyKey,
    variantId: variant.id,
    slotId: slot.id,
    platform: variant.platform,
    content: variant.content,
    mediaUrls: variant.mediaUrls,
    metadata: variant.metadata as Record<string, unknown> | undefined,
    attemptNumber: 1,
    maxAttempts: 3,
  }, { delay });

  await prisma.variant.update({
    where: { id: variant.id },
    data: { status: 'SCHEDULED', scheduledAt: slot.scheduledAt }
  });

  await prisma.timeSlot.update({
    where: { id: slot.id },
    data: { variantId: variant.id }
  });

  return { jobId: idempotencyKey, scheduledAt: slot.scheduledAt };
}

export async function publishVariantNow(variant: Variant): Promise<{ success: boolean; externalId?: string; url?: string }> {
  if (!['APPROVED', 'SCHEDULED'].includes(variant.status)) {
    throw new UnapprovedVariantError(variant.status);
  }

  const adapter = registry.get(variant.platform);
  const validation = await adapter.validate({
    variantId: variant.id,
    content: variant.content,
    mediaUrls: variant.mediaUrls,
    metadata: variant.metadata as Record<string, unknown> | undefined,
  });

  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join('; ')}`);
  }

  const result = await adapter.publish({
    variantId: variant.id,
    content: variant.content,
    mediaUrls: variant.mediaUrls,
    metadata: variant.metadata as Record<string, unknown> | undefined,
  });

  await prisma.$transaction([
    prisma.variant.update({
      where: { id: variant.id },
      data: { 
        status: 'PUBLISHED', 
        publishedAt: new Date(),
      }
    }),
    prisma.publishAttempt.create({
      data: {
        variantId: variant.id,
        platform: variant.platform,
        externalId: result.externalId,
        success: true,
        attemptNumber: 1,
        rawResponse: result.rawResponse as Prisma.InputJsonValue | undefined,
      }
    }),
  ]);

  return { success: true, externalId: result.externalId, url: result.url };
}

export async function createTimeSlot(
  postId: string,
  platform: Platform,
  scheduledAt: Date,
  timezone = 'UTC',
  isRecurring = false,
  recurrenceRule?: string
): Promise<TimeSlot> {
  return prisma.timeSlot.create({
    data: { postId, platform, scheduledAt, timezone, isRecurring, recurrenceRule }
  });
}

export async function getAvailableSlots(postId: string, platform: Platform): Promise<TimeSlot[]> {
  return prisma.timeSlot.findMany({
    where: { postId, platform, variantId: null, scheduledAt: { gte: new Date() } },
    orderBy: { scheduledAt: 'asc' },
  });
}