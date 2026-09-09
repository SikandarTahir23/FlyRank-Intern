import { prisma } from '../../db/prisma.js';
import { Variant, Platform, VariantStatus, Post } from '@prisma/client';
import { generateVariant, GeneratorContext } from './generator.js';
import { validateVariantOrThrow } from '../constraints/validator.js';
import { canTransition, SCHEDULABLE_STATUSES } from './state.js';
import { scheduleVariantJob } from '../scheduling/jobs.js';
import { publishVariantNow } from '../scheduling/jobs.js';
import { NotFoundError, InvalidTransitionError, UnapprovedVariantError } from '../../utils/errors.js';
import { GenerateVariantsInput, UpdateVariantInput, ScheduleVariantInput } from './types.js';

export async function generateVariants(postId: string, input: GenerateVariantsInput, authorId: string): Promise<Variant[]> {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new NotFoundError('Post', postId);

  const profiles = await prisma.constraintProfile.findMany({
    where: { platform: { in: input.platforms } },
  });

  const variants = await prisma.$transaction(async (tx) => {
    const created: Variant[] = [];
    for (const platform of input.platforms) {
      const profile = profiles.find(p => p.platform === platform);
      if (!profile) continue;

      const ctx: GeneratorContext = {
        post: { ...post, constraintProfile: profile },
        platform,
        constraintProfile: profile,
      };

      const { content, metadata } = generateVariant(ctx);
      await validateVariantOrThrow({ platform, content, metadata, mediaUrls: [] } as any);

      const variant = await tx.variant.create({
        data: {
          postId,
          authorId,
          platform,
          content,
          metadata: metadata as any,
          mediaUrls: [],
          status: 'DRAFT',
        },
      });
      created.push(variant);
    }
    return created;
  });

  return variants;
}

export async function getVariantById(id: string) {
  return prisma.variant.findUnique({
    where: { id },
    include: {
      attempts: { orderBy: { createdAt: 'desc' } },
      slots: true,
      post: { select: { title: true, sourceMarkdown: true } },
    },
  });
}

export async function updateVariant(id: string, data: UpdateVariantInput, userId: string): Promise<Variant> {
  const variant = await prisma.variant.findUnique({ where: { id } });
  if (!variant) throw new NotFoundError('Variant', id);
  if (variant.authorId !== userId) throw new Error('Not authorized');
  if (variant.status !== 'DRAFT') throw new Error('Can only update draft variants');

  if (data.content) {
    await validateVariantOrThrow({ 
      platform: variant.platform, 
      content: data.content, 
      metadata: data.metadata as any, 
      mediaUrls: data.mediaUrls ?? variant.mediaUrls 
    } as any);
  }

  return prisma.variant.update({
    where: { id },
    data: { 
      content: data.content,
      mediaUrls: data.mediaUrls,
      metadata: data.metadata as any,
      updatedAt: new Date() 
    },
  });
}

export async function submitForReview(variantId: string, userId: string): Promise<Variant> {
  const variant = await prisma.variant.findUnique({ where: { id: variantId } });
  if (!variant) throw new NotFoundError('Variant', variantId);
  if (variant.authorId !== userId) throw new Error('Not authorized');

  return changeStatus(variant, 'IN_REVIEW', userId);
}

export async function approveVariant(variantId: string, approverId: string): Promise<Variant> {
  const variant = await prisma.variant.findUnique({ where: { id: variantId } });
  if (!variant) throw new NotFoundError('Variant', variantId);

  const updated = await changeStatus(variant, 'APPROVED', approverId);
  await prisma.review.create({ data: { variantId, approverId, action: 'APPROVE' } });
  return updated;
}

export async function rejectVariant(variantId: string, approverId: string, reason: string): Promise<Variant> {
  const variant = await prisma.variant.findUnique({ where: { id: variantId } });
  if (!variant) throw new NotFoundError('Variant', variantId);

  const updated = await changeStatus(variant, 'REJECTED', approverId);
  await prisma.review.create({ data: { variantId, approverId, action: 'REJECT', comment: reason } });
  return prisma.variant.update({ where: { id: variantId }, data: { rejectedReason: reason } });
}

export async function requestChanges(variantId: string, approverId: string, comment: string): Promise<Variant> {
  const variant = await prisma.variant.findUnique({ where: { id: variantId } });
  if (!variant) throw new NotFoundError('Variant', variantId);

  const updated = await changeStatus(variant, 'DRAFT', approverId);
  await prisma.review.create({ data: { variantId, approverId, action: 'REQUEST_CHANGES', comment } });
  return updated;
}

async function changeStatus(variant: Variant, newStatus: VariantStatus, actorId: string): Promise<Variant> {
  if (!canTransition(variant.status, newStatus)) {
    throw new InvalidTransitionError(variant.status, newStatus);
  }
  return prisma.variant.update({ where: { id: variant.id }, data: { status: newStatus } });
}

export async function scheduleVariant(variantId: string, input: ScheduleVariantInput): Promise<{ jobId: string; scheduledAt: Date }> {
  const variant = await prisma.variant.findUnique({ where: { id: variantId } });
  if (!variant) throw new NotFoundError('Variant', variantId);
  if (!SCHEDULABLE_STATUSES.includes(variant.status)) {
    throw new UnapprovedVariantError(variant.status);
  }

  const slot = await prisma.timeSlot.findUnique({ where: { id: input.slotId } });
  if (!slot) throw new NotFoundError('TimeSlot', input.slotId);
  if (slot.variantId && slot.variantId !== variantId) throw new Error('Slot already assigned');

  return scheduleVariantJob(variant, slot);
}

export async function publishVariant(variantId: string): Promise<{ success: boolean; externalId?: string; url?: string }> {
  const variant = await prisma.variant.findUnique({ where: { id: variantId } });
  if (!variant) throw new NotFoundError('Variant', variantId);
  if (!SCHEDULABLE_STATUSES.includes(variant.status)) {
    throw new UnapprovedVariantError(variant.status);
  }

  return publishVariantNow(variant);
}

export async function getPublishHistory(variantId: string) {
  const variant = await prisma.variant.findUnique({ where: { id: variantId } });
  if (!variant) throw new NotFoundError('Variant', variantId);
  return prisma.publishAttempt.findMany({
    where: { variantId },
    orderBy: { createdAt: 'desc' },
  });
}