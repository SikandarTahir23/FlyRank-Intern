import axios, { AxiosInstance } from 'axios';
import { GeoResponse, GeoProviderConfig } from '../geo.schemas.js';

export class IpApiProvider {
  private client: AxiosInstance;
  private config: GeoProviderConfig;

  constructor(config: GeoProviderConfig) {
    this.config = config;
    this.client = axios.create({ baseURL: config.url, timeout: config.timeoutMs, headers: { Accept: 'application/json' } });
  }

  async lookup(ipAddress: string): Promise<GeoResponse> {
    if (this.config.mockFailure) throw new Error('Mock failure enabled for Provider A');
    try {
      const response = await this.client.get(`/${ipAddress}`, { params: { fields: 'countryCode,city' } });
      const data = response.data;
      if (data.status === 'fail') throw new Error(data.message || 'Provider A lookup failed');
      return { country: data.countryCode?.toUpperCase() || null, city: data.city || null };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') throw new Error('Provider A timeout');
        if (error.response?.status === 429) throw new Error('Provider A rate limited');
      }
      throw error;
    }
  }
}