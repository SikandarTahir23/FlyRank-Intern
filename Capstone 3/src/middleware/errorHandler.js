import { toResponse, isAppError } from '../errors/index.js';

export function errorHandler(err, req, res, next) {
  const { statusCode, body } = toResponse(err);
  res.status(statusCode).json(body);
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
}