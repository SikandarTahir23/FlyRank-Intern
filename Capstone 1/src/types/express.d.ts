import { Request } from 'express';
import { Tenant } from '../modules/tenants/tenants.schemas.js';
import { Widget } from '../modules/widgets/widgets.schemas.js';

/**
 * Extends Express Request with typed properties for tenant and widget context.
 * These are populated by middleware after validation.
 */
declare global {
  namespace Express {
    interface Request {
      /** The authenticated tenant from API key validation */
      tenant?: Tenant;
      /** The widget being accessed (for public endpoints) */
      widget?: Widget;
      /** Geo enrichment result from the ingestion pipeline */
      geo?: {
        country: string | null;
        city: string | null;
      };
      /** Unique request ID for tracing */
      requestId?: string;
      /** Client IP address */
      clientIpAddress?: string;
    }
  }
}

export {};