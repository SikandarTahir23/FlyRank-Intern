import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware that assigns a unique request ID to each request.
 * This ID is used for tracing and correlation across logs and services.
 * 
 * The request ID is:
 * 1. Read from X-Request-Id header if present (for distributed tracing)
 * 2. Generated as UUID v4 if not provided
 * 3. Attached to req.requestId and res.locals.requestId
 * 4. Included in response headers for client-side debugging
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  
  next();
}