import { createApp } from './app.js';
import { getConfig } from './config/index.js';
import { getPool } from './config/database.js';
import { getRedisClient, closeRedisClient } from './config/redis.js';
import { closePool } from './config/database.js';
import { logger } from './utils/logger.js';

/**
 * Application entry point.
 * Handles startup, graceful shutdown, and error handling.
 */

async function start(): Promise<void> {
  const config = getConfig();
  
  // Initialize connections
  const pool = getPool();
  const redis = getRedisClient();
  
  // Test database connection
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection established');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to database');
    process.exit(1);
  }

  // Test Redis connection
  try {
    await redis.connect();
    await redis.ping();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to Redis');
    process.exit(1);
  }

  // Create and start server
  const app = createApp();
  
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server started');
    console.log(`🚀 Server running on http://localhost:${config.PORT}`);
    console.log(`📊 Health check: http://localhost:${config.PORT}/health`);
    console.log(`📧 Mailpit UI: http://localhost:8025`);
  });

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await closePool();
        logger.info('Database pool closed');
      } catch (error) {
        logger.error({ err: error }, 'Error closing database pool');
      }
      
      try {
        await closeRedisClient();
        logger.info('Redis client closed');
      } catch (error) {
        logger.error({ err: error }, 'Error closing Redis client');
      }
      
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
    shutdown('unhandledRejection');
  });
}

// Start the application
start().catch((error) => {
  logger.error({ err: error }, 'Failed to start application');
  process.exit(1);
});