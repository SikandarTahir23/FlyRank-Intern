import { describe, it, expect } from 'vitest';
import { checkSpam } from '../../src/modules/spam/spam.service.js';

describe('Honeypot Spam Detection', () => {
  it('should return not spam when honeypot not triggered', () => {
    const result = checkSpam(false);
    expect(result.isSpam).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it('should return spam when honeypot triggered', () => {
    const result = checkSpam(true);
    expect(result.isSpam).toBe(true);
    expect(result.score).toBe(100);
    expect(result.reasons).toContain('honeypot_triggered');
  });
});