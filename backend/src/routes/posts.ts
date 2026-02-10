import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadFile } from '../config/s3';
import { cacheGet, cacheSet, cacheDelete } from '../config/redis';

export const postsRouter = Router();

// POST /v1/posts — Create a new post
postsRouter.post(
  '/',
  requireAuth,
  upload.array('media', 10),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'At least one media file required' });
        return;
      }

      // Upload all media files to S3 in parallel
      const mediaUrls = await Promise.all(
        files.map((file) =>
          uploadFile(file.buffer, file.originalname, 'posts', file.mimetype)
        )
      );

      const hashtags = req.body.hashtags
        ? (typeof req.body.hashtags === 'string' ? JSON.parse(req.body.hashtags) : req.body.hashtags)
        : [];

      const post = await prisma.post.create({
        data: {
          authorId: req.userId!,
          catProfileId: req.body.cat_profile_id || null,
          caption: req.body.caption || null,
          mediaUrls,
          mediaType: req.body.media_type || 'image',
          hashtags,
          locationName: req.body.location_name || null,
          locationLat: req.body.location_lat ? parseFloat(req.body.location_lat) : null,
          locationLng: req.body.location_lng ? parseFloat(req.body.location_lng) : null,
        },
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      });

      // Invalidate feed cache
      await cacheDelete('feed:*');

      res.status(201).json({
        id: post.id,
        caption: post.caption,
        media_urls: post.mediaUrls,
        media_type: post.mediaType,
        hashtags: post.hashtags,
        author: post.author,
        created_at: post.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /v1/posts — Get feed (posts from followed users + boosted posts)
postsRouter.get('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;

    // Check cache first
    const cacheKey = `feed:${req.userId}:${page}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // Get IDs of users the current user follows
    const follows = await prisma.follow.findMany({
      where: { followerId: req.userId! },
      select: { followingId: true },
    });
    const followingIds = follows.map((f) => f.followingId);
    followingIds.push(req.userId!); // Include own posts

    // Fetch posts from followed users + boosted posts
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: {
          OR: [
            { authorId: { in: followingIds } },
            { isBoosted: true, boostExpiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          catProfile: {
            select: { id: true, name: true, breed: true },
          },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.post.count({
        where: {
          OR: [
            { authorId: { in: followingIds } },
            { isBoosted: true, boostExpiresAt: { gt: new Date() } },
          ],
        },
      }),
    ]);

    // Check which posts the user has liked
    const likedPostIds = new Set(
      (
        await prisma.postLike.findMany({
          where: { userId: req.userId!, postId: { in: posts.map((p) => p.id) } },
          select: { postId: true },
        })
      ).map((l) => l.postId)
    );

    const response = {
      data: posts.map((post) => ({
        id: post.id,
        author: post.author,
        cat_profile: post.catProfile,
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
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };

    // Cache for 60 seconds
    await cacheSet(cacheKey, response, 60);

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// POST /v1/posts/:id/like
postsRouter.post('/:id/like', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.$transaction([
      prisma.postLike.create({
        data: { userId: req.userId!, postId: req.params.id },
      }),
      prisma.post.update({
        where: { id: req.params.id },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/posts/:id/like
postsRouter.delete('/:id/like', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.$transaction([
      prisma.postLike.delete({
        where: {
          userId_postId: { userId: req.userId!, postId: req.params.id },
        },
      }),
      prisma.post.update({
        where: { id: req.params.id },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /v1/posts/:id/comments
postsRouter.get('/:id/comments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: req.params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    res.json({ data: comments });
  } catch (err) {
    next(err);
  }
});

// POST /v1/posts/:id/comments
postsRouter.post('/:id/comments', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { body, parent_id } = req.body;
    if (!body?.trim()) {
      res.status(400).json({ error: 'Comment body required' });
      return;
    }

    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          authorId: req.userId!,
          postId: req.params.id,
          parentId: parent_id || null,
          body: body.trim(),
        },
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.post.update({
        where: { id: req.params.id },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});
