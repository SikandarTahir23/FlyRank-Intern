import { GeoResponse } from '../geo.schemas.js';

/**
 * Null Geo Provider - Deterministic mock for testing.
 * 
 * Returns consistent test data when both real providers fail.
 * Used when MOCK_GEO_FAILURE_ALL=true or both providers are down.
 * 
 * This ensures tests are deterministic and don't depend on external services.
 */
export class NullGeoProvider {
  private static readonly TEST_COUNTRY = 'XX';
  private static readonly TEST_CITY = 'TestCity';

  async lookup(_ipAddress: string): Promise<GeoResponse> {
    // Deterministic mock response for testing
    return {
      country: NullGeoProvider.TEST_COUNTRY,
      city: NullGeoProvider.TEST_CITY,
    };
  }
}