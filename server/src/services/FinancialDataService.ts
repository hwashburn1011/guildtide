/**
 * FinancialDataService — Fetch and process financial APIs.
 *
 * T-0991: Alpha Vantage / Yahoo Finance API integration for stock data
 * T-0992: Stock data fetch with symbol lookup and price history
 * T-0993: Stock data caching with end-of-day refresh
 * T-0994: Market open/close detection for fetch timing
 * T-0995: Stock market summary display data for Observatory
 * T-0999: Commodity price tracking (gold, silver, oil, wheat)
 * T-1004: Commodity price chart data with real-world comparison
 * T-1005: Economic indicator dashboard (GDP growth, unemployment, inflation)
 * T-1007: Economic forecast display based on real indicators
 * T-1008: Cryptocurrency market data API integration
 * T-1009: Bitcoin price fetch with hourly caching
 * T-1013: Crypto sentiment gauge (extreme fear to extreme greed)
 * T-1014: Fear & Greed Index detailed breakdown
 * T-1017: VIX mapping to expedition danger
 * T-1019: Currency exchange rate tracking (USD/EUR, USD/JPY)
 * T-1021: Interest rate data fetch and caching
 * T-1023: Financial data refresh scheduler with market hours
 * T-1024: Fallback to cached data on API failure
 * T-1025: Anomaly detection for extreme values
 * T-1026: Financial event notification (crash, record high)
 * T-1027: Normalization to percentage-based modifiers
 * T-1033: Historical comparison (today vs 7-day avg)
 * T-1034: Integration settings (choose which data to use)
 * T-1035: Educational tooltips for each indicator
 * T-1042: Mock mode for development
 * T-1043: Audit trail for modifier calculations
 * T-1044: Financial holiday handling
 * T-1045: API key management with rotation
 * T-1051: Health check and monitoring endpoint
 */
import { dataCache } from './ExternalDataCache';
import {
  type CommodityQuote,
  type EconomicIndicator,
  type SectorPerformance,
  type CurrencyRate,
  type FinancialAnomaly,
  stockMarketToMerchantEffect,
  goldPriceToEffect,
  oilPriceToEffect,
  wheatPriceToEffect,
  silverPriceToEffect,
  economicIndicatorsToPhase,
  calculateCryptoVolatilityIndex,
  cryptoBullMarketToExpedition,
  cryptoBearMarketToDefense,
  fearGreedToMerchantBehavior,
  vixToExpeditionDanger,
  exchangeRateToTradeModifier,
  interestRateToLoanEffect,
  detectFinancialAnomalies,
  normalizeToModifier,
  sectorToBuilding,
  generateFantasyHeadline,
  translateToFantasy,
} from '../data/financialMappings';

// ---- Config ----

/** T-1042: Mock mode for development */
const MOCK_MODE = process.env.FINANCIAL_DATA_MOCK === 'true' || !process.env.FINANCIAL_API_KEY;

/** T-1034: Integration settings */
interface FinancialIntegrationSettings {
  stockMarketEnabled: boolean;
  commoditiesEnabled: boolean;
  cryptoEnabled: boolean;
  economicIndicatorsEnabled: boolean;
  currencyExchangeEnabled: boolean;
  interestRatesEnabled: boolean;
  sectorRotationEnabled: boolean;
}

const DEFAULT_SETTINGS: FinancialIntegrationSettings = {
  stockMarketEnabled: true,
  commoditiesEnabled: true,
  cryptoEnabled: true,
  economicIndicatorsEnabled: true,
  currencyExchangeEnabled: true,
  interestRatesEnabled: true,
  sectorRotationEnabled: true,
};

// ---- Audit Trail (T-1043) ----

interface AuditEntry {
  timestamp: string;
  source: string;
  rawValue: unknown;
  computedModifier: Record<string, number>;
  description: string;
}

// ---- Types ----

export interface FinancialSnapshot {
  stockMarket: StockMarketSummary | null;
  commodities: CommodityQuote[];
  cryptoData: CryptoMarketData | null;
  fearGreedDetail: FearGreedDetail | null;
  economicIndicators: EconomicIndicator[];
  economicForecast: EconomicForecast | null;
  sectorPerformance: SectorPerformance[];
  currencyRates: CurrencyRate[];
  interestRate: InterestRateData | null;
  vixData: VixData | null;
  anomalies: FinancialAnomaly[];
  historicalComparison: HistoricalComparison | null;
  modifiers: FinancialModifierSummary;
  fantasyNewsFeed: FantasyNewsItem[];
  lastUpdated: string;
}

export interface StockMarketSummary {
  index: string;
  value: number;
  change: number;
  changePct: number;
  marketOpen: boolean;
  merchantEffect: ReturnType<typeof stockMarketToMerchantEffect>;
  timestamp: string;
}

export interface CryptoMarketData {
  btcPrice: number;
  btcChange24h: number;
  btcChangePct24h: number;
  sentiment: number;
  volatilityIndex: number;
  expeditionEffect: ReturnType<typeof cryptoBullMarketToExpedition>;
  defenseEffect: ReturnType<typeof cryptoBearMarketToDefense>;
  timestamp: string;
}

