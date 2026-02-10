import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

export const boostsRouter = Router();

// POST /v1/boosts — Create a boost
boostsRouter.post('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { target_type, target_id, duration_hours, payment_provider } = req.body;

    if (!['post', 'lost_cat', 'memorial'].includes(target_type)) {
      throw new AppError('Invalid target type', 400);
    }

    // Pricing logic (RM)
    const pricePerHour: Record<string, number> = {
      post: 2.0,
      lost_cat: 1.5,  // Discounted — social good
      memorial: 3.0,
    };

    const amount = pricePerHour[target_type] * duration_hours;

    const boost = await prisma.paidBoost.create({
      data: {
        userId: req.userId!,
        targetType: target_type,
        targetId: target_id,
        amount,
        durationHours: duration_hours,
        paymentProvider: payment_provider || 'stripe',
        paymentStatus: 'pending',
      },
    });

    // In production: create Stripe payment intent and return client_secret
    // For now, return the boost record with pending status
    res.status(201).json({
      id: boost.id,
      amount: boost.amount,
      currency: boost.currency,
      payment_status: boost.paymentStatus,
      // client_secret: stripePaymentIntent.client_secret,  // In production
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/boosts/activate — Called after payment confirmation
boostsRouter.post('/activate', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { boost_id, payment_reference } = req.body;

    const boost = await prisma.paidBoost.findUnique({ where: { id: boost_id } });
    if (!boost) throw new AppError('Boost not found', 404);
    if (boost.userId !== req.userId) throw new AppError('Not authorized', 403);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + boost.durationHours * 60 * 60 * 1000);

    // Update boost record
    await prisma.paidBoost.update({
      where: { id: boost_id },
      data: {
        paymentStatus: 'paid',
        paymentReference: payment_reference,
        startsAt: now,
        expiresAt,
      },
    });

    // Apply boost to the target
    if (boost.targetType === 'post') {
      await prisma.post.update({
        where: { id: boost.targetId },
        data: { isBoosted: true, boostExpiresAt: expiresAt },
      });
    } else if (boost.targetType === 'lost_cat') {
      await prisma.lostCat.update({
        where: { id: boost.targetId },
        data: { isBoosted: true, boostExpiresAt: expiresAt },
      });
    }

    res.json({ success: true, expires_at: expiresAt });
  } catch (err) {
    next(err);
  }
});

// GET /v1/boosts/me
boostsRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const boosts = await prisma.paidBoost.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: boosts });
  } catch (err) {
    next(err);
  }
});

// POST /v1/subscriptions — Subscribe to premium
boostsRouter.post('/subscriptions', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { plan } = req.body;

    const pricing: Record<string, number> = {
      monthly: 9.90,
      yearly: 99.00,
    };

    if (!pricing[plan]) {
      throw new AppError('Invalid plan. Choose "monthly" or "yearly"', 400);
    }

    const now = new Date();
    const expiresAt = plan === 'yearly'
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        userId: req.userId!,
        plan,
        amount: pricing[plan],
        startsAt: now,
        expiresAt,
      },
    });

    // Mark user as premium
    await prisma.user.update({
      where: { id: req.userId! },
      data: { isPremium: true },
    });

    res.status(201).json({
      id: subscription.id,
      plan: subscription.plan,
      amount: subscription.amount,
      expires_at: subscription.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});
