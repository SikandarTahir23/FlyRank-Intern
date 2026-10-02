import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';
import { tenantsService } from './tenants.service.js';
import { createTenantSchema } from './tenants.schemas.js';

export class TenantsController {
  list = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await tenantsService.list()));
  create = asyncHandler(async (req: Request, res: Response) => {
    const parseResult = createTenantSchema.safeParse(req.body);
    if (!parseResult.success) { sendError(res, 'VALIDATION_ERROR', 'Invalid input', 400, parseResult.error.flatten().fieldErrors); return; }
    sendSuccess(res, await tenantsService.create(parseResult.data), 201);
  });
  getById = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await tenantsService.getById(req.params.id)));
  update = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string') { sendError(res, 'VALIDATION_ERROR', 'Name is required', 400); return; }
    sendSuccess(res, await tenantsService.update(req.params.id, name));
  });
  delete = asyncHandler(async (req: Request, res: Response) => { await tenantsService.delete(req.params.id); sendSuccess(res, { message: 'Tenant deleted' }); });
}

export const tenantsController = new TenantsController();