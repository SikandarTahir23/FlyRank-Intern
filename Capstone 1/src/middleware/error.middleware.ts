import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/api-response.js';
import { logger, createChildLogger } from '../utils/logger.js';

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestLogger = createChildLogger({ requestId: req.requestId, path: req.path, method: req.method });

  if (error instanceof ZodError) {
    const details = error.errors.map((e) => ({ field: e.path.join('.'), message: e.message, code: e.code }));
    requestLogger.warn({ details }, 'Validation error');
    sendError(res, 'VALIDATION_ERROR', 'Request validation failed', 400, details);
    return;
  }

  if ('statusCode' in error && typeof error.statusCode === 'number') {
    const statusCode = error.statusCode;
    const code = 'code' in error ? String(error.code) : 'OPERATIONAL_ERROR';
    requestLogger.warn({ code, statusCode }, 'Operational error');
    sendError(res, code, error.message, statusCode);
    return;
  }

  requestLogger.error({ err: error }, 'Unexpected error');
  const isDevelopment = process.env.NODE_ENV === 'development';
  sendError(res, 'INTERNAL_ERROR', 'An unexpected error occurred', 500, isDevelopment ? { message: error.message, stack: error.stack } : undefined);
}

export class OperationalError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'OperationalError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const Errors = {
  notFound: (resource: string) => new OperationalError(`${resource} not found`, 404, 'NOT_FOUND'),
  unauthorized: (message = 'Authentication required') => new OperationalError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Access denied') => new OperationalError(message, 403, 'FORBIDDEN'),
  conflict: (message: string) => new OperationalError(message, 409, 'CONFLICT'),
  rateLimited: (retryAfter: number) => { const error = new OperationalError('Rate limit exceeded', 429, 'RATE_LIMITED'); (error as any).retryAfter = retryAfter; return error; },
  payloadTooLarge: (maxBytes: number) => new OperationalError(`Payload exceeds ${maxBytes} bytes`, 413, 'PAYLOAD_TOO_LARGE'),
};