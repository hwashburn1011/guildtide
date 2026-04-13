// ---------------------------------------------------------------------------
// Database optimization helpers — query profiling, connection management,
// migration support, cleanup, backup, and bulk operations
// ---------------------------------------------------------------------------

import { prisma, testConnection, enableWALMode } from '../db';
import { logger } from './logger';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

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
        role: true,
        level: true,
        stats: true,
        status: true,
        traits: true,
        assignment: true,
      },
    }),
  );
}

/** Optimized guild query with eager loading of related entities. */
export async function getGuildWithRelationsOptimized(playerId: string) {
  return profileQuery('guild-full', () =>
    prisma.guild.findUnique({
      where: { playerId },
      include: {
        heroes: {
          select: {
            id: true,
            name: true,
            role: true,
            level: true,
            status: true,
            assignment: true,
          },
        },
        buildings: true,
        inventory: {
          select: {
            id: true,
            templateId: true,
            quantity: true,
          },
        },
        expeditions: {
          where: { status: 'active' },
          select: {
            id: true,
            type: true,
            destination: true,
            status: true,
            startedAt: true,
            duration: true,
          },
        },
      },
    }),
  );
}

/** Optimized expedition list with status-based filtering. */
export async function getExpeditionsOptimized(guildId: string, status?: string) {
  const where: any = { guildId };
  if (status) where.status = status;

  return profileQuery('expedition-list', () =>
    prisma.expedition.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        destination: true,
        startedAt: true,
        duration: true,
        result: true,
      },
    }),
  );
}

/** Batch query to prevent N+1 — load items for multiple guilds. */
export async function batchLoadGuildItems(guildIds: string[]) {
  return profileQuery('batch-guild-items', () =>
    prisma.item.findMany({
      where: { guildId: { in: guildIds } },
      select: {
        id: true,
        templateId: true,
        quantity: true,
        guildId: true,
        metadata: true,
      },
    }),
  );
}

/** Resource aggregation query. */
export async function aggregateGuildResources(guildId: string) {
  return profileQuery('resource-aggregation', async () => {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { resources: true },
    });
    return guild ? JSON.parse(guild.resources) : {};
  });
}

// ---------------------------------------------------------------------------
// Database transaction wrapper with automatic rollback
// ---------------------------------------------------------------------------

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
// Bulk insert optimization
// ---------------------------------------------------------------------------

export async function bulkInsertItems(
  items: Array<{ guildId: string; templateId: string; quantity: number; metadata?: string }>,
): Promise<number> {
  return profileQuery('bulk-insert-items', async () => {
    const result = await prisma.item.createMany({ data: items });
    return result.count;
  });
}

// ---------------------------------------------------------------------------
// Connection pool monitoring
// ---------------------------------------------------------------------------

export async function getConnectionPoolStatus() {
  try {
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

/** Clean up old event logs beyond retention period. */
export async function cleanupOldData(retentionDays: number = 90): Promise<{
  deletedEventLogs: number;
  deletedExpeditions: number;
}> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  return profileQuery('cleanup-old-data', async () => {
    const [eventLogs, expeditions] = await Promise.all([
      prisma.eventLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      }).catch(() => ({ count: 0 })),
      prisma.expedition.deleteMany({
        where: { startedAt: { lt: cutoff }, status: { in: ['completed', 'failed'] } },
      }).catch(() => ({ count: 0 })),
    ]);

    const result = {
      deletedEventLogs: eventLogs.count,
      deletedExpeditions: expeditions.count,
    };
    logger.info('Data cleanup complete', result);
    return result;
  });
}

/** Database integrity check — verify foreign key consistency. */
export async function integrityCheck(): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  try {
    // SQLite PRAGMA integrity check
    const result: any[] = await prisma.$queryRaw`PRAGMA integrity_check`;
    const isOk = result.length === 1 && (result[0] as any).integrity_check === 'ok';
    if (!isOk) {
      errors.push('SQLite integrity check failed');
    }

    // Check for orphaned heroes (no guild)
    const orphanedHeroes = await prisma.$queryRaw`
      SELECT COUNT(*) as cnt FROM Hero WHERE guildId NOT IN (SELECT id FROM Guild)
    ` as any[];
    if (orphanedHeroes[0]?.cnt > 0) {
      errors.push(`Found ${orphanedHeroes[0].cnt} orphaned hero records`);
    }

    // Check for orphaned items
    const orphanedItems = await prisma.$queryRaw`
      SELECT COUNT(*) as cnt FROM Item WHERE guildId NOT IN (SELECT id FROM Guild)
    ` as any[];
    if (orphanedItems[0]?.cnt > 0) {
      errors.push(`Found ${orphanedItems[0].cnt} orphaned item records`);
    }

    return { ok: errors.length === 0, errors };
  } catch (err: any) {
    return { ok: false, errors: [err.message] };
  }
}

/** Validate database schema on startup. */
export async function validateDatabaseSchema(): Promise<boolean> {
  try {
    await Promise.all([
      prisma.guild.count(),
      prisma.hero.count(),
      prisma.item.count(),
      prisma.expedition.count(),
      prisma.eventLog.count(),
    ]);
    logger.info('Database schema validation passed');
    return true;
  } catch (err: any) {
    logger.error('Database schema validation failed', { error: err.message });
    return false;
  }
}

