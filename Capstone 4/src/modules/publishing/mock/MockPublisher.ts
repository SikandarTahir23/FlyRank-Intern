import { Platform } from '@prisma/client';
import { SocialPublisher, PublishInput, PublishResult, ValidationResult } from '../interface.js';

export class MockPublisher implements SocialPublisher {
  readonly platform: Platform;
  readonly name: string;

  constructor(platform: Platform) {
    this.platform = platform;
    this.name = `Mock ${Platform[platform]}`;
  }

  async validate(): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  }

  async publish(input: PublishInput): Promise<PublishResult> {
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