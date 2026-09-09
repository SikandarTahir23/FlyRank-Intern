import { Platform } from '@prisma/client';
import { SocialPublisher } from './interface.js';
import { AdapterNotFoundError } from '../../utils/errors.js';

export class AdapterRegistry {
  private adapters = new Map<Platform, SocialPublisher>();

  register(platform: Platform, adapter: SocialPublisher): void {
    this.adapters.set(platform, adapter);
  }

  get(platform: Platform): SocialPublisher {
    const adapter = this.adapters.get(platform);
    if (!adapter) throw new AdapterNotFoundError(platform);
    return adapter;
  }

  has(platform: Platform): boolean {
    return this.adapters.has(platform);
  }

  getAll(): SocialPublisher[] {
    return Array.from(this.adapters.values());
  }

  unregister(platform: Platform): void {
    this.adapters.delete(platform);
  }
}

export const registry = new AdapterRegistry();