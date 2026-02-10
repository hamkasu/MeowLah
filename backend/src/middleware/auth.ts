import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * JWT authentication middleware.
 * Extracts and verifies the Bearer token from the Authorization header.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth — sets userId if token is present, but doesn't block.
 * Used for endpoints that return different data for authenticated users
 * (e.g., whether the user liked a post).
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      req.userId = payload.userId;
    } catch {
      // Token invalid — proceed without user context
    }
  }
  next();
}
