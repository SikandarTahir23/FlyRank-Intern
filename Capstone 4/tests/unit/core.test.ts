import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateVariant, GeneratorContext } from '@/modules/variants/generator.js';
import { Platform, ConstraintProfile } from '@prisma/client';
import { canTransition, transition, VALID_TRANSITIONS } from '@/modules/variants/state.js';
import { MockPublisher } from '@/modules/publishing/mock/MockPublisher.js';
import { FailingMockPublisher } from '@/modules/publishing/mock/FailingMockPublisher.js';
import { validateVariant, ValidationResult } from '@/modules/constraints/validator.js';
import { VariantStatus } from '@prisma/client';
import { DISCORD_LIMITS, validateDiscordEmbeds } from '@/modules/constraints/discord.js';

describe('Variant Generator', () => {
  const mockPost = {
    id: 'post_1',
    title: 'Test Blog Post',
    sourceMarkdown: '# Test Blog Post\n\nShort content.',
    description: 'A test blog post',
    sourceUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    authorId: 'user_1',
  } as any;

  const mockProfile = (platform: Platform, overrides: Partial<ConstraintProfile> = {}): ConstraintProfile => ({
    id: 'profile_1',
    platform,
    maxLength: 2000,
    maxHashtags: 5,
    toneRules: {},
    mediaLimits: {},
    embedLimits: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  it('generates Discord variant with embeds for long content', () => {
    const longPost = {
      ...mockPost,
      sourceMarkdown: '# Test Blog Post\n\n' + 'This is a long blog post with lots of content. '.repeat(100),
    };
    const ctx: GeneratorContext = {
      post: { ...longPost, constraintProfile: mockProfile(Platform.DISCORD) },
      platform: Platform.DISCORD,
      constraintProfile: mockProfile(Platform.DISCORD),
    };

    const result = generateVariant(ctx);
    expect(result.content).toContain('Test Blog Post');
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.embeds).toBeInstanceOf(Array);
  });

  it('generates Twitter variant with hashtags', () => {
    const ctx: GeneratorContext = {
      post: { ...mockPost, constraintProfile: mockProfile(Platform.TWITTER) },
      platform: Platform.TWITTER,
      constraintProfile: mockProfile(Platform.TWITTER, { maxLength: 280, maxHashtags: 3 }),
    };

    const result = generateVariant(ctx);
    expect(result.content.length).toBeLessThanOrEqual(280);
    expect(result.content).toMatch(/#\w+/);
  });

  it('generates LinkedIn variant with professional hashtags', () => {
    const ctx: GeneratorContext = {
      post: { ...mockPost, constraintProfile: mockProfile(Platform.LINKEDIN) },
      platform: Platform.LINKEDIN,
      constraintProfile: mockProfile(Platform.LINKEDIN, { maxLength: 3000, maxHashtags: 5 }),
    };

    const result = generateVariant(ctx);
    expect(result.content.length).toBeLessThanOrEqual(3000);
    expect(result.content).toMatch(/#\w+/);
  });

  it('generates Instagram variant with hashtag clusters', () => {
    const ctx: GeneratorContext = {
      post: { ...mockPost, constraintProfile: mockProfile(Platform.INSTAGRAM) },
      platform: Platform.INSTAGRAM,
      constraintProfile: mockProfile(Platform.INSTAGRAM, { maxLength: 2200, maxHashtags: 15 }),
    };

    const result = generateVariant(ctx);
    expect(result.content.length).toBeLessThanOrEqual(2200);
    const hashtags = result.content.match(/#\w+/g) || [];
    expect(hashtags.length).toBeGreaterThan(5);
  });
});

describe('State Machine', () => {
  it('allows valid transitions', () => {
    expect(canTransition('DRAFT', 'IN_REVIEW')).toBe(true);
    expect(canTransition('IN_REVIEW', 'APPROVED')).toBe(true);
    expect(canTransition('IN_REVIEW', 'REJECTED')).toBe(true);
    expect(canTransition('IN_REVIEW', 'DRAFT')).toBe(true);
    expect(canTransition('APPROVED', 'SCHEDULED')).toBe(true);
    expect(canTransition('APPROVED', 'PUBLISHED')).toBe(true);
    expect(canTransition('SCHEDULED', 'PUBLISHED')).toBe(true);
    expect(canTransition('FAILED', 'SCHEDULED')).toBe(true);
  });

  it('blocks invalid transitions', () => {
    expect(canTransition('DRAFT', 'APPROVED')).toBe(false);
    expect(canTransition('PUBLISHED', 'DRAFT')).toBe(false);
    expect(canTransition('REJECTED', 'APPROVED')).toBe(false);
  });

  it('throws on invalid transition', () => {
    expect(() => transition('DRAFT', 'APPROVED')).toThrow('Invalid transition');
  });
});

describe('MockPublisher', () => {
  it('always succeeds', async () => {
    const publisher = new MockPublisher(Platform.TWITTER);
    const result = await publisher.publish({ variantId: '1', content: 'test' });
    expect(result.success).toBe(true);
    expect(result.externalId).toBeDefined();
  });

  it('validate always passes', async () => {
    const publisher = new MockPublisher(Platform.TWITTER);
    const result = await publisher.validate({ variantId: '1', content: 'test' });
    expect(result.valid).toBe(true);
  });
});

describe('FailingMockPublisher', () => {
  it('fails when configured', async () => {
    const publisher = new FailingMockPublisher(Platform.TWITTER, 1.0);
    await expect(publisher.publish({ variantId: '1', content: 'test' })).rejects.toThrow();
  });

  it('succeeds when not failing', async () => {
    const publisher = new FailingMockPublisher(Platform.TWITTER, 0.0);
    const result = await publisher.publish({ variantId: '1', content: 'test' });
    expect(result.success).toBe(true);
  });
});

describe('Discord Constraints', () => {
  it('validates message content length', () => {
    const errors: Array<{ field: string; message: string }> = [];
    validateDiscordEmbeds({ embeds: [] }, errors);
    expect(errors.length).toBe(0);
  });

  it('rejects embed title too long', () => {
    const errors: Array<{ field: string; message: string }> = [];
    validateDiscordEmbeds({ 
      embeds: [{ title: 'a'.repeat(DISCORD_LIMITS.EMBED_TITLE + 1) }] 
    }, errors);
    expect(errors.some(e => e.field.includes('title'))).toBe(true);
  });

  it('rejects too many embeds', () => {
    const errors: Array<{ field: string; message: string }> = [];
    validateDiscordEmbeds({ 
      embeds: Array(DISCORD_LIMITS.MAX_EMBEDS + 1).fill({ title: 'test' }) 
    }, errors);
    expect(errors.some(e => e.field === 'metadata.embeds')).toBe(true);
  });

  it('rejects total embed chars exceeded', () => {
    const errors: Array<{ field: string; message: string }> = [];
    validateDiscordEmbeds({ 
      embeds: [{ 
        title: 'a'.repeat(1000), 
        description: 'b'.repeat(5000),
        fields: [{ name: 'c'.repeat(500), value: 'd'.repeat(500) }]
      }] 
    }, errors);
    expect(errors.some(e => e.field === 'metadata.embeds')).toBe(true);
  });
});