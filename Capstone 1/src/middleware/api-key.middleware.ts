import { Request, Response, NextFunction } from 'express';
import { tenantsService } from '../modules/tenants/tenants.service.js';
import { OperationalError } from './error.middleware.js';

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) throw new OperationalError('API key required', 401, 'UNAUTHORIZED');
  try {
    req.tenant = await tenantsService.getByApiKey(apiKey);
    next();
  } catch (error) {
    if (error instanceof OperationalError) throw error;
    throw new OperationalError('Authentication failed', 401, 'UNAUTHORIZED');
  }
}