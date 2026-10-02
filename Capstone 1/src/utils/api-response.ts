import { Response } from 'express';
import { ZodError } from 'zod';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: any };
  meta?: { requestId: string; timestamp: string };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: Partial<ApiResponse['meta']>): void {
  res.status(statusCode).json({ success: true, data, meta: { requestId: res.locals.requestId || 'unknown', timestamp: new Date().toISOString(), ...meta } });
}

export function sendError(res: Response, code: string, message: string, statusCode = 400, details?: any): void {
  res.status(statusCode).json({ success: false, error: { code, message, details }, meta: { requestId: res.locals.requestId || 'unknown', timestamp: new Date().toISOString() } });
}

export function handleZodError(res: Response, error: ZodError): void {
  const details = error.errors.map((e) => ({ field: e.path.join('.'), message: e.message, code: e.code }));
  sendError(res, 'VALIDATION_ERROR', 'Request validation failed', 400, details);
}