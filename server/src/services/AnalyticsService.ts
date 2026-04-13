// ============================================================================
// Epic 30: Analytics & Monetization — Server-side (T-2041 – T-2090)
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyticsEvent {
  name: string;
  category: string;
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
}

interface SessionMeta {
  sessionId: string;
  duration: number;
  segment: string;
}

interface EventBatch {
  playerId: string;
  events: AnalyticsEvent[];
  session: SessionMeta;
  receivedAt: number;
}

interface FunnelStep {
  step: string;
  count: number;
  dropoff: number;
}

interface MetricsSummary {
  dau: number;
  wau: number;
  mau: number;
  avgSessionDuration: number;
  totalEvents: number;
  topFeatures: Array<{ feature: string; count: number }>;
  funnels: Record<string, FunnelStep[]>;
  errorRate: number;
  revenueMetrics: RevenueMetrics;
}

interface RevenueMetrics {
  totalRevenue: number;
  arpu: number;
  ltv: number;
  purchaseCount: number;
  refundCount: number;
}

interface ABTestResults {
  testId: string;
  variants: Array<{
    name: string;
    participants: number;
    conversions: number;
    conversionRate: number;
  }>;
  significant: boolean;
  winner: string | null;
}

interface FeedbackEntry {
  playerId: string;
  category: string;
  message: string;
  rating?: number;
  timestamp: number;
}

interface NPSResult {
  score: number;
  respondents: number;
  promoters: number;
  passives: number;
  detractors: number;
}

// ---------------------------------------------------------------------------
// In-memory analytics store
// (In production, this would be backed by a time-series DB or data warehouse)
// ---------------------------------------------------------------------------

class AnalyticsStore {
  private batches: EventBatch[] = [];
  private feedback: FeedbackEntry[] = [];
  private activePlayers: Map<string, number> = new Map(); // playerId -> lastSeenTimestamp

  ingest(batch: EventBatch): void {
    this.batches.push(batch);
    this.activePlayers.set(batch.playerId, batch.receivedAt);
  }

  addFeedback(entry: FeedbackEntry): void {
    this.feedback.push(entry);
  }

  getAllEvents(): AnalyticsEvent[] {
    return this.batches.flatMap((b) => b.events);
  }

  getEventsInRange(startMs: number, endMs: number): AnalyticsEvent[] {
    return this.getAllEvents().filter((e) => e.timestamp >= startMs && e.timestamp <= endMs);
  }

  getActivePlayerCount(windowMs: number): number {
    const cutoff = Date.now() - windowMs;
    let count = 0;
    this.activePlayers.forEach((ts) => { if (ts >= cutoff) count++; });
    return count;
  }

  getBatches(): EventBatch[] {
    return this.batches;
  }

  getFeedback(): FeedbackEntry[] {
    return this.feedback;
  }

  /** Prune old data to prevent unbounded memory growth. */
  prune(maxAgeMs: number): void {
    const cutoff = Date.now() - maxAgeMs;
    this.batches = this.batches.filter((b) => b.receivedAt >= cutoff);
    this.feedback = this.feedback.filter((f) => f.timestamp >= cutoff);
    for (const [id, ts] of this.activePlayers) {
      if (ts < cutoff) this.activePlayers.delete(id);
    }
  }
}

// ---------------------------------------------------------------------------
// Analytics Service
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

export class AnalyticsService {
  private static store = new AnalyticsStore();

  // -----------------------------------------------------------------------
  // Event ingestion
  // -----------------------------------------------------------------------

  /** T-2041: Ingest a batch of events from the client. */
  static ingestEvents(playerId: string, events: AnalyticsEvent[], session: SessionMeta): void {
    AnalyticsService.store.ingest({
      playerId,
      events,
      session,
      receivedAt: Date.now(),
    });
  }

  // -----------------------------------------------------------------------
  // T-2063: Feedback collection
  // -----------------------------------------------------------------------

  static submitFeedback(playerId: string, category: string, message: string, rating?: number): void {
    AnalyticsService.store.addFeedback({
      playerId,
      category,
      message,
      rating,
      timestamp: Date.now(),
    });
  }

  static getFeedback(limit = 50): FeedbackEntry[] {
    return AnalyticsService.store.getFeedback().slice(-limit);
  }

  // -----------------------------------------------------------------------
  // T-2050–T-2052: DAU/WAU/MAU
  // -----------------------------------------------------------------------

  static getDAU(): number {
    return AnalyticsService.store.getActivePlayerCount(DAY_MS);
  }

  static getWAU(): number {
    return AnalyticsService.store.getActivePlayerCount(WEEK_MS);
  }

