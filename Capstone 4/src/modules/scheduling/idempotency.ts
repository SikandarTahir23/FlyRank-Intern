import { redis } from '../../config/redis.js';

export function generateIdempotencyKey(variantId: string, slotId: string, attempt: number): string {
  return `publish:${variantId}:${slotId}:${attempt}`;
}

export async function checkAndSetIdempotency(key: string, ttlSeconds = 3600): Promise<boolean> {
  const result = await redis.set(key, 'processing', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

export async function completeIdempotency(key: string, result: { success: boolean; externalId?: string; url?: string }, ttlSeconds = 604800): Promise<void> {
  const { success, ...rest } = result;
  await redis.set(key, JSON.stringify({ success: true, ...rest }), 'EX', ttlSeconds);
}

export async function releaseIdempotency(key: string): Promise<void> {
  await redis.del(key);
}

export async function getIdempotencyResult(key: string): Promise<{ success: boolean; externalId?: string; url?: string } | null> {
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}