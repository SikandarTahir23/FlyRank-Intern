import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join('.') || 'field';
      res.status(409).json({ error: 'DUPLICATE_ENTRY', message: `${field} already exists` });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Record not found' });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid data provided' });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` });
}