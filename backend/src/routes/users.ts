import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

export const usersRouter = Router();

// GET /v1/users/me
usersRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true, email: true, username: true, displayName: true,
        avatarUrl: true, bio: true, isPremium: true, isVerifiedRescuer: true,
        locationCity: true, createdAt: true,
        _count: { select: { followers: true, following: true, posts: true } },
      },
    });
    if (!user) throw new AppError('User not found', 404);

    res.json({
      ...user,
      follower_count: user._count.followers,
      following_count: user._count.following,
      post_count: user._count.posts,
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/users/:username
usersRouter.get('/:username', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true, username: true, displayName: true, avatarUrl: true,
        bio: true, isVerifiedRescuer: true, createdAt: true,
        _count: { select: { followers: true, following: true, posts: true } },
      },
    });
    if (!user) throw new AppError('User not found', 404);

    // Check if current user follows this user
    let isFollowing = false;
    if (req.userId) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: req.userId, followingId: user.id },
        },
      });
      isFollowing = !!follow;
    }

    res.json({
      ...user,
      follower_count: user._count.followers,
      following_count: user._count.following,
      post_count: user._count.posts,
      is_following: isFollowing,
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/users/:id/follow
usersRouter.post('/:id/follow', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.userId) throw new AppError('Cannot follow yourself', 400);

    await prisma.follow.create({
      data: { followerId: req.userId!, followingId: targetId },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/users/:id/follow
usersRouter.delete('/:id/follow', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.follow.delete({
      where: {
        followerId_followingId: { followerId: req.userId!, followingId: req.params.id },
      },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /v1/users/me/push-subscription
usersRouter.put('/me/push-subscription', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.userId! },
      data: { pushSubscription: req.body },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /v1/users/me/location
usersRouter.put('/me/location', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { lat, lng, city } = req.body;

    await prisma.user.update({
      where: { id: req.userId! },
      data: {
        locationLat: lat,
        locationLng: lng,
        locationCity: city,
      },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
