import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import postsRouter from './modules/posts/routes.js';
import variantsRouter from './modules/variants/routes.js';
import { logger } from './utils/logger.js';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    logger.info({ method: req.method, path: req.path }, 'Request received');
    next();
  });

  app.get('/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(`${env.API_PREFIX}/posts`, postsRouter);
  app.use(env.API_PREFIX, variantsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}