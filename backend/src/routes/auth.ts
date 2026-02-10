import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/error-handler';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
  display_name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function generateTokens(userId: string) {
  const token = jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string | number,
  });
  const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as string | number,
  });
  return { token, refreshToken };
}

function sanitizeUser(user: { id: string; email: string; username: string; displayName: string | null; avatarUrl: string | null; isPremium: boolean; isVerifiedRescuer: boolean }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.displayName,
    avatar_url: user.avatarUrl,
    is_premium: user.isPremium,
    is_verified_rescuer: user.isVerifiedRescuer,
  };
}

// POST /v1/auth/register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);

    // Check for existing user
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.username }],
      },
    });
    if (existing) {
      throw new AppError(
        existing.email === body.email ? 'Email already registered' : 'Username already taken',
        409
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        passwordHash,
        displayName: body.display_name,
      },
    });

    const { token, refreshToken } = generateTokens(user.id);

    res.status(201).json({
      user: sanitizeUser(user),
      token,
      refresh_token: refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    const { token, refreshToken } = generateTokens(user.id);

    res.json({
      user: sanitizeUser(user),
      token,
      refresh_token: refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      throw new AppError('Refresh token required', 400);
    }

    const payload = jwt.verify(refresh_token, env.JWT_REFRESH_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const tokens = generateTokens(user.id);

    res.json({
      token: tokens.token,
      refresh_token: tokens.refreshToken,
    });
  } catch (err) {
    next(err);
  }
});