export interface FearGreedDetail {
  value: number;
  classification: string;
  previousClose: number;
  weekAgo: number;
  monthAgo: number;
  merchantEffect: ReturnType<typeof fearGreedToMerchantBehavior>;
  timestamp: string;
}

export interface EconomicForecast {
  currentPhase: ReturnType<typeof economicIndicatorsToPhase>;
  trend: 'improving' | 'stable' | 'declining';
  outlook: string;
}

export interface VixData {
  value: number;
  change: number;
  expeditionEffect: ReturnType<typeof vixToExpeditionDanger>;
  timestamp: string;
}

export interface InterestRateData {
  rate: number;
  previousRate: number;
  loanEffect: ReturnType<typeof interestRateToLoanEffect>;
  timestamp: string;
}

export interface HistoricalComparison {
  stockAvg7d: number;
  stockCurrent: number;
  cryptoAvg7d: number;
  cryptoCurrent: number;
  fearGreedAvg7d: number;
  fearGreedCurrent: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface FinancialModifierSummary {
  tradeValueModifier: number;
  rareItemChanceBonus: number;
  goldCostModifier: number;
  fuelCostModifier: number;
  foodProductionModifier: number;
  equipmentCostModifier: number;
  expeditionDangerModifier: number;
  expeditionRewardModifier: number;
  defenseBonus: number;
  defensiveItemDiscount: number;
  luxuryItemInflation: number;
  crossRegionTradeModifier: number;
  loanInterestRate: number;
  buildingLoanCost: number;
  economicPriceMultiplier: number;
  observatoryEfficiency: number;
  templeEfficiency: number;
  mineEfficiency: number;
  farmEfficiency: number;
}

export interface FantasyNewsItem {
  headline: string;
  source: string;
  category: 'stock' | 'crypto' | 'commodity' | 'economic';
  timestamp: string;
}

// ---- Educational Tooltips (T-1035) ----

export const FINANCIAL_TOOLTIPS: Record<string, { title: string; description: string; gameEffect: string }> = {
  'sapphire-exchange': {
    title: 'The Sapphire Exchange',
    description: 'The central trading index of the realm, reflecting the collective prosperity of merchant guilds.',
    gameEffect: 'Affects trade values in the marketplace. Rising markets boost trade, falling markets open rare salvage opportunities.',
  },
  'aethercoin': {
    title: 'Aethercoin',
    description: 'A volatile digital currency mined from the Aetherial Plane. Its value swings wildly with the tides of speculation.',
    gameEffect: 'High values boost expedition rewards but increase risk. Low values favor defensive strategies.',
  },
  'courage-avarice': {
    title: 'Courage & Avarice Index',
    description: 'A mystical gauge measuring the collective mood of all merchants in the realm.',
    gameEffect: 'Fear makes defensive items cheaper. Greed inflates luxury prices.',
  },
  'storm-index': {
    title: 'The Storm Index',
    description: 'A measure of uncertainty and chaos in the trading halls. High readings signal turbulent times.',
    gameEffect: 'High Storm Index increases expedition danger. Low readings mean safer travels.',
  },
  'true-gold': {
    title: 'True Gold',
    description: 'The eternal metal that underpins all currency in the realm.',
    gameEffect: 'Price changes affect gold mining yields and smelting costs.',
  },
  'darkfire-essence': {
    title: 'Darkfire Essence',
    description: 'Liquid fuel drawn from deep underground wells. Powers forges and siege engines.',
    gameEffect: 'Price changes affect fuel costs for forges and expeditions.',
  },
  'golden-grain': {
    title: 'Golden Grain',
    description: 'The staple crop that feeds every settlement in the realm.',
    gameEffect: 'Price changes affect food production rates and granary costs.',
  },
  'moonsilver': {
    title: 'Moonsilver',
    description: 'A precious metal favored by armorers and jewelers for its moonlit luster.',
    gameEffect: 'Price changes affect equipment crafting and material costs.',
  },
  'lending-guild-rate': {
    title: 'Lending Guild Rate',
    description: 'The rate at which the Lending Guild offers loans for building expansions.',
    gameEffect: 'High rates make building loans expensive but savings grow. Low rates offer cheap expansion.',
  },
  'realm-prosperity': {
    title: 'Realm Prosperity',
    description: 'An aggregate measure of economic health across all guild territories.',
    gameEffect: 'Determines the economic cycle phase: expansion, peak, contraction, trough, or recovery.',
  },
};

// ---- US Market Hours (T-0994, T-1023) ----

/** T-0994: Detect if US stock market is currently open */
export function isMarketOpen(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const day = now.getUTCDay();

  // US market: Mon-Fri 9:30 AM - 4:00 PM ET = 14:30 - 21:00 UTC (EST)
  // Adjusted for DST: 13:30 - 20:00 UTC (EDT)
  if (day === 0 || day === 6) return false; // weekend

  const utcTime = utcHour * 60 + utcMinute;
  const marketOpen = 13 * 60 + 30;  // 13:30 UTC (EDT open)
  const marketClose = 20 * 60;       // 20:00 UTC (EDT close)

  return utcTime >= marketOpen && utcTime < marketClose;
}

/** T-1044: Check if today is a US financial holiday */
export function isFinancialHoliday(date: Date = new Date()): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  // Fixed holidays
  if (month === 1 && day === 1) return true;   // New Year's
  if (month === 7 && day === 4) return true;   // Independence Day
  if (month === 12 && day === 25) return true; // Christmas

