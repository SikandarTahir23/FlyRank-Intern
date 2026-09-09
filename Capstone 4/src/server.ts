import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './db/prisma.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { publishWorker, closeWorker } from './modules/scheduling/worker.js';
import { publishQueue, closeQueue } from './modules/scheduling/queue.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function start(): Promise<void> {
  try {
    await connectDatabase();
    logger.info('Database connected');

    await connectRedis();
    logger.info('Redis connected');

    // Initialize adapters
    const { registry } = await import('./modules/publishing/registry.js');
    const { MockPublisher } = await import('./modules/publishing/mock/MockPublisher.js');
    const { DiscordWebhookAdapter } = await import('./modules/publishing/discord/DiscordWebhookAdapter.js');
    const { Platform } = await import('@prisma/client');

    registry.register(Platform.DISCORD, new DiscordWebhookAdapter(env.DISCORD_WEBHOOK_URL || ''));
    registry.register(Platform.TWITTER, new MockPublisher(Platform.TWITTER));
    registry.register(Platform.LINKEDIN, new MockPublisher(Platform.LINKEDIN));
    registry.register(Platform.INSTAGRAM, new MockPublisher(Platform.INSTAGRAM));

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`API available at http://localhost:${env.PORT}${env.API_PREFIX}`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      server.close(async () => {
        await closeWorker();
        await closeQueue();
        await disconnectRedis();
        await disconnectDatabase();
        logger.info('Shutdown complete');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    publishWorker.on('error', (err) => {
      logger.error({ err }, 'Worker error');
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

start();