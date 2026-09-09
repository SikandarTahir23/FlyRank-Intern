import { createApp } from './app.js';
import { getConfig } from './config/index.js';
import { getPool, closePool } from './config/database.js';
import { getRedisClient, closeRedisClient } from './config/redis.js';
import { logger } from './utils/logger.js';

async function start(): Promise<void> {
  const config = getConfig();
  const pool = getPool();
  const redis = getRedisClient();

  try {
    await pool.query('SELECT 1');
    logger.info('Database connection established');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to database');
    process.exit(1);
  }

  try {
    await redis.connect();
    await redis.ping();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to Redis');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server started');
    console.log(`Server running on http://localhost:${config.PORT}`);
    console.log(`Health check: http://localhost:${config.PORT}/health`);
    console.log(`Mailpit UI: http://localhost:8025`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    server.close(async () => {
      logger.info('HTTP server closed');
      try { await closePool(); logger.info('Database pool closed'); } catch (error) { logger.error({ err: error }, 'Error closing database pool'); }
      try { await closeRedisClient(); logger.info('Redis client closed'); } catch (error) { logger.error({ err: error }, 'Error closing Redis client'); }
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });
    setTimeout(() => { logger.error('Forced shutdown after timeout'); process.exit(1); }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (error) => { logger.error({ err: error }, 'Uncaught exception'); shutdown('uncaughtException'); });
  process.on('unhandledRejection', (reason) => { logger.error({ reason }, 'Unhandled rejection'); shutdown('unhandledRejection'); });
}

start().catch((error) => { logger.error({ err: error }, 'Failed to start application'); process.exit(1); });