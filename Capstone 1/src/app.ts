import express, { Request, Response, NextFunction } from 'express';
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

/**
 * Creates and configures the Express application.
 * Middleware order matters - see comments for each layer.
 */
export function createApp(): express.Application {
  const config = getConfig();
  const app = express();

  // Trust proxy for correct IP detection behind load balancers
  app.set('trust proxy', 1);

  // Global middleware (applied to all routes)
  app.use(helmetMiddleware);           // Security headers
  app.use(requestIdMiddleware);        // Correlation IDs
  app.use(cors());                     // Base CORS (can be overridden per-route)
  app.use(json({ 
    limit: `${config.SUBMISSION_MAX_BYTES}bytes`,
    strict: true,
  }));
  app.use(urlencoded({ extended: true, limit: `${config.SUBMISSION_MAX_BYTES}bytes` }));

  // Health check (no auth, no rate limit)
  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // ============================================
  // PUBLIC WIDGET ENDPOINTS (Open CORS)
  // ============================================
  
  // Widget.js - Static asset with long-term caching
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

  // Widget config - Public, cached 60s, open CORS
  app.get('/api/widgets/:id/config', corsMiddleware, widgetsController.getPublicConfig);

  // Embed code helper - Requires auth
  app.get('/api/widgets/:id/embed', adminCorsMiddleware, apiKeyMiddleware, widgetsController.getEmbedCode);

  // ============================================
  // PUBLIC SUBMISSION ENDPOINT (Open CORS)
  // ============================================
  // Middleware chain order matters:
  // 1. CORS (handles OPTIONS preflight)
  // 2. Payload size check
  // 3. Rate limiting (per IP per widget)
  // 4. Honeypot detection
  // 6. Controller handler
  app.post(
    '/api/submissions',
    corsMiddleware,
    payloadSizeMiddleware,
    rateLimitMiddleware,
    honeypotMiddleware,
    submissionsController.create
  );

  // ============================================
  // ADMIN API ENDPOINTS (Tenant isolated via API Key)
  // ============================================
  const adminRouter = express.Router();
  adminRouter.use(adminCorsMiddleware);
  adminRouter.use(apiKeyMiddleware);      // Validates X-Api-Key, sets req.tenant
  adminRouter.use(adminRateLimitMiddleware); // Higher limits for admin

  // Tenants
  adminRouter.get('/tenants', tenantsController.list);
  adminRouter.post('/tenants', tenantsController.create);
  adminRouter.get('/tenants/:id', tenantsController.getById);
  adminRouter.put('/tenants/:id', tenantsController.update);
  adminRouter.delete('/tenants/:id', tenantsController.delete);

  // Widgets
  adminRouter.get('/widgets', widgetsController.list);
  adminRouter.post('/widgets', widgetsController.create);
  adminRouter.get('/widgets/:id', widgetsController.getById);
  adminRouter.put('/widgets/:id', widgetsController.update);
  adminRouter.delete('/widgets/:id', widgetsController.delete);

  // Submissions
  adminRouter.get('/submissions', submissionsController.listByWidget);
  adminRouter.get('/submissions/tenant', submissionsController.listByTenant);

  // Dashboard
  adminRouter.get('/dashboard/stats', submissionsController.getDashboardStats);

  app.use('/api', adminRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    sendSuccess(res, null, 404); // Using sendSuccess with 404 for consistent envelope
  });

  // Error handling middleware (must be last)
  app.use(errorMiddleware);

  return app;
}