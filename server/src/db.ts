// ---------------------------------------------------------------------------
// Database client with connection pooling, logging, and query timeout
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client';
import { config } from './config';

export const prisma = new PrismaClient({
  log: config.isProduction
    ? ['error']
    : ['query', 'info', 'warn', 'error'],
  datasourceUrl: config.databaseUrl,
});

// ---------------------------------------------------------------------------
// Prisma middleware for query timeout protection
// ---------------------------------------------------------------------------

prisma.$use(async (params, next) => {
  const start = Date.now();
  const timeoutMs = config.dbQueryTimeout;

  const result = await Promise.race([
    next(params),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Query timeout after ${timeoutMs}ms: ${params.model}.${params.action}`)),
        timeoutMs,
      ),
    ),
  ]);

  const duration = Date.now() - start;
  if (duration > 500) {
    console.warn(`[DB] Slow query: ${params.model}.${params.action} took ${duration}ms`);
  }

  return result;
});

// ---------------------------------------------------------------------------
// Soft delete helper — mark records as deleted instead of removing
// ---------------------------------------------------------------------------

export async function softDelete(
  model: string,
  id: string,
): Promise<void> {
  // Generic soft-delete: sets a deletedAt field if the model supports it.
  // Falls back to actual delete if no deletedAt field exists.
  try {
    await (prisma as any)[model].update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch {
    // Model may not have deletedAt — fall back to real delete
    await (prisma as any)[model].delete({ where: { id } });
  }
}

// ---------------------------------------------------------------------------
// Connection health check
// ---------------------------------------------------------------------------

export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// WAL mode for SQLite performance (Epic 22 - T-1634)
// ---------------------------------------------------------------------------

export async function enableWALMode(): Promise<void> {
  try {
    await prisma.$executeRaw`PRAGMA journal_mode=WAL`;
    await prisma.$executeRaw`PRAGMA synchronous=NORMAL`;
    await prisma.$executeRaw`PRAGMA cache_size=-64000`; // 64MB cache
    await prisma.$executeRaw`PRAGMA temp_store=MEMORY`;
  } catch (err: any) {
    console.warn('[DB] WAL mode setup skipped:', err.message);
  }
}
