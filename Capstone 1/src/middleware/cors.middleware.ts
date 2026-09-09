import { Request, Response, NextFunction } from 'express';

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Widget-Id, X-Api-Key, X-Request-Id');
  res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After, ETag, X-Request-Id');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  next();
}

export function adminCorsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key, X-Request-Id');
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  next();
}