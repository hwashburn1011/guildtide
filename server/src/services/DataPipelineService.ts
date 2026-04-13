/**
 * DataPipelineService — Central orchestrator for all external data sources.
 *
 * T-0791: Fear & Greed Index API integration
 * T-0792: Fear & Greed data fetch with daily caching
 * T-0795: Stock index API integration (S&P 500)
 * T-0796: Stock index data fetch with daily caching
 * T-0799: Crypto market sentiment API integration
 * T-0800: Crypto sentiment data fetch with hourly caching
 * T-0803: News headline API integration
 * T-0804: News data fetch with 2-hour caching
 * T-0805: News sentiment analysis (positive/negative/neutral classification)
 * T-0808: Sports results API integration
 * T-0809: Sports data fetch with event-based caching
 * T-0816: Data pipeline orchestrator managing all API fetches
 * T-0817: Data pipeline scheduling with staggered fetch intervals
 * T-0818: Data pipeline health dashboard
 * T-0819: Data pipeline error logging and alerting
 * T-0820: Data pipeline fallback chain
 * T-0825: Global celebration detection
 * T-0826: Celebration event generation
 * T-0828: API usage tracking and budget monitoring
 * T-0829: API key rotation
 * T-0831: Historical data archive
 * T-0834: Data source reliability scoring
 * T-0842: Data feed aggregation endpoint
 * T-0850: Unit test interfaces for fetch/cache/fallback
 * T-0851: Mock mode for dev/testing
 * T-0854: Batch processing for low-priority sources
 */
import { dataCache } from './ExternalDataCache';
import {
  fearGreedToModifier,
  stockIndexToModifier,
  cryptoSentimentToModifier,
  newsSentimentToModifier,
  calculateMoonPhase,
  getMoonPhaseEffect,
  getAstronomicalEvents,
  scoreEventSignificance,
  type NewsSentiment,
  type MoonPhase,
  type AstronomicalEvent,
  SPORTS_TOURNAMENT_MAP,
} from '../data/realWorldMappings';

// ---- Data Source Types ----

export interface DataSourceStatus {
  source: string;
  enabled: boolean;
  lastFetch: number | null;
  lastSuccess: number | null;
  lastError: string | null;
  reliability: number; // 0-1
  callCount: number;
  errorCount: number;
}

export interface FearGreedData {
  value: number;
  classification: string;
  timestamp: string;
}

export interface StockIndexData {
  index: string;
  value: number;
  change: number;
  changePct: number;
  timestamp: string;
}

export interface CryptoSentimentData {
  sentiment: number; // -100 to 100
  btcPrice: number;
  volume24h: number;
  timestamp: string;
}

export interface NewsHeadline {
  title: string;
  source: string;
  sentiment: NewsSentiment;
  magnitude: number;
  publishedAt: string;
}

export interface SportsEvent {
  league: string;
  event: string;
  homeTeam: string;
  awayTeam: string;
  isFinal: boolean;
  timestamp: string;
}

export interface CelebrationEvent {
  name: string;
  fantasyName: string;
  description: string;
  significance: number;
  detectedAt: string;
}

export interface DataPipelineSnapshot {
  weather: { condition: string; temperature: number } | null;
  fearGreed: FearGreedData | null;
  stockIndex: StockIndexData | null;
  cryptoSentiment: CryptoSentimentData | null;
  newsHeadlines: NewsHeadline[];
  sportsEvents: SportsEvent[];
  moonPhase: { phase: MoonPhase; label: string; icon: string };
  astronomicalEvents: AstronomicalEvent[];
  celebrations: CelebrationEvent[];
  modifierSummary: Record<string, number>;
  sources: DataSourceStatus[];
  timestamp: string;
}

// ---- Error Log ----

interface ErrorLogEntry {
  source: string;
  error: string;
  timestamp: number;
}

// ---- Historical Archive ----

interface ArchiveEntry {
  date: string;
  snapshot: Partial<DataPipelineSnapshot>;
}

// ---- Pipeline Configuration ----

