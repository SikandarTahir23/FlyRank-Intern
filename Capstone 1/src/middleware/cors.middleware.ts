import { Request, Response, NextFunction } from 'express';

/**
 * CORS middleware for public widget endpoints.
 * Allows cross-origin requests from any origin (widget embeds).
 * 
 * Handles:
 * - OPTIONS preflight requests
 * - Access-Control-Allow-Origin: *
 * - Allowed headers for widget communication
 * - Exposed headers for rate limiting and correlation
 * 
 * Applied selectively to public endpoints only (not admin API).
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Allow any origin for public widget endpoints
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Allow methods used by widget
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  // Allow headers sent by widget
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Widget-Id, X-Api-Key, X-Request-Id');
  
  // Expose headers that clients may need
  res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After, ETag, X-Request-Id');
  
  // Cache preflight response for 24 hours
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // No credentials for widget flow (no cookies)
  // res.setHeader('Access-Control-Allow-Credentials', 'false');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  next();
}

/**
 * CORS middleware for admin API endpoints.
 * More restrictive - could be configured for specific origins in production.
 */
export function adminCorsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key, X-Request-Id');
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  next();
}