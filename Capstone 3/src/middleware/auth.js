import { isValidUUID } from '../utils/helpers.js';
import { ValidationError, IdempotencyError } from '../errors/index.js';

export function idempotencyMiddleware(req, res, next) {
  const key = req.headers['idempotency-key'];
  if (!key || !isValidUUID(key)) {
    throw new ValidationError('Invalid or missing Idempotency-Key header');
  }
  req.idempotencyKey = key;
  next();
}

export function tenantContextMiddleware(req, res, next) {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId || !isValidUUID(tenantId)) {
    throw new ValidationError('Invalid or missing X-Tenant-Id header');
  }
  req.tenantId = tenantId;
  next();
}