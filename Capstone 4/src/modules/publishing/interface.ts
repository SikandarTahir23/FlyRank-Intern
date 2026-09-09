import { Platform } from '@prisma/client';

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

export interface SocialPublisher {
  readonly platform: Platform;
  readonly name: string;
  validate(input: PublishInput): Promise<ValidationResult>;
  publish(input: PublishInput): Promise<PublishResult>;
  delete?(externalId: string): Promise<boolean>;
}