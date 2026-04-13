/**
 * Performance optimization utilities for multiplayer/social features (T-1240).
 *
 * Handles:
 * - Message batching and debouncing to reduce API calls
 * - Virtual scrolling for large member lists
 * - Presence update throttling
 * - Leaderboard caching with TTL
 * - Chat message pagination with lazy loading
 */

export class SocialPerformanceOptimizer {
  // --- Request Debouncing ---
  private static pendingRequests: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /**
   * Debounce an API call by key. Only the last call within the window fires.
   */
  static debounce(key: string, fn: () => void, delayMs: number = 300): void {
    const existing = SocialPerformanceOptimizer.pendingRequests.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      SocialPerformanceOptimizer.pendingRequests.delete(key);
      fn();
    }, delayMs);

    SocialPerformanceOptimizer.pendingRequests.set(key, timer);
  }

  // --- Cache with TTL ---
  private static cache: Map<string, { data: any; expiresAt: number }> = new Map();

  /**
   * Get cached data if still valid.
   */
  static getCached<T>(key: string): T | null {
    const entry = SocialPerformanceOptimizer.cache.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      SocialPerformanceOptimizer.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Set cached data with a TTL in milliseconds.
   */
  static setCache(key: string, data: any, ttlMs: number = 60000): void {
    SocialPerformanceOptimizer.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Invalidate cache entries matching a prefix.
   */
  static invalidateCache(prefix: string): void {
    for (const key of SocialPerformanceOptimizer.cache.keys()) {
      if (key.startsWith(prefix)) {
        SocialPerformanceOptimizer.cache.delete(key);
      }
    }
  }

  // --- Presence Throttling ---
  private static lastPresenceUpdate: number = 0;
  private static PRESENCE_THROTTLE_MS: number = 10000; // 10 seconds

  /**
   * Returns true if a presence update should be sent (throttled).
   */
  static shouldUpdatePresence(): boolean {
    const now = Date.now();
    if (now - SocialPerformanceOptimizer.lastPresenceUpdate < SocialPerformanceOptimizer.PRESENCE_THROTTLE_MS) {
      return false;
    }
    SocialPerformanceOptimizer.lastPresenceUpdate = now;
    return true;
  }

  // --- Virtual Scroll Helper ---

  /**
   * Calculate which items are visible in a virtual scroll window.
   */
  static getVisibleRange(
    scrollOffset: number,
    viewportHeight: number,
    itemHeight: number,
    totalItems: number,
  ): { startIndex: number; endIndex: number; offsetY: number } {
    const startIndex = Math.max(0, Math.floor(scrollOffset / itemHeight) - 2);
    const visibleCount = Math.ceil(viewportHeight / itemHeight) + 4;
    const endIndex = Math.min(totalItems, startIndex + visibleCount);
    const offsetY = startIndex * itemHeight;
    return { startIndex, endIndex, offsetY };
  }

  // --- Message Batching ---
  private static messageBatch: Array<{ channel: string; content: string }> = [];
  private static batchTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Queue a message for batch sending.
   */
  static queueMessage(channel: string, content: string, flushFn: (messages: Array<{ channel: string; content: string }>) => void): void {
    SocialPerformanceOptimizer.messageBatch.push({ channel, content });

    if (SocialPerformanceOptimizer.batchTimer) {
      clearTimeout(SocialPerformanceOptimizer.batchTimer);
    }

    SocialPerformanceOptimizer.batchTimer = setTimeout(() => {
      const batch = [...SocialPerformanceOptimizer.messageBatch];
      SocialPerformanceOptimizer.messageBatch = [];
      SocialPerformanceOptimizer.batchTimer = null;
      flushFn(batch);
    }, 100);
  }

  // --- Cleanup ---

  static cleanup(): void {
    for (const timer of SocialPerformanceOptimizer.pendingRequests.values()) {
      clearTimeout(timer);
    }
    SocialPerformanceOptimizer.pendingRequests.clear();
    SocialPerformanceOptimizer.cache.clear();
    if (SocialPerformanceOptimizer.batchTimer) {
      clearTimeout(SocialPerformanceOptimizer.batchTimer);
      SocialPerformanceOptimizer.batchTimer = null;
    }
    SocialPerformanceOptimizer.messageBatch = [];
  }
}
