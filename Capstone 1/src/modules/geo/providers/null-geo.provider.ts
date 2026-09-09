import { GeoResponse } from '../geo.schemas.js';

export class NullGeoProvider {
  private static readonly TEST_COUNTRY = 'XX';
  private static readonly TEST_CITY = 'TestCity';

  async lookup(_ipAddress: string): Promise<GeoResponse> {
    return { country: NullGeoProvider.TEST_COUNTRY, city: NullGeoProvider.TEST_CITY };
  }
}