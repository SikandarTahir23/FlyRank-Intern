import axios, { AxiosInstance, AxiosError } from 'axios';
import { Platform } from '@prisma/client';
import { SocialPublisher, PublishInput, PublishResult, ValidationResult } from '../interface.js';
import { DISCORD_LIMITS, validateDiscordEmbeds } from '../../constraints/discord.js';
import { ExternalServiceError } from '../../../utils/errors.js';

interface DiscordWebhookPayload {
  content?: string;
  embeds?: Array<Record<string, unknown>>;
  username?: string;
  avatar_url?: string;
  allowed_mentions?: { parse: string[] };
}

export class DiscordWebhookAdapter implements SocialPublisher {
  readonly platform = Platform.DISCORD;
  readonly name = 'Discord Webhook';

  private webhookUrl: string;
  private client: AxiosInstance;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
    this.client = axios.create({
      baseURL: webhookUrl,
      timeout: 30000,
      validateStatus: (status) => status < 500,
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          const retryAfter = Number(error.response.headers['retry-after']) || 1;
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.client.request(error.config!);
        }
        throw error;
      }
    );
  }

  async validate(input: PublishInput): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];

    if (input.content.length > DISCORD_LIMITS.MESSAGE_CONTENT) {
      errors.push({ field: 'content', message: `Content exceeds ${DISCORD_LIMITS.MESSAGE_CONTENT} character limit` });
    }

    if (input.metadata?.embeds) {
      validateDiscordEmbeds(input.metadata as Record<string, unknown>, errors);
    }

    if (input.mediaUrls && input.mediaUrls.length > DISCORD_LIMITS.MAX_EMBEDS) {
      errors.push({ field: 'mediaUrls', message: `Maximum ${DISCORD_LIMITS.MAX_EMBEDS} attachments allowed` });
    }

    return { valid: errors.length === 0, errors };
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    const validation = await this.validate(input);
    if (!validation.valid) {
      throw new ExternalServiceError('Discord', validation.errors.map(e => e.message).join('; '), false);
    }

    const payload = this.buildPayload(input);

    try {
      const response = await this.client.post<DiscordWebhookPayload>('', payload);
      
      const messageId = response.headers['x-message-id'] || `discord_${Date.now()}`;
      const channelId = this.extractChannelId();

      return {
        success: true,
        externalId: messageId,
        url: channelId ? `https://discord.com/channels/@me/${channelId}/${messageId}` : undefined,
        rawResponse: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        
        if (status === 429) {
          const retryAfter = Number(error.response?.headers['retry-after']) || 1;
          throw new ExternalServiceError('Discord', `Rate limited. Retry after ${retryAfter}s`, true);
        }
        if (status && status >= 400 && status < 500) {
          throw new ExternalServiceError('Discord', `Discord API error: ${message}`, false);
        }
        throw new ExternalServiceError('Discord', `Network error: ${message}`, true);
      }
      throw error;
    }
  }

  async delete(externalId: string): Promise<boolean> {
    try {
      await this.client.delete(`/messages/${externalId}`);
      return true;
    } catch {
      return false;
    }
  }

  private buildPayload(input: PublishInput): DiscordWebhookPayload {
    const payload: DiscordWebhookPayload = {
      content: input.content.slice(0, DISCORD_LIMITS.MESSAGE_CONTENT),
      username: 'Social Media Studio',
      allowed_mentions: { parse: [] },
    };

    if (input.metadata?.embeds) {
      payload.embeds = input.metadata.embeds as DiscordWebhookPayload['embeds'];
    }

    if (input.mediaUrls && input.mediaUrls.length > 0) {
      payload.embeds = payload.embeds || [];
      for (const url of input.mediaUrls.slice(0, DISCORD_LIMITS.MAX_EMBEDS - (payload.embeds?.length || 0))) {
        payload.embeds.push({ image: { url } });
      }
    }

    return payload;
  }

  private extractChannelId(): string | undefined {
    try {
      const url = new URL(this.webhookUrl);
      const parts = url.pathname.split('/');
      return parts[parts.length - 2];
    } catch {
      return undefined;
    }
  }
}