  // MLK Day: 3rd Monday of January
  if (month === 1 && dayOfWeek === 1 && day >= 15 && day <= 21) return true;
  // Presidents Day: 3rd Monday of February
  if (month === 2 && dayOfWeek === 1 && day >= 15 && day <= 21) return true;
  // Memorial Day: Last Monday of May
  if (month === 5 && dayOfWeek === 1 && day >= 25) return true;
  // Labor Day: 1st Monday of September
  if (month === 9 && dayOfWeek === 1 && day <= 7) return true;
  // Thanksgiving: 4th Thursday of November
  if (month === 11 && dayOfWeek === 4 && day >= 22 && day <= 28) return true;

  return false;
}

// ---- Service ----

export class FinancialDataService {
  private static settings: FinancialIntegrationSettings = { ...DEFAULT_SETTINGS };
  private static auditLog: AuditEntry[] = [];
  private static historicalSnapshots: Array<{ date: string; stock: number; crypto: number; fearGreed: number }> = [];
  private static apiKeys: Record<string, { primary: string; backup: string }> = {};
  private static eventNotifications: Array<{
    type: string;
    message: string;
    fantasyMessage: string;
    severity: number;
    timestamp: string;
  }> = [];

  // ---- Settings (T-1034) ----

  static getSettings(): FinancialIntegrationSettings {
    return { ...FinancialDataService.settings };
  }

  static updateSettings(partial: Partial<FinancialIntegrationSettings>): void {
    Object.assign(FinancialDataService.settings, partial);
  }

  // ---- API Key Management (T-1045) ----

  static setApiKeys(source: string, primary: string, backup: string): void {
    FinancialDataService.apiKeys[source] = { primary, backup };
  }

  static rotateApiKey(source: string): void {
    const keys = FinancialDataService.apiKeys[source];
    if (!keys || !keys.backup) return;
    const temp = keys.primary;
    keys.primary = keys.backup;
    keys.backup = temp;
  }

  private static getApiKey(source: string): string {
    return FinancialDataService.apiKeys[source]?.primary || process.env.FINANCIAL_API_KEY || '';
  }

  // ---- Audit Trail (T-1043) ----

  private static addAuditEntry(source: string, rawValue: unknown, modifiers: Record<string, number>, desc: string): void {
    FinancialDataService.auditLog.push({
      timestamp: new Date().toISOString(),
      source,
      rawValue,
      computedModifier: modifiers,
      description: desc,
    });
    // Keep last 500 entries
    if (FinancialDataService.auditLog.length > 500) {
      FinancialDataService.auditLog.splice(0, FinancialDataService.auditLog.length - 500);
    }
  }

  static getAuditLog(limit: number = 50): AuditEntry[] {
    return FinancialDataService.auditLog.slice(-limit);
  }

  // ---- Event Notifications (T-1026) ----

  private static addEventNotification(type: string, message: string, fantasyMessage: string, severity: number): void {
    FinancialDataService.eventNotifications.push({
      type,
      message,
      fantasyMessage,
      severity,
      timestamp: new Date().toISOString(),
    });
    if (FinancialDataService.eventNotifications.length > 100) {
      FinancialDataService.eventNotifications.splice(0, FinancialDataService.eventNotifications.length - 100);
    }
  }

  static getEventNotifications(limit: number = 20): typeof FinancialDataService.eventNotifications {
    return FinancialDataService.eventNotifications.slice(-limit);
  }

  // ---- Stock Market (T-0991 through T-0998) ----

