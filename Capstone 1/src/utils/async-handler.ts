import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler to automatically catch errors
 * and pass them to Express error middleware.
 * 
 * This eliminates the need for try/catch in every route handler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}