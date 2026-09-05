/**
 * Spam detection service.
 * 
 * Currently uses honeypot-based detection only.
 * Can be extended with additional signals:
 * - IP reputation
 * - Content analysis
 * - Behavioral patterns
 * - ML-based classification
 */
export interface SpamCheckResult {
  isSpam: boolean;
  score: number; // 0-100
  reasons: string[];
}

/**
 * Determines if a submission is spam.
 * Currently only uses honeypot detection.
 * 
 * @param isHoneypotTriggered - Whether the honeypot field was filled
 * @returns Spam check result
 */
export function checkSpam(isHoneypotTriggered: boolean): SpamCheckResult {
  if (isHoneypotTriggered) {
    return {
      isSpam: true,
      score: 100,
      reasons: ['honeypot_triggered'],
    };
  }
  
  return {
    isSpam: false,
    score: 0,
    reasons: [],
  };
}