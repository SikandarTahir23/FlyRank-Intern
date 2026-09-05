import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';
import { tenantsService } from './tenants.service.js';
import { createTenantSchema } from './tenants.schemas.js';
import { OperationalError } from '../../middleware/error.middleware.js';

/**
 * Tenant Controller - HTTP handlers for tenant management.
 * All endpoints require valid API key authentication (tenant isolation).
 */
export class TenantsController {
  /**
   * GET /api/tenants - List all tenants (admin)
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const tenants = await tenantsService.list();
    sendSuccess(res, tenants);
  });

  /**
   * POST /api/tenants - Create a new tenant
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const parseResult = createTenantSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'VALIDATION_ERROR', 'Invalid input', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const tenant = await tenantsService.create(parseResult.data);
    sendSuccess(res, tenant, 201);
  });

  /**
   * GET /api/tenants/:id - Get a tenant by ID
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const tenant = await tenantsService.getById(req.params.id);
    sendSuccess(res, tenant);
  });

  /**
   * PUT /api/tenants/:id - Update a tenant
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      sendError(res, 'VALIDATION_ERROR', 'Name is required', 400);
      return;
    }

    const tenant = await tenantsService.update(req.params.id, name);
    sendSuccess(res, tenant);
  });

  /**
   * DELETE /api/tenants/:id - Delete a tenant
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    await tenantsService.delete(req.params.id);
    sendSuccess(res, { message: 'Tenant deleted' });
  });
}

export const tenantsController = new TenantsController();