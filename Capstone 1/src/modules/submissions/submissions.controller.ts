import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';
import { submissionsService } from './submissions.service.js';
import { widgetsRepository } from '../widgets/widgets.repository.js';
import { OperationalError } from '../../middleware/error.middleware.js';

/**
 * Submission Controller - HTTP handlers for form submissions.
 * 
 * Public endpoint: POST /api/submissions
 * - Open CORS for widget embedding
 * - Rate limited per IP per widget
 * - Validates widget exists and is active
 * - Runs full ingestion pipeline
 * 
 * Admin endpoints: GET /api/submissions (tenant isolated)
 */
export class SubmissionsController {
  /**
   * POST /api/submissions - Public form submission endpoint
   * 
   * Pipeline:
   * 1. Validate X-Widget-Id header
   * 2. Fetch widget config (for honeypot field name)
   * 3. Check payload size (middleware)
   * 4. Rate limit (middleware)
   * 5. Honeypot detection (middleware)
   * 6. Process through ingestion service
   * 7. Return 201 with submission ID and geo
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    // Extract widget ID from header
    const widgetId = req.headers['x-widget-id'] as string;
    if (!widgetId) {
      sendError(res, 'MISSING_WIDGET_ID', 'X-Widget-Id header is required', 400);
      return;
    }

    // Fetch widget configuration (for honeypot field name and validation)
    const widget = await widgetsRepository.findById(widgetId);
    if (!widget) {
      sendError(res, 'WIDGET_NOT_FOUND', 'Widget not found', 404);
      return;
    }

    if (!widget.is_active) {
      sendError(res, 'WIDGET_INACTIVE', 'Widget is not active', 403);
      return;
    }

    // Attach honeypot field name to request for middleware
    const honeypotFieldName = (widget.config_json as any)?.honeypotFieldName || 'website';
    (req as any).honeypotFieldName = honeypotFieldName;

    // Extract client IP
    const clientIpAddress = req.ip || req.socket.remoteAddress || 'unknown';

    // Get honeypot result from middleware
    const isHoneypotTriggered = (req as any).isHoneypotTriggered === true;

    // Process submission through ingestion pipeline
    const submission = await submissionsService.ingest({
      widgetId,
      tenantId: widget.tenant_id,
      payload: req.body,
      clientIpAddress,
      isHoneypotTriggered,
    });

    // Set response headers
    res.setHeader('Cache-Control', 'no-store, private, must-revalidate');
    
    sendSuccess(res, submission, 201);
  });

  /**
   * GET /api/submissions - List submissions for a widget (admin)
   * Requires tenant authentication via X-Api-Key
   */
  listByWidget = asyncHandler(async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const widgetId = req.query.widget_id as string;
    
    if (!widgetId) {
      sendError(res, 'MISSING_WIDGET_ID', 'widget_id query parameter is required', 400);
      return;
    }

    // Verify widget belongs to tenant
    const widget = await widgetsRepository.findByIdAndTenant(widgetId, tenant.id);
    if (!widget) {
      sendError(res, 'WIDGET_NOT_FOUND', 'Widget not found', 404);
      return;
    }

    const query = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
      is_spam: req.query.is_spam === 'true' ? true : req.query.is_spam === 'false' ? false : undefined,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
    };

    const result = await submissionsService.listByWidget(widgetId, tenant.id, query);
    sendSuccess(res, result);
  });

  /**
   * GET /api/submissions/tenant - List all submissions for tenant (admin)
   */
  listByTenant = asyncHandler(async (req: Request, res: Response) => {
    const tenant = req.tenant!;

    const query = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
      is_spam: req.query.is_spam === 'true' ? true : req.query.is_spam === 'false' ? false : undefined,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
    };

    const result = await submissionsService.listByTenant(tenant.id, query);
    sendSuccess(res, result);
  });

  /**
   * GET /api/dashboard/stats - Dashboard statistics (admin)
   */
  getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const widgetId = req.query.widget_id as string;

    if (!widgetId) {
      sendError(res, 'MISSING_WIDGET_ID', 'widget_id query parameter is required', 400);
      return;
    }

    // Verify widget belongs to tenant
    const widget = await widgetsRepository.findByIdAndTenant(widgetId, tenant.id);
    if (!widget) {
      sendError(res, 'WIDGET_NOT_FOUND', 'Widget not found', 404);
      return;
    }

    const stats = await submissionsService.getStats(widgetId);
    sendSuccess(res, stats);
  });
}

export const submissionsController = new SubmissionsController();