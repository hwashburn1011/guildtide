/**
 * ExternalDataCache — Caching layer for all external API calls.
 *
 * T-0764: Weather data caching with 30-minute TTL
 * T-0765: Cache invalidation and refresh mechanism
 * T-0785: Rate limiter (max 60 calls per minute)
 * T-0843: Retry logic with exponential backoff
 * T-0844: Circuit breaker for repeatedly failing APIs
 */

export interface CacheEntry<T = unknown> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
  source: string;
}

export interface RateLimitConfig {
  maxCalls: number;
  windowMs: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  openUntil: number;
}

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_OPEN_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export class ExternalDataCache {
  private cache = new Map<string, CacheEntry>();
  private rateLimitWindows = new Map<string, number[]>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private rateLimits = new Map<string, RateLimitConfig>();

  /** Configure rate limit for a source */
  setRateLimit(source: string, config: RateLimitConfig): void {
    this.rateLimits.set(source, config);
  }

  /** Get cached data if fresh */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) return null;
    return entry.data as T;
  }

  /** Get cached data even if stale (for fallback) */
  getStale<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry as CacheEntry<T>;
  }

  /** Store data in cache */
  set<T>(key: string, data: T, source: string, ttlMs: number = DEFAULT_TTL_MS): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      fetchedAt: now,
      expiresAt: now + ttlMs,
      source,
    });
  }

  /** Invalidate a cache entry */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /** Invalidate all entries from a specific source */
  invalidateSource(source: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.source === source) {
        this.cache.delete(key);
      }
    }
  }

  /** Check if rate limit allows a call */
  checkRateLimit(source: string): boolean {
    const config = this.rateLimits.get(source);
    if (!config) return true;

    const now = Date.now();
    const window = this.rateLimitWindows.get(source) || [];
    const filtered = window.filter((t) => now - t < config.windowMs);
    this.rateLimitWindows.set(source, filtered);

    return filtered.length < config.maxCalls;
  }

  /** Record a rate-limited call */
  recordCall(source: string): void {
    const window = this.rateLimitWindows.get(source) || [];
    window.push(Date.now());
    this.rateLimitWindows.set(source, window);
  }

  /** Check circuit breaker state */
  isCircuitOpen(source: string): boolean {
    const cb = this.circuitBreakers.get(source);
    if (!cb) return false;
    if (cb.state === 'open' && Date.now() < cb.openUntil) return true;
    if (cb.state === 'open' && Date.now() >= cb.openUntil) {
      cb.state = 'half-open';
      return false;
    }
    return false;
  }

  /** Record success — reset circuit breaker */
  recordSuccess(source: string): void {
    this.circuitBreakers.set(source, {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      openUntil: 0,
    });
  }

  /** Record failure — potentially open circuit */
  recordFailure(source: string): void {
    const cb = this.circuitBreakers.get(source) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const,
      openUntil: 0,
    };

    cb.failures++;
    cb.lastFailure = Date.now();

    if (cb.failures >= CIRCUIT_FAILURE_THRESHOLD) {
      cb.state = 'open';
      cb.openUntil = Date.now() + CIRCUIT_OPEN_DURATION_MS;
    }

    this.circuitBreakers.set(source, cb);
  }

  /** Fetch with retry, backoff, rate limiting, and circuit breaker */
  async fetchWithRetry<T>(
    source: string,
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL_MS,
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(cacheKey);
    if (cached !== null) return cached;

    // Check circuit breaker
    if (this.isCircuitOpen(source)) {
      const stale = this.getStale<T>(cacheKey);
      if (stale) return stale.data;
      throw new Error(`Circuit breaker open for ${source}`);
    }

    // Check rate limit
    if (!this.checkRateLimit(source)) {
      const stale = this.getStale<T>(cacheKey);
      if (stale) return stale.data;
      throw new Error(`Rate limit exceeded for ${source}`);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        this.recordCall(source);
        const data = await fetchFn();
        this.set(cacheKey, data, source, ttlMs);
        this.recordSuccess(source);
        return data;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < MAX_RETRIES - 1) {
          const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
    }

    this.recordFailure(source);

    // Fall back to stale cache
    const stale = this.getStale<T>(cacheKey);
    if (stale) return stale.data;

    throw lastError || new Error(`Failed to fetch from ${source}`);
  }

  /** Get freshness info for all cached sources */
  getFreshnessReport(): Array<{
    source: string;
    key: string;
    fetchedAt: number;
    expiresAt: number;
    isStale: boolean;
    ageSeconds: number;
  }> {
    const now = Date.now();
    const entries: Array<{
      source: string;
      key: string;
      fetchedAt: number;
      expiresAt: number;
      isStale: boolean;
      ageSeconds: number;
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        source: entry.source,
        key,
        fetchedAt: entry.fetchedAt,
        expiresAt: entry.expiresAt,
        isStale: now > entry.expiresAt,
        ageSeconds: Math.floor((now - entry.fetchedAt) / 1000),
      });
    }

    return entries;
  }

  /** Get circuit breaker states */
  getCircuitBreakerStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /** Get API usage stats per source */
  getUsageStats(): Array<{
    source: string;
    callsInWindow: number;
    limit: number;
    windowMs: number;
  }> {
    const now = Date.now();
    const stats: Array<{
      source: string;
      callsInWindow: number;
      limit: number;
      windowMs: number;
    }> = [];

    for (const [source, config] of this.rateLimits.entries()) {
      const window = this.rateLimitWindows.get(source) || [];
      const recent = window.filter((t) => now - t < config.windowMs);
      stats.push({
        source,
        callsInWindow: recent.length,
        limit: config.maxCalls,
        windowMs: config.windowMs,
      });
    }

    return stats;
  }

  /** Clear all cached data */
  clear(): void {
    this.cache.clear();
  }
}

/** Singleton instance used across all services */
export const dataCache = new ExternalDataCache();

// Configure rate limits
dataCache.setRateLimit('openweathermap', { maxCalls: 60, windowMs: 60 * 1000 });
dataCache.setRateLimit('fear-greed', { maxCalls: 10, windowMs: 60 * 1000 });
dataCache.setRateLimit('stock-index', { maxCalls: 5, windowMs: 60 * 1000 });
dataCache.setRateLimit('crypto-sentiment', { maxCalls: 20, windowMs: 60 * 1000 });
dataCache.setRateLimit('news-headlines', { maxCalls: 10, windowMs: 60 * 1000 });
dataCache.setRateLimit('sports-results', { maxCalls: 10, windowMs: 60 * 1000 });
