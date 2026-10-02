export interface SpamCheckResult { isSpam: boolean; score: number; reasons: string[]; }

export function checkSpam(isHoneypotTriggered: boolean): SpamCheckResult {
  if (isHoneypotTriggered) return { isSpam: true, score: 100, reasons: ['honeypot_triggered'] };
  return { isSpam: false, score: 0, reasons: [] };
}