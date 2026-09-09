import { prisma } from '../../db/prisma.js';
import { Platform, ConstraintProfile } from '@prisma/client';

export async function getConstraintProfile(platform: Platform): Promise<ConstraintProfile | null> {
  return prisma.constraintProfile.findUnique({ where: { platform } });
}

export async function getAllConstraintProfiles(): Promise<ConstraintProfile[]> {
  return prisma.constraintProfile.findMany();
}

interface ConstraintProfileUpdateInput {
  maxLength?: number;
  maxHashtags?: number;
  toneRules?: any;
  mediaLimits?: any;
  embedLimits?: any;
}

export async function upsertConstraintProfile(
  platform: Platform,
  data: ConstraintProfileUpdateInput
): Promise<ConstraintProfile> {
  return prisma.constraintProfile.upsert({
    where: { platform },
    update: data as any,
    create: {
      platform,
      maxLength: data.maxLength ?? 2000,
      maxHashtags: data.maxHashtags ?? 10,
      toneRules: data.toneRules ?? {},
      mediaLimits: data.mediaLimits ?? {},
      embedLimits: data.embedLimits ?? null,
    } as any,
  });
}