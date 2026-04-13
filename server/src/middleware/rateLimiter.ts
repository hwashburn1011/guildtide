// ---------------------------------------------------------------------------
// Rate limiting middleware — per-user and per-IP with tier support
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

type RateLimitTier = 'standard' | 'premium' | 'internal';

const TIER_MULTIPLIERS: Record<RateLimitTier, number> = {
  standard: 1,
  premium: 3,
  internal: 100, // effectively unlimited for internal calls
};

class RateLimitStore {
  private entries: Map<string, RateLimitEntry> = new Map();

  /** Clean expired entries periodically. */
  constructor() {
    setInterval(() => this.cleanup(), 60_000);
  }

  check(key: string, maxRequests: number, windowMs: number): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    let entry = this.entries.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      this.entries.set(key, entry);
    }

    entry.count++;

    return {
      allowed: entry.count <= maxRequests,
      remaining: Math.max(0, maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now >= entry.resetAt) {
        this.entries.delete(key);
      }
    }
  }
}

const store = new RateLimitStore();

/** Determine rate limit tier from request (extensible). */
function getTier(req: Request): RateLimitTier {
  // Internal service calls use API key header
  if (req.headers['x-internal-api-key']) {
    return 'internal';
  }
  // Could check user's subscription tier from DB in the future
  return 'standard';
}

/** Get rate limit key — prefer playerId (authenticated) or IP. */
function getKey(req: Request, category: string): string {
  const identity = req.playerId ?? req.ip ?? 'unknown';
  return `${category}:${identity}`;
}

/**
 * Rate limiting middleware factory.
 * @param category - Endpoint category for separate limits (e.g. 'api', 'auth')
 * @param maxRequests - Max requests per window (before tier multiplier)
 * @param windowMs - Time window in ms
 */
export function rateLimiter(
  category: string = 'api',
  maxRequests?: number,
  windowMs?: number,
) {
  const baseMax = maxRequests ?? config.rateLimitMaxRequests;
  const window = windowMs ?? config.rateLimitWindowMs;

  return (req: Request, res: Response, next: NextFunction): void => {
    const tier = getTier(req);
    const effectiveMax = Math.floor(baseMax * TIER_MULTIPLIERS[tier]);
    const key = getKey(req, category);
    const result = store.check(key, effectiveMax, window);

    // Always set rate limit headers
    res.setHeader('X-RateLimit-Limit', effectiveMax);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        key,
        tier,
        category,
        limit: effectiveMax,
      });
      res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      });
      return;
    }

    next();
  };
}

/** Stricter rate limiter for auth endpoints (IP-based). */
export function authRateLimiter() {
  return rateLimiter('auth', config.rateLimitAuthMaxRequests, 60_000);
}
