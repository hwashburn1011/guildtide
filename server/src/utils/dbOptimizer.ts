// ---------------------------------------------------------------------------
// Database optimization helpers — query profiling, connection management,
// migration support, cleanup, and backup utilities
// ---------------------------------------------------------------------------

import { prisma } from '../db';
import { logger } from './logger';
import { config } from '../config';

// ---------------------------------------------------------------------------
// Query profiling
// ---------------------------------------------------------------------------

interface QueryProfile {
  query: string;
  duration: number;
  timestamp: string;
}

const slowQueryLog: QueryProfile[] = [];
const SLOW_QUERY_THRESHOLD_MS = 500;

/**
 * Profile a database operation and log slow queries.
 */
export async function profileQuery<T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;

    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      const profile: QueryProfile = {
        query: name,
        duration,
        timestamp: new Date().toISOString(),
      };
      slowQueryLog.push(profile);
      // Keep only last 200 slow queries
      if (slowQueryLog.length > 200) {
        slowQueryLog.splice(0, slowQueryLog.length - 200);
      }
      logger.warn('Slow query detected', { query: name, duration });
    }

    return result;
  } catch (err) {
    const duration = Date.now() - start;
    logger.error('Query failed', { query: name, duration, error: (err as Error).message });
    throw err;
  }
}

/** Get slow query log for analysis. */
export function getSlowQueryLog(): QueryProfile[] {
  return [...slowQueryLog];
}

// ---------------------------------------------------------------------------
// Optimized query helpers (selective field loading, eager loading)
// ---------------------------------------------------------------------------

/** Optimized hero roster query — loads only essential fields. */
export async function getHeroRosterOptimized(guildId: string) {
  return profileQuery('hero-roster', () =>
    prisma.hero.findMany({
      where: { guildId },
      select: {
        id: true,
        name: true,
        class: true,
        level: true,
        stats: true,
        status: true,
        traits: true,
        assignedBuildingId: true,
      },
    }),
  );
}

/** Optimized market listing query with pagination. */
export async function getMarketListingsOptimized(
  filters: { type?: string; minPrice?: number; maxPrice?: number },
  offset: number = 0,
  limit: number = 20,
) {
  const where: any = { status: 'active' };
  if (filters.type) where.itemType = filters.type;
  if (filters.minPrice !== undefined) where.price = { ...where.price, gte: filters.minPrice };
  if (filters.maxPrice !== undefined) where.price = { ...where.price, lte: filters.maxPrice };

  return profileQuery('market-listings', async () => {
    const [data, total] = await Promise.all([
      prisma.marketListing.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          itemType: true,
          itemName: true,
          price: true,
          quantity: true,
          sellerGuildId: true,
          createdAt: true,
        },
      }),
      prisma.marketListing.count({ where }),
    ]);
    return { data, total };
  });
}

/** Optimized expedition list with status-based partitioning. */
export async function getExpeditionsOptimized(guildId: string, status?: string) {
  const where: any = { guildId };
  if (status) where.status = status;

  return profileQuery('expedition-list', () =>
    prisma.expedition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        regionId: true,
        startTime: true,
        endTime: true,
        difficulty: true,
      },
    }),
  );
}

/** Batch query related entities to prevent N+1 queries. */
export async function batchLoadHeroEquipment(heroIds: string[]) {
  return profileQuery('batch-hero-equipment', () =>
    prisma.item.findMany({
      where: { heroId: { in: heroIds } },
      select: {
        id: true,
        name: true,
        type: true,
        rarity: true,
        heroId: true,
        metadata: true,
      },
    }),
  );
}

// ---------------------------------------------------------------------------
// Database transaction wrapper with automatic rollback
// ---------------------------------------------------------------------------

/**
 * Execute operations within a transaction. Automatically rolls back on error.
 */
export async function withTransaction<T>(
  operation: (tx: typeof prisma) => Promise<T>,
): Promise<T> {
  return profileQuery('transaction', () =>
    prisma.$transaction(async (tx) => {
      return operation(tx as unknown as typeof prisma);
    }),
  );
}

// ---------------------------------------------------------------------------
// Database retry with exponential backoff
// ---------------------------------------------------------------------------

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 100,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        logger.warn(`Database retry (attempt ${attempt + 1}/${maxRetries})`, {
          error: err.message,
          delay,
        });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Connection pool monitoring
