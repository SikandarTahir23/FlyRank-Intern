import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

/**
 * Honeypot spam detection middleware.
 * 
 * Checks for a hidden field in the submission payload that should remain empty.
 * Legitimate users won't see/fill this field (hidden via CSS).
 * Bots often fill all fields, triggering the honeypot.
 * 
 * If triggered:
 * - Marks submission as spam (is_spam = true)
 * - Still processes and stores the submission for analytics
 * - Does NOT block the request (returns 201)
 * - Logs detection for monitoring
 * 
 * The honeypot field name is configurable per widget via widget.config_json.honeypotFieldName
 */
export function honeypotMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Honeypot field name should be attached by the route handler after fetching widget config
  const honeypotFieldName = (req as any).honeypotFieldName as string | undefined;
  
  if (!honeypotFieldName) {
    // No honeypot configured for this widget
    next();
    return;
  }
  
  const payload = req.body as Record<string, any>;
  const honeypotValue = payload[honeypotFieldName];
  
  // Check if honeypot field exists and has a non-empty value
  const isHoneypotTriggered = honeypotValue !== undefined && 
                              honeypotValue !== null && 
                              String(honeypotValue).trim() !== '';
  
  // Attach result to request for use in submission service
  (req as any).isHoneypotTriggered = isHoneypotTriggered;
  
  if (isHoneypotTriggered) {
    logger.warn({
      honeypotField: honeypotFieldName,
      widgetId: req.headers['x-widget-id'],
      ip: req.ip,
    }, 'Honeypot triggered - potential spam submission');
  }
  
  next();
}