import { Router, Response, NextFunction } from 'express';
import slugify from 'slugify';
import { nanoid } from 'nanoid';
import { prisma } from '../config/database';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadFile } from '../config/s3';
import { AppError } from '../middleware/error-handler';
import { cacheGet, cacheSet } from '../config/redis';
import { sendPushToUser } from '../services/push-notification';

export const memorialsRouter = Router();

/**
 * Generate a unique, SEO-friendly slug for a memorial.
 * Format: "cat-name-forever-remembered-abc123"
 */
function generateSlug(catName: string): string {
  const base = slugify(catName, { lower: true, strict: true });
  const suffix = nanoid(8);
  return `${base}-forever-remembered-${suffix}`;
}

// POST /v1/memorials — Create a memorial
memorialsRouter.post(
  '/',
  requireAuth,
  upload.fields([
    { name: 'cat_photo', maxCount: 1 },
    { name: 'gallery', maxCount: 20 },
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Upload cat photo
      let catPhotoUrl: string | null = null;
      if (files.cat_photo?.[0]) {
        catPhotoUrl = await uploadFile(
          files.cat_photo[0].buffer,
          files.cat_photo[0].originalname,
          'memorials',
          files.cat_photo[0].mimetype
        );
      }

      // Upload gallery photos
      let galleryUrls: string[] = [];
      if (files.gallery?.length) {
        galleryUrls = await Promise.all(
          files.gallery.map((file) =>
            uploadFile(file.buffer, file.originalname, 'memorials/gallery', file.mimetype)
          )
        );
      }

      const slug = generateSlug(req.body.cat_name);

      // Check if theme is premium and user has premium subscription
      const isPremiumTheme = ['starlight', 'ocean'].includes(req.body.theme);
      if (isPremiumTheme) {
        const user = await prisma.user.findUnique({
          where: { id: req.userId! },
          select: { isPremium: true },
        });
        if (!user?.isPremium) {
          res.status(403).json({ error: 'Premium subscription required for this theme' });
          return;
        }
      }

      const memorial = await prisma.memorial.create({
        data: {
          slug,
          creatorId: req.userId!,
          catProfileId: req.body.cat_profile_id || null,
          catName: req.body.cat_name,
          catBreed: req.body.cat_breed || null,
          catColor: req.body.cat_color || null,
          catPhotoUrl: catPhotoUrl,
          dateOfBirth: req.body.date_of_birth ? new Date(req.body.date_of_birth) : null,
          dateOfPassing: req.body.date_of_passing ? new Date(req.body.date_of_passing) : null,
          lifeStory: req.body.life_story || null,
          galleryUrls,
          visibility: req.body.visibility || 'public',
          theme: req.body.theme || 'default',
          isPremiumTheme,
          showOnWall: req.body.show_on_wall === 'true' || req.body.show_on_wall === true,
        },
      });

      const shareUrl = `${process.env.FRONTEND_URL || 'https://meowlah.my'}/memorial/${slug}`;

      res.status(201).json({
        id: memorial.id,
        slug: memorial.slug,
        cat_name: memorial.catName,
        share_url: shareUrl,
        created_at: memorial.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /v1/memorials/:slug — Get a memorial page (public, cached)
memorialsRouter.get('/:slug', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug;

    // Check Redis cache
    const cacheKey = `memorial:${slug}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const memorial = await prisma.memorial.findUnique({
      where: { slug },
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    if (!memorial) throw new AppError('Memorial not found', 404);

    // Check visibility
    if (memorial.visibility === 'private' && memorial.creatorId !== req.userId) {
      throw new AppError('This memorial is private', 403);
    }

    const response = {
      id: memorial.id,
      slug: memorial.slug,
      creator: memorial.creator,
      cat_name: memorial.catName,
      cat_breed: memorial.catBreed,
      cat_color: memorial.catColor,
      cat_photo_url: memorial.catPhotoUrl,
      date_of_birth: memorial.dateOfBirth,
      date_of_passing: memorial.dateOfPassing,
      age_text: memorial.ageText,
      life_story: memorial.lifeStory,
      gallery_urls: memorial.galleryUrls,
      visibility: memorial.visibility,
      theme: memorial.theme,
      is_premium_theme: memorial.isPremiumTheme,
      candle_count: memorial.candleCount,
      flower_count: memorial.flowerCount,
      show_on_wall: memorial.showOnWall,
      created_at: memorial.createdAt,
    };

    // Cache for 5 minutes
    await cacheSet(cacheKey, response, 300);

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// GET /v1/memorials/wall — Public memorial wall
memorialsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Differentiate between /wall route and user's memorials
    if (req.path === '/wall' || req.query.wall === 'true') {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);
      const skip = (page - 1) * limit;

      const [memorials, total] = await Promise.all([
        prisma.memorial.findMany({
          where: { visibility: 'public', showOnWall: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            creator: {
              select: { id: true, username: true, displayName: true },
            },
          },
        }),
        prisma.memorial.count({ where: { visibility: 'public', showOnWall: true } }),
      ]);

      res.json({
        data: memorials.map((m) => ({
          id: m.id,
          slug: m.slug,
          creator: m.creator,
          cat_name: m.catName,
          cat_breed: m.catBreed,
          cat_photo_url: m.catPhotoUrl,
          date_of_passing: m.dateOfPassing,
          theme: m.theme,
          candle_count: m.candleCount,
          flower_count: m.flowerCount,
          created_at: m.createdAt,
        })),
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
      });
      return;
    }

    // Default: list should require auth and return user's own memorials
    res.status(400).json({ error: 'Use /wall for public memorials or authenticate for your memorials' });
  } catch (err) {
    next(err);
  }
});

// POST /v1/memorials/:id/tributes — Light candle / send flower
memorialsRouter.post('/:id/tributes', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tribute_type, message } = req.body;
    if (!['candle', 'flower', 'heart'].includes(tribute_type)) {
      res.status(400).json({ error: 'Invalid tribute type' });
      return;
    }

    const [tribute] = await prisma.$transaction([
      prisma.memorialTribute.create({
        data: {
          memorialId: req.params.id,
          userId: req.userId!,
          tributeType: tribute_type,
          message: message || null,
        },
      }),
      // Increment the count
      prisma.memorial.update({
        where: { id: req.params.id },
        data: tribute_type === 'candle'
          ? { candleCount: { increment: 1 } }
          : { flowerCount: { increment: 1 } },
      }),
    ]);

    // Notify memorial creator
    const memorial = await prisma.memorial.findUnique({
      where: { id: req.params.id },
      select: { creatorId: true, catName: true },
    });
    if (memorial && memorial.creatorId !== req.userId) {
      await sendPushToUser(memorial.creatorId, {
        title: `Someone lit a candle for ${memorial.catName}`,
        body: message || `A tribute was left on ${memorial.catName}'s memorial.`,
        url: `/memorial/${req.params.id}`,
        type: 'tribute',
      });
    }

    res.status(201).json(tribute);
  } catch (err) {
    next(err);
  }
});

