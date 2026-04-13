import { API_BASE_URL } from '../config';

// ============================================================================
// Epic 30: Analytics & Monetization — Client-side (T-2041 – T-2065)
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsEvent {
  name: string;
  category: EventCategory;
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
}

export type EventCategory =
  | 'navigation'   // T-2042: page views
  | 'interaction'  // T-2043: button clicks
  | 'session'      // T-2044: session tracking
  | 'feature'      // T-2045: feature usage
  | 'funnel'       // T-2046–T-2049: funnel events
  | 'engagement'   // T-2060: real-world data engagement
  | 'performance'  // T-2062: performance metrics
  | 'error'        // T-2061: error tracking
  | 'feedback'     // T-2063–T-2064: user feedback
  | 'monetization'; // T-2066–T-2090: shop/purchase events

export interface SessionData {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  pageViews: number;
  interactions: number;
}

/** T-2055: User activity segment */
export type ActivitySegment = 'casual' | 'regular' | 'hardcore';

/** T-2057: A/B test variant assignment */
export interface ABTestAssignment {
  testId: string;
  variant: string;
  assignedAt: number;
}

/** T-2053: Retention data */
export interface RetentionData {
  firstSeen: number;
  lastSeen: number;
  totalSessions: number;
  day1Return: boolean;
  day7Return: boolean;
  day30Return: boolean;
}

/** T-2064: NPS response */
export interface NPSResponse {
  score: number; // 0-10
  comment?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface AnalyticsConfig {
  enabled: boolean;              // T-2041: opt-in tracking
  batchSize: number;             // Flush after N events
  flushIntervalMs: number;       // Auto-flush interval
  sessionTimeoutMs: number;      // Session expires after inactivity
  endpoint: string;              // Server endpoint
  debug: boolean;
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: false,  // Privacy: opt-in by default
  batchSize: 20,
  flushIntervalMs: 30_000,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  endpoint: `${API_BASE_URL}/analytics`,
  debug: false,
};

const STORAGE_KEY_OPT_IN = 'guildtide_analytics_optin';
const STORAGE_KEY_SESSION = 'guildtide_analytics_session';
const STORAGE_KEY_RETENTION = 'guildtide_analytics_retention';
const STORAGE_KEY_AB = 'guildtide_ab_tests';

/**
 * Client-side analytics service.
 *
 * Privacy-first: disabled by default. Players must opt in (T-2041).
 * Events are batched and flushed periodically to the server.
 *
 * Singleton — obtain via AnalyticsService.getInstance().
 */
export class AnalyticsService {
  private static instance: AnalyticsService | null = null;

  private config: AnalyticsConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private session: SessionData;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private abTests: Map<string, ABTestAssignment> = new Map();

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.config.enabled = this.loadOptIn();
    this.session = this.initSession();
    this.loadABTests();

    if (this.config.enabled) {
      this.startFlushTimer();
    }

    // Track session start
    this.trackSessionStart();

