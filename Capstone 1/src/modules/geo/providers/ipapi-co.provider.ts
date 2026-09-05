import axios, { AxiosInstance } from 'axios';
import { GeoResponse, GeoProviderConfig } from '../geo.schemas.js';

/**
 * Provider B: ipapi.co
 * Free tier: 1000 requests/day
 * Returns: { country_code, city, ... }
 */
export class IpapiCoProvider {
  private client: AxiosInstance;
  private config: GeoProviderConfig;

  constructor(config: GeoProviderConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.url,
      timeout: config.timeoutMs,
      headers: { 'Accept': 'application/json' },
    });
  }

  async lookup(ipAddress: string): Promise<GeoResponse> {
    if (this.config.mockFailure) {
      throw new Error('Mock failure enabled for Provider B');
    }

    try {
      const response = await this.client.get(`/${ipAddress}/json/`);
      const data = response.data;

      if (data.error) {
        throw new Error(data.reason || 'Provider B lookup failed');
      }

      return {
        country: data.country_code?.toUpperCase() || null,
        city: data.city || null,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Provider B timeout');
        }
        if (error.response?.status === 429) {
          throw new Error('Provider B rate limited');
        }
      }
      throw error;
    }
  }
}