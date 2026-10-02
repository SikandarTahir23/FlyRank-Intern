import { Queue } from 'bullmq';
import { bullRedis } from '../../config/redis.js';
import { Platform } from '@prisma/client';

export interface PublishJobData {
  idempotencyKey: string;
  variantId: string;
  slotId: string;
  platform: Platform;
  content: string;
  mediaUrls?: string[];
  metadata?: Record<string, unknown>;
  attemptNumber: number;
  maxAttempts: number;
}

export const publishQueue = new Queue<PublishJobData>('publish', {
  connection: bullRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function closeQueue(): Promise<void> {
  await publishQueue.close();
}