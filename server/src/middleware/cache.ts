// ---------------------------------------------------------------------------
// Response caching layer — in-memory with TTL per resource type
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

interface CacheEntry {
  body: unknown;
  statusCode: number;
  headers: Record<string, string>;
  expiresAt: number;
}

class ResponseCache {
  private store: Map<string, CacheEntry> = new Map();
  private maxEntries: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), 60_000);
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry;
  }

  set(key: string, entry: CacheEntry): void {
    // Evict oldest entries if at capacity
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, entry);
  }

  /** Invalidate a specific key. */
  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  /** Invalidate all keys matching a prefix (e.g. "/api/v1/heroes"). */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Invalidate everything. */
  flush(): void {
    this.store.clear();
    logger.info('Cache flushed');
  }

  /** Get cache statistics. */
  getStats() {
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? Math.round((this.hits / (this.hits + this.misses)) * 100)
        : 0,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

export const responseCache = new ResponseCache(config.cacheMaxEntries);

// ---------------------------------------------------------------------------
// Per-resource TTL configuration
// ---------------------------------------------------------------------------

const CACHE_TTLS: Record<string, number> = {
  '/api/v1/world': 120,        // 2 minutes — world state
  '/api/v1/market': 60,        // 1 minute — market listings
  '/api/v1/leaderboards': 300, // 5 minutes — leaderboards
  '/api/v1/regions': 600,      // 10 minutes — regions are mostly static
  '/api/v1/events': 30,        // 30 seconds — events change frequently
};

function getTtl(path: string): number {
  for (const [prefix, ttl] of Object.entries(CACHE_TTLS)) {
    if (path.startsWith(prefix)) return ttl;
  }
  return config.cacheTtlSeconds;
}

// ---------------------------------------------------------------------------
// Cache middleware factory
// ---------------------------------------------------------------------------

/**
 * Cache GET responses. Only applies to GET requests with 2xx status codes.
 * @param ttlSeconds - Override TTL for this route (otherwise uses per-resource config)
 */
export function cacheMiddleware(ttlSeconds?: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      next();
      return;
    }

    // Build cache key from URL + user (so caches are per-user)
    const userKey = req.playerId ?? 'anon';
    const cacheKey = `${userKey}:${req.originalUrl}`;

    // Check cache
    const cached = responseCache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      for (const [h, v] of Object.entries(cached.headers)) {
        res.setHeader(h, v);
      }
      res.status(cached.statusCode).json(cached.body);
      return;
    }

    // Intercept res.json to capture the response for caching
    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const ttl = ttlSeconds ?? getTtl(req.path);
        responseCache.set(cacheKey, {
          body,
          statusCode: res.statusCode,
          headers: { 'Content-Type': 'application/json' },
          expiresAt: Date.now() + ttl * 1000,
        });
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalidation middleware — call after mutations to clear related caches.
 * @param prefixes - URL prefixes to invalidate
 */
export function invalidateCache(...prefixes: string[]) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    for (const prefix of prefixes) {
      const count = responseCache.invalidateByPrefix(prefix);
      if (count > 0) {
        logger.debug('Cache invalidated', { prefix, count });
      }
    }
    next();
  };
}
