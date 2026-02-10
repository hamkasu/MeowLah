/**
 * Cron job to expire boosts that have passed their expiration time.
 * Run every 15 minutes via a scheduled job (e.g., Railway cron, node-cron).
 *
 * Usage: npx ts-node src/jobs/expire-boosts.ts
 * Or via node-cron in production: schedule('0,15,30,45 * * * *', expireBoosts)
 */

import { prisma } from '../config/database';

export async function expireBoosts(): Promise<void> {
  const now = new Date();

  // Expire post boosts
  const expiredPosts = await prisma.post.updateMany({
    where: {
      isBoosted: true,
      boostExpiresAt: { lt: now },
    },
    data: { isBoosted: false },
  });

  // Expire lost cat boosts
  const expiredLostCats = await prisma.lostCat.updateMany({
    where: {
      isBoosted: true,
      boostExpiresAt: { lt: now },
    },
    data: { isBoosted: false },
  });

  console.log(
    `[Cron] Expired ${expiredPosts.count} post boosts and ${expiredLostCats.count} lost cat boosts`
  );
}

// Run if called directly
if (require.main === module) {
  expireBoosts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
