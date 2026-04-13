// ---------------------------------------------------------------------------
// Health check service — server status + dependency checks
// ---------------------------------------------------------------------------

import { prisma } from '../db';
import { scheduler, workerQueue } from '../jobs/scheduler';
import { getPerformanceMetrics } from '../middleware/requestLogger';
import { errorTracker } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  dependencies: {
    database: { status: string; latencyMs?: number; error?: string };
  };
  jobs: Record<string, any>;
  workers: Record<string, any>;
  metrics: Record<string, any>;
  recentErrors: number;
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
}

const SERVER_START_TIME = Date.now();

export class HealthService {
  /** Full health status including dependency checks. */
  static async getHealth(): Promise<HealthStatus> {
    const dbCheck = await this.checkDatabase();
    const mem = process.memoryUsage();

    const overallStatus = dbCheck.status === 'ok' ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
      version: '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      dependencies: {
        database: dbCheck,
      },
      jobs: scheduler.getStatus(),
      workers: workerQueue.getStatus(),
      metrics: getPerformanceMetrics(),
      recentErrors: errorTracker.getRecent(100).length,
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1048576),
        heapTotalMB: Math.round(mem.heapTotal / 1048576),
        rssMB: Math.round(mem.rss / 1048576),
      },
    };
  }

  /** Simple readiness probe — can the server handle requests? */
  static async isReady(): Promise<{ ready: boolean; checks: Record<string, boolean> }> {
    const dbOk = await this.isDatabaseReady();
    return {
      ready: dbOk,
      checks: { database: dbOk },
    };
  }

  /** Liveness probe — is the process alive? */
  static isAlive(): { alive: boolean; uptime: number } {
    return {
      alive: true,
      uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
    };
  }

  private static async checkDatabase(): Promise<{
    status: string;
    latencyMs?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err: any) {
      logger.error('Database health check failed', { error: err.message });
      return { status: 'error', error: err.message, latencyMs: Date.now() - start };
    }
  }

  private static async isDatabaseReady(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
