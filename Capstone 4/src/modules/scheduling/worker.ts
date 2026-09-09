import { Worker, Job } from 'bullmq';
import { prisma } from '../../db/prisma.js';
import { bullRedis } from '../../config/redis.js';
import { registry } from '../publishing/registry.js';
import { Platform } from '@prisma/client';
import { PublishJobData } from './queue.js';
import { generateIdempotencyKey, checkAndSetIdempotency, completeIdempotency, releaseIdempotency, getIdempotencyResult } from './idempotency.js';
import { ExternalServiceError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { Prisma } from '@prisma/client';

export const publishWorker = new Worker<PublishJobData>('publish', async (job: Job<PublishJobData>) => {
  const { idempotencyKey, variantId, platform, attemptNumber, content, mediaUrls, metadata } = job.data;
  
  const existing = await getIdempotencyResult(idempotencyKey);
  if (existing?.success) {
    logger.info({ idempotencyKey }, 'Job already completed, skipping');
    const { success, ...rest } = existing;
    return { success: true, skipped: true, ...rest };
  }

  const acquired = await checkAndSetIdempotency(idempotencyKey);
  if (!acquired) {
    const existingResult = await getIdempotencyResult(idempotencyKey);
    if (existingResult?.success) {
      const { success, ...rest } = existingResult;
      return { success: true, skipped: true, ...rest };
    }
    throw new Error('Job already processing');
  }

  try {
    const adapter = registry.get(platform);
    const validation = await adapter.validate({ variantId, content, mediaUrls, metadata });
    if (!validation.valid) {
      throw new ExternalServiceError(platform, validation.errors.map(e => e.message).join('; '), false);
    }

    const result = await adapter.publish({ variantId, content, mediaUrls, metadata });
    
    await completeIdempotency(idempotencyKey, result);
    
    await prisma.$transaction([
      prisma.variant.update({
        where: { id: variantId },
        data: { 
          status: 'PUBLISHED', 
          publishedAt: new Date(),
        }
      }),
      prisma.publishAttempt.create({
        data: {
          variantId,
          platform,
          externalId: result.externalId,
          success: true,
          attemptNumber,
          rawResponse: result.rawResponse as Prisma.InputJsonValue | undefined,
        }
      }),
      prisma.timeSlot.updateMany({
        where: { variantId, platform },
        data: { variantId: null }
      })
    ]);

    logger.info({ variantId, platform, externalId: result.externalId }, 'Variant published successfully');
    return result;
  } catch (error) {
    await releaseIdempotency(idempotencyKey);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const retryable = error instanceof ExternalServiceError ? error.retryable : true;
    
    await prisma.publishAttempt.create({
      data: {
        variantId,
        platform,
        error: errorMessage,
        success: false,
        attemptNumber,
      }
    });

    if (!retryable || attemptNumber >= job.data.maxAttempts) {
      await prisma.variant.update({
        where: { id: variantId },
        data: { status: 'FAILED' }
      });
      logger.error({ variantId, platform, error: errorMessage, attemptNumber }, 'Publish failed permanently');
    } else {
      await prisma.variant.update({
        where: { id: variantId },
        data: { status: 'SCHEDULED' }
      });
      logger.warn({ variantId, platform, error: errorMessage, attemptNumber }, 'Publish failed, will retry');
    }
    
    throw error;
  }
}, {
  connection: bullRedis,
  concurrency: 5,
  limiter: { max: 10, duration: 1000 },
});

publishWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Publish job completed');
});

publishWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Publish job failed');
});

export async function closeWorker(): Promise<void> {
  await publishWorker.close();
}