interface DataSourceConfig {
  enabled: boolean;
  apiKey: string;
  backupApiKey: string;
  fetchIntervalMs: number;
  priority: 'high' | 'normal' | 'low';
}

/** T-0851: Mock mode flag */
const MOCK_MODE = process.env.DATA_PIPELINE_MOCK === 'true' || !process.env.OPENWEATHERMAP_API_KEY;

export class DataPipelineService {
  private static errorLog: ErrorLogEntry[] = [];
  private static archive: ArchiveEntry[] = [];
  private static sourceStatus = new Map<string, DataSourceStatus>();
  private static fetchTimers = new Map<string, ReturnType<typeof setInterval>>();
  private static optedOutPlayers = new Set<string>(); // T-0823
  private static disabledModifiers = new Map<string, Set<string>>(); // T-0860

  /** Source configurations */
  private static configs: Record<string, DataSourceConfig> = {
    'fear-greed': {
      enabled: true,
      apiKey: process.env.FEAR_GREED_API_KEY || '',
      backupApiKey: '',
      fetchIntervalMs: 24 * 60 * 60 * 1000, // daily
      priority: 'normal',
    },
    'stock-index': {
      enabled: true,
      apiKey: process.env.STOCK_API_KEY || '',
      backupApiKey: '',
      fetchIntervalMs: 24 * 60 * 60 * 1000,
      priority: 'normal',
    },
    'crypto-sentiment': {
      enabled: true,
      apiKey: process.env.CRYPTO_API_KEY || '',
      backupApiKey: '',
      fetchIntervalMs: 60 * 60 * 1000, // hourly
      priority: 'normal',
    },
    'news-headlines': {
      enabled: true,
      apiKey: process.env.NEWS_API_KEY || '',
      backupApiKey: '',
      fetchIntervalMs: 2 * 60 * 60 * 1000, // 2 hours
      priority: 'normal',
    },
    'sports-results': {
      enabled: true,
      apiKey: process.env.SPORTS_API_KEY || '',
      backupApiKey: '',
      fetchIntervalMs: 4 * 60 * 60 * 1000, // 4 hours
      priority: 'low',
    },
  };

  // ---- Initialization ----

  /** T-0817: Start staggered fetch intervals */
  static startPipeline(): void {
    const sources = Object.entries(DataPipelineService.configs);
    let delay = 0;

    for (const [source, config] of sources) {
      if (!config.enabled) continue;

      // Stagger initial fetches by 5 seconds each
      setTimeout(() => {
        DataPipelineService.fetchSource(source);
        const timer = setInterval(() => {
          DataPipelineService.fetchSource(source);
        }, config.fetchIntervalMs);
        DataPipelineService.fetchTimers.set(source, timer);
      }, delay);

      delay += 5000;
    }
  }

  /** Stop all scheduled fetches */
  static stopPipeline(): void {
    for (const timer of DataPipelineService.fetchTimers.values()) {
      clearInterval(timer);
    }
    DataPipelineService.fetchTimers.clear();
  }

  // ---- Individual Source Fetchers ----

