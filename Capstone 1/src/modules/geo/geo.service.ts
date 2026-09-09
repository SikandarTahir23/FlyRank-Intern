import { getConfig } from '../../config/index.js';
import { logger, createChildLogger } from '../../utils/logger.js';
import { GeoResponse, NULL_GEO } from './geo.schemas.js';
import { IpApiProvider } from './providers/ipapi.provider.js';
import { IpapiCoProvider } from './providers/ipapi-co.provider.js';
import { NullGeoProvider } from './providers/null-geo.provider.js';

function getMockFlags() {
  return { mockFailureA: process.env.MOCK_GEO_FAILURE_A === 'true', mockFailureAll: process.env.MOCK_GEO_FAILURE_ALL === 'true' };
}

interface CircuitBreakerState { failures: number; lastFailure: number; isOpen: boolean; }

export class GeoService {
  private providerA: IpApiProvider;
  private providerB: IpapiCoProvider;
  private nullProvider: NullGeoProvider;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly circuitBreakerThreshold: number;
  private readonly circuitBreakerResetMs: number;

  constructor() {
    const config = getConfig();
    const mockFlags = getMockFlags();
    this.circuitBreakerThreshold = config.GEO_CIRCUIT_BREAKER_THRESHOLD;
    this.circuitBreakerResetMs = config.GEO_CIRCUIT_BREAKER_RESET_MS;
    this.providerA = new IpApiProvider({ name: 'Provider A (ip-api.com)', url: config.GEO_PROVIDER_A_URL, timeoutMs: config.GEO_TIMEOUT_MS, mockFailure: mockFlags.mockFailureA });
    this.providerB = new IpapiCoProvider({ name: 'Provider B (ipapi.co)', url: config.GEO_PROVIDER_B_URL, timeoutMs: config.GEO_TIMEOUT_MS, mockFailure: mockFlags.mockFailureAll });
    this.nullProvider = new NullGeoProvider();
    this.circuitBreakers.set('providerA', { failures: 0, lastFailure: 0, isOpen: false });
    this.circuitBreakers.set('providerB', { failures: 0, lastFailure: 0, isOpen: false });
  }

  async enrich(ipAddress: string): Promise<GeoResponse> {
    const requestLogger = createChildLogger({ ipAddress, operation: 'geo_enrichment' });
    if (this.isPrivateIp(ipAddress)) { requestLogger.debug('Skipping geo enrichment for private IP'); return NULL_GEO; }
    if (!this.isCircuitOpen('providerA')) {
      try { const result = await this.providerA.lookup(ipAddress); this.recordSuccess('providerA'); requestLogger.info({ provider: 'A', ...result }, 'Geo enrichment successful'); return result; }
      catch (error) { this.recordFailure('providerA'); requestLogger.warn({ provider: 'A', error: String(error) }, 'Provider A failed, trying fallback'); }
    } else { requestLogger.debug('Circuit breaker open for Provider A, skipping'); }
    if (!this.isCircuitOpen('providerB')) {
      try { const result = await this.providerB.lookup(ipAddress); this.recordSuccess('providerB'); requestLogger.info({ provider: 'B', ...result }, 'Geo enrichment successful (fallback)'); return result; }
      catch (error) { this.recordFailure('providerB'); requestLogger.warn({ provider: 'B', error: String(error) }, 'Provider B failed, using NullGeo'); }
    } else { requestLogger.debug('Circuit breaker open for Provider B, skipping'); }
    requestLogger.warn('All geo providers failed, using NullGeo mock');
    return this.nullProvider.lookup(ipAddress);
  }

  private isCircuitOpen(providerKey: string): boolean {
    const state = this.circuitBreakers.get(providerKey);
    if (!state || !state.isOpen) return false;
    if (Date.now() - state.lastFailure > this.circuitBreakerResetMs) { state.isOpen = false; state.failures = 0; return false; }
    return true;
  }
  private recordSuccess(providerKey: string): void { const state = this.circuitBreakers.get(providerKey); if (state) { state.failures = 0; state.isOpen = false; } }
  private recordFailure(providerKey: string): void { const state = this.circuitBreakers.get(providerKey); if (!state) return; state.failures++; state.lastFailure = Date.now(); if (state.failures >= this.circuitBreakerThreshold) { state.isOpen = true; logger.warn({ provider: providerKey, failures: state.failures }, 'Circuit breaker opened'); } }
  private isPrivateIp(ip: string): boolean {
    const privateRanges = [/^10\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^192\.168\./, /^127\./, /^169\.254\./, /^::1$/, /^fe80::/i, /^::ffff:10\./, /^::ffff:172\.(1[6-9]|2[0-9]|3[0-1])\./, /^::ffff:192\.168\./];
    return privateRanges.some(range => range.test(ip));
  }
}

let geoServiceInstance: GeoService | null = null;
export function getGeoService(): GeoService { if (!geoServiceInstance) geoServiceInstance = new GeoService(); return geoServiceInstance; }
export function resetGeoService(): void { geoServiceInstance = null; }