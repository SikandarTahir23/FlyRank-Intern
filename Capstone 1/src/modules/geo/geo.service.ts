import { getConfig } from '../../config/index.js';
import { logger, createChildLogger } from '../../utils/logger.js';
import { GeoResponse, NULL_GEO } from './geo.schemas.js';
import { IpApiProvider } from './providers/ipapi.provider.js';
import { IpapiCoProvider } from './providers/ipapi-co.provider.js';
import { NullGeoProvider } from './providers/null-geo.provider.js';

/**
 * Reads mock flags directly from process.env to avoid config caching issues in tests.
 */
function getMockFlags() {
  return {
    mockFailureA: process.env.MOCK_GEO_FAILURE_A === 'true',
    mockFailureAll: process.env.MOCK_GEO_FAILURE_ALL === 'true',
  };
}

/**
 * Circuit breaker state for each provider.
 * Prevents hammering failing providers.
 */
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

/**
 * Geo Enrichment Service with fallback chain.
 * 
 * Fallback Chain:
 * 1. Provider A (ip-api.com) - Primary
 * 2. Provider B (ipapi.co) - Fallback
 * 3. NullGeo Provider - Deterministic mock (test mode / both failed)
 * 
 * Features:
 * - Strict per-provider timeouts
 * - Circuit breaker pattern (3 failures -> skip for 60s)
 * - Mock failure toggles for deterministic testing
 * - Comprehensive logging for debugging
 * - Never throws - always returns a GeoResponse (possibly null)
 */
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

    // Initialize providers with config
    this.providerA = new IpApiProvider({
      name: 'Provider A (ip-api.com)',
      url: config.GEO_PROVIDER_A_URL,
      timeoutMs: config.GEO_TIMEOUT_MS,
      mockFailure: mockFlags.mockFailureA,
    });

    this.providerB = new IpapiCoProvider({
      name: 'Provider B (ipapi.co)',
      url: config.GEO_PROVIDER_B_URL,
      timeoutMs: config.GEO_TIMEOUT_MS,
      mockFailure: mockFlags.mockFailureAll,
    });

    this.nullProvider = new NullGeoProvider();

    // Initialize circuit breakers
    this.circuitBreakers.set('providerA', { failures: 0, lastFailure: 0, isOpen: false });
    this.circuitBreakers.set('providerB', { failures: 0, lastFailure: 0, isOpen: false });
  }

  /**
   * Enriches an IP address with geo data using the fallback chain.
   * 
   * @param ipAddress - Client IP address
   * @returns Geo data (country, city) or null values if all providers fail
   */
  async enrich(ipAddress: string): Promise<GeoResponse> {
    const requestLogger = createChildLogger({ ipAddress, operation: 'geo_enrichment' });

    // Skip geo for private/local IPs
    if (this.isPrivateIp(ipAddress)) {
      requestLogger.debug('Skipping geo enrichment for private IP');
      return NULL_GEO;
    }

    // Try Provider A
    if (!this.isCircuitOpen('providerA')) {
      try {
        const result = await this.providerA.lookup(ipAddress);
        this.recordSuccess('providerA');
        requestLogger.info({ provider: 'A', ...result }, 'Geo enrichment successful');
        return result;
      } catch (error) {
        this.recordFailure('providerA');
        requestLogger.warn({ provider: 'A', error: String(error) }, 'Provider A failed, trying fallback');
      }
    } else {
      requestLogger.debug('Circuit breaker open for Provider A, skipping');
    }

    // Try Provider B
    if (!this.isCircuitOpen('providerB')) {
      try {
        const result = await this.providerB.lookup(ipAddress);
        this.recordSuccess('providerB');
        requestLogger.info({ provider: 'B', ...result }, 'Geo enrichment successful (fallback)');
        return result;
      } catch (error) {
        this.recordFailure('providerB');
        requestLogger.warn({ provider: 'B', error: String(error) }, 'Provider B failed, using NullGeo');
      }
    } else {
      requestLogger.debug('Circuit breaker open for Provider B, skipping');
    }

    // Both failed - use NullGeo
    requestLogger.warn('All geo providers failed, using NullGeo mock');
    return this.nullProvider.lookup(ipAddress);
  }

  /**
   * Checks if a circuit breaker is open.
   * Auto-resets after configured timeout.
   */
  private isCircuitOpen(providerKey: string): boolean {
    const state = this.circuitBreakers.get(providerKey);
    if (!state || !state.isOpen) return false;

    // Check if reset time has passed
    if (Date.now() - state.lastFailure > this.circuitBreakerResetMs) {
      state.isOpen = false;
      state.failures = 0;
      return false;
    }

    return true;
  }

  private recordSuccess(providerKey: string): void {
    const state = this.circuitBreakers.get(providerKey);
    if (state) {
      state.failures = 0;
      state.isOpen = false;
    }
  }

  private recordFailure(providerKey: string): void {
    const state = this.circuitBreakers.get(providerKey);
    if (!state) return;

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= this.circuitBreakerThreshold) {
      state.isOpen = true;
      logger.warn({ provider: providerKey, failures: state.failures }, 'Circuit breaker opened');
    }
  }

  /**
   * Checks if an IP is private/local and should skip geo enrichment.
   */
  private isPrivateIp(ip: string): boolean {
    // IPv4 private ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./, // link-local
      /^::1$/, // IPv6 localhost
      /^fe80::/i, // IPv6 link-local
      /^::ffff:10\./,
      /^::ffff:172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^::ffff:192\.168\./,
    ];

    return privateRanges.some(range => range.test(ip));
  }
}

// Singleton instance
let geoServiceInstance: GeoService | null = null;

export function getGeoService(): GeoService {
  if (!geoServiceInstance) {
    geoServiceInstance = new GeoService();
  }
  return geoServiceInstance;
}

export function resetGeoService(): void {
  geoServiceInstance = null;
}