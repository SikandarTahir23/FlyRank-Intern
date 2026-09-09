import pino from 'pino';
import { getConfig } from '../config/index.js';

const config = getConfig();

export const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } } : undefined,
  base: { service: 'widget-platform' },
});

export function createChildLogger(context: Record<string, any>): pino.Logger {
  return logger.child(context);
}