// GET /v1/memorials/:id/tributes
memorialsRouter.get('/:id/tributes', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const tributes = await prisma.memorialTribute.findMany({
      where: { memorialId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    res.json({ data: tributes });
  } catch (err) {
    next(err);
  }
});

// POST /v1/memorials/:id/condolences
memorialsRouter.post('/:id/condolences', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      res.status(400).json({ error: 'Message required' });
      return;
    }

    const condolence = await prisma.condolence.create({
      data: {
        memorialId: req.params.id,
        authorId: req.userId!,
        message: message.trim(),
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Notify memorial creator
    const memorial = await prisma.memorial.findUnique({
      where: { id: req.params.id },
      select: { creatorId: true, catName: true },
    });
    if (memorial && memorial.creatorId !== req.userId) {
      await sendPushToUser(memorial.creatorId, {
        title: `New condolence for ${memorial.catName}`,
        body: message.slice(0, 100),
        url: `/memorial/${req.params.id}`,
        type: 'condolence',
      });
    }

    res.status(201).json(condolence);
  } catch (err) {
    next(err);
  }
});

// GET /v1/memorials/:id/condolences
memorialsRouter.get('/:id/condolences', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const condolences = await prisma.condolence.findMany({
      where: { memorialId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    res.json({ data: condolences });
  } catch (err) {
    next(err);
  }
});