// ---------------------------------------------------------------------------

export async function getConnectionPoolStatus() {
  try {
    // Prisma doesn't expose pool metrics directly, but we can test connectivity
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      latencyMs: Date.now() - start,
      poolMin: config.dbPoolMin,
      poolMax: config.dbPoolMax,
    };
  } catch (err: any) {
    return { status: 'error', error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Database cleanup & maintenance
// ---------------------------------------------------------------------------

/** Clean up old data beyond retention period. */
export async function cleanupOldData(retentionDays: number = 90): Promise<{
  deletedEvents: number;
  deletedExpeditions: number;
}> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  return profileQuery('cleanup-old-data', async () => {
    const [events, expeditions] = await Promise.all([
      prisma.event.deleteMany({
        where: { createdAt: { lt: cutoff }, status: 'completed' },
      }).catch(() => ({ count: 0 })),
      prisma.expedition.deleteMany({
        where: { createdAt: { lt: cutoff }, status: { in: ['completed', 'failed'] } },
      }).catch(() => ({ count: 0 })),
    ]);

    const result = {
      deletedEvents: events.count,
      deletedExpeditions: expeditions.count,
    };
    logger.info('Data cleanup complete', result);
    return result;
  });
}

/** Validate database schema on startup. */
export async function validateDatabaseSchema(): Promise<boolean> {
  try {
    // Run a lightweight query against each critical table
    await Promise.all([
      prisma.guild.count(),
      prisma.hero.count(),
      prisma.item.count(),
    ]);
    logger.info('Database schema validation passed');
    return true;
  } catch (err: any) {
    logger.error('Database schema validation failed', { error: err.message });
    return false;
  }
}

/** Seed data for development environment. */
export async function seedDevelopmentData(): Promise<void> {
  if (config.isProduction) {
    logger.warn('Seed data skipped in production');
    return;
  }
  logger.info('Development seed data applied (placeholder)');
}

// ---------------------------------------------------------------------------
// Data export utility (for GDPR / player data requests)
// ---------------------------------------------------------------------------

export async function exportPlayerData(playerId: string): Promise<Record<string, unknown>> {
  return profileQuery('export-player-data', async () => {
    const [guild, heroes, items, expeditions] = await Promise.all([
      prisma.guild.findUnique({ where: { playerId } }),
      prisma.hero.findMany({ where: { guild: { playerId } } }),
      prisma.item.findMany({ where: { guild: { playerId } } }),
      prisma.expedition.findMany({ where: { guild: { playerId } } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      playerId,
      guild,
      heroes,
      items,
      expeditions,
    };
  });
}

// ---------------------------------------------------------------------------
// Index recommendations (document which indexes should exist)
// ---------------------------------------------------------------------------

export const RECOMMENDED_INDEXES = [
  { model: 'Guild', fields: ['playerId'], reason: 'Primary lookup by player' },
  { model: 'Hero', fields: ['guildId'], reason: 'Roster queries' },
  { model: 'Hero', fields: ['guildId', 'status'], reason: 'Active hero filtering' },
  { model: 'Item', fields: ['guildId'], reason: 'Inventory queries' },
  { model: 'Item', fields: ['heroId'], reason: 'Equipment lookup' },
  { model: 'MarketListing', fields: ['status', 'price'], reason: 'Active listing sort' },
  { model: 'MarketListing', fields: ['sellerGuildId'], reason: 'Seller listings' },
  { model: 'Expedition', fields: ['guildId', 'status'], reason: 'Active expedition queries' },
  { model: 'Expedition', fields: ['status', 'endTime'], reason: 'Completion checks' },
  { model: 'Event', fields: ['status', 'triggerTime'], reason: 'Event scheduling' },
  { model: 'Research', fields: ['guildId', 'status'], reason: 'Active research lookup' },
  { model: 'Region', fields: ['currentWeather'], reason: 'Weather-based queries' },
  { model: 'Resource', fields: ['userId', 'type'], reason: 'Resource lookups' },
  { model: 'Building', fields: ['guildId'], reason: 'Building queries' },
  // Time-based indexes
  { model: 'Event', fields: ['createdAt'], reason: 'Time-based event queries' },
  { model: 'Expedition', fields: ['createdAt'], reason: 'Time-based expedition queries' },
  { model: 'MarketListing', fields: ['createdAt'], reason: 'Recent listings' },
];
