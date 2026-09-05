import { Response } from 'express';
import { ZodError } from 'zod';

/**
 * Standardized API response envelope.
 * All API responses follow this structure for consistency.
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * Sends a successful response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: Partial<ApiResponse['meta']>
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      requestId: res.locals.requestId || 'unknown',
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
  res.status(statusCode).json(response);
}

/**
 * Sends an error response.
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any
): void {
  const response: ApiResponse = {
    success: false,
    error: { code, message, details },
    meta: {
      requestId: res.locals.requestId || 'unknown',
      timestamp: new Date().toISOString(),
    },
  };
  res.status(statusCode).json(response);
}

/**
 * Handles Zod validation errors and sends a structured response.
 */
export function handleZodError(res: Response, error: ZodError): void {
  const details = error.errors.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
    code: e.code,
  }));
  
  sendError(res, 'VALIDATION_ERROR', 'Request validation failed', 400, details);
}