import { VariantStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<VariantStatus, VariantStatus[]> = {
  DRAFT: ['IN_REVIEW'],
  IN_REVIEW: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED: ['SCHEDULED', 'PUBLISHED', 'REJECTED'],
  REJECTED: ['DRAFT'],
  SCHEDULED: ['PUBLISHED', 'FAILED', 'APPROVED'],
  PUBLISHED: [],
  FAILED: ['SCHEDULED', 'APPROVED'],
};

export function canTransition(from: VariantStatus, to: VariantStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(status: VariantStatus): VariantStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

export function transition(status: VariantStatus, to: VariantStatus): VariantStatus {
  if (!canTransition(status, to)) {
    throw new Error(`Invalid transition from ${status} to ${to}`);
  }
  return to;
}

export const TERMINAL_STATUSES: VariantStatus[] = ['PUBLISHED'];
export const SCHEDULABLE_STATUSES: VariantStatus[] = ['APPROVED', 'SCHEDULED'];