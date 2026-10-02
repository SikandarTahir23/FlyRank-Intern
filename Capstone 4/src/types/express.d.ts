import { Variant, Post, User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      variant?: Variant;
      post?: Post;
    }
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}

export interface PublishInput {
  variantId: string;
  content: string;
  mediaUrls?: string[];
  metadata?: Record<string, unknown>;
}

export interface PublishResult {
  success: boolean;
  externalId?: string;
  url?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface PublishJobData {
  idempotencyKey: string;
  variantId: string;
  slotId: string;
  platform: string;
  content: string;
  mediaUrls?: string[];
  metadata?: Record<string, unknown>;
  attemptNumber: number;
  maxAttempts: number;
}