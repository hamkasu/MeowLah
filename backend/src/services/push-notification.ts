import webpush from 'web-push';
import { env } from '../config/env';
import { prisma } from '../config/database';

// Configure VAPID keys for Web Push
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  type: string;
  tag?: string;
}

/**
 * Send a push notification to a specific user.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushSubscription: true },
    });

    if (!user?.pushSubscription) return false;

    const subscription = user.pushSubscription as unknown as webpush.PushSubscription;
    await webpush.sendNotification(subscription, JSON.stringify(payload));

    // Also store in DB notifications table
    await prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: { url: payload.url },
      },
    });

    return true;
  } catch (error) {
    console.error(`[Push] Failed to send to user ${userId}:`, error);
    return false;
  }
}

/**
 * Notify all users within a radius of a location about a lost cat.
 * Uses raw SQL with PostGIS for efficient geospatial query.
 */
export async function notifyNearbyUsers(
  lostCatId: string,
  lat: number,
  lng: number,
  catName: string,
  excludeUserId: string
): Promise<number> {
  // Find users within their notification radius
  // Using Prisma raw query with PostGIS ST_DWithin
  const nearbyUsers = await prisma.$queryRaw<{ id: string; push_subscription: unknown }[]>`
    SELECT id, push_subscription
    FROM users
    WHERE id != ${excludeUserId}::uuid
      AND push_subscription IS NOT NULL
      AND location_lat IS NOT NULL
      AND location_lng IS NOT NULL
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        notification_radius_km * 1000
      )
  `;

  let sentCount = 0;

  for (const user of nearbyUsers) {
    if (!user.push_subscription) continue;

    try {
      await webpush.sendNotification(
        user.push_subscription as unknown as webpush.PushSubscription,
        JSON.stringify({
          title: `Lost Cat Alert: ${catName}`,
          body: `A cat named ${catName} was reported missing near your area. Tap to help.`,
          url: `/lost-cats/${lostCatId}`,
          type: 'lost_cat_nearby',
          tag: `lost-cat-${lostCatId}`,
        })
      );
      sentCount++;
    } catch {
      // Skip failed sends
    }
  }

  // Batch-create notifications for nearby users
  if (nearbyUsers.length > 0) {
    await prisma.notification.createMany({
      data: nearbyUsers.map((u) => ({
        userId: u.id,
        type: 'lost_cat_nearby',
        title: `Lost Cat Alert: ${catName}`,
        body: `A cat named ${catName} was reported missing near your area.`,
        data: { lostCatId, url: `/lost-cats/${lostCatId}` },
      })),
    });
  }

  return sentCount;
}
