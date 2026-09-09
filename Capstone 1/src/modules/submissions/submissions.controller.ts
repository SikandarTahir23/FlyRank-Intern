import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';
import { submissionsService } from './submissions.service.js';
import { widgetsRepository } from '../widgets/widgets.repository.js';

export class SubmissionsController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const widgetId = req.headers['x-widget-id'] as string;
    if (!widgetId) { sendError(res, 'MISSING_WIDGET_ID', 'X-Widget-Id header is required', 400); return; }
    const widget = await widgetsRepository.findById(widgetId);
    if (!widget) { sendError(res, 'WIDGET_NOT_FOUND', 'Widget not found', 404); return; }
    if (!widget.is_active) { sendError(res, 'WIDGET_INACTIVE', 'Widget is not active', 403); return; }
    (req as any).honeypotFieldName = (widget.config_json as any)?.honeypotFieldName || 'website';
    const clientIpAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const isHoneypotTriggered = (req as any).isHoneypotTriggered === true;
    const submission = await submissionsService.ingest({ widgetId, tenantId: widget.tenant_id, payload: req.body, clientIpAddress, isHoneypotTriggered });
    res.setHeader('Cache-Control', 'no-store, private, must-revalidate');
    sendSuccess(res, submission, 201);
  });

  listByWidget = asyncHandler(async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const widgetId = req.query.widget_id as string;
    if (!widgetId) { sendError(res, 'MISSING_WIDGET_ID', 'widget_id query parameter is required', 400); return; }
    const widget = await widgetsRepository.findByIdAndTenant(widgetId, tenant.id);
    if (!widget) { sendError(res, 'WIDGET_NOT_FOUND', 'Widget not found', 404); return; }
    const query = { page: parseInt(req.query.page as string) || 1, limit: Math.min(parseInt(req.query.limit as string) || 20, 100), is_spam: req.query.is_spam === 'true' ? true : req.query.is_spam === 'false' ? false : undefined, start_date: req.query.start_date as string, end_date: req.query.end_date as string };
    sendSuccess(res, await submissionsService.listByWidget(widgetId, tenant.id, query));
  });

  listByTenant = asyncHandler(async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const query = { page: parseInt(req.query.page as string) || 1, limit: Math.min(parseInt(req.query.limit as string) || 20, 100), is_spam: req.query.is_spam === 'true' ? true : req.query.is_spam === 'false' ? false : undefined, start_date: req.query.start_date as string, end_date: req.query.end_date as string };
    sendSuccess(res, await submissionsService.listByTenant(tenant.id, query));
  });

  getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const widgetId = req.query.widget_id as string;
    if (!widgetId) { sendError(res, 'MISSING_WIDGET_ID', 'widget_id query parameter is required', 400); return; }
    const widget = await widgetsRepository.findByIdAndTenant(widgetId, tenant.id);
    if (!widget) { sendError(res, 'WIDGET_NOT_FOUND', 'Widget not found', 404); return; }
    sendSuccess(res, await submissionsService.getStats(widgetId));
  });
}

export const submissionsController = new SubmissionsController();