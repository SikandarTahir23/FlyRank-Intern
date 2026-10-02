import { PrismaClient, Platform } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PROFILES = [
  {
    platform: Platform.DISCORD,
    maxLength: 2000,
    maxHashtags: 0,
    toneRules: {
      allowed: ['casual', 'technical', 'community'],
      forbidden: ['formal', 'corporate'],
      styleGuide: 'Use Discord markdown. Keep messages conversational. Use embeds for structured content.',
    },
    mediaLimits: {
      maxImages: 10,
      maxVideoSeconds: 60,
      maxFileSizeMB: 25,
    },
    embedLimits: {
      maxEmbeds: 10,
      maxTitleLength: 256,
      maxDescriptionLength: 4096,
      maxFieldNameLength: 256,
      maxFieldValueLength: 1024,
      maxFooterLength: 2048,
      maxAuthorNameLength: 256,
      maxTotalChars: 6000,
    },
  },
  {
    platform: Platform.TWITTER,
    maxLength: 280,
    maxHashtags: 10,
    toneRules: {
      allowed: ['concise', 'engaging', 'thread-friendly'],
      forbidden: ['verbose', 'formal'],
      styleGuide: 'Thread format for long content. Use hashtags strategically. Tag relevant accounts.',
    },
    mediaLimits: {
      maxImages: 4,
      maxVideoSeconds: 140,
      maxFileSizeMB: 512,
    },
    embedLimits: null,
  },
  {
    platform: Platform.LINKEDIN,
    maxLength: 3000,
    maxHashtags: 5,
    toneRules: {
      allowed: ['professional', 'thought-leadership', 'insightful'],
      forbidden: ['casual', 'slang', 'excessive-emoji'],
      styleGuide: 'Professional tone. Lead with insight. Use line breaks for readability. 3-5 relevant hashtags.',
    },
    mediaLimits: {
      maxImages: 9,
      maxVideoSeconds: 600,
      maxFileSizeMB: 100,
    },
    embedLimits: null,
  },
  {
    platform: Platform.INSTAGRAM,
    maxLength: 2200,
    maxHashtags: 30,
    toneRules: {
      allowed: ['visual', 'inspiring', 'community-focused'],
      forbidden: ['text-heavy', 'technical-jargon'],
      styleGuide: 'Visual-first. Hashtag clusters at end. Line breaks for readability. Tag collaborators.',
    },
    mediaLimits: {
      maxImages: 10,
      maxVideoSeconds: 90,
      maxFileSizeMB: 100,
    },
    embedLimits: null,
  },
];

async function main() {
  console.log('Seeding constraint profiles...');

  for (const profile of DEFAULT_PROFILES) {
    await prisma.constraintProfile.upsert({
      where: { platform: profile.platform },
      update: profile,
      create: profile,
    });
    console.log(`  ✓ ${profile.platform}`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });