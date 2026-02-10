import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadFile, deleteFile } from '../config/s3';
import { notifyNearbyUsers } from '../services/push-notification';
import { AppError } from '../middleware/error-handler';

export const lostCatsRouter = Router();

// POST /v1/lost-cats — Report a lost cat
lostCatsRouter.post(
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
          uploadFile(file.buffer, file.originalname, 'lost-cats', file.mimetype)
        )
      );

      const lostCat = await prisma.lostCat.create({
        data: {
          reporterId: req.userId!,
          catProfileId: req.body.cat_profile_id || null,
          name: req.body.name,
          breed: req.body.breed || null,
          color: req.body.color || null,
          description: req.body.description,
          photoUrls,
          lastSeenLat: parseFloat(req.body.last_seen_lat),
          lastSeenLng: parseFloat(req.body.last_seen_lng),
          lastSeenAddress: req.body.last_seen_address || null,
          lastSeenAt: req.body.last_seen_at ? new Date(req.body.last_seen_at) : null,
          contactPhone: req.body.contact_phone || null,
          contactWhatsapp: req.body.contact_whatsapp || null,
          rewardAmount: req.body.reward_amount ? parseFloat(req.body.reward_amount) : null,
        },
      });

      const notificationCount = await notifyNearbyUsers(
        lostCat.id,
        lostCat.lastSeenLat,
        lostCat.lastSeenLng,
        lostCat.name,
        req.userId!
      );

      res.status(201).json({
        id: lostCat.id,
        name: lostCat.name,
        status: lostCat.status,
        photo_urls: lostCat.photoUrls,
        notifications_sent: notificationCount,
        created_at: lostCat.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /v1/lost-cats — List active lost cats
lostCatsRouter.get('/', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || 'active';

    const [lostCats, total] = await Promise.all([
      prisma.lostCat.findMany({
        where: { status },
        orderBy: [
          { isBoosted: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
        include: {
          reporter: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, isVerifiedRescuer: true },
          },
          _count: { select: { sightings: true } },
        },
      }),
      prisma.lostCat.count({ where: { status } }),
    ]);

    res.json({
      data: lostCats.map((cat) => ({
        id: cat.id,
        reporter: cat.reporter,
        name: cat.name,
        breed: cat.breed,
        color: cat.color,
        description: cat.description,
        photo_urls: cat.photoUrls,
        last_seen_lat: cat.lastSeenLat,
        last_seen_lng: cat.lastSeenLng,
        last_seen_address: cat.lastSeenAddress,
        last_seen_at: cat.lastSeenAt,
        contact_phone: cat.contactPhone,
        contact_whatsapp: cat.contactWhatsapp,
        reward_amount: cat.rewardAmount,
        status: cat.status,
        is_boosted: cat.isBoosted,
        sighting_count: cat._count.sightings,
        created_at: cat.createdAt,
      })),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/lost-cats/nearby — Geospatial query
lostCatsRouter.get('/nearby', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = parseInt(req.query.radius as string) || 10;

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: 'lat and lng query params required' });
      return;
    }

    const nearbyCats = await prisma.$queryRaw`
      SELECT lc.*,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(lc.last_seen_lng, lc.last_seen_lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) / 1000 as distance_km
      FROM lost_cats lc
      WHERE lc.status = 'active'
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(lc.last_seen_lng, lc.last_seen_lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusKm * 1000}
        )
      ORDER BY distance_km ASC
      LIMIT 50
    `;

    res.json({ data: nearbyCats });
  } catch (err) {
    next(err);
  }
});

// GET /v1/lost-cats/:id
lostCatsRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lostCat = await prisma.lostCat.findUnique({
      where: { id: req.params.id },
      include: {
        reporter: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerifiedRescuer: true },
        },
        sightings: {
          orderBy: { createdAt: 'desc' },
          include: {
            reporter: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!lostCat) throw new AppError('Lost cat report not found', 404);

    res.json({
      id: lostCat.id,
      reporter: lostCat.reporter,
      name: lostCat.name,
      breed: lostCat.breed,
      color: lostCat.color,
      description: lostCat.description,
      photo_urls: lostCat.photoUrls,
      last_seen_lat: lostCat.lastSeenLat,
      last_seen_lng: lostCat.lastSeenLng,
      last_seen_address: lostCat.lastSeenAddress,
      last_seen_at: lostCat.lastSeenAt,
      contact_phone: lostCat.contactPhone,
      contact_whatsapp: lostCat.contactWhatsapp,
      reward_amount: lostCat.rewardAmount,
      status: lostCat.status,
      is_boosted: lostCat.isBoosted,
      sightings: lostCat.sightings,
      created_at: lostCat.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /v1/lost-cats/:id — Edit own lost cat report
lostCatsRouter.put('/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lostCat = await prisma.lostCat.findUnique({ where: { id: req.params.id } });
    if (!lostCat) throw new AppError('Lost cat report not found', 404);
    if (lostCat.reporterId !== req.userId) throw new AppError('Not authorized', 403);

    const updated = await prisma.lostCat.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.breed !== undefined && { breed: req.body.breed }),
        ...(req.body.color !== undefined && { color: req.body.color }),
        ...(req.body.description && { description: req.body.description }),
        ...(req.body.contact_phone !== undefined && { contactPhone: req.body.contact_phone }),
        ...(req.body.contact_whatsapp !== undefined && { contactWhatsapp: req.body.contact_whatsapp }),
        ...(req.body.reward_amount !== undefined && { rewardAmount: req.body.reward_amount ? parseFloat(req.body.reward_amount) : null }),
        ...(req.body.last_seen_address && { lastSeenAddress: req.body.last_seen_address }),
      },
    });

    res.json({ id: updated.id, name: updated.name, status: updated.status });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/lost-cats/:id — Delete own lost cat report
lostCatsRouter.delete('/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lostCat = await prisma.lostCat.findUnique({
      where: { id: req.params.id },
      select: { reporterId: true, photoUrls: true },
    });
    if (!lostCat) throw new AppError('Lost cat report not found', 404);
    if (lostCat.reporterId !== req.userId) throw new AppError('Not authorized', 403);

    await Promise.allSettled(lostCat.photoUrls.map((url) => deleteFile(url)));
    await prisma.lostCat.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /v1/lost-cats/:id/status
lostCatsRouter.put('/:id/status', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lostCat = await prisma.lostCat.findUnique({ where: { id: req.params.id } });
    if (!lostCat) throw new AppError('Lost cat report not found', 404);
    if (lostCat.reporterId !== req.userId) throw new AppError('Not authorized', 403);

    const updated = await prisma.lostCat.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });

    res.json({ id: updated.id, status: updated.status });
  } catch (err) {
    next(err);
  }
});

// POST /v1/lost-cats/:id/sightings — Report a sighting
lostCatsRouter.post(
  '/:id/sightings',
  requireAuth,
  upload.single('photo'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      let photoUrl: string | null = null;
      if (req.file) {
        photoUrl = await uploadFile(req.file.buffer, req.file.originalname, 'sightings', req.file.mimetype);
      }

      const sighting = await prisma.catSighting.create({
        data: {
          lostCatId: req.params.id,
          reporterId: req.userId!,
          lat: parseFloat(req.body.lat),
          lng: parseFloat(req.body.lng),
          address: req.body.address || null,
          note: req.body.note || null,
          photoUrl,
        },
        include: {
          reporter: {
            select: { id: true, username: true, displayName: true },
          },
        },
      });

      // Notify the lost cat reporter
      const lostCat = await prisma.lostCat.findUnique({
        where: { id: req.params.id },
        select: { reporterId: true, name: true },
      });

      if (lostCat) {
        const { sendPushToUser } = await import('../services/push-notification');
        await sendPushToUser(lostCat.reporterId, {
          title: `New sighting of ${lostCat.name}!`,
          body: sighting.note || 'Someone reported seeing your cat.',
          url: `/lost-cats/${req.params.id}`,
          type: 'sighting',
        });
      }

      res.status(201).json(sighting);
    } catch (err) {
      next(err);
    }
  }
);