    // Listen for page unload to flush remaining events
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flush();
      });
    }
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // -----------------------------------------------------------------------
  // Opt-in / opt-out (privacy-compliant)
  // -----------------------------------------------------------------------

  private loadOptIn(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY_OPT_IN) === 'true';
    } catch { return false; }
  }

  isOptedIn(): boolean {
    return this.config.enabled;
  }

  /** T-2041: Player must explicitly opt in. */
  optIn(): void {
    this.config.enabled = true;
    localStorage.setItem(STORAGE_KEY_OPT_IN, 'true');
    this.startFlushTimer();
    this.track('analytics_opted_in', 'session');
  }

  /** Player can opt out at any time. Clears all queued events. */
  optOut(): void {
    this.config.enabled = false;
    localStorage.setItem(STORAGE_KEY_OPT_IN, 'false');
    this.eventQueue = [];
    this.stopFlushTimer();
  }

  // -----------------------------------------------------------------------
  // Core event tracking
  // -----------------------------------------------------------------------

  /** Track a named event with optional properties. */
  track(name: string, category: EventCategory, properties?: Record<string, string | number | boolean>): void {
    if (!this.config.enabled) return;

    const event: AnalyticsEvent = {
      name,
      category,
      properties: {
        ...properties,
        sessionId: this.session.sessionId,
      },
      timestamp: Date.now(),
    };

    this.eventQueue.push(event);
    this.session.lastActivity = Date.now();

    if (this.config.debug) {
      console.log('[Analytics]', event.name, event.properties);
    }

    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  // -----------------------------------------------------------------------
  // T-2042: Page view tracking
  // -----------------------------------------------------------------------

  trackPageView(sceneName: string): void {
    this.session.pageViews++;
    this.track('page_view', 'navigation', { scene: sceneName });
  }

  // -----------------------------------------------------------------------
  // T-2043: Button / interaction tracking
  // -----------------------------------------------------------------------

  trackClick(buttonId: string, context?: string): void {
    this.session.interactions++;
    this.track('button_click', 'interaction', { buttonId, context: context ?? '' });
  }

  // -----------------------------------------------------------------------
  // T-2044: Session tracking
  // -----------------------------------------------------------------------

  private initSession(): SessionData {
    const stored = this.loadSession();
    if (stored && Date.now() - stored.lastActivity < (this.config.sessionTimeoutMs)) {
      return stored;
    }
    return {
      sessionId: this.generateId(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 0,
      interactions: 0,
    };
  }

  private loadSession(): SessionData | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private saveSession(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(this.session));
    } catch { /* ignore */ }
  }

  private trackSessionStart(): void {
    this.track('session_start', 'session');
    this.updateRetention();
  }

  getSessionDuration(): number {
    return Date.now() - this.session.startTime;
  }

  // -----------------------------------------------------------------------
  // T-2045: Feature usage tracking
  // -----------------------------------------------------------------------

  trackFeatureUsage(feature: string, action?: string): void {
    this.track('feature_usage', 'feature', { feature, action: action ?? 'use' });
  }

  // -----------------------------------------------------------------------
  // T-2046–T-2049: Funnel tracking
  // -----------------------------------------------------------------------

  /** Track a funnel step. funnelId groups related steps. */
  trackFunnelStep(funnelId: string, step: string, stepIndex: number): void {
    this.track('funnel_step', 'funnel', { funnelId, step, stepIndex });
  }

  // Predefined funnels
  trackRegistrationFunnel(step: 'register' | 'guild_setup' | 'first_building' | 'first_expedition'): void {
    const steps = ['register', 'guild_setup', 'first_building', 'first_expedition'];
    this.trackFunnelStep('onboarding', step, steps.indexOf(step));
  }

  trackExpeditionFunnel(step: 'launch' | 'complete' | 'loot_collect'): void {
    const steps = ['launch', 'complete', 'loot_collect'];
    this.trackFunnelStep('expedition', step, steps.indexOf(step));
  }

  trackMarketFunnel(step: 'visit' | 'browse' | 'purchase'): void {
    const steps = ['visit', 'browse', 'purchase'];
    this.trackFunnelStep('market', step, steps.indexOf(step));
  }

  trackHeroFunnel(step: 'recruit' | 'level_up' | 'skill_unlock'): void {
    const steps = ['recruit', 'level_up', 'skill_unlock'];
    this.trackFunnelStep('hero_progression', step, steps.indexOf(step));
  }

  // -----------------------------------------------------------------------
  // T-2050–T-2053: DAU/WAU/MAU & retention
  // -----------------------------------------------------------------------

  private updateRetention(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RETENTION);
      let data: RetentionData;

      if (raw) {
        data = JSON.parse(raw);
        data.lastSeen = Date.now();
        data.totalSessions++;

        const dayMs = 86_400_000;
        const elapsed = Date.now() - data.firstSeen;
        if (elapsed >= dayMs && elapsed < 2 * dayMs) data.day1Return = true;
        if (elapsed >= 7 * dayMs && elapsed < 8 * dayMs) data.day7Return = true;
        if (elapsed >= 30 * dayMs && elapsed < 31 * dayMs) data.day30Return = true;
      } else {
        data = {
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          totalSessions: 1,
          day1Return: false,
          day7Return: false,
          day30Return: false,
        };
      }

      localStorage.setItem(STORAGE_KEY_RETENTION, JSON.stringify(data));

      this.track('daily_active', 'session', {
        totalSessions: data.totalSessions,
        day1Return: data.day1Return,
        day7Return: data.day7Return,
        day30Return: data.day30Return,
      });
    } catch { /* ignore */ }
  }

  // -----------------------------------------------------------------------
  // T-2055: User segmentation
  // -----------------------------------------------------------------------

  getActivitySegment(): ActivitySegment {
    const duration = this.getSessionDuration();
    const interactions = this.session.interactions;

    if (interactions > 100 || duration > 3_600_000) return 'hardcore';
    if (interactions > 20 || duration > 600_000) return 'regular';
    return 'casual';
  }

  // -----------------------------------------------------------------------
  // T-2057–T-2059: A/B testing
  // -----------------------------------------------------------------------

  private loadABTests(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AB);
      if (raw) {
        const entries = JSON.parse(raw) as ABTestAssignment[];
        entries.forEach((e) => this.abTests.set(e.testId, e));
      }
    } catch { /* ignore */ }
  }

  private saveABTests(): void {
    localStorage.setItem(STORAGE_KEY_AB, JSON.stringify([...this.abTests.values()]));
  }

  /**
   * Get the variant for an A/B test. If not yet assigned, randomly pick one.
   * Returns the variant string (e.g., 'control', 'variant_a').
   */
  getABTestVariant(testId: string, variants: string[]): string {
    let assignment = this.abTests.get(testId);
    if (!assignment) {
      const variant = variants[Math.floor(Math.random() * variants.length)];
      assignment = { testId, variant, assignedAt: Date.now() };
      this.abTests.set(testId, assignment);
      this.saveABTests();
      this.track('ab_test_assigned', 'feature', { testId, variant });
    }
    return assignment.variant;
  }

  /** Track conversion for an A/B test. */
  trackABTestConversion(testId: string, conversionEvent: string): void {
    const assignment = this.abTests.get(testId);
    if (assignment) {
      this.track('ab_test_conversion', 'feature', {
        testId,
        variant: assignment.variant,
        conversionEvent,
      });
    }
  }

  // -----------------------------------------------------------------------
  // T-2060: Real-world data engagement
  // -----------------------------------------------------------------------

  trackRealWorldEngagement(dataType: string, action: string): void {
    this.track('realworld_engagement', 'engagement', { dataType, action });
  }

  // -----------------------------------------------------------------------
  // T-2061: Error tracking
  // -----------------------------------------------------------------------

  trackError(errorType: string, message: string, endpoint?: string): void {
    this.track('error_occurred', 'error', { errorType, message, endpoint: endpoint ?? '' });
  }

  // -----------------------------------------------------------------------
  // T-2062: Performance tracking
  // -----------------------------------------------------------------------

  trackPerformance(metric: string, valueMs: number, context?: string): void {
    this.track('performance_metric', 'performance', { metric, valueMs, context: context ?? '' });
  }

  /** Auto-track page load performance. */
  trackPageLoadPerformance(): void {
    if (typeof window === 'undefined' || !window.performance) return;
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      this.trackPerformance('page_load', nav.loadEventEnd - nav.startTime);
      this.trackPerformance('dom_interactive', nav.domInteractive - nav.startTime);
    }
  }

  // -----------------------------------------------------------------------
  // T-2063/T-2064: Feedback & NPS
  // -----------------------------------------------------------------------

  submitFeedback(category: string, message: string, rating?: number): void {
    this.track('feedback_submitted', 'feedback', { category, message, rating: rating ?? 0 });
    // Also send directly to server
    this.sendToServer([{
      name: 'feedback_submitted',
      category: 'feedback',
      properties: { category, message, rating: rating ?? 0 },
      timestamp: Date.now(),
    }]);
  }

  submitNPS(response: NPSResponse): void {
    this.track('nps_response', 'feedback', {
      score: response.score,
      comment: response.comment ?? '',
    });
  }

  // -----------------------------------------------------------------------
  // Monetization tracking (T-2066–T-2090)
  // -----------------------------------------------------------------------

  trackShopView(category?: string): void {
    this.track('shop_view', 'monetization', { category: category ?? 'all' });
  }

  trackItemPreview(itemId: string, category: string): void {
    this.track('item_preview', 'monetization', { itemId, category });
  }

  trackPurchase(itemId: string, price: number, currency: string): void {
    this.track('purchase', 'monetization', { itemId, price, currency });
  }

  trackGiftSent(itemId: string, recipientId: string): void {
    this.track('gift_sent', 'monetization', { itemId, recipientId });
  }

  trackSupporterTierChange(tier: string): void {
    this.track('supporter_tier_change', 'monetization', { tier });
  }

  // -----------------------------------------------------------------------
  // Event flushing
  // -----------------------------------------------------------------------

  private startFlushTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /** Flush queued events to the server. */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0);
    this.saveSession();
    await this.sendToServer(batch);
  }

  private async sendToServer(events: AnalyticsEvent[]): Promise<void> {
    if (!this.config.enabled || events.length === 0) return;

    try {
      const token = localStorage.getItem('guildtide_token');
      await fetch(this.config.endpoint + '/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          events,
          session: {
            sessionId: this.session.sessionId,
            duration: this.getSessionDuration(),
            segment: this.getActivitySegment(),
          },
        }),
        keepalive: true, // Allows sending during page unload
      });
    } catch {
      // Re-queue on failure for retry
      this.eventQueue.unshift(...events);
    }
  }

  // -----------------------------------------------------------------------
  // T-2065: Data export
  // -----------------------------------------------------------------------

  exportData(): string {
    return JSON.stringify({
      session: this.session,
      queuedEvents: this.eventQueue,
      abTests: [...this.abTests.values()],
    }, null, 2);
  }

  // -----------------------------------------------------------------------
  // Utilities
  // -----------------------------------------------------------------------

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  destroy(): void {
    this.flush();
    this.stopFlushTimer();
    AnalyticsService.instance = null;
  }
}
