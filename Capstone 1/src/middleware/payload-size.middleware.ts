import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config/index.js';
import { sendError } from '../utils/api-response.js';

export function payloadSizeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const maxBytes = getConfig().SUBMISSION_MAX_BYTES;
  const contentLength = req.headers['content-length'];
  if (contentLength) {
    const length = parseInt(contentLength, 10);
    if (isNaN(length)) { sendError(res, 'INVALID_CONTENT_LENGTH', 'Invalid Content-Length header', 400); return; }
    if (length > maxBytes) { sendError(res, 'PAYLOAD_TOO_LARGE', `Request payload exceeds maximum allowed size of ${maxBytes} bytes`, 413, { maxBytes, receivedBytes: length }); return; }
  }
  next();
}