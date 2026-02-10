import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadFile, deleteFile } from '../config/s3';
import { AppError } from '../middleware/error-handler';

export const usersRouter = Router();

const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location_city: z.string().max(100).optional(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/).optional(),
});

// GET /v1/users/me
usersRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true, email: true, username: true, displayName: true,
        avatarUrl: true, bio: true, isPremium: true, isVerifiedRescuer: true,
        locationCity: true, locationLat: true, locationLng: true,
        notificationRadiusKm: true, createdAt: true,
        _count: { select: { followers: true, following: true, posts: true } },
        catProfiles: {
          select: { id: true, name: true, breed: true, photoUrl: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) throw new AppError('User not found', 404);

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.displayName,
      avatar_url: user.avatarUrl,
      bio: user.bio,
      is_premium: user.isPremium,
      is_verified_rescuer: user.isVerifiedRescuer,
      location_city: user.locationCity,
      notification_radius_km: user.notificationRadiusKm,
      created_at: user.createdAt,
      follower_count: user._count.followers,
      following_count: user._count.following,
      post_count: user._count.posts,
      cats_owned: user.catProfiles,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /v1/users/me — Update profile
usersRouter.put('/me', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = updateProfileSchema.parse(req.body);

    if (body.username) {
      const existing = await prisma.user.findFirst({
        where: { username: body.username, NOT: { id: req.userId! } },
      });
      if (existing) throw new AppError('Username already taken', 409);
    }

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        ...(body.display_name !== undefined && { displayName: body.display_name }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.location_city !== undefined && { locationCity: body.location_city }),
        ...(body.username !== undefined && { username: body.username }),
      },
      select: {
        id: true, email: true, username: true, displayName: true,
        avatarUrl: true, bio: true, isPremium: true, isVerifiedRescuer: true,
        locationCity: true, createdAt: true,
      },
    });

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.displayName,
      avatar_url: user.avatarUrl,
      bio: user.bio,
      is_premium: user.isPremium,
      is_verified_rescuer: user.isVerifiedRescuer,
      location_city: user.locationCity,
      created_at: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /v1/users/me/avatar — Upload avatar image
usersRouter.put(
  '/me/avatar',
  requireAuth,
  upload.single('avatar'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('Avatar image required', 400);
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { avatarUrl: true },
      });

      const avatarUrl = await uploadFile(
        req.file.buffer,
        req.file.originalname,
        'avatars',
        req.file.mimetype
      );

      await prisma.user.update({
        where: { id: req.userId! },
        data: { avatarUrl },
      });

      if (currentUser?.avatarUrl) {
        try { await deleteFile(currentUser.avatarUrl); } catch { /* non-critical */ }
      }

      res.json({ avatar_url: avatarUrl });
    } catch (err) {
      next(err);
    }
  }
);

// GET /v1/users/:username
usersRouter.get('/:username', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true, username: true, displayName: true, avatarUrl: true,
        bio: true, isVerifiedRescuer: true, isPremium: true,
        locationCity: true, createdAt: true,
        _count: { select: { followers: true, following: true, posts: true } },
        catProfiles: {
          select: { id: true, name: true, breed: true, photoUrl: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) throw new AppError('User not found', 404);

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
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      avatar_url: user.avatarUrl,
      bio: user.bio,
      is_verified_rescuer: user.isVerifiedRescuer,
      is_premium: user.isPremium,
      location_city: user.locationCity,
      created_at: user.createdAt,
      follower_count: user._count.followers,
      following_count: user._count.following,
      post_count: user._count.posts,
      cats_owned: user.catProfiles,
      is_following: isFollowing,
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/users/:username/posts
usersRouter.get('/:username/posts', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: { id: true },
    });
    if (!user) throw new AppError('User not found', 404);

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.post.count({ where: { authorId: user.id } }),
    ]);

    let likedPostIds = new Set<string>();
    if (req.userId) {
      likedPostIds = new Set(
        (await prisma.postLike.findMany({
          where: { userId: req.userId, postId: { in: posts.map((p) => p.id) } },
          select: { postId: true },
        })).map((l) => l.postId)
      );
    }

    res.json({
      data: posts.map((post) => ({
        id: post.id,
        author: post.author,
        caption: post.caption,
        media_urls: post.mediaUrls,
        media_type: post.mediaType,
        hashtags: post.hashtags,
        location_name: post.locationName,
        like_count: post._count.likes,
        comment_count: post._count.comments,
        is_liked: likedPostIds.has(post.id),
        is_boosted: post.isBoosted,
        created_at: post.createdAt,
      })),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
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

    const follower = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { username: true, displayName: true },
    });

    await prisma.notification.create({
      data: {
        userId: targetId,
        type: 'follow',
        title: 'New follower',
        body: `${follower?.displayName || follower?.username} started following you`,
        data: { follower_id: req.userId },
      },
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
      data: { locationLat: lat, locationLng: lng, locationCity: city },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /v1/users/me/cats — Add a cat to profile
usersRouter.post(
  '/me/cats',
  requireAuth,
  upload.single('photo'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      let photoUrl: string | null = null;
      if (req.file) {
        photoUrl = await uploadFile(req.file.buffer, req.file.originalname, 'cats', req.file.mimetype);
      }

      const cat = await prisma.catProfile.create({
        data: {
          ownerId: req.userId!,
          name: req.body.name,
          breed: req.body.breed || null,
          color: req.body.color || null,
          ageYears: req.body.age_years ? parseInt(req.body.age_years) : null,
          ageMonths: req.body.age_months ? parseInt(req.body.age_months) : null,
          gender: req.body.gender || null,
          isNeutered: req.body.is_neutered === 'true' || req.body.is_neutered === true,
          photoUrl,
          description: req.body.description || null,
        },
      });

      res.status(201).json(cat);
    } catch (err) {
      next(err);
    }
  }
);

// GET /v1/users/me/cats
usersRouter.get('/me/cats', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cats = await prisma.catProfile.findMany({
      where: { ownerId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: cats });
  } catch (err) {
    next(err);
  }
});

// GET /v1/users/me/lost-cats — My lost cat reports
usersRouter.get('/me/lost-cats', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lostCats = await prisma.lostCat.findMany({
      where: { reporterId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { sightings: true } },
      },
    });
    res.json({
      data: lostCats.map((cat) => ({
        id: cat.id,
        name: cat.name,
        breed: cat.breed,
        description: cat.description,
        photo_urls: cat.photoUrls,
        status: cat.status,
        is_boosted: cat.isBoosted,
        sighting_count: cat._count.sightings,
        created_at: cat.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/users/me/memorials — My memorials
usersRouter.get('/me/memorials', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const memorials = await prisma.memorial.findMany({
      where: { creatorId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      data: memorials.map((m) => ({
        id: m.id,
        slug: m.slug,
        cat_name: m.catName,
        cat_photo_url: m.catPhotoUrl,
        visibility: m.visibility,
        theme: m.theme,
        candle_count: m.candleCount,
        flower_count: m.flowerCount,
        created_at: m.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});
