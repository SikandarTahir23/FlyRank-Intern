import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';

import { requestLogger, errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { validateQueryParams } from './middleware/validation.middleware.js';
import { cacheControl } from './middleware/cache.middleware.js';

import billingRoutes from './modules/billing/billing.routes.js';
import anomaliesRoutes from './modules/anomalies/anomalies.routes.js';
import optimizationsRoutes from './modules/optimizations/optimizations.routes.js';
import sweepsRoutes from './modules/sweeps/sweeps.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

const swaggerDoc = YAML.load(path.join(__dirname, '../docs/openapi.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use('/api/v1/billing', validateQueryParams, cacheControl(60), billingRoutes);
app.use('/api/v1/anomalies', validateQueryParams, cacheControl(60), anomaliesRoutes);
app.use('/api/v1/optimizations', validateQueryParams, cacheControl(60), optimizationsRoutes);
app.use('/api/v1/sweeps', validateQueryParams, cacheControl(60), sweepsRoutes);

app.post('/api/v1/cache/clear', async (req, res) => {
  const { clear } = await import('./config/cache.js');
  clear();
  res.json({ cleared: true });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;