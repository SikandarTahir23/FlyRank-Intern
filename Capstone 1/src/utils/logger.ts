import pino from 'pino';
import { getConfig } from '../config/index.js';

/**
 * Creates a structured logger using Pino.
 * Log level is configurable via environment variable.
 */
const config = getConfig();

export const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  } : undefined,
  base: {
    service: 'widget-platform',
  },
});

/**
 * Creates a child logger with additional context.
 */
export function createChildLogger(context: Record<string, any>): pino.Logger {
  return logger.child(context);
}