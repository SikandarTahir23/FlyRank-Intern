import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

export function honeypotMiddleware(req: Request, res: Response, next: NextFunction): void {
  const honeypotFieldName = (req as any).honeypotFieldName as string | undefined;
  if (!honeypotFieldName) { next(); return; }
  const payload = req.body as Record<string, any>;
  const honeypotValue = payload[honeypotFieldName];
  const isHoneypotTriggered = honeypotValue !== undefined && honeypotValue !== null && String(honeypotValue).trim() !== '';
  (req as any).isHoneypotTriggered = isHoneypotTriggered;
  if (isHoneypotTriggered) logger.warn({ honeypotField: honeypotFieldName, widgetId: req.headers['x-widget-id'], ip: req.ip }, 'Honeypot triggered - potential spam submission');
  next();
}