/** Initialize database optimizations on startup. */
export async function initializeDatabaseOptimizations(): Promise<void> {
  await enableWALMode();
  await validateDatabaseSchema();
  logger.info('Database optimizations initialized');
}

// ---------------------------------------------------------------------------
// Backup utilities
// ---------------------------------------------------------------------------

/** Create a database backup to the filesystem. */
export async function createBackup(backupDir: string = './backups'): Promise<string> {
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `guildtide-${timestamp}.db`);

  // For SQLite, we can use the backup PRAGMA
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${backupPath}'`);
    logger.info('Database backup created', { path: backupPath });

    // Verify backup integrity
    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }

    return backupPath;
  } catch (err: any) {
    // Fallback: copy the database file
    const dbUrl = config.databaseUrl;
    const dbPath = dbUrl.replace('file:', '').replace('./', 'server/prisma/');
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      logger.info('Database backup created (file copy)', { path: backupPath });
      return backupPath;
    }
    logger.error('Database backup failed', { error: err.message });
    throw err;
  }
}

/** Get database size information. */
export async function getDatabaseSize(): Promise<{
  fileSizeBytes: number;
  fileSizeMB: number;
  tables: Array<{ name: string; rowCount: number }>;
}> {
  const tables = await Promise.all([
    prisma.player.count().then((c) => ({ name: 'Player', rowCount: c })),
    prisma.guild.count().then((c) => ({ name: 'Guild', rowCount: c })),
    prisma.hero.count().then((c) => ({ name: 'Hero', rowCount: c })),
    prisma.building.count().then((c) => ({ name: 'Building', rowCount: c })),
    prisma.item.count().then((c) => ({ name: 'Item', rowCount: c })),
    prisma.expedition.count().then((c) => ({ name: 'Expedition', rowCount: c })),
    prisma.regionState.count().then((c) => ({ name: 'RegionState', rowCount: c })),
    prisma.eventLog.count().then((c) => ({ name: 'EventLog', rowCount: c })),
  ]);

  // Try to get file size
  let fileSizeBytes = 0;
  try {
    const dbPath = 'server/prisma/dev.db';
    if (fs.existsSync(dbPath)) {
      fileSizeBytes = fs.statSync(dbPath).size;
    }
  } catch {
    // Ignore — file may not be accessible
  }

  return {
    fileSizeBytes,
    fileSizeMB: Math.round(fileSizeBytes / 1048576 * 100) / 100,
    tables,
  };
}

// ---------------------------------------------------------------------------
// Data export utility (GDPR / player data requests)
// ---------------------------------------------------------------------------

export async function exportPlayerData(playerId: string): Promise<Record<string, unknown>> {
  return profileQuery('export-player-data', async () => {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    const guild = await prisma.guild.findUnique({
      where: { playerId },
      include: {
        heroes: true,
        buildings: true,
        inventory: true,
        expeditions: true,
      },
    });

    const eventLogs = await prisma.eventLog.findMany({
      where: { guildId: guild?.id },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return {
      exportedAt: new Date().toISOString(),
      player,
      guild,
      eventLogs,
    };
  });
}

// ---------------------------------------------------------------------------
// Seed data for development
// ---------------------------------------------------------------------------

export async function seedDevelopmentData(): Promise<void> {
  if (config.isProduction) {
    logger.warn('Seed data skipped in production');
    return;
  }
  // Placeholder — seeding is handled by existing game setup flows
  logger.info('Development seed data check completed');
}

// ---------------------------------------------------------------------------
// Index recommendations (documentation)
// ---------------------------------------------------------------------------

export const RECOMMENDED_INDEXES = [
  { model: 'Guild', fields: ['playerId'], reason: 'Primary lookup by player' },
  { model: 'Hero', fields: ['guildId'], reason: 'Roster queries' },
  { model: 'Hero', fields: ['guildId', 'status'], reason: 'Active hero filtering' },
  { model: 'Item', fields: ['guildId'], reason: 'Inventory queries' },
  { model: 'Item', fields: ['guildId', 'templateId'], reason: 'Inventory dedup' },
  { model: 'Expedition', fields: ['guildId', 'status'], reason: 'Active expedition queries' },
  { model: 'Expedition', fields: ['status', 'resolvedAt'], reason: 'Completion checks' },
  { model: 'EventLog', fields: ['guildId', 'type'], reason: 'Event type filtering' },
  { model: 'EventLog', fields: ['createdAt'], reason: 'Time-based log queries' },
  { model: 'RegionState', fields: ['regionId'], reason: 'Region lookups' },
  { model: 'Building', fields: ['guildId'], reason: 'Building queries' },
  { model: 'Player', fields: ['createdAt'], reason: 'Time-based player queries' },
];

// ---------------------------------------------------------------------------
// Database health dashboard data
// ---------------------------------------------------------------------------

export async function getDatabaseHealthDashboard() {
  const [poolStatus, dbSize, integrity, slowQueries] = await Promise.all([
    getConnectionPoolStatus(),
    getDatabaseSize(),
    integrityCheck(),
    Promise.resolve(getSlowQueryLog()),
  ]);

  return {
    connection: poolStatus,
    size: dbSize,
    integrity,
    slowQueries: slowQueries.slice(-20),
    recommendations: RECOMMENDED_INDEXES,
  };
}
