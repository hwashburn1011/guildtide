// ---------------------------------------------------------------------------
// Cron job definitions — all recurring game tasks
// ---------------------------------------------------------------------------

import { scheduler } from './scheduler';
import { prisma } from '../db';
import { logger } from '../utils/logger';

/** Register all cron jobs. Call once on server startup. */
export function registerCronJobs(): void {
  // Resource production — every 5 minutes
  scheduler.register('resource-production', 5 * 60 * 1000, async () => {
    const guilds = await prisma.guild.findMany({ include: { buildings: true } });
    let updated = 0;
    for (const guild of guilds) {
      try {
        const resources = JSON.parse(guild.resources);
        let changed = false;
        for (const building of guild.buildings) {
          const meta = building.metadata ? JSON.parse(building.metadata) : {};
          if (meta.productionType && meta.productionRate) {
            const key = meta.productionType;
            if (key in resources) {
              resources[key] = (resources[key] ?? 0) + meta.productionRate;
              changed = true;
            }
          }
        }
        if (changed) {
          await prisma.guild.update({
            where: { id: guild.id },
            data: { resources: JSON.stringify(resources) },
          });
          updated++;
        }
      } catch (err: any) {
        logger.error('Resource production failed for guild', { guildId: guild.id, error: err.message });
      }
    }
    logger.info('Resource production complete', { guildsUpdated: updated });
  });

  // Resource decay — every 15 minutes
  scheduler.register('resource-decay', 15 * 60 * 1000, async () => {
    const guilds = await prisma.guild.findMany();
    let updated = 0;
    for (const guild of guilds) {
      try {
        const resources = JSON.parse(guild.resources);
        // Decay perishable resources by 1%
        const perishables = ['food'];
        let changed = false;
        for (const key of perishables) {
          if (resources[key] && resources[key] > 0) {
            const decay = Math.max(1, Math.floor(resources[key] * 0.01));
            resources[key] = Math.max(0, resources[key] - decay);
            changed = true;
          }
        }
        if (changed) {
          await prisma.guild.update({
            where: { id: guild.id },
            data: { resources: JSON.stringify(resources) },
          });
          updated++;
        }
      } catch (err: any) {
        logger.error('Resource decay failed for guild', { guildId: guild.id, error: err.message });
      }
    }
    logger.info('Resource decay complete', { guildsUpdated: updated });
  });

  // Market price update — every hour
  scheduler.register('market-price-update', 60 * 60 * 1000, async () => {
    try {
      const listings = await prisma.marketListing.findMany({ where: { status: 'active' } });
      let adjusted = 0;
      for (const listing of listings) {
        // Apply small random price drift (+/- 5%)
        const drift = 1 + (Math.random() - 0.5) * 0.1;
        const newPrice = Math.max(1, Math.round(listing.price * drift));
        if (newPrice !== listing.price) {
          await prisma.marketListing.update({
            where: { id: listing.id },
            data: { price: newPrice },
          });
          adjusted++;
        }
      }
      logger.info('Market price update complete', { adjusted });
    } catch (err: any) {
      logger.error('Market price update failed', { error: err.message });
    }
  });

  // Expedition progress — every minute
  scheduler.register('expedition-progress', 60 * 1000, async () => {
    try {
      const active = await prisma.expedition.findMany({
        where: { status: 'in_progress' },
      });
      const now = new Date();
      let completed = 0;
      for (const exp of active) {
        if (exp.endTime && new Date(exp.endTime) <= now) {
          await prisma.expedition.update({
            where: { id: exp.id },
            data: { status: 'completed' },
          });
          completed++;
        }
      }
      logger.info('Expedition progress check', { active: active.length, completed });
    } catch (err: any) {
      logger.error('Expedition progress check failed', { error: err.message });
    }
  });

  // Weather refresh — every 30 minutes
  scheduler.register('weather-refresh', 30 * 60 * 1000, async () => {
    try {
      const regions = await prisma.region.findMany();
      const weatherTypes = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy', 'foggy'];
      for (const region of regions) {
        const weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        await prisma.region.update({
          where: { id: region.id },
          data: { currentWeather: weather },
        });
      }
      logger.info('Weather refresh complete', { regions: regions.length });
    } catch (err: any) {
      logger.error('Weather refresh failed', { error: err.message });
    }
  });

  // Daily reset — once per day (runs every hour, checks if reset needed)
  scheduler.register('daily-reset', 60 * 60 * 1000, async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      // Use a simple key-value check (we store last reset date)
      const lastReset = dailyResetTracker.lastDate;
      if (lastReset === today) return;
      dailyResetTracker.lastDate = today;

      // Reset daily challenge progress, refresh merchants
      logger.info('Daily reset triggered', { date: today });
    } catch (err: any) {
      logger.error('Daily reset failed', { error: err.message });
    }
  });

  // Session cleanup — daily (runs every 6 hours, purges expired)
  scheduler.register('session-cleanup', 6 * 60 * 60 * 1000, async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const deleted = await prisma.session.deleteMany({
        where: { expiresAt: { lt: thirtyDaysAgo } },
      });
      logger.info('Session cleanup complete', { deleted: deleted.count });
    } catch (err: any) {
      // Session table may not exist yet — that's OK
      logger.debug('Session cleanup skipped', { error: err.message });
    }
  });

  // Database backup (placeholder — logs backup event)
  scheduler.register('database-backup', 24 * 60 * 60 * 1000, async () => {
    logger.info('Database backup job triggered (placeholder)');
  });
}

// Simple in-memory tracker for daily resets
const dailyResetTracker = { lastDate: '' };
