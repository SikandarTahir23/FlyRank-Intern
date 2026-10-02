import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';
import { widgetsService } from './widgets.service.js';
import { createWidgetSchema, updateWidgetSchema } from './widgets.schemas.js';

export class WidgetsController {
  list = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await widgetsService.listByTenant(req.tenant!.id)));
  create = asyncHandler(async (req: Request, res: Response) => {
    const parseResult = createWidgetSchema.safeParse(req.body);
    if (!parseResult.success) { sendError(res, 'VALIDATION_ERROR', 'Invalid input', 400, parseResult.error.flatten().fieldErrors); return; }
    sendSuccess(res, await widgetsService.create(req.tenant!.id, parseResult.data), 201);
  });
  getById = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await widgetsService.getById(req.params.id, req.tenant!.id)));
  update = asyncHandler(async (req: Request, res: Response) => {
    const parseResult = updateWidgetSchema.safeParse(req.body);
    if (!parseResult.success) { sendError(res, 'VALIDATION_ERROR', 'Invalid input', 400, parseResult.error.flatten().fieldErrors); return; }
    sendSuccess(res, await widgetsService.update(req.params.id, req.tenant!.id, parseResult.data));
  });
  delete = asyncHandler(async (req: Request, res: Response) => { await widgetsService.delete(req.params.id, req.tenant!.id); sendSuccess(res, { message: 'Widget deleted' }); });
  getPublicConfig = asyncHandler(async (req: Request, res: Response) => {
    const config = await widgetsService.getPublicConfig(req.params.id);
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.setHeader('ETag', `"${req.params.id}-${Date.now()}"`);
    sendSuccess(res, config);
  });
  getEmbedCode = asyncHandler(async (req: Request, res: Response) => {
    const widget = await widgetsService.getById(req.params.id, req.tenant!.id);
    sendSuccess(res, { embedCode: widgetsService.generateEmbedCode(widget.id, `${req.protocol}://${req.get('host')}`), widgetId: widget.id });
  });
}

export const widgetsController = new WidgetsController();