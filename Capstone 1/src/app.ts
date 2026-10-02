import express, { Request, Response } from 'express';
import cors from 'cors';
import { json, urlencoded } from 'express';
import { getConfig } from './config/index.js';
import { helmetMiddleware, widgetCspMiddleware } from './middleware/helmet.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { payloadSizeMiddleware } from './middleware/payload-size.middleware.js';
import { corsMiddleware, adminCorsMiddleware } from './middleware/cors.middleware.js';
import { rateLimitMiddleware, adminRateLimitMiddleware } from './modules/rate-limit/rate-limit.middleware.js';
import { honeypotMiddleware } from './modules/spam/honeypot.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { tenantsController } from './modules/tenants/tenants.controller.js';
import { widgetsController } from './modules/widgets/widgets.controller.js';
import { submissionsController } from './modules/submissions/submissions.controller.js';
import { apiKeyMiddleware } from './middleware/api-key.middleware.js';
import { sendSuccess } from './utils/api-response.js';

export function createApp(): express.Application {
  const config = getConfig();
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmetMiddleware);
  app.use(requestIdMiddleware);
  app.use(cors());
  app.use(json({ limit: `${config.SUBMISSION_MAX_BYTES}bytes`, strict: true }));
  app.use(urlencoded({ extended: true, limit: `${config.SUBMISSION_MAX_BYTES}bytes` }));

  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
  });

  app.get('/static/widget.v1.js', widgetCspMiddleware, corsMiddleware,
    express.static('public/widget.v1.js', {
      etag: true,
      maxAge: '1y',
      immutable: true,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      }
    })
  );

  app.get('/api/widgets/:id/config', corsMiddleware, widgetsController.getPublicConfig);
  app.get('/api/widgets/:id/embed', adminCorsMiddleware, apiKeyMiddleware, widgetsController.getEmbedCode);

  app.post('/api/submissions', corsMiddleware, payloadSizeMiddleware, rateLimitMiddleware, honeypotMiddleware, submissionsController.create);

  const adminRouter = express.Router();
  adminRouter.use(adminCorsMiddleware);
  adminRouter.use(apiKeyMiddleware);
  adminRouter.use(adminRateLimitMiddleware);

  adminRouter.get('/tenants', tenantsController.list);
  adminRouter.post('/tenants', tenantsController.create);
  adminRouter.get('/tenants/:id', tenantsController.getById);
  adminRouter.put('/tenants/:id', tenantsController.update);
  adminRouter.delete('/tenants/:id', tenantsController.delete);

  adminRouter.get('/widgets', widgetsController.list);
  adminRouter.post('/widgets', widgetsController.create);
  adminRouter.get('/widgets/:id', widgetsController.getById);
  adminRouter.put('/widgets/:id', widgetsController.update);
  adminRouter.delete('/widgets/:id', widgetsController.delete);

  adminRouter.get('/submissions', submissionsController.listByWidget);
  adminRouter.get('/submissions/tenant', submissionsController.listByTenant);
  adminRouter.get('/dashboard/stats', submissionsController.getDashboardStats);

  app.use('/api', adminRouter);

  app.use((_req: Request, res: Response) => sendSuccess(res, null, 404));
  app.use(errorMiddleware);

  return app;
}