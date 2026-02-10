import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { env } from '../config/env';

export const paymentsRouter = Router();

// ---------------------------------------------------------------------------
// Stripe — conditional initialization
// In development/test the key may be empty; routes will return 503.
// ---------------------------------------------------------------------------
type StripeInstance = {
  checkout: {
    sessions: {
      create: (params: Record<string, unknown>) => Promise<{ id: string; url: string }>;
    };
  };
  webhooks: {
    constructEvent: (body: Buffer, sig: string, secret: string) => Record<string, unknown>;
  };
};

let stripe: StripeInstance | null = null;

async function getStripe(): Promise<StripeInstance> {
  if (stripe) return stripe;
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError('Stripe is not configured', 503);
  }
  // Dynamic import so the server can start even if stripe package is missing
  const Stripe = (await import('stripe')).default;
  stripe = new (Stripe as unknown as new (key: string, opts: Record<string, string>) => StripeInstance)(
    env.STRIPE_SECRET_KEY,
    { apiVersion: '2024-04-10' },
  );
  return stripe;
}

// ---------------------------------------------------------------------------
// Boost pricing (RM per hour)
// ---------------------------------------------------------------------------
const BOOST_PRICE_PER_HOUR: Record<string, number> = {
  post: 2.0,
  lost_cat: 1.5,   // Discounted — social good
  memorial: 3.0,
};

// Subscription pricing (RM)
const SUBSCRIPTION_PRICING: Record<string, { amount: number; intervalDays: number }> = {
  monthly: { amount: 9.90, intervalDays: 30 },
  yearly: { amount: 99.0, intervalDays: 365 },
};

