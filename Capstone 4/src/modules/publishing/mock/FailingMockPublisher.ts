import { Platform } from '@prisma/client';
import { SocialPublisher, PublishInput, PublishResult, ValidationResult } from '../interface.js';

export class FailingMockPublisher implements SocialPublisher {
  readonly platform: Platform;
  readonly name: string;
  private failureRate: number;
  private failNext: boolean = false;

  constructor(platform: Platform, failureRate = 0.3) {
    this.platform = platform;
    this.name = `Failing Mock ${Platform[platform]}`;
    this.failureRate = failureRate;
  }

  setFailNext(fail: boolean): void {
    this.failNext = fail;
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  async validate(): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    if (this.failNext || Math.random() < this.failureRate) {
      this.failNext = false;
      throw new Error(`Simulated ${this.platform} API failure`);
    }
    const externalId = `mock_${this.platform.toLowerCase()}_${crypto.randomUUID()}`;
    return {
      success: true,
      externalId,
      url: `https://mock.${this.platform.toLowerCase()}.com/post/${externalId}`,
      rawResponse: { mock: true, platform: this.platform },
    };
  }

  async delete(externalId: string): Promise<boolean> {
    return true;
  }
}