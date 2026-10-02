export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(errors: Array<{ field: string; message: string }>) {
    super(400, 'VALIDATION_ERROR', 'Input validation failed', errors);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, 'NOT_FOUND', `${resource} not found${id ? `: ${id}` : ''}`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

export class UnapprovedVariantError extends AppError {
  constructor(currentStatus: string) {
    super(
      409,
      'VARIANT_NOT_APPROVED',
      `Cannot schedule/publish variant in status "${currentStatus}". Variant must be APPROVED.`,
      { currentStatus, allowedStatuses: ['APPROVED', 'SCHEDULED'] }
    );
  }
}

export class AdapterNotFoundError extends AppError {
  constructor(platform: string) {
    super(500, 'ADAPTER_NOT_FOUND', `No publisher adapter configured for ${platform}`);
  }
}

export class RateLimitedError extends AppError {
  constructor(retryAfter: number) {
    super(429, 'RATE_LIMITED', `Rate limited. Retry after ${retryAfter}s`, { retryAfter });
  }
}

export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(400, 'INVALID_TRANSITION', `Cannot transition from ${from} to ${to}`);
  }
}

export class ExternalServiceError extends AppError {
  constructor(platform: string, message: string, public readonly retryable = true) {
    super(502, 'EXTERNAL_SERVICE_ERROR', `${platform}: ${message}`, { platform, retryable });
  }
}