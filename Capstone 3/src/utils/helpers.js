import { randomUUID } from 'crypto';

export function generateId() {
  return randomUUID();
}

export function isValidUUID(value) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function getSecondsUntil(date) {
  const now = Date.now();
  const target = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return Math.max(0, Math.ceil((target - now) / 1000));
}