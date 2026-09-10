export class AppError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message, retryAfter, limit, used) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter, limit, used });
  }
}

export class QuotaExceededError extends AppError {
  constructor(message, retryAfter, limit, used) {
    super(message, 402, 'QUOTA_EXCEEDED', { retryAfter, limit, used });
  }
}

export class SubscriptionInactiveError extends AppError {
  constructor(message = 'Subscription is not active') {
    super(message, 402, 'SUBSCRIPTION_INACTIVE');
  }
}

export class IdempotencyError extends AppError {
  constructor(message, details = null) {
    super(message, 409, 'IDEMPOTENCY_CONFLICT', details);
  }
}

export class StripeSignatureError extends AppError {
  constructor(message = 'Invalid Stripe signature') {
    super(message, 400, 'STRIPE_SIGNATURE_INVALID');
  }
}

export function isAppError(error) {
  return error instanceof AppError;
}

export function toResponse(error) {
  if (isAppError(error)) {
    return {
      statusCode: error.statusCode,
      body: {
        error: error.code,
        message: error.message,
        ...(error.details && { details: error.details })
      }
    };
  }

  console.error('Unhandled error:', error);
  return {
    statusCode: 500,
    body: { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  };
}