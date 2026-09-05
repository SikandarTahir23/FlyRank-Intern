import { Request, Response, NextFunction } from 'express';
import { tenantsService } from '../modules/tenants/tenants.service.js';
import { OperationalError } from './error.middleware.js';

/**
 * API Key Authentication Middleware.
 * 
 * Validates X-Api-Key header against tenant database.
 * On success, attaches tenant to req.tenant for downstream handlers.
 * On failure, returns 401 Unauthorized.
 * 
 * Used for all admin endpoints to enforce tenant isolation.
 */
export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    throw new OperationalError('API key required', 401, 'UNAUTHORIZED');
  }

  try {
    const tenant = await tenantsService.getByApiKey(apiKey);
    req.tenant = tenant;
    next();
  } catch (error) {
    if (error instanceof OperationalError) {
      throw error;
    }
    throw new OperationalError('Authentication failed', 401, 'UNAUTHORIZED');
  }
}