  /** Generic fetch dispatcher */
  private static async fetchSource(source: string): Promise<void> {
    const status = DataPipelineService.getOrCreateStatus(source);
    status.lastFetch = Date.now();
    status.callCount++;

    try {
      switch (source) {
        case 'fear-greed':
          await DataPipelineService.fetchFearGreed();
          break;
        case 'stock-index':
          await DataPipelineService.fetchStockIndex();
          break;
        case 'crypto-sentiment':
          await DataPipelineService.fetchCryptoSentiment();
          break;
        case 'news-headlines':
          await DataPipelineService.fetchNewsHeadlines();
          break;
        case 'sports-results':
          await DataPipelineService.fetchSportsResults();
          break;
      }
      status.lastSuccess = Date.now();
      status.lastError = null;
      DataPipelineService.updateReliability(source, true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      status.lastError = errorMsg;
      status.errorCount++;
      DataPipelineService.logError(source, errorMsg);
      DataPipelineService.updateReliability(source, false);
    }
  }

  /** T-0791, T-0792: Fetch Fear & Greed Index */
  static async fetchFearGreed(): Promise<FearGreedData> {
    if (MOCK_MODE) return DataPipelineService.mockFearGreed();

    return dataCache.fetchWithRetry<FearGreedData>(
      'fear-greed',
      'fear-greed:current',
      async () => {
        const url = 'https://api.alternative.me/fng/?limit=1';
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fear & Greed API: ${response.status}`);
        const data = await response.json();
        const entry = data.data?.[0];
        return {
          value: parseInt(entry?.value || '50', 10),
          classification: entry?.value_classification || 'Neutral',
          timestamp: new Date().toISOString(),
        };
      },
      24 * 60 * 60 * 1000, // daily cache
    );
  }

  /** T-0795, T-0796: Fetch stock index data */
  static async fetchStockIndex(): Promise<StockIndexData> {
    if (MOCK_MODE) return DataPipelineService.mockStockIndex();

    return dataCache.fetchWithRetry<StockIndexData>(
      'stock-index',
      'stock-index:sp500',
      async () => {
        // Placeholder URL — real implementation would use Alpha Vantage, Finnhub, etc.
        const apiKey = DataPipelineService.configs['stock-index'].apiKey;
        if (!apiKey) throw new Error('No stock API key configured');

        const url = `https://finnhub.io/api/v1/quote?symbol=SPY&token=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Stock API: ${response.status}`);
        const data = await response.json();
        return {
          index: 'S&P 500',
          value: data.c || 0,
          change: data.d || 0,
          changePct: data.dp || 0,
          timestamp: new Date().toISOString(),
        };
      },
      24 * 60 * 60 * 1000,
    );
  }

  /** T-0799, T-0800: Fetch crypto sentiment */
  static async fetchCryptoSentiment(): Promise<CryptoSentimentData> {
    if (MOCK_MODE) return DataPipelineService.mockCryptoSentiment();

    return dataCache.fetchWithRetry<CryptoSentimentData>(
      'crypto-sentiment',
      'crypto:sentiment',
      async () => {
        const url = 'https://api.alternative.me/fng/?limit=1&date_format=us';
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Crypto API: ${response.status}`);
        const data = await response.json();
        const fng = parseInt(data.data?.[0]?.value || '50', 10);
        // Convert 0-100 to -100 to 100
        const sentiment = (fng - 50) * 2;
        return {
          sentiment,
          btcPrice: 0, // populated from price API if available
          volume24h: 0,
          timestamp: new Date().toISOString(),
        };
      },
      60 * 60 * 1000, // hourly
    );
  }

  /** T-0803, T-0804, T-0805: Fetch news headlines with sentiment */
  static async fetchNewsHeadlines(): Promise<NewsHeadline[]> {
    if (MOCK_MODE) return DataPipelineService.mockNewsHeadlines();

    return dataCache.fetchWithRetry<NewsHeadline[]>(
      'news-headlines',
      'news:headlines',
      async () => {
        const apiKey = DataPipelineService.configs['news-headlines'].apiKey;
        if (!apiKey) throw new Error('No news API key configured');

        const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`News API: ${response.status}`);
        const data = await response.json();

        return (data.articles || []).slice(0, 10).map((article: any) => ({
          title: article.title || '',
          source: article.source?.name || 'Unknown',
          sentiment: DataPipelineService.classifyHeadlineSentiment(article.title || ''),
          magnitude: 0.5,
          publishedAt: article.publishedAt || new Date().toISOString(),
        }));
      },
      2 * 60 * 60 * 1000,
    );
  }

  /** T-0805: Simple keyword-based sentiment classification */
  private static classifyHeadlineSentiment(title: string): NewsSentiment {
    const lower = title.toLowerCase();
    const positiveWords = ['rise', 'gain', 'growth', 'surge', 'record', 'win', 'peace', 'celebrate', 'success', 'breakthrough'];
    const negativeWords = ['fall', 'crash', 'crisis', 'war', 'death', 'loss', 'attack', 'disaster', 'collapse', 'fear'];

    let positive = 0;
    let negative = 0;
    for (const word of positiveWords) {
      if (lower.includes(word)) positive++;
    }
    for (const word of negativeWords) {
      if (lower.includes(word)) negative++;
    }

    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }

  /** T-0808, T-0809: Fetch sports results */
  static async fetchSportsResults(): Promise<SportsEvent[]> {
    if (MOCK_MODE) return DataPipelineService.mockSportsResults();

    return dataCache.fetchWithRetry<SportsEvent[]>(
      'sports-results',
      'sports:results',
      async () => {
        const apiKey = DataPipelineService.configs['sports-results'].apiKey;
        if (!apiKey) throw new Error('No sports API key configured');
        // Placeholder — would use ESPN or similar API
        throw new Error('Sports API not yet configured');
      },
      4 * 60 * 60 * 1000,
    );
  }

  // ---- Mock Data (T-0851) ----

  private static mockFearGreed(): FearGreedData {
    const hour = new Date().getHours();
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const value = 30 + ((dayOfYear * 7 + hour) % 50);
    const classifications = ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'];
    return {
      value,
      classification: classifications[Math.floor(value / 20)],
      timestamp: new Date().toISOString(),
    };
  }

  private static mockStockIndex(): StockIndexData {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const changePct = ((dayOfYear * 13) % 600 - 300) / 100;
    return {
      index: 'S&P 500',
      value: 4500 + (dayOfYear * 3) % 500,
      change: changePct * 45,
      changePct,
      timestamp: new Date().toISOString(),
    };
  }

  private static mockCryptoSentiment(): CryptoSentimentData {
    const hour = new Date().getHours();
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const sentiment = ((dayOfYear * 11 + hour * 3) % 200) - 100;
    return {
      sentiment,
      btcPrice: 40000 + (dayOfYear * 100) % 30000,
      volume24h: 20000000000 + (dayOfYear * 1000000000) % 50000000000,
      timestamp: new Date().toISOString(),
    };
  }

  private static mockNewsHeadlines(): NewsHeadline[] {
    const headlines = [
      { title: 'Markets surge on positive economic data', sentiment: 'positive' as NewsSentiment },
      { title: 'Scientists achieve breakthrough in energy research', sentiment: 'positive' as NewsSentiment },
      { title: 'International summit concludes peacefully', sentiment: 'positive' as NewsSentiment },
      { title: 'Supply chain concerns persist amid global uncertainty', sentiment: 'negative' as NewsSentiment },
      { title: 'New regulations proposed for tech sector', sentiment: 'neutral' as NewsSentiment },
    ];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const offset = dayOfYear % headlines.length;
    const selected = [...headlines.slice(offset), ...headlines.slice(0, offset)].slice(0, 3);
    return selected.map((h) => ({
      ...h,
      source: 'Simulated News',
      magnitude: 0.5,
      publishedAt: new Date().toISOString(),
    }));
  }

  private static mockSportsResults(): SportsEvent[] {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    if (dayOfYear % 3 === 0) {
      return [{
        league: 'nba',
        event: 'Regular Season',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        isFinal: true,
        timestamp: new Date().toISOString(),
      }];
    }
    return [];
  }

  // ---- Aggregation ----

  /**
   * T-0842: Get complete data pipeline snapshot for frontend.
   */
  static async getSnapshot(): Promise<DataPipelineSnapshot> {
    const now = new Date();
    const moonPhase = calculateMoonPhase(now);
    const moonEffect = getMoonPhaseEffect(now);
    const astronomicalEvents = getAstronomicalEvents(now);

    // Fetch all available data
    let fearGreed: FearGreedData | null = null;
    let stockIndex: StockIndexData | null = null;
    let cryptoSentiment: CryptoSentimentData | null = null;
    let newsHeadlines: NewsHeadline[] = [];
    let sportsEvents: SportsEvent[] = [];

    try { fearGreed = await DataPipelineService.fetchFearGreed(); } catch { /* use null */ }
    try { stockIndex = await DataPipelineService.fetchStockIndex(); } catch { /* use null */ }
    try { cryptoSentiment = await DataPipelineService.fetchCryptoSentiment(); } catch { /* use null */ }
    try { newsHeadlines = await DataPipelineService.fetchNewsHeadlines(); } catch { /* use empty */ }
    try { sportsEvents = await DataPipelineService.fetchSportsResults(); } catch { /* use empty */ }

    // Detect celebrations (T-0825)
    const celebrations = DataPipelineService.detectCelebrations(sportsEvents, newsHeadlines);

    // Build modifier summary
    const modifierSummary: Record<string, number> = {};

    if (fearGreed) {
      const fg = fearGreedToModifier(fearGreed.value);
      modifierSummary['marketVolatility'] = fg.marketVolatility;
      modifierSummary['marketConfidence'] = fg.marketConfidence;
    }

    if (stockIndex) {
      const si = stockIndexToModifier(stockIndex.changePct);
      modifierSummary['merchantProsperity'] = si.merchantProsperity;
      modifierSummary['tradeVolume'] = si.tradeVolume;
    }

    if (cryptoSentiment) {
      const cs = cryptoSentimentToModifier(cryptoSentiment.sentiment);
      modifierSummary['tradeVolatility'] = cs.tradeVolatility;
      modifierSummary['essenceDropBonus'] = cs.essenceDropBonus;
    }

    modifierSummary['magicPotency'] = moonEffect.magicPotency;
    modifierSummary['stealthBonus'] = moonEffect.stealthBonus;

    // Get source statuses
    const sources = DataPipelineService.getHealthDashboard();

    return {
      weather: null, // populated by caller with region-specific data
      fearGreed,
      stockIndex,
      cryptoSentiment,
      newsHeadlines,
      sportsEvents,
      moonPhase: { phase: moonPhase, label: moonEffect.label, icon: moonEffect.icon },
      astronomicalEvents,
      celebrations,
      modifierSummary,
      sources,
      timestamp: now.toISOString(),
    };
  }

  // ---- Celebration Detection (T-0825, T-0826) ----

  private static detectCelebrations(
    sports: SportsEvent[],
    news: NewsHeadline[],
  ): CelebrationEvent[] {
    const celebrations: CelebrationEvent[] = [];

    // Check for major sports finals
    for (const event of sports) {
      if (event.isFinal) {
        const mapping = SPORTS_TOURNAMENT_MAP[event.league] || SPORTS_TOURNAMENT_MAP['default'];
        celebrations.push({
          name: event.event,
          fantasyName: mapping.fantasyName,
          description: mapping.description,
          significance: scoreEventSignificance({ type: 'sports_final' }),
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Check for major positive news clusters
    const positiveCount = news.filter((n) => n.sentiment === 'positive').length;
    if (positiveCount >= 3) {
      celebrations.push({
        name: 'Good News Day',
        fantasyName: 'Heralds of Fortune',
        description: 'An abundance of good news spreads joy throughout the realm!',
        significance: 30,
        detectedAt: new Date().toISOString(),
      });
    }

    return celebrations;
  }

  // ---- Health & Monitoring ----

  /** T-0818: Data pipeline health dashboard */
  static getHealthDashboard(): DataSourceStatus[] {
    const allSources = ['openweathermap', 'fear-greed', 'stock-index', 'crypto-sentiment', 'news-headlines', 'sports-results'];
    return allSources.map((source) => DataPipelineService.getOrCreateStatus(source));
  }

  /** T-0819: Error log */
  private static logError(source: string, error: string): void {
    DataPipelineService.errorLog.push({
      source,
      error,
      timestamp: Date.now(),
    });
    // Keep last 200 errors
    if (DataPipelineService.errorLog.length > 200) {
      DataPipelineService.errorLog.splice(0, DataPipelineService.errorLog.length - 200);
    }
  }

  /** Get recent errors */
  static getRecentErrors(limit: number = 50): ErrorLogEntry[] {
    return DataPipelineService.errorLog.slice(-limit);
  }

  /** T-0834: Reliability scoring */
  private static updateReliability(source: string, success: boolean): void {
    const status = DataPipelineService.getOrCreateStatus(source);
    const total = status.callCount || 1;
    const errors = status.errorCount;
    status.reliability = Math.max(0, Math.min(1, (total - errors) / total));
  }

  private static getOrCreateStatus(source: string): DataSourceStatus {
    let status = DataPipelineService.sourceStatus.get(source);
    if (!status) {
      status = {
        source,
        enabled: true,
        lastFetch: null,
        lastSuccess: null,
        lastError: null,
        reliability: 1.0,
        callCount: 0,
        errorCount: 0,
      };
      DataPipelineService.sourceStatus.set(source, status);
    }
    return status;
  }

  // ---- API Usage Tracking (T-0828) ----

  static getUsageReport(): {
    sources: Array<{ source: string; calls: number; errors: number; reliability: number }>;
    totalCalls: number;
    totalErrors: number;
  } {
    const usage = dataCache.getUsageStats();
    const sourceReports = usage.map((u) => {
      const status = DataPipelineService.getOrCreateStatus(u.source);
      return {
        source: u.source,
        calls: status.callCount,
        errors: status.errorCount,
        reliability: status.reliability,
      };
    });

    return {
      sources: sourceReports,
      totalCalls: sourceReports.reduce((sum, s) => sum + s.calls, 0),
      totalErrors: sourceReports.reduce((sum, s) => sum + s.errors, 0),
    };
  }

  // ---- API Key Rotation (T-0829) ----

  static rotateApiKey(source: string): void {
    const config = DataPipelineService.configs[source];
    if (!config || !config.backupApiKey) return;
    const temp = config.apiKey;
    config.apiKey = config.backupApiKey;
    config.backupApiKey = temp;
  }

  // ---- Data Source Configuration (T-0821) ----

  static getSourceConfigs(): Record<string, { enabled: boolean; priority: string; fetchIntervalMs: number }> {
    const result: Record<string, { enabled: boolean; priority: string; fetchIntervalMs: number }> = {};
    for (const [source, config] of Object.entries(DataPipelineService.configs)) {
      result[source] = {
        enabled: config.enabled,
        priority: config.priority,
        fetchIntervalMs: config.fetchIntervalMs,
      };
    }
    return result;
  }

  static setSourceEnabled(source: string, enabled: boolean): void {
    const config = DataPipelineService.configs[source];
    if (config) config.enabled = enabled;
  }

  // ---- Historical Archive (T-0831) ----

  static archiveSnapshot(snapshot: Partial<DataPipelineSnapshot>): void {
    const date = new Date().toISOString().split('T')[0];
    DataPipelineService.archive.push({ date, snapshot });
    // Keep last 90 days
    if (DataPipelineService.archive.length > 90) {
      DataPipelineService.archive.splice(0, DataPipelineService.archive.length - 90);
    }
  }

  static getArchive(days: number = 30): ArchiveEntry[] {
    return DataPipelineService.archive.slice(-days);
  }

  // ---- Player Opt-Out (T-0823) ----

  static setPlayerOptOut(playerId: string, optOut: boolean): void {
    if (optOut) {
      DataPipelineService.optedOutPlayers.add(playerId);
    } else {
      DataPipelineService.optedOutPlayers.delete(playerId);
    }
  }

  static isPlayerOptedOut(playerId: string): boolean {
    return DataPipelineService.optedOutPlayers.has(playerId);
  }

  // ---- Per-Modifier Toggle (T-0860) ----

  static setModifierEnabled(playerId: string, modifier: string, enabled: boolean): void {
    let disabled = DataPipelineService.disabledModifiers.get(playerId);
    if (!disabled) {
      disabled = new Set();
      DataPipelineService.disabledModifiers.set(playerId, disabled);
    }
    if (enabled) {
      disabled.delete(modifier);
    } else {
      disabled.add(modifier);
    }
  }

  static isModifierEnabled(playerId: string, modifier: string): boolean {
    const disabled = DataPipelineService.disabledModifiers.get(playerId);
    if (!disabled) return true;
    return !disabled.has(modifier);
  }

  /** Get modifiers filtered by player preferences */
  static getPlayerModifiers(
    playerId: string,
    allModifiers: Record<string, number>,
  ): Record<string, number> {
    if (DataPipelineService.isPlayerOptedOut(playerId)) {
      // Return all 1.0 (neutral)
      const result: Record<string, number> = {};
      for (const key of Object.keys(allModifiers)) {
        result[key] = 1.0;
      }
      return result;
    }

    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(allModifiers)) {
      result[key] = DataPipelineService.isModifierEnabled(playerId, key) ? value : 1.0;
    }
    return result;
  }

  // ---- Freshness (T-0830) ----

  static getFreshnessInfo(): Array<{
    source: string;
    lastUpdate: string | null;
    ageSeconds: number;
    isStale: boolean;
  }> {
    const report = dataCache.getFreshnessReport();
    const bySource = new Map<string, { lastUpdate: number; isStale: boolean }>();

    for (const entry of report) {
      const existing = bySource.get(entry.source);
      if (!existing || entry.fetchedAt > existing.lastUpdate) {
        bySource.set(entry.source, { lastUpdate: entry.fetchedAt, isStale: entry.isStale });
      }
    }

    const now = Date.now();
    const result: Array<{ source: string; lastUpdate: string | null; ageSeconds: number; isStale: boolean }> = [];

    for (const source of ['openweathermap', 'fear-greed', 'stock-index', 'crypto-sentiment', 'news-headlines', 'sports-results']) {
      const info = bySource.get(source);
      result.push({
        source,
        lastUpdate: info ? new Date(info.lastUpdate).toISOString() : null,
        ageSeconds: info ? Math.floor((now - info.lastUpdate) / 1000) : -1,
        isStale: info ? info.isStale : true,
      });
    }

    return result;
  }

  // ---- Changelog (T-0835) ----

  static generateChangelog(
    previousSnapshot: Partial<DataPipelineSnapshot> | null,
    currentSnapshot: DataPipelineSnapshot,
  ): string[] {
    const changes: string[] = [];

    if (!previousSnapshot) {
      changes.push('Initial data pipeline snapshot recorded.');
      return changes;
    }

    // Compare fear & greed
    if (previousSnapshot.fearGreed && currentSnapshot.fearGreed) {
      const diff = currentSnapshot.fearGreed.value - previousSnapshot.fearGreed.value;
      if (Math.abs(diff) >= 5) {
        changes.push(`Market sentiment shifted ${diff > 0 ? 'up' : 'down'} by ${Math.abs(diff)} points.`);
      }
    }

    // Compare moon phase
    if (previousSnapshot.moonPhase && currentSnapshot.moonPhase) {
      if (previousSnapshot.moonPhase.phase !== currentSnapshot.moonPhase.phase) {
        changes.push(`Moon phase changed to ${currentSnapshot.moonPhase.label}.`);
      }
    }

    // Compare astronomical events
    if (currentSnapshot.astronomicalEvents.length > 0) {
      for (const event of currentSnapshot.astronomicalEvents) {
        changes.push(`Astronomical event: ${event.fantasyName} is active!`);
      }
    }

    // Celebrations
    if (currentSnapshot.celebrations.length > 0) {
      for (const cel of currentSnapshot.celebrations) {
        changes.push(`Celebration detected: ${cel.fantasyName}`);
      }
    }

    return changes;
  }

  // ---- A/B Testing (T-0857) ----

  private static abTestGroups = new Map<string, 'control' | 'variant'>();

  static assignABGroup(playerId: string): 'control' | 'variant' {
    if (!DataPipelineService.abTestGroups.has(playerId)) {
      // Deterministic assignment based on player ID hash
      let hash = 0;
      for (let i = 0; i < playerId.length; i++) {
        hash = ((hash << 5) - hash) + playerId.charCodeAt(i);
        hash |= 0;
      }
      DataPipelineService.abTestGroups.set(playerId, hash % 2 === 0 ? 'control' : 'variant');
    }
    return DataPipelineService.abTestGroups.get(playerId)!;
  }

  /** Control group gets 50% effect, variant gets full */
  static applyABModifier(playerId: string, value: number): number {
    const group = DataPipelineService.assignABGroup(playerId);
    if (group === 'control') {
      // Halve the deviation from 1.0
      return 1.0 + (value - 1.0) * 0.5;
    }
    return value;
  }
}
