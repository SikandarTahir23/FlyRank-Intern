import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';
import { widgetsService } from './widgets.service.js';
import { createWidgetSchema, updateWidgetSchema } from './widgets.schemas.js';

/**
 * Widget Controller - HTTP handlers for widget management.
 * Admin endpoints require tenant authentication via X-Api-Key.
 * Public endpoints (config) are open with CORS.
 */
export class WidgetsController {
  /**
   * GET /api/widgets - List all widgets for authenticated tenant
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const widgets = await widgetsService.listByTenant(tenant.id);
    sendSuccess(res, widgets);
  });

  /**
   * POST /api/widgets - Create a new widget for authenticated tenant
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    
    const parseResult = createWidgetSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'VALIDATION_ERROR', 'Invalid input', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const widget = await widgetsService.create(tenant.id, parseResult.data);
    sendSuccess(res, widget, 201);
  });

  /**
   * GET /api/widgets/:id - Get a widget by ID (tenant isolated)
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const widget = await widgetsService.getById(req.params.id, tenant.id);
    sendSuccess(res, widget);
  });

  /**
   * PUT /api/widgets/:id - Update a widget (tenant isolated)
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    
    const parseResult = updateWidgetSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'VALIDATION_ERROR', 'Invalid input', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const widget = await widgetsService.update(req.params.id, tenant.id, parseResult.data);
    sendSuccess(res, widget);
  });

  /**
   * DELETE /api/widgets/:id - Delete a widget (tenant isolated)
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    await widgetsService.delete(req.params.id, tenant.id);
    sendSuccess(res, { message: 'Widget deleted' });
  });

  /**
   * GET /api/widgets/:id/config - Public widget configuration
   * No authentication required, open CORS, cached for 60s
   */
  getPublicConfig = asyncHandler(async (req: Request, res: Response) => {
    const config = await widgetsService.getPublicConfig(req.params.id);
    
    // Set cache headers: 60s max-age, stale-while-revalidate 5min
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.setHeader('ETag', `"${req.params.id}-${Date.now()}"`);
    
    sendSuccess(res, config);
  });

  /**
   * GET /api/widgets/:id/embed - Get embed code for a widget
   */
  getEmbedCode = asyncHandler(async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const widget = await widgetsService.getById(req.params.id, tenant.id);
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const embedCode = widgetsService.generateEmbedCode(widget.id, baseUrl);
    
    sendSuccess(res, { embedCode, widgetId: widget.id });
  });
}

export const widgetsController = new WidgetsController();