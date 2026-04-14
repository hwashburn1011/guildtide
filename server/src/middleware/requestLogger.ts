// ---------------------------------------------------------------------------
// Request logging middleware — structured logs with timing & correlation IDs
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}

/**
 * Assigns a correlation ID to every request and logs structured request/response data.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Assign correlation ID (from header or generate)
  req.correlationId = (req.headers['x-correlation-id'] as string) ?? randomUUID();
  req.startTime = Date.now();

  // Set correlation ID on response for tracing
  res.setHeader('X-Correlation-Id', req.correlationId);

  res.on('finish', () => {
    const duration = Date.now() - (req.startTime ?? Date.now());
    const logData = {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      playerId: req.playerId,
      contentLength: res.getHeader('content-length'),
    };

    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}

// ---------------------------------------------------------------------------
// Performance monitoring middleware — tracks response time statistics
// ---------------------------------------------------------------------------

interface EndpointStats {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  errors: number;
}

const endpointMetrics: Map<string, EndpointStats> = new Map();

export function performanceMonitor(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const key = `${req.method} ${req.route?.path ?? req.path}`;

    let stats = endpointMetrics.get(key);
    if (!stats) {
      stats = { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0, errors: 0 };
      endpointMetrics.set(key, stats);
    }

    stats.count++;
    stats.totalMs += duration;
    stats.minMs = Math.min(stats.minMs, duration);
    stats.maxMs = Math.max(stats.maxMs, duration);
    if (res.statusCode >= 500) stats.errors++;

    // Set server timing header (only if headers not yet sent)
    if (!res.headersSent) {
      res.setHeader('Server-Timing', `total;dur=${duration}`);
    }
  });

  next();
}

/** Get aggregated performance metrics for all endpoints. */
export function getPerformanceMetrics(): Record<string, {
  count: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  errors: number;
}> {
  const result: Record<string, any> = {};
  for (const [key, stats] of endpointMetrics) {
    result[key] = {
      count: stats.count,
      avgMs: stats.count > 0 ? Math.round(stats.totalMs / stats.count) : 0,
      minMs: stats.minMs === Infinity ? 0 : stats.minMs,
      maxMs: stats.maxMs,
      errors: stats.errors,
    };
  }
  return result;
}
