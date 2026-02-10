import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadFile } from '../config/s3';

export const foundCatsRouter = Router();

// POST /v1/found-cats
foundCatsRouter.post(
  '/',
  requireAuth,
  upload.array('photos', 5),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'At least one photo required' });
        return;
      }

      const photoUrls = await Promise.all(
        files.map((file) =>
          uploadFile(file.buffer, file.originalname, 'found-cats', file.mimetype)
        )
      );

      const foundCat = await prisma.foundCat.create({
        data: {
          reporterId: req.userId!,
          description: req.body.description,
          photoUrls,
          foundLat: parseFloat(req.body.found_lat),
          foundLng: parseFloat(req.body.found_lng),
          foundAddress: req.body.found_address || null,
          foundAt: req.body.found_at ? new Date(req.body.found_at) : null,
          contactPhone: req.body.contact_phone || null,
        },
      });

      res.status(201).json({
        id: foundCat.id,
        status: foundCat.status,
        photo_urls: foundCat.photoUrls,
        created_at: foundCat.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /v1/found-cats
foundCatsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || 'active';

    const [foundCats, total] = await Promise.all([
      prisma.foundCat.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          reporter: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.foundCat.count({ where: { status } }),
    ]);

    res.json({
      data: foundCats,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});
