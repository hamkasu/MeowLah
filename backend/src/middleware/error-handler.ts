import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Global error handler.
 * Catches Zod validation errors, known app errors, and unexpected errors.
 */
export function errorHandler(
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Known app errors with status codes
  if (err.statusCode) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Unexpected errors
  console.error('[Error]', err);
  res.status(500).json({ error: 'Internal server error' });
}

/**
 * Helper to create typed app errors with status codes.
 */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}
