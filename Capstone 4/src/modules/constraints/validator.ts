import { ConstraintProfile, Platform, Variant } from '@prisma/client';
import { getConstraintProfile } from './profiles.js';
import { validateDiscordEmbeds } from './discord.js';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export async function validateVariant(variant: Pick<Variant, 'platform' | 'content' | 'metadata' | 'mediaUrls'>): Promise<ValidationResult> {
  const profile = await getConstraintProfile(variant.platform);
  if (!profile) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = [];

  if (variant.content.length > profile.maxLength) {
    errors.push({ field: 'content', message: `Content exceeds maximum length of ${profile.maxLength} characters` });
  }

  const hashtagCount = (variant.content.match(/#\w+/g) || []).length;
  if (hashtagCount > profile.maxHashtags) {
    errors.push({ field: 'content', message: `Hashtag count (${hashtagCount}) exceeds maximum of ${profile.maxHashtags}` });
  }

  if (variant.platform === Platform.DISCORD) {
    validateDiscordEmbeds(variant.metadata as Record<string, unknown> | undefined, errors);
    
    const mediaLimits = profile.mediaLimits as Record<string, unknown> | undefined;
    if (variant.mediaUrls && mediaLimits?.maxImages && variant.mediaUrls.length > Number(mediaLimits.maxImages)) {
      errors.push({ field: 'mediaUrls', message: `Maximum ${mediaLimits.maxImages} images allowed for Discord` });
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function validateVariantOrThrow(variant: Pick<Variant, 'platform' | 'content' | 'metadata' | 'mediaUrls'>): Promise<void> {
  const result = await validateVariant(variant);
  if (!result.valid) {
    const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join('; ');
    throw new Error(`Validation failed: ${errorMessages}`);
  }
}