  static getMAU(): number {
    return AnalyticsService.store.getActivePlayerCount(MONTH_MS);
  }

  // -----------------------------------------------------------------------
  // T-2044: Average session duration
  // -----------------------------------------------------------------------

  static getAvgSessionDuration(): number {
    const batches = AnalyticsService.store.getBatches();
    if (batches.length === 0) return 0;
    const total = batches.reduce((sum, b) => sum + b.session.duration, 0);
    return Math.round(total / batches.length);
  }

  // -----------------------------------------------------------------------
  // T-2045: Top features
  // -----------------------------------------------------------------------

  static getTopFeatures(limit = 10): Array<{ feature: string; count: number }> {
    const counts = new Map<string, number>();
    for (const event of AnalyticsService.store.getAllEvents()) {
      if (event.category === 'feature' && event.properties?.feature) {
        const f = String(event.properties.feature);
        counts.set(f, (counts.get(f) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // -----------------------------------------------------------------------
  // T-2046–T-2049: Funnel analysis
  // -----------------------------------------------------------------------

  static getFunnelAnalysis(funnelId: string): FunnelStep[] {
    const stepCounts = new Map<number, Map<string, number>>();

    for (const event of AnalyticsService.store.getAllEvents()) {
      if (event.name === 'funnel_step' && event.properties?.funnelId === funnelId) {
        const idx = Number(event.properties.stepIndex);
        const step = String(event.properties.step);
        if (!stepCounts.has(idx)) stepCounts.set(idx, new Map());
        const m = stepCounts.get(idx)!;
        m.set(step, (m.get(step) ?? 0) + 1);
      }
    }

    const steps: FunnelStep[] = [];
    const sortedIndices = [...stepCounts.keys()].sort((a, b) => a - b);
    let prevCount = 0;

    for (const idx of sortedIndices) {
      const m = stepCounts.get(idx)!;
      for (const [step, count] of m) {
        const dropoff = prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0;
        steps.push({ step, count, dropoff });
        prevCount = count;
      }
    }

    return steps;
  }

  // -----------------------------------------------------------------------
  // T-2053: Retention cohort analysis
  // -----------------------------------------------------------------------

  static getRetentionData(): { day1: number; day7: number; day30: number } {
    let d1 = 0, d7 = 0, d30 = 0, total = 0;

    for (const event of AnalyticsService.store.getAllEvents()) {
      if (event.name === 'daily_active' && event.properties) {
        total++;
        if (event.properties.day1Return) d1++;
        if (event.properties.day7Return) d7++;
        if (event.properties.day30Return) d30++;
      }
    }

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return { day1: pct(d1), day7: pct(d7), day30: pct(d30) };
  }

  // -----------------------------------------------------------------------
  // T-2055: User segmentation
  // -----------------------------------------------------------------------

  static getSegmentDistribution(): Record<string, number> {
    const segments: Record<string, number> = { casual: 0, regular: 0, hardcore: 0 };
    const seen = new Set<string>();

    for (const batch of AnalyticsService.store.getBatches()) {
      if (!seen.has(batch.playerId)) {
        seen.add(batch.playerId);
        const seg = batch.session.segment;
        if (seg in segments) segments[seg]++;
      }
    }

    return segments;
  }

  // -----------------------------------------------------------------------
  // T-2056: Churn prediction (simplified rule-based model)
  // -----------------------------------------------------------------------

  static getChurnRisk(playerId: string): 'low' | 'medium' | 'high' {
    const batches = AnalyticsService.store.getBatches().filter((b) => b.playerId === playerId);
    if (batches.length === 0) return 'high';

    const latest = Math.max(...batches.map((b) => b.receivedAt));
    const daysSinceLastSeen = (Date.now() - latest) / DAY_MS;

    if (daysSinceLastSeen > 14) return 'high';
    if (daysSinceLastSeen > 5) return 'medium';
    return 'low';
  }

  // -----------------------------------------------------------------------
  // T-2057–T-2059: A/B test results
  // -----------------------------------------------------------------------

  static getABTestResults(testId: string): ABTestResults {
    const variantData = new Map<string, { participants: number; conversions: number }>();

    for (const event of AnalyticsService.store.getAllEvents()) {
      if (event.properties?.testId === testId) {
        const variant = String(event.properties.variant);
        if (!variantData.has(variant)) {
          variantData.set(variant, { participants: 0, conversions: 0 });
        }
        const data = variantData.get(variant)!;

        if (event.name === 'ab_test_assigned') data.participants++;
        if (event.name === 'ab_test_conversion') data.conversions++;
      }
    }

    const variants = [...variantData.entries()].map(([name, data]) => ({
      name,
      participants: data.participants,
      conversions: data.conversions,
      conversionRate: data.participants > 0 ? data.conversions / data.participants : 0,
    }));

    // Simple significance check: require 30+ participants per variant
    const significant = variants.every((v) => v.participants >= 30);
    const winner = significant
      ? variants.reduce((best, v) => v.conversionRate > best.conversionRate ? v : best, variants[0])?.name ?? null
      : null;

    return { testId, variants, significant, winner };
  }

  // -----------------------------------------------------------------------
  // T-2061: Error rate
  // -----------------------------------------------------------------------

  static getErrorRate(): number {
    const all = AnalyticsService.store.getAllEvents();
    if (all.length === 0) return 0;
    const errors = all.filter((e) => e.category === 'error').length;
    return errors / all.length;
  }

  // -----------------------------------------------------------------------
  // T-2064: NPS calculation
  // -----------------------------------------------------------------------

  static getNPSResult(): NPSResult {
    const scores: number[] = [];

    for (const event of AnalyticsService.store.getAllEvents()) {
      if (event.name === 'nps_response' && typeof event.properties?.score === 'number') {
        scores.push(event.properties.score);
      }
    }

    const respondents = scores.length;
    const promoters = scores.filter((s) => s >= 9).length;
    const passives = scores.filter((s) => s >= 7 && s <= 8).length;
    const detractors = scores.filter((s) => s <= 6).length;
    const score = respondents > 0
      ? Math.round(((promoters - detractors) / respondents) * 100)
      : 0;

    return { score, respondents, promoters, passives, detractors };
  }

  // -----------------------------------------------------------------------
  // T-2085–T-2087: Revenue metrics
  // -----------------------------------------------------------------------

  static getRevenueMetrics(): RevenueMetrics {
    let totalRevenue = 0;
    let purchaseCount = 0;
    let refundCount = 0;
    const purchasers = new Set<string>();

    for (const batch of AnalyticsService.store.getBatches()) {
      for (const event of batch.events) {
        if (event.name === 'purchase' && typeof event.properties?.price === 'number') {
          totalRevenue += event.properties.price;
          purchaseCount++;
          purchasers.add(batch.playerId);
        }
        if (event.name === 'refund') refundCount++;
      }
    }

    const uniquePlayers = new Set(AnalyticsService.store.getBatches().map((b) => b.playerId)).size;
    const arpu = uniquePlayers > 0 ? totalRevenue / uniquePlayers : 0;
    const ltv = purchasers.size > 0 ? totalRevenue / purchasers.size : 0;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      arpu: Math.round(arpu * 100) / 100,
      ltv: Math.round(ltv * 100) / 100,
      purchaseCount,
      refundCount,
    };
  }

  // -----------------------------------------------------------------------
  // T-2054: Full dashboard metrics summary
  // -----------------------------------------------------------------------

  static getDashboardMetrics(): MetricsSummary {
    return {
      dau: AnalyticsService.getDAU(),
      wau: AnalyticsService.getWAU(),
      mau: AnalyticsService.getMAU(),
      avgSessionDuration: AnalyticsService.getAvgSessionDuration(),
      totalEvents: AnalyticsService.store.getAllEvents().length,
      topFeatures: AnalyticsService.getTopFeatures(),
      funnels: {
        onboarding: AnalyticsService.getFunnelAnalysis('onboarding'),
        expedition: AnalyticsService.getFunnelAnalysis('expedition'),
        market: AnalyticsService.getFunnelAnalysis('market'),
        hero_progression: AnalyticsService.getFunnelAnalysis('hero_progression'),
      },
      errorRate: AnalyticsService.getErrorRate(),
      revenueMetrics: AnalyticsService.getRevenueMetrics(),
    };
  }

  // -----------------------------------------------------------------------
  // T-2065: Data export
  // -----------------------------------------------------------------------

  static exportData(startMs?: number, endMs?: number): string {
    const events = startMs && endMs
      ? AnalyticsService.store.getEventsInRange(startMs, endMs)
      : AnalyticsService.store.getAllEvents();

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      eventCount: events.length,
      events,
    }, null, 2);
  }

  // -----------------------------------------------------------------------
  // Maintenance
  // -----------------------------------------------------------------------

  /** Prune data older than maxAge (default: 90 days). */
  static pruneOldData(maxAgeMs = 90 * DAY_MS): void {
    AnalyticsService.store.prune(maxAgeMs);
  }
}
