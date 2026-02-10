import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const notificationsRouter = Router();

// GET /v1/notifications
notificationsRouter.get('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.userId! },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId: req.userId! } }),
      prisma.notification.count({ where: { userId: req.userId!, isRead: false } }),
    ]);

    res.json({
      data: notifications,
      unread_count: unreadCount,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /v1/notifications/:id/read
notificationsRouter.put('/:id/read', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /v1/notifications/read-all
notificationsRouter.put('/read-all', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