  /** T-0992/T-0993: Fetch stock data with caching */
  static async fetchStockMarket(): Promise<StockMarketSummary> {
    if (MOCK_MODE) return FinancialDataService.mockStockMarket();

    return dataCache.fetchWithRetry<StockMarketSummary>(
      'financial-stock',
      'financial:stock:sp500',
      async () => {
        const apiKey = FinancialDataService.getApiKey('stock');
        if (!apiKey) throw new Error('No financial API key configured');

        const url = `https://finnhub.io/api/v1/quote?symbol=SPY&token=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Stock API: ${response.status}`);
        const data = await response.json();

        const changePct = data.dp || 0;
        const merchantEffect = stockMarketToMerchantEffect(changePct);
        const open = isMarketOpen();

        const summary: StockMarketSummary = {
          index: 'Sapphire Exchange Index',
          value: data.c || 0,
          change: data.d || 0,
          changePct,
          marketOpen: open,
          merchantEffect,
          timestamp: new Date().toISOString(),
        };

        // T-1026: Check for notable events
        if (Math.abs(changePct) > 3) {
          FinancialDataService.addEventNotification(
            changePct > 0 ? 'market_rally' : 'market_crash',
            `S&P 500 moved ${changePct.toFixed(1)}%`,
            merchantEffect.fantasyDescription,
            Math.min(1, Math.abs(changePct) / 7),
          );
        }

        FinancialDataService.addAuditEntry('stock', { changePct }, {
          tradeValueModifier: merchantEffect.tradeValueModifier,
          rareItemChanceBonus: merchantEffect.rareItemChanceBonus,
        }, `Stock market change ${changePct.toFixed(2)}%`);

        return summary;
      },
      FinancialDataService.getStockCacheTTL(),
    );
  }

  /** T-0993/T-1023: Cache TTL based on market hours */
  private static getStockCacheTTL(): number {
    if (isMarketOpen()) {
      return 15 * 60 * 1000; // 15 min during market hours
    }
    return 60 * 60 * 1000; // 1 hour outside market hours
  }

  // ---- Commodity Prices (T-0999 through T-1004) ----

  static async fetchCommodityPrices(): Promise<CommodityQuote[]> {
    if (MOCK_MODE) return FinancialDataService.mockCommodities();

    return dataCache.fetchWithRetry<CommodityQuote[]>(
      'financial-commodities',
      'financial:commodities',
      async () => {
        const apiKey = FinancialDataService.getApiKey('commodities');
        if (!apiKey) throw new Error('No commodity API key configured');
        // Placeholder — real API would fetch GC=F, SI=F, CL=F, ZW=F
        throw new Error('Commodity API not yet configured');
      },
      60 * 60 * 1000, // hourly
    );
  }

  // ---- Crypto Data (T-1008, T-1009) ----

  /** T-1008/T-1009: Fetch Bitcoin price with hourly caching */
  static async fetchCryptoData(): Promise<CryptoMarketData> {
    if (MOCK_MODE) return FinancialDataService.mockCryptoData();

    return dataCache.fetchWithRetry<CryptoMarketData>(
      'financial-crypto',
      'financial:crypto:btc',
      async () => {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true';
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Crypto API: ${response.status}`);
        const data = await response.json();
        const btcPrice = data.bitcoin?.usd || 0;
        const btcChange = data.bitcoin?.usd_24h_change || 0;
        // Use Fear & Greed API for sentiment
        let sentiment = 0;
        try {
          const fngRes = await fetch('https://api.alternative.me/fng/?limit=1');
          const fngData = await fngRes.json();
          sentiment = ((parseInt(fngData.data?.[0]?.value || '50', 10)) - 50) * 2;
        } catch { /* use 0 */ }

        const volatilityIndex = calculateCryptoVolatilityIndex([btcChange]);
        const expeditionEffect = cryptoBullMarketToExpedition(sentiment);
        const defenseEffect = cryptoBearMarketToDefense(sentiment);

        return {
          btcPrice,
          btcChange24h: btcChange,
          btcChangePct24h: btcPrice > 0 ? (btcChange / btcPrice) * 100 : 0,
          sentiment,
          volatilityIndex,
          expeditionEffect,
          defenseEffect,
          timestamp: new Date().toISOString(),
        };
      },
      60 * 60 * 1000, // hourly
    );
  }

  // ---- Fear & Greed Detail (T-1013, T-1014) ----

  static async fetchFearGreedDetail(): Promise<FearGreedDetail> {
    if (MOCK_MODE) return FinancialDataService.mockFearGreedDetail();

    return dataCache.fetchWithRetry<FearGreedDetail>(
      'financial-fng',
      'financial:fng:detail',
      async () => {
        const url = 'https://api.alternative.me/fng/?limit=30';
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fear & Greed API: ${response.status}`);
        const data = await response.json();
        const entries = data.data || [];
        const current = parseInt(entries[0]?.value || '50', 10);
        const prevClose = parseInt(entries[1]?.value || '50', 10);
        const weekAgo = parseInt(entries[7]?.value || '50', 10);
        const monthAgo = parseInt(entries[29]?.value || '50', 10);

        return {
          value: current,
          classification: entries[0]?.value_classification || 'Neutral',
          previousClose: prevClose,
          weekAgo,
          monthAgo,
          merchantEffect: fearGreedToMerchantBehavior(current),
          timestamp: new Date().toISOString(),
        };
      },
      24 * 60 * 60 * 1000,
    );
  }

  // ---- VIX (T-1017) ----

  static async fetchVixData(): Promise<VixData> {
    if (MOCK_MODE) return FinancialDataService.mockVixData();

    return dataCache.fetchWithRetry<VixData>(
      'financial-vix',
      'financial:vix',
      async () => {
        const apiKey = FinancialDataService.getApiKey('stock');
        if (!apiKey) throw new Error('No API key for VIX');
        // Placeholder — Finnhub or Alpha Vantage for ^VIX
        throw new Error('VIX API not yet configured');
      },
      30 * 60 * 1000,
    );
  }

  // ---- Currency Exchange (T-1019) ----

  static async fetchCurrencyRates(): Promise<CurrencyRate[]> {
    if (MOCK_MODE) return FinancialDataService.mockCurrencyRates();

    return dataCache.fetchWithRetry<CurrencyRate[]>(
      'financial-forex',
      'financial:forex',
      async () => {
        const apiKey = FinancialDataService.getApiKey('forex');
        if (!apiKey) throw new Error('No forex API key');
        throw new Error('Forex API not yet configured');
      },
      4 * 60 * 60 * 1000,
    );
  }

  // ---- Interest Rates (T-1021) ----

  static async fetchInterestRate(): Promise<InterestRateData> {
    if (MOCK_MODE) return FinancialDataService.mockInterestRate();

    return dataCache.fetchWithRetry<InterestRateData>(
      'financial-rates',
      'financial:interest-rate',
      async () => {
        throw new Error('Interest rate API not yet configured');
      },
      24 * 60 * 60 * 1000,
    );
  }

  // ---- Economic Indicators (T-1005, T-1007) ----

  static async fetchEconomicIndicators(): Promise<EconomicIndicator[]> {
    if (MOCK_MODE) return FinancialDataService.mockEconomicIndicators();

    return dataCache.fetchWithRetry<EconomicIndicator[]>(
      'financial-econ',
      'financial:economic-indicators',
      async () => {
        throw new Error('Economic indicator API not yet configured');
      },
      24 * 60 * 60 * 1000,
    );
  }

  /** T-1007: Build economic forecast from indicators */
  static async getEconomicForecast(): Promise<EconomicForecast> {
    const indicators = await FinancialDataService.fetchEconomicIndicators();
    const gdp = indicators.find(i => i.name === 'GDP Growth')?.value;
    const unemployment = indicators.find(i => i.name === 'Unemployment')?.value;
    const inflation = indicators.find(i => i.name === 'Inflation')?.value;

    const phase = economicIndicatorsToPhase({ gdpGrowth: gdp, unemployment, inflation });

    // Determine trend from previous values
    const prevGdp = indicators.find(i => i.name === 'GDP Growth')?.previousValue ?? gdp;
    const trend = (gdp ?? 2) > (prevGdp ?? 2) ? 'improving' : (gdp ?? 2) < (prevGdp ?? 2) ? 'declining' : 'stable';

    return {
      currentPhase: phase,
      trend,
      outlook: phase.description,
    };
  }

  // ---- Sector Performance (T-1028-T-1032) ----

  static async fetchSectorPerformance(): Promise<SectorPerformance[]> {
    if (MOCK_MODE) return FinancialDataService.mockSectorPerformance();

    return dataCache.fetchWithRetry<SectorPerformance[]>(
      'financial-sectors',
      'financial:sectors',
      async () => {
        throw new Error('Sector API not yet configured');
      },
      24 * 60 * 60 * 1000,
    );
  }

  // ---- Historical Comparison (T-1033) ----

  static getHistoricalComparison(): HistoricalComparison {
    const history = FinancialDataService.historicalSnapshots;
    if (history.length < 2) {
      return {
        stockAvg7d: 0, stockCurrent: 0,
        cryptoAvg7d: 0, cryptoCurrent: 0,
        fearGreedAvg7d: 50, fearGreedCurrent: 50,
        trend: 'stable',
      };
    }

    const recent = history.slice(-7);
    const stockAvg = recent.reduce((sum, s) => sum + s.stock, 0) / recent.length;
    const cryptoAvg = recent.reduce((sum, s) => sum + s.crypto, 0) / recent.length;
    const fgAvg = recent.reduce((sum, s) => sum + s.fearGreed, 0) / recent.length;
    const latest = history[history.length - 1];

    const scoreDelta = (latest.stock - stockAvg) + (latest.crypto - cryptoAvg) * 0.01 + (latest.fearGreed - fgAvg);
    const trend = scoreDelta > 5 ? 'improving' : scoreDelta < -5 ? 'declining' : 'stable';

    return {
      stockAvg7d: stockAvg,
      stockCurrent: latest.stock,
      cryptoAvg7d: cryptoAvg,
      cryptoCurrent: latest.crypto,
      fearGreedAvg7d: fgAvg,
      fearGreedCurrent: latest.fearGreed,
      trend,
    };
  }

  /** Record today's snapshot for historical tracking */
  static recordDailySnapshot(stock: number, crypto: number, fearGreed: number): void {
    const date = new Date().toISOString().split('T')[0];
    FinancialDataService.historicalSnapshots.push({ date, stock, crypto, fearGreed });
    if (FinancialDataService.historicalSnapshots.length > 90) {
      FinancialDataService.historicalSnapshots.splice(0, FinancialDataService.historicalSnapshots.length - 90);
    }
  }

  // ---- Full Snapshot ----

  /** Get complete financial data snapshot with all modifiers */
  static async getFinancialSnapshot(): Promise<FinancialSnapshot> {
    const settings = FinancialDataService.settings;

    let stockMarket: StockMarketSummary | null = null;
    let commodities: CommodityQuote[] = [];
    let cryptoData: CryptoMarketData | null = null;
    let fearGreedDetail: FearGreedDetail | null = null;
    let economicIndicators: EconomicIndicator[] = [];
    let economicForecast: EconomicForecast | null = null;
    let sectorPerformance: SectorPerformance[] = [];
    let currencyRates: CurrencyRate[] = [];
    let interestRate: InterestRateData | null = null;
    let vixData: VixData | null = null;

    // T-1024: Graceful fallback on API failure
    if (settings.stockMarketEnabled) {
      try { stockMarket = await FinancialDataService.fetchStockMarket(); } catch { /* use null */ }
    }
    if (settings.commoditiesEnabled) {
      try { commodities = await FinancialDataService.fetchCommodityPrices(); } catch { /* use empty */ }
    }
    if (settings.cryptoEnabled) {
      try { cryptoData = await FinancialDataService.fetchCryptoData(); } catch { /* use null */ }
    }
    try { fearGreedDetail = await FinancialDataService.fetchFearGreedDetail(); } catch { /* use null */ }
    if (settings.economicIndicatorsEnabled) {
      try {
        economicIndicators = await FinancialDataService.fetchEconomicIndicators();
        economicForecast = await FinancialDataService.getEconomicForecast();
      } catch { /* use empty */ }
    }
    if (settings.sectorRotationEnabled) {
      try { sectorPerformance = await FinancialDataService.fetchSectorPerformance(); } catch { /* use empty */ }
    }
    if (settings.currencyExchangeEnabled) {
      try { currencyRates = await FinancialDataService.fetchCurrencyRates(); } catch { /* use empty */ }
    }
    if (settings.interestRatesEnabled) {
      try { interestRate = await FinancialDataService.fetchInterestRate(); } catch { /* use null */ }
    }
    try { vixData = await FinancialDataService.fetchVixData(); } catch { /* use null */ }

    // T-1025: Anomaly detection
    const anomalies = detectFinancialAnomalies(
      {
        stockChangePct: stockMarket?.changePct,
        cryptoChangePct: cryptoData?.btcChangePct24h,
        vix: vixData?.value,
      },
      {
        stockChangePct: 0,
        cryptoChangePct: 0,
        vix: 20,
      },
    );

    // Build modifier summary
    const modifiers = FinancialDataService.computeModifiers(
      stockMarket, commodities, cryptoData, fearGreedDetail, vixData,
      currencyRates, interestRate, sectorPerformance, economicForecast,
    );

    // Generate fantasy news feed
    const fantasyNewsFeed = FinancialDataService.generateFantasyNewsFeed(
      stockMarket, cryptoData, commodities, economicForecast,
    );

    // Historical comparison
    const historicalComparison = FinancialDataService.getHistoricalComparison();

    // Record daily snapshot
    if (stockMarket || cryptoData || fearGreedDetail) {
      FinancialDataService.recordDailySnapshot(
        stockMarket?.value ?? 0,
        cryptoData?.btcPrice ?? 0,
        fearGreedDetail?.value ?? 50,
      );
    }

    return {
      stockMarket,
      commodities,
      cryptoData,
      fearGreedDetail,
      economicIndicators,
      economicForecast,
      sectorPerformance,
      currencyRates,
      interestRate,
      vixData,
      anomalies,
      historicalComparison,
      modifiers,
      fantasyNewsFeed,
      lastUpdated: new Date().toISOString(),
    };
  }

  // ---- Modifier Computation (T-1027) ----

  private static computeModifiers(
    stock: StockMarketSummary | null,
    commodities: CommodityQuote[],
    crypto: CryptoMarketData | null,
    fng: FearGreedDetail | null,
    vix: VixData | null,
    forex: CurrencyRate[],
    interest: InterestRateData | null,
    sectors: SectorPerformance[],
    econ: EconomicForecast | null,
  ): FinancialModifierSummary {
    const mods: FinancialModifierSummary = {
      tradeValueModifier: 1.0,
      rareItemChanceBonus: 0,
      goldCostModifier: 1.0,
      fuelCostModifier: 1.0,
      foodProductionModifier: 1.0,
      equipmentCostModifier: 1.0,
      expeditionDangerModifier: 1.0,
      expeditionRewardModifier: 1.0,
      defenseBonus: 1.0,
      defensiveItemDiscount: 0,
      luxuryItemInflation: 0,
      crossRegionTradeModifier: 1.0,
      loanInterestRate: 0.05,
      buildingLoanCost: 1.0,
      economicPriceMultiplier: 1.0,
      observatoryEfficiency: 1.0,
      templeEfficiency: 1.0,
      mineEfficiency: 1.0,
      farmEfficiency: 1.0,
    };

    if (stock) {
      mods.tradeValueModifier = stock.merchantEffect.tradeValueModifier;
      mods.rareItemChanceBonus = stock.merchantEffect.rareItemChanceBonus;
    }

    for (const c of commodities) {
      if (c.symbol === 'GC=F' || c.name === 'Gold') {
        const effect = goldPriceToEffect(c.changePct);
        mods.goldCostModifier = effect.costModifier;
      } else if (c.symbol === 'CL=F' || c.name === 'Oil') {
        const effect = oilPriceToEffect(c.changePct);
        mods.fuelCostModifier = effect.costModifier;
      } else if (c.symbol === 'ZW=F' || c.name === 'Wheat') {
        const effect = wheatPriceToEffect(c.changePct);
        mods.foodProductionModifier = effect.productionModifier;
      } else if (c.symbol === 'SI=F' || c.name === 'Silver') {
        const effect = silverPriceToEffect(c.changePct);
        mods.equipmentCostModifier = effect.costModifier;
      }
    }

    if (crypto) {
      mods.expeditionRewardModifier = crypto.expeditionEffect.rewardMultiplier;
      mods.defenseBonus = crypto.defenseEffect.defenseBonus;
    }

    if (fng) {
      mods.defensiveItemDiscount = fng.merchantEffect.defensiveItemDiscount;
      mods.luxuryItemInflation = fng.merchantEffect.luxuryItemInflation;
    }

    if (vix) {
      mods.expeditionDangerModifier = vix.expeditionEffect.dangerModifier;
    }

    if (forex.length > 0) {
      const avgChange = forex.reduce((sum, r) => sum + r.changePct, 0) / forex.length;
      const fxEffect = exchangeRateToTradeModifier(avgChange);
      mods.crossRegionTradeModifier = fxEffect.crossRegionTradeModifier;
    }

    if (interest) {
      mods.loanInterestRate = interest.loanEffect.loanInterestRate;
      mods.buildingLoanCost = interest.loanEffect.buildingLoanCost;
    }

    if (econ) {
      mods.economicPriceMultiplier = econ.currentPhase.priceMultiplier;
    }

    for (const s of sectors) {
      const effect = sectorToBuilding(s.sector, s.changePct);
      switch (effect.building) {
        case 'observatory': mods.observatoryEfficiency = effect.efficiencyModifier; break;
        case 'temple': mods.templeEfficiency = effect.efficiencyModifier; break;
        case 'mine': mods.mineEfficiency = effect.efficiencyModifier; break;
        case 'farm': mods.farmEfficiency = effect.efficiencyModifier; break;
      }
    }

    return mods;
  }

  // ---- Fantasy News Feed ----

  private static generateFantasyNewsFeed(
    stock: StockMarketSummary | null,
    crypto: CryptoMarketData | null,
    commodities: CommodityQuote[],
    econ: EconomicForecast | null,
  ): FantasyNewsItem[] {
    const news: FantasyNewsItem[] = [];
    const now = new Date().toISOString();

    if (stock) {
      news.push({
        headline: generateFantasyHeadline({
          type: 'stock',
          direction: stock.changePct > 0.5 ? 'up' : stock.changePct < -0.5 ? 'down' : 'neutral',
          magnitude: Math.min(1, Math.abs(stock.changePct) / 5),
          subject: 'S&P 500',
        }),
        source: 'Sapphire Exchange Herald',
        category: 'stock',
        timestamp: now,
      });
    }

    if (crypto) {
      news.push({
        headline: generateFantasyHeadline({
          type: 'crypto',
          direction: crypto.sentiment > 20 ? 'up' : crypto.sentiment < -20 ? 'down' : 'neutral',
          magnitude: Math.min(1, Math.abs(crypto.sentiment) / 80),
          subject: 'Bitcoin',
        }),
        source: 'Aetherial Gazette',
        category: 'crypto',
        timestamp: now,
      });
    }

    for (const c of commodities.slice(0, 2)) {
      news.push({
        headline: generateFantasyHeadline({
          type: 'commodity',
          direction: c.changePct > 1 ? 'up' : c.changePct < -1 ? 'down' : 'neutral',
          magnitude: Math.min(1, Math.abs(c.changePct) / 5),
          subject: c.name.toLowerCase(),
        }),
        source: 'Merchant Guild Circular',
        category: 'commodity',
        timestamp: now,
      });
    }

    if (econ) {
      news.push({
        headline: generateFantasyHeadline({
          type: 'economic',
          direction: econ.trend === 'improving' ? 'up' : econ.trend === 'declining' ? 'down' : 'neutral',
          magnitude: 0.5,
          subject: 'GDP',
        }),
        source: 'Royal Treasury Report',
        category: 'economic',
        timestamp: now,
      });
    }

    return news;
  }

  // ---- Health Check (T-1051) ----

  static async getHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    sources: Array<{ source: string; status: string; lastUpdate: string | null }>;
    anomalyCount: number;
    mockMode: boolean;
  }> {
    const sourcesChecks: Array<{ source: string; status: string; lastUpdate: string | null }> = [];
    const sources = ['financial-stock', 'financial-crypto', 'financial-fng', 'financial-vix', 'financial-commodities'];

    let healthyCount = 0;
    for (const source of sources) {
      const cached = dataCache.getStale(source.replace('financial-', 'financial:'));
      if (cached) {
        healthyCount++;
        sourcesChecks.push({ source, status: 'ok', lastUpdate: new Date(cached.fetchedAt).toISOString() });
      } else {
        sourcesChecks.push({ source, status: 'no_data', lastUpdate: null });
      }
    }

    const status = healthyCount >= 4 ? 'healthy' : healthyCount >= 2 ? 'degraded' : 'unhealthy';

    return {
      status,
      sources: sourcesChecks,
      anomalyCount: FinancialDataService.eventNotifications.length,
      mockMode: MOCK_MODE,
    };
  }

  // ---- Mock Data (T-1042) ----

  private static mockStockMarket(): StockMarketSummary {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const changePct = ((dayOfYear * 17) % 800 - 400) / 100;
    const merchantEffect = stockMarketToMerchantEffect(changePct);
    return {
      index: 'Sapphire Exchange Index',
      value: 4500 + (dayOfYear * 5) % 600,
      change: changePct * 45,
      changePct,
      marketOpen: isMarketOpen(),
      merchantEffect,
      timestamp: new Date().toISOString(),
    };
  }

  private static mockCommodities(): CommodityQuote[] {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return [
      {
        symbol: 'GC=F', name: 'Gold',
        price: 2000 + (dayOfYear * 3) % 200,
        change: ((dayOfYear * 7) % 60 - 30),
        changePct: ((dayOfYear * 7) % 60 - 30) / 20,
        timestamp: new Date().toISOString(),
      },
      {
        symbol: 'SI=F', name: 'Silver',
        price: 24 + (dayOfYear * 2) % 8,
        change: ((dayOfYear * 5) % 30 - 15) / 10,
        changePct: ((dayOfYear * 5) % 30 - 15) / 25,
        timestamp: new Date().toISOString(),
      },
      {
        symbol: 'CL=F', name: 'Oil',
        price: 70 + (dayOfYear * 4) % 30,
        change: ((dayOfYear * 11) % 80 - 40) / 10,
        changePct: ((dayOfYear * 11) % 80 - 40) / 75,
        timestamp: new Date().toISOString(),
      },
      {
        symbol: 'ZW=F', name: 'Wheat',
        price: 550 + (dayOfYear * 6) % 150,
        change: ((dayOfYear * 9) % 50 - 25),
        changePct: ((dayOfYear * 9) % 50 - 25) / 55,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  private static mockCryptoData(): CryptoMarketData {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const hour = new Date().getHours();
    const sentiment = ((dayOfYear * 13 + hour * 5) % 200) - 100;
    const btcPrice = 40000 + (dayOfYear * 150) % 30000;
    const btcChange = ((dayOfYear * 19) % 10000 - 5000);
    return {
      btcPrice,
      btcChange24h: btcChange,
      btcChangePct24h: (btcChange / btcPrice) * 100,
      sentiment,
      volatilityIndex: calculateCryptoVolatilityIndex([(btcChange / btcPrice) * 100]),
      expeditionEffect: cryptoBullMarketToExpedition(sentiment),
      defenseEffect: cryptoBearMarketToDefense(sentiment),
      timestamp: new Date().toISOString(),
    };
  }

  private static mockFearGreedDetail(): FearGreedDetail {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const value = 20 + ((dayOfYear * 11) % 60);
    const classifications = ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'];
    return {
      value,
      classification: classifications[Math.floor(value / 20)],
      previousClose: value + ((dayOfYear * 3) % 10 - 5),
      weekAgo: value + ((dayOfYear * 7) % 20 - 10),
      monthAgo: value + ((dayOfYear * 13) % 30 - 15),
      merchantEffect: fearGreedToMerchantBehavior(value),
      timestamp: new Date().toISOString(),
    };
  }

  private static mockVixData(): VixData {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const value = 12 + ((dayOfYear * 7) % 25);
    return {
      value,
      change: ((dayOfYear * 3) % 6 - 3),
      expeditionEffect: vixToExpeditionDanger(value),
      timestamp: new Date().toISOString(),
    };
  }

  private static mockCurrencyRates(): CurrencyRate[] {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return [
      {
        pair: 'USD/EUR', rate: 0.85 + ((dayOfYear * 3) % 10) / 100,
        change: ((dayOfYear * 5) % 4 - 2) / 100,
        changePct: ((dayOfYear * 5) % 4 - 2) / 0.85,
        timestamp: new Date().toISOString(),
      },
      {
        pair: 'USD/JPY', rate: 140 + ((dayOfYear * 7) % 20),
        change: ((dayOfYear * 11) % 4 - 2),
        changePct: ((dayOfYear * 11) % 4 - 2) / 1.5,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  private static mockInterestRate(): InterestRateData {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const rate = 2 + ((dayOfYear * 3) % 40) / 10;
    return {
      rate,
      previousRate: rate + ((dayOfYear * 7) % 10 - 5) / 10,
      loanEffect: interestRateToLoanEffect(rate),
      timestamp: new Date().toISOString(),
    };
  }

  private static mockEconomicIndicators(): EconomicIndicator[] {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return [
      { name: 'GDP Growth', value: 1 + ((dayOfYear * 3) % 40) / 10, previousValue: 2.0, unit: '%', timestamp: new Date().toISOString() },
      { name: 'Unemployment', value: 3 + ((dayOfYear * 5) % 30) / 10, previousValue: 3.5, unit: '%', timestamp: new Date().toISOString() },
      { name: 'Inflation', value: 1.5 + ((dayOfYear * 7) % 40) / 10, previousValue: 2.5, unit: '%', timestamp: new Date().toISOString() },
    ];
  }

  private static mockSectorPerformance(): SectorPerformance[] {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return [
      { sector: 'technology', changePct: ((dayOfYear * 11) % 80 - 40) / 10, fantasyBuilding: 'Observatory', timestamp: new Date().toISOString() },
      { sector: 'healthcare', changePct: ((dayOfYear * 7) % 60 - 30) / 10, fantasyBuilding: 'Temple', timestamp: new Date().toISOString() },
      { sector: 'energy', changePct: ((dayOfYear * 13) % 70 - 35) / 10, fantasyBuilding: 'Mine', timestamp: new Date().toISOString() },
      { sector: 'agriculture', changePct: ((dayOfYear * 9) % 50 - 25) / 10, fantasyBuilding: 'Farm', timestamp: new Date().toISOString() },
    ];
  }
}
