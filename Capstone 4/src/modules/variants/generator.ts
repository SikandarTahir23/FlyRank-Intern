import { Platform, ConstraintProfile, Post } from '@prisma/client';
import { truncateToLimit, stripMarkdown } from '../../utils/markdown.js';
import { DISCORD_LIMITS } from '../constraints/discord.js';

export interface GeneratorContext {
  post: Post & { constraintProfile?: ConstraintProfile };
  platform: Platform;
  constraintProfile: ConstraintProfile;
}

function generateDiscordVariant(ctx: GeneratorContext): { content: string; metadata?: Record<string, unknown> } {
  const { post, constraintProfile } = ctx;
  const sourceText = post.sourceMarkdown ? stripMarkdown(post.sourceMarkdown) : post.description || '';
  const maxLength = constraintProfile.maxLength;

  const embeds = [];
  if (sourceText.length > 500) {
    embeds.push({
      title: post.title.slice(0, DISCORD_LIMITS.EMBED_TITLE),
      description: truncateToLimit(sourceText, DISCORD_LIMITS.EMBED_DESCRIPTION),
      color: 0x5865F2,
      footer: { text: 'Social Media Studio' },
    });
  }

  const content = truncateToLimit(
    `**${post.title}**\n\n${sourceText.slice(0, 1500)}`,
    maxLength
  );

  return { content, metadata: embeds.length ? { embeds } : undefined };
}

function generateTwitterVariant(ctx: GeneratorContext): { content: string; metadata?: Record<string, unknown> } {
  const { post, constraintProfile } = ctx;
  const sourceText = post.sourceMarkdown ? stripMarkdown(post.sourceMarkdown) : post.description || '';
  const maxLength = constraintProfile.maxLength;

  const hashtags = ['#tech', '#blog', '#insights'].slice(0, constraintProfile.maxHashtags);
  const hashtagStr = hashtags.join(' ');

  const tweetText = truncateToLimit(
    `${post.title}\n\n${sourceText}\n\n${hashtagStr}`,
    maxLength
  );

  return { content: tweetText };
}

function generateLinkedInVariant(ctx: GeneratorContext): { content: string; metadata?: Record<string, unknown> } {
  const { post, constraintProfile } = ctx;
  const sourceText = post.sourceMarkdown ? stripMarkdown(post.sourceMarkdown) : post.description || '';
  const maxLength = constraintProfile.maxLength;

  const hashtags = ['#leadership', '#innovation', '#technology', '#insights', '#growth'].slice(0, constraintProfile.maxHashtags);
  const hashtagStr = hashtags.join(' ');

  const content = truncateToLimit(
    `${post.title}\n\n${sourceText}\n\n${hashtagStr}`,
    maxLength
  );

  return { content };
}

function generateInstagramVariant(ctx: GeneratorContext): { content: string; metadata?: Record<string, unknown> } {
  const { post, constraintProfile } = ctx;
  const sourceText = post.sourceMarkdown ? stripMarkdown(post.sourceMarkdown) : post.description || '';
  const maxLength = constraintProfile.maxLength;

  const hashtags = [
    '#tech', '#innovation', '#startup', '#programming', '#developer',
    '#coding', '#software', '#ai', '#machinelearning', '#datascience',
    '#webdev', '#mobiledev', '#opensource', '#github', '#vscode',
  ].slice(0, constraintProfile.maxHashtags);
  const hashtagStr = hashtags.join(' ');

  const content = truncateToLimit(
    `${post.title}\n\n${sourceText}\n\n${hashtagStr}`,
    maxLength
  );

  return { content };
}

export function generateVariant(ctx: GeneratorContext): { content: string; metadata?: Record<string, unknown> } {
  switch (ctx.platform) {
    case Platform.DISCORD:
      return generateDiscordVariant(ctx);
    case Platform.TWITTER:
      return generateTwitterVariant(ctx);
    case Platform.LINKEDIN:
      return generateLinkedInVariant(ctx);
    case Platform.INSTAGRAM:
      return generateInstagramVariant(ctx);
    default:
      return { content: ctx.post.title };
  }
}