// ---------------------------------------------------------------------------
// POST /v1/payments/create-checkout
// Create a Stripe Checkout Session for a boost or subscription purchase.
// Body: { type: 'boost' | 'subscription', boost_id?: string, plan?: string }
// ---------------------------------------------------------------------------
paymentsRouter.post(
  '/create-checkout',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stripeClient = await getStripe();
      const { type, boost_id, plan } = req.body;

      if (type === 'boost') {
        // ----- Boost checkout -----
        if (!boost_id) {
          throw new AppError('boost_id is required for boost checkout', 400);
        }

        const boost = await prisma.paidBoost.findUnique({ where: { id: boost_id } });
        if (!boost) throw new AppError('Boost not found', 404);
        if (boost.userId !== req.userId) throw new AppError('Not authorized', 403);
        if (boost.paymentStatus !== 'pending') {
          throw new AppError('Boost is no longer pending payment', 400);
        }

        const session = await stripeClient.checkout.sessions.create({
          payment_method_types: ['card', 'fpx'],
          mode: 'payment',
          customer_email: undefined, // Optionally fetch user email
          line_items: [
            {
              price_data: {
                currency: boost.currency.toLowerCase(),
                unit_amount: Math.round(Number(boost.amount) * 100), // Stripe uses cents
                product_data: {
                  name: `MeowLah Boost — ${boost.targetType} (${boost.durationHours}h)`,
                  description: `Boost your ${boost.targetType} for ${boost.durationHours} hours`,
                },
              },
              quantity: 1,
            },
          ],
          metadata: {
            type: 'boost',
            boost_id: boost.id,
            user_id: req.userId!,
          },
          success_url: `${env.FRONTEND_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${env.FRONTEND_URL}/payments/cancel`,
        });

        // Store the Stripe session reference
        await prisma.paidBoost.update({
          where: { id: boost_id },
          data: {
            paymentProvider: 'stripe',
            paymentReference: session.id,
          },
        });

        res.json({ checkout_url: session.url, session_id: session.id });
      } else if (type === 'subscription') {
        // ----- Subscription checkout -----
        if (!plan || !SUBSCRIPTION_PRICING[plan]) {
          throw new AppError('Invalid plan. Choose "monthly" or "yearly"', 400);
        }

        const pricing = SUBSCRIPTION_PRICING[plan];

        const session = await stripeClient.checkout.sessions.create({
          payment_method_types: ['card', 'fpx'],
          mode: 'payment', // One-time payment; recurring handled by app logic
          line_items: [
            {
              price_data: {
                currency: 'myr',
                unit_amount: Math.round(pricing.amount * 100),
                product_data: {
                  name: `MeowLah Premium — ${plan}`,
                  description: `Premium subscription (${plan})`,
                },
              },
              quantity: 1,
            },
          ],
          metadata: {
            type: 'subscription',
            plan,
            user_id: req.userId!,
          },
          success_url: `${env.FRONTEND_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${env.FRONTEND_URL}/payments/cancel`,
        });

        res.json({ checkout_url: session.url, session_id: session.id });
      } else {
        throw new AppError('Invalid type. Use "boost" or "subscription"', 400);
      }
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /v1/payments/webhook
// Stripe webhook handler. Must receive the raw body for signature verification.
// In server.ts the JSON body parser runs before routes, so the webhook route
// needs express.raw() applied specifically (see note below).
// ---------------------------------------------------------------------------
paymentsRouter.post(
  '/webhook',
  // Stripe requires the raw body for signature verification.
  // When this route is mounted the global JSON parser has already run,
  // but we can still access req.body as a Buffer if the route is registered
  // with express.raw(). The parent server.ts should mount this route with:
  //   app.use('/v1/payments/webhook', express.raw({ type: 'application/json' }));
  // As a fallback we also handle pre-parsed JSON bodies.
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stripeClient = await getStripe();
      const sig = req.headers['stripe-signature'] as string;

      if (!sig) {
        throw new AppError('Missing stripe-signature header', 400);
      }

      let event: Record<string, unknown>;

      try {
        // req.body should be a Buffer when express.raw() is used
        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
        event = stripeClient.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
      } catch (webhookErr) {
        console.error('[Stripe Webhook] Signature verification failed:', webhookErr);
        res.status(400).json({ error: 'Webhook signature verification failed' });
        return;
      }

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data as Record<string, unknown>;
          const sessionObj = (session as Record<string, unknown>).object as Record<string, unknown>;
          const metadata = sessionObj.metadata as Record<string, string>;

          if (metadata.type === 'boost') {
            await handleBoostPaymentSuccess(metadata.boost_id);
          } else if (metadata.type === 'subscription') {
            await handleSubscriptionPaymentSuccess(metadata.user_id, metadata.plan);
          }
          break;
        }

        case 'checkout.session.expired': {
          const session = event.data as Record<string, unknown>;
          const sessionObj = (session as Record<string, unknown>).object as Record<string, unknown>;
          const metadata = sessionObj.metadata as Record<string, string>;

          if (metadata.type === 'boost') {
            // Mark the boost as failed
            await prisma.paidBoost.update({
              where: { id: metadata.boost_id },
              data: { paymentStatus: 'failed' },
            });
          }
          break;
        }

        default:
          // Unhandled event type — log and acknowledge
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }

      // Acknowledge receipt to Stripe
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /v1/payments/history
// Payment history for the currently authenticated user.
// Returns both boosts and subscriptions, newest first.
// ---------------------------------------------------------------------------
paymentsRouter.get(
  '/history',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const [boosts, subscriptions] = await Promise.all([
        prisma.paidBoost.findMany({
          where: { userId: req.userId! },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.subscription.findMany({
          where: { userId: req.userId! },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      res.json({
        boosts: boosts.map((b) => ({
          id: b.id,
          target_type: b.targetType,
          target_id: b.targetId,
          amount: b.amount,
          currency: b.currency,
          duration_hours: b.durationHours,
          payment_status: b.paymentStatus,
          payment_provider: b.paymentProvider,
          starts_at: b.startsAt,
          expires_at: b.expiresAt,
          created_at: b.createdAt,
        })),
        subscriptions: subscriptions.map((s) => ({
          id: s.id,
          plan: s.plan,
          status: s.status,
          amount: s.amount,
          currency: s.currency,
          starts_at: s.startsAt,
          expires_at: s.expiresAt,
          auto_renew: s.autoRenew,
          created_at: s.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Activate a boost after successful Stripe payment.
 * Sets payment_status to 'paid', computes the activation window,
 * and applies the boost flag to the target (post or lost_cat).
 */
async function handleBoostPaymentSuccess(boostId: string): Promise<void> {
  const boost = await prisma.paidBoost.findUnique({ where: { id: boostId } });
  if (!boost || boost.paymentStatus === 'paid') return;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + boost.durationHours * 60 * 60 * 1000);

  // Mark boost as paid
  await prisma.paidBoost.update({
    where: { id: boostId },
    data: {
      paymentStatus: 'paid',
      startsAt: now,
      expiresAt,
    },
  });

  // Apply boost to the target entity
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

  // Create a notification for the user
  await prisma.notification.create({
    data: {
      userId: boost.userId,
      type: 'boost_activated',
      title: 'Boost activated!',
      body: `Your ${boost.targetType} boost is now active for ${boost.durationHours} hours.`,
      data: {
        boost_id: boost.id,
        target_type: boost.targetType,
        target_id: boost.targetId,
        expires_at: expiresAt.toISOString(),
      },
    },
  });
}

/**
 * Activate a premium subscription after successful Stripe payment.
 * Creates a subscription record and marks the user as premium.
 */
async function handleSubscriptionPaymentSuccess(userId: string, plan: string): Promise<void> {
  const pricing = SUBSCRIPTION_PRICING[plan];
  if (!pricing) return;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + pricing.intervalDays * 24 * 60 * 60 * 1000);

  // Create subscription record
  await prisma.subscription.create({
    data: {
      userId,
      plan,
      amount: pricing.amount,
      startsAt: now,
      expiresAt,
      paymentProvider: 'stripe',
    },
  });

  // Mark user as premium
  await prisma.user.update({
    where: { id: userId },
    data: { isPremium: true },
  });

  // Create a notification for the user
  await prisma.notification.create({
    data: {
      userId,
      type: 'subscription_activated',
      title: 'Welcome to MeowLah Premium!',
      body: `Your ${plan} premium subscription is now active.`,
      data: {
        plan,
        expires_at: expiresAt.toISOString(),
      },
    },
  });
}
