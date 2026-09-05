import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config/index.js';
import { sendError } from '../utils/api-response.js';

/**
 * Middleware that enforces a strict payload size limit.
 * Protects against payload bombs and DoS attacks.
 * 
 * The limit is configurable via SUBMISSION_MAX_BYTES (default 50KB).
 * Returns 413 Payload Too Large with a structured error response.
 */
export function payloadSizeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const config = getConfig();
  const maxBytes = config.SUBMISSION_MAX_BYTES;
  
  const contentLength = req.headers['content-length'];
  
  if (contentLength) {
    const length = parseInt(contentLength, 10);
    
    if (isNaN(length)) {
      sendError(res, 'INVALID_CONTENT_LENGTH', 'Invalid Content-Length header', 400);
      return;
    }
    
    if (length > maxBytes) {
      sendError(
        res,
        'PAYLOAD_TOO_LARGE',
        `Request payload exceeds maximum allowed size of ${maxBytes} bytes`,
        413,
        { maxBytes, receivedBytes: length }
      );
      return;
    }
  }
  
  // Also set a limit on the body parser as a secondary defense
  // This is handled by express.json({ limit: ... }) in app.ts
  
  next();
}