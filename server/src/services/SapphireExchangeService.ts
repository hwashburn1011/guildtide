/**
 * SapphireExchangeService — In-game exchange system reflecting real markets.
 *
 * T-0995: Stock market summary in Observatory building
 * T-1004: Commodity price chart with real-world comparison
 * T-1018: Market volatility indicator in expedition planning
 * T-1036: IPO frenzy event boosts market activity
 * T-1037: Recession warnings trigger NPC stockpiling
 * T-1038: Portfolio tracker for in-game investments
 * T-1039: Dividend payment system from investments
 * T-1040: Market sector dashboard
 * T-1041: Bond yield data for stability modifier
 * T-1046: Real-world market event calendar
 * T-1047: Earnings season detection for merchant guild events
 * T-1048: Financial data contribution to monthly guild report
 * T-1049: Financial sentiment shift notification
 * T-1050: Financial data visualization in research tree
 * T-1052: Impact simulation tool for balance testing
 * T-1053: Bankruptcy protection during extreme events
 * T-1055: Gold standard toggle (peg currency to gold)
 * T-1056: Commodity futures in-game trading
 * T-1057: Market ticker scrolling display
 * T-1058: Financial data privacy notice and opt-in
 * T-1059: Aggregate anonymized reporting
 * T-1060: Economic newspaper NPC
 * T-1061: Quarterly economic event from GDP data
 * T-1062: Trade war event from international news
 * T-1063: Inflation meter affecting prices
 * T-1064: Deflation event reversing prices
 * T-1065: Market manipulation detection for auctions
 * T-1066: Economic advisor NPC
 * T-1067: Stock split event -> resource doubling
 * T-1068: Financial data loading skeleton
 * T-1069: Sector rotation calendar
 * T-1070: End-of-quarter financial summary event
 */
import { FinancialDataService, type FinancialSnapshot } from './FinancialDataService';
import { translateToFantasy, type SectorPerformance } from '../data/financialMappings';

// ---- Venture / Investment System (T-1038, T-1039) ----

export interface PlayerVenture {
  id: string;
  playerId: string;
  ventureName: string;
  sector: string;
  investedGold: number;
  purchaseDate: string;
  currentValue: number;
  returnPct: number;
  dividendAccrued: number;
  status: 'active' | 'matured' | 'liquidated';
}

// ---- Market Events ----

export interface SapphireExchangeEvent {
  id: string;
  type: string;
  fantasyTitle: string;
  fantasyDescription: string;
  effects: Record<string, number>;
  duration: number; // hours
  startedAt: string;
  expiresAt: string;
}

// ---- Economic Newspaper NPC (T-1060) ----

export interface NewspaperArticle {
  headline: string;
  body: string;
  source: string;
  category: string;
  timestamp: string;
}

// ---- Advisor NPC (T-1066) ----

export interface AdvisorPrediction {
  topic: string;
  prediction: string;
  confidence: number; // 0-1
  fantasyRationale: string;
  timestamp: string;
}

// ---- Service ----

export class SapphireExchangeService {
  private static ventures = new Map<string, PlayerVenture[]>(); // playerId -> ventures
  private static activeEvents: SapphireExchangeEvent[] = [];
  private static inflationMeter: number = 1.0; // T-1063
  private static goldStandardEnabled: boolean = false; // T-1055
  private static consentedPlayers = new Set<string>(); // T-1058
  private static previousSentiment: number | null = null; // T-1049
  private static manipulationFlags = new Map<string, number>(); // T-1065

  // ---- Privacy Consent (T-1058) ----

  static setFinancialConsent(playerId: string, consented: boolean): void {
    if (consented) {
      SapphireExchangeService.consentedPlayers.add(playerId);
    } else {
      SapphireExchangeService.consentedPlayers.delete(playerId);
    }
  }

  static hasFinancialConsent(playerId: string): boolean {
    return SapphireExchangeService.consentedPlayers.has(playerId);
  }

  static getPrivacyNotice(): {
    title: string;
    description: string;
    dataUsed: string[];
    dataNotStored: string[];
  } {
    return {
      title: 'Sapphire Exchange Data Notice',
      description: 'The Sapphire Exchange uses anonymized market trend data to influence in-game economics. No personal financial data is collected or stored.',
      dataUsed: [
        'Aggregate market indices (direction only, not specific values)',
        'Commodity price trends (not specific prices)',
        'Market sentiment indicators',
      ],
      dataNotStored: [
        'Your personal financial information',
        'Your browsing or trading activity outside the game',
        'Any identifying financial data',
      ],
    };
  }

  // ---- Observatory Summary (T-0995) ----

  static async getObservatorySummary(): Promise<{
    sapphireIndex: { value: number; trend: string; fantasyDescription: string };
    commodityOverview: Array<{ name: string; fantasyName: string; trend: string; effect: string }>;
    sentimentGauge: { label: string; value: number; description: string };
    stormIndex: { label: string; value: number; description: string };
    economicPhase: { name: string; description: string };
  }> {
    const snapshot = await FinancialDataService.getFinancialSnapshot();

    return {
      sapphireIndex: {
        value: snapshot.stockMarket?.value ?? 0,
        trend: (snapshot.stockMarket?.changePct ?? 0) > 0 ? 'rising' : (snapshot.stockMarket?.changePct ?? 0) < 0 ? 'falling' : 'stable',
        fantasyDescription: snapshot.stockMarket?.merchantEffect.fantasyDescription ?? 'No data from the Sapphire Exchange.',
      },
      commodityOverview: snapshot.commodities.map(c => ({
        name: c.name,
        fantasyName: translateToFantasy(c.name.toLowerCase()),
        trend: c.changePct > 1 ? 'rising' : c.changePct < -1 ? 'falling' : 'stable',
        effect: `${c.changePct > 0 ? '+' : ''}${c.changePct.toFixed(1)}% impact on related resources`,
      })),
      sentimentGauge: {
        label: snapshot.fearGreedDetail?.classification ?? 'Unknown',
        value: snapshot.fearGreedDetail?.value ?? 50,
        description: snapshot.fearGreedDetail?.merchantEffect.fantasyDescription ?? 'The merchants reveal nothing.',
      },
      stormIndex: {
        label: snapshot.vixData?.expeditionEffect.fantasyName ?? 'Unknown',
        value: snapshot.vixData?.value ?? 15,
        description: snapshot.vixData?.expeditionEffect.fantasyDescription ?? 'Storm readings unavailable.',
      },
      economicPhase: {
        name: snapshot.economicForecast?.currentPhase.fantasyName ?? 'Unknown',
        description: snapshot.economicForecast?.currentPhase.description ?? 'Economic seers remain silent.',
      },
    };
  }

  // ---- Venture Investment System (T-1038, T-1039) ----

  static createVenture(
    playerId: string,
    sector: string,
    investedGold: number,
  ): PlayerVenture {
    const ventures = SapphireExchangeService.ventures.get(playerId) || [];
    const venture: PlayerVenture = {
      id: `venture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerId,
      ventureName: SapphireExchangeService.generateVentureName(sector),
      sector,
      investedGold,
      purchaseDate: new Date().toISOString(),
      currentValue: investedGold,
      returnPct: 0,
      dividendAccrued: 0,
      status: 'active',
    };
    ventures.push(venture);
    SapphireExchangeService.ventures.set(playerId, ventures);
    return venture;
  }

  static getPlayerVentures(playerId: string): PlayerVenture[] {
    return SapphireExchangeService.ventures.get(playerId) || [];
  }

  /** T-1039: Process dividend payments based on sector performance */
  static processDividends(playerId: string, sectorPerformances: SectorPerformance[]): {
    totalDividend: number;
    ventureUpdates: Array<{ ventureId: string; dividend: number; newValue: number }>;
  } {
    const ventures = SapphireExchangeService.ventures.get(playerId) || [];
    let totalDividend = 0;
    const updates: Array<{ ventureId: string; dividend: number; newValue: number }> = [];

    for (const venture of ventures) {
      if (venture.status !== 'active') continue;

      const sectorData = sectorPerformances.find(s => s.sector === venture.sector);
      const changePct = sectorData?.changePct ?? 0;

      // Dividend: base 1% + sector performance * 0.5%
      const dividendRate = Math.max(0, 0.01 + (changePct / 100) * 0.5);
      const dividend = Math.floor(venture.investedGold * dividendRate);
      venture.dividendAccrued += dividend;

      // Value changes with sector performance
      venture.currentValue = Math.floor(venture.investedGold * (1 + changePct / 100));
      venture.returnPct = ((venture.currentValue - venture.investedGold) / venture.investedGold) * 100;

      totalDividend += dividend;
      updates.push({ ventureId: venture.id, dividend, newValue: venture.currentValue });
    }

    return { totalDividend, ventureUpdates: updates };
  }

  static liquidateVenture(playerId: string, ventureId: string): {
    goldReturned: number;
    profitLoss: number;
  } | null {
    const ventures = SapphireExchangeService.ventures.get(playerId) || [];
    const venture = ventures.find(v => v.id === ventureId);
    if (!venture || venture.status !== 'active') return null;

    venture.status = 'liquidated';
    const goldReturned = venture.currentValue + venture.dividendAccrued;
    const profitLoss = goldReturned - venture.investedGold;

    return { goldReturned, profitLoss };
  }

  private static generateVentureName(sector: string): string {
    const names: Record<string, string[]> = {
      technology: ['Arcane Innovations Fund', 'Crystal Computing Consortium', 'Runic Networks Guild'],
      healthcare: ['Temple Healing Trust', 'Restoration Arts Fund', 'Sacred Waters Collective'],
      energy: ['Elemental Forge Alliance', 'Darkfire Mining Company', 'Stormharvest Syndicate'],
      agriculture: ['Golden Grain Exchange', 'Harvest Moon Cooperative', 'Fertile Plains Trust'],
    };
    const pool = names[sector] || ['General Merchant Venture', 'Guild Commerce Trust', 'Regional Trade Fund'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ---- Market Events (T-1036, T-1037, T-1047, T-1061, T-1062, T-1064, T-1067, T-1070) ----

  /** T-1036: IPO frenzy boosts market activity */
  static triggerIpoFrenzy(): SapphireExchangeEvent {
    return SapphireExchangeService.createEvent(
      'ipo_frenzy',
      'Guild Charter Frenzy',
      'A wave of new guild charters flood the Sapphire Exchange! Market activity surges as investors scramble for shares.',
      { marketActivity: 1.30, tradeVolume: 1.25, rareItemChance: 0.90 },
      24,
    );
  }

  /** T-1037: Recession warnings trigger NPC stockpiling */
  static triggerRecessionWarning(): SapphireExchangeEvent {
    return SapphireExchangeService.createEvent(
      'recession_warning',
      'Lean Times Warning',
      'Seers warn of approaching hardship. NPC merchants begin hoarding essential supplies, driving up prices.',
      { npcPrices: 1.20, supplyAvailability: 0.80, stockpilingBonus: 1.15 },
      48,
    );
  }

  /** T-1047: Earnings season -> merchant guild special events */
  static triggerEarningsSeason(): SapphireExchangeEvent {
    return SapphireExchangeService.createEvent(
      'earnings_season',
      'Guild Reckoning Season',
      'Merchant guilds open their ledgers for quarterly review. Surprises lurk in every transaction.',
      { merchantReputation: 1.10, tradeVolume: 1.20, priceVolatility: 1.15 },
      72,
    );
  }

  /** T-1061: Quarterly economic event from GDP */
  static triggerQuarterlyEconomicEvent(gdpGrowth: number): SapphireExchangeEvent {
    const positive = gdpGrowth > 2;
    return SapphireExchangeService.createEvent(
      'quarterly_report',
      positive ? 'Realm Prosperity Report: Growth!' : 'Realm Prosperity Report: Stagnation',
      positive
        ? 'The quarterly Realm Prosperity Index rises! Guilds celebrate with expanded trade and bonuses.'
        : 'The quarterly Realm Prosperity Index disappoints. Guilds tighten their belts.',
      positive
        ? { morale: 1.10, tradeVolume: 1.15, guildXP: 1.10 }
        : { morale: 0.90, tradeVolume: 0.85, resourceCost: 1.10 },
      168, // 1 week
    );
  }

  /** T-1062: Trade war event */
  static triggerTradeWar(): SapphireExchangeEvent {
    return SapphireExchangeService.createEvent(
      'trade_war',
      'The Great Embargo',
      'Rival merchant factions impose tariffs! Cross-region trade suffers while local production gains favor.',
      { crossRegionTrade: 0.70, localProduction: 1.20, diplomaticTension: 1.50 },
      96,
    );
  }

  /** T-1064: Deflation event */
  static triggerDeflation(): SapphireExchangeEvent {
    SapphireExchangeService.inflationMeter = Math.max(0.8, SapphireExchangeService.inflationMeter - 0.05);
    return SapphireExchangeService.createEvent(
      'deflation',
      'The Price Collapse',
      'A sudden deflation sweeps the markets! Prices fall across the board, but merchants reduce their stocks.',
      { allPrices: 0.85, merchantStock: 0.70, savingsValue: 1.15 },
      48,
    );
  }

  /** T-1067: Stock split -> resource doubling */
  static triggerResourceSplit(resource: string): SapphireExchangeEvent {
    const fantasyResource = translateToFantasy(resource);
    return SapphireExchangeService.createEvent(
      'resource_split',
      `${fantasyResource} Bounty Split`,
      `A magical duplication event affects ${fantasyResource}! Quantities double but individual unit value halves.`,
      { [`${resource}Quantity`: 2.0, [`${resource}UnitValue`]: 0.5 },
      24,
    );
  }

  /** T-1070: End-of-quarter financial summary with bonuses */
  static triggerEndOfQuarterSummary(quarterNum: number): SapphireExchangeEvent {
    return SapphireExchangeService.createEvent(
      'quarter_end',
      `Quarter ${quarterNum} Grand Tally`,
      `The ${quarterNum}${['st', 'nd', 'rd', 'th'][Math.min(quarterNum - 1, 3)]} quarter concludes! All guilds receive performance bonuses based on their quarterly activity.`,
      { guildXP: 1.20, gold: 1.10, morale: 1.05 },
      24,
    );
  }

  private static createEvent(
    type: string,
    title: string,
    description: string,
    effects: Record<string, number>,
    durationHours: number,
  ): SapphireExchangeEvent {
    const now = new Date();
    const event: SapphireExchangeEvent = {
      id: `exchange-${type}-${Date.now()}`,
      type,
      fantasyTitle: title,
      fantasyDescription: description,
      effects,
      duration: durationHours,
      startedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + durationHours * 60 * 60 * 1000).toISOString(),
    };
    SapphireExchangeService.activeEvents.push(event);
    // Clean expired events
    SapphireExchangeService.activeEvents = SapphireExchangeService.activeEvents.filter(
      e => new Date(e.expiresAt).getTime() > Date.now(),
    );
    return event;
  }

  static getActiveEvents(): SapphireExchangeEvent[] {
    SapphireExchangeService.activeEvents = SapphireExchangeService.activeEvents.filter(
      e => new Date(e.expiresAt).getTime() > Date.now(),
    );
    return SapphireExchangeService.activeEvents;
  }

  // ---- Inflation Meter (T-1063) ----

  static getInflationMeter(): number {
    return SapphireExchangeService.inflationMeter;
  }

  /** T-1063: Gradually apply inflation based on economic indicators */
  static updateInflation(inflationRate: number): void {
    // Slowly drift toward real-world-influenced target
    const target = 1.0 + (inflationRate - 2) * 0.02; // 2% = neutral
    SapphireExchangeService.inflationMeter += (target - SapphireExchangeService.inflationMeter) * 0.1;
    SapphireExchangeService.inflationMeter = Math.max(0.7, Math.min(1.3, SapphireExchangeService.inflationMeter));
  }

  // ---- Gold Standard Toggle (T-1055) ----

  static setGoldStandard(enabled: boolean): void {
    SapphireExchangeService.goldStandardEnabled = enabled;
  }

  static isGoldStandard(): boolean {
    return SapphireExchangeService.goldStandardEnabled;
  }

  static getGoldPegModifier(goldChangePct: number): number {
    if (!SapphireExchangeService.goldStandardEnabled) return 1.0;
    return 1.0 + (goldChangePct / 100) * 0.3;
  }

  // ---- Commodity Futures In-Game (T-1056) ----

  private static commodityFutures: Array<{
    id: string;
    playerId: string;
    commodity: string;
    quantity: number;
    purchasePrice: number;
    maturityDate: string;
    settled: boolean;
  }> = [];

  static createCommodityFuture(playerId: string, commodity: string, quantity: number, price: number, maturityHours: number): {
    id: string;
    commodity: string;
    quantity: number;
    price: number;
    maturityDate: string;
  } {
    const future = {
      id: `cfuture-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId,
      commodity,
      quantity,
      purchasePrice: price,
      maturityDate: new Date(Date.now() + maturityHours * 60 * 60 * 1000).toISOString(),
      settled: false,
    };
    SapphireExchangeService.commodityFutures.push(future);
    return {
      id: future.id,
      commodity: future.commodity,
      quantity: future.quantity,
      price: future.purchasePrice,
      maturityDate: future.maturityDate,
    };
  }

  static getPlayerFutures(playerId: string): typeof SapphireExchangeService.commodityFutures {
    return SapphireExchangeService.commodityFutures.filter(f => f.playerId === playerId && !f.settled);
  }

  // ---- Market Ticker (T-1057) ----

  static async getMarketTicker(): Promise<Array<{
    symbol: string;
    fantasyName: string;
    direction: 'up' | 'down' | 'flat';
    changePct: number;
    shortDescription: string;
  }>> {
    const snapshot = await FinancialDataService.getFinancialSnapshot();
    const items: Array<{
      symbol: string;
      fantasyName: string;
      direction: 'up' | 'down' | 'flat';
      changePct: number;
      shortDescription: string;
    }> = [];

    if (snapshot.stockMarket) {
      items.push({
        symbol: 'SEI',
        fantasyName: 'Sapphire Exchange',
        direction: snapshot.stockMarket.changePct > 0.1 ? 'up' : snapshot.stockMarket.changePct < -0.1 ? 'down' : 'flat',
        changePct: snapshot.stockMarket.changePct,
        shortDescription: snapshot.stockMarket.merchantEffect.merchantMood,
      });
    }

    for (const c of snapshot.commodities) {
      items.push({
        symbol: c.symbol,
        fantasyName: translateToFantasy(c.name.toLowerCase()),
        direction: c.changePct > 0.5 ? 'up' : c.changePct < -0.5 ? 'down' : 'flat',
        changePct: c.changePct,
        shortDescription: c.changePct > 1 ? 'surging' : c.changePct < -1 ? 'dropping' : 'steady',
      });
    }

    if (snapshot.cryptoData) {
      items.push({
        symbol: 'AEC',
        fantasyName: 'Aethercoin',
        direction: snapshot.cryptoData.sentiment > 10 ? 'up' : snapshot.cryptoData.sentiment < -10 ? 'down' : 'flat',
        changePct: snapshot.cryptoData.btcChangePct24h,
        shortDescription: snapshot.cryptoData.sentiment > 50 ? 'moon mode' : snapshot.cryptoData.sentiment < -50 ? 'winter' : 'neutral',
      });
    }

    return items;
  }

  // ---- Market Sector Dashboard (T-1040) ----

  static async getSectorDashboard(): Promise<Array<{
    sector: string;
    fantasyName: string;
    affectedBuilding: string;
    changePct: number;
    efficiencyModifier: number;
    description: string;
  }>> {
    const snapshot = await FinancialDataService.getFinancialSnapshot();
    return snapshot.sectorPerformance.map(s => {
      const mapping: Record<string, { fantasy: string; building: string }> = {
        technology: { fantasy: 'Arcane Sciences', building: 'Observatory' },
        healthcare: { fantasy: 'Healing Arts', building: 'Temple' },
        energy: { fantasy: 'Elemental Forges', building: 'Mine' },
        agriculture: { fantasy: 'Harvest Guilds', building: 'Farm' },
      };
      const m = mapping[s.sector] || { fantasy: s.sector, building: 'General' };
      return {
        sector: s.sector,
        fantasyName: m.fantasy,
        affectedBuilding: m.building,
        changePct: s.changePct,
        efficiencyModifier: 1.0 + (s.changePct / 100) * 0.5,
        description: s.changePct > 1
          ? `${m.fantasy} flourish, boosting ${m.building} efficiency.`
          : s.changePct < -1
            ? `${m.fantasy} struggle, reducing ${m.building} output.`
            : `${m.fantasy} hold steady.`,
      };
    });
  }

  // ---- Bond Yield / Stability (T-1041) ----

  static getBondYieldStabilityModifier(bondYield: number = 4.0): {
    stabilityModifier: number;
    fantasyDescription: string;
  } {
    if (bondYield > 5) {
      return {
        stabilityModifier: 0.90,
        fantasyDescription: 'Guild Bonds demand high returns. Stability wavers as safe investments draw gold from commerce.',
      };
    } else if (bondYield > 3) {
      return {
        stabilityModifier: 1.0,
        fantasyDescription: 'Guild Bonds offer fair returns. The balance between safety and commerce holds.',
      };
    }
    return {
      stabilityModifier: 1.10,
      fantasyDescription: 'Guild Bonds pay little. Gold flows into commerce and ventures, boosting market stability.',
    };
  }

  // ---- Sentiment Shift Detection (T-1049) ----

  static checkSentimentShift(currentSentiment: number): {
    shifted: boolean;
    direction: 'bullish' | 'bearish' | 'none';
    fantasyMessage: string;
  } | null {
    if (SapphireExchangeService.previousSentiment === null) {
      SapphireExchangeService.previousSentiment = currentSentiment;
      return null;
    }

    const prev = SapphireExchangeService.previousSentiment;
    SapphireExchangeService.previousSentiment = currentSentiment;

    if (prev <= 40 && currentSentiment > 60) {
      return {
        shifted: true,
        direction: 'bullish',
        fantasyMessage: 'The winds shift! Fear gives way to greed as merchant confidence surges across the Sapphire Exchange.',
      };
    } else if (prev >= 60 && currentSentiment < 40) {
      return {
        shifted: true,
        direction: 'bearish',
        fantasyMessage: 'A chill wind blows through the trading halls. Greed retreats as caution grips the merchant guilds.',
      };
    }

    return { shifted: false, direction: 'none', fantasyMessage: '' };
  }

  // ---- Market Manipulation Detection (T-1065) ----

  static reportSuspiciousActivity(playerId: string, auctionId: string): void {
    const key = `${playerId}:${auctionId}`;
    const count = (SapphireExchangeService.manipulationFlags.get(key) || 0) + 1;
    SapphireExchangeService.manipulationFlags.set(key, count);
  }

  static checkManipulation(playerId: string): {
    flagged: boolean;
    suspiciousCount: number;
  } {
    let total = 0;
    for (const [key, count] of SapphireExchangeService.manipulationFlags.entries()) {
      if (key.startsWith(playerId)) total += count;
    }
    return { flagged: total >= 5, suspiciousCount: total };
  }

  // ---- Bankruptcy Protection (T-1053) ----

  static checkBankruptcyProtection(playerGold: number, marketCrashSeverity: number): {
    protected: boolean;
    protectedAmount: number;
    fantasyMessage: string;
  } {
    if (marketCrashSeverity < 0.5) {
      return { protected: false, protectedAmount: 0, fantasyMessage: '' };
    }

    // Protect minimum 100 gold during extreme market events
    const protectedAmount = Math.min(playerGold, 100);
    return {
      protected: true,
      protectedAmount,
      fantasyMessage: 'The Royal Treasury activates emergency protections! Your guild\'s minimum reserves are shielded from the market chaos.',
    };
  }

  // ---- Economic Newspaper NPC (T-1060) ----

  static async getNewspaperArticles(): Promise<NewspaperArticle[]> {
    const snapshot = await FinancialDataService.getFinancialSnapshot();
    const articles: NewspaperArticle[] = [];

    for (const item of snapshot.fantasyNewsFeed) {
      articles.push({
        headline: item.headline,
        body: `Our correspondents at the ${item.source} report the latest developments affecting guild commerce and trade across the realm.`,
        source: item.source,
        category: item.category,
        timestamp: item.timestamp,
      });
    }

    // Add economic phase article
    if (snapshot.economicForecast) {
      articles.push({
        headline: `Economic Seers Declare: "${snapshot.economicForecast.currentPhase.fantasyName}"`,
        body: snapshot.economicForecast.currentPhase.description,
        source: 'Royal Treasury Report',
        category: 'economic',
        timestamp: snapshot.lastUpdated,
      });
    }

    return articles;
  }

  // ---- Economic Advisor NPC (T-1066) ----

  static async getAdvisorPredictions(): Promise<AdvisorPrediction[]> {
    const snapshot = await FinancialDataService.getFinancialSnapshot();
    const predictions: AdvisorPrediction[] = [];

    if (snapshot.stockMarket) {
      const trend = snapshot.historicalComparison?.trend ?? 'stable';
      predictions.push({
        topic: 'Sapphire Exchange',
        prediction: trend === 'improving'
          ? 'I foresee continued prosperity. Consider investing in merchant ventures.'
          : trend === 'declining'
            ? 'Dark clouds gather over the Exchange. Prudent guilds should stockpile and fortify.'
            : 'The Exchange rests in equilibrium. Neither bold moves nor timid retreat serve well.',
        confidence: trend === 'stable' ? 0.5 : 0.7,
        fantasyRationale: `Based on my readings of the crystal indices, the ${trend} trend suggests ${trend === 'improving' ? 'opportunity' : trend === 'declining' ? 'caution' : 'patience'}.`,
        timestamp: new Date().toISOString(),
      });
    }

    if (snapshot.cryptoData) {
      predictions.push({
        topic: 'Aethercoin',
        prediction: snapshot.cryptoData.sentiment > 30
          ? 'The Aetherial currents surge with speculative energy. Bold expeditions may yield great rewards.'
          : snapshot.cryptoData.sentiment < -30
            ? 'The Aetherial currents wane. Focus on defense and resource preservation.'
            : 'The Aetherial realm is calm. Steady work beats speculation in times like these.',
        confidence: 0.6,
        fantasyRationale: `My scrying crystal reads the Aetherial sentiment at ${snapshot.cryptoData.sentiment > 0 ? 'positive' : 'negative'} energy levels.`,
        timestamp: new Date().toISOString(),
      });
    }

    return predictions;
  }

  // ---- Sector Rotation Calendar (T-1069) ----

  static getSectorRotationCalendar(): Array<{
    month: number;
    favoredSector: string;
    fantasyName: string;
    description: string;
  }> {
    return [
      { month: 1, favoredSector: 'technology', fantasyName: 'Arcane Sciences', description: 'The new year brings innovation. Observatory research accelerates.' },
      { month: 2, favoredSector: 'healthcare', fantasyName: 'Healing Arts', description: 'Winter ailments boost demand for Temple services.' },
      { month: 3, favoredSector: 'agriculture', fantasyName: 'Harvest Guilds', description: 'Spring planting season. Farms prepare for growth.' },
      { month: 4, favoredSector: 'agriculture', fantasyName: 'Harvest Guilds', description: 'Seedlings take root. Farm investments bear fruit.' },
      { month: 5, favoredSector: 'energy', fantasyName: 'Elemental Forges', description: 'Summer approaches. Mine and forge demand rises.' },
      { month: 6, favoredSector: 'energy', fantasyName: 'Elemental Forges', description: 'Peak energy season. Mine operations flourish.' },
      { month: 7, favoredSector: 'technology', fantasyName: 'Arcane Sciences', description: 'Mid-year innovations emerge from the Observatory.' },
      { month: 8, favoredSector: 'healthcare', fantasyName: 'Healing Arts', description: 'Summer heat drives demand for Temple cooling remedies.' },
      { month: 9, favoredSector: 'agriculture', fantasyName: 'Harvest Guilds', description: 'Harvest season begins. Farm yields reach their peak.' },
      { month: 10, favoredSector: 'technology', fantasyName: 'Arcane Sciences', description: 'Autumn brings a wave of arcane discoveries.' },
      { month: 11, favoredSector: 'healthcare', fantasyName: 'Healing Arts', description: 'Cooler weather brings illness. Temple healing in high demand.' },
      { month: 12, favoredSector: 'energy', fantasyName: 'Elemental Forges', description: 'Winter fuel demands surge. Mine and forge profits soar.' },
    ];
  }

  // ---- Monthly Guild Report Contribution (T-1048) ----

  static async getMonthlyFinancialReport(): Promise<{
    exchangeTrend: string;
    topPerformingSector: string;
    bottomPerformingSector: string;
    averageSentiment: string;
    venturePerformance: string;
    inflationRate: number;
    fantasyNarrative: string;
  }> {
    const snapshot = await FinancialDataService.getFinancialSnapshot();
    const sectors = snapshot.sectorPerformance;
    const top = sectors.reduce((best, s) => s.changePct > best.changePct ? s : best, sectors[0] || { sector: 'none', changePct: 0 });
    const bottom = sectors.reduce((worst, s) => s.changePct < worst.changePct ? s : worst, sectors[0] || { sector: 'none', changePct: 0 });

    return {
      exchangeTrend: (snapshot.stockMarket?.changePct ?? 0) > 0 ? 'Bullish' : 'Bearish',
      topPerformingSector: translateToFantasy(top?.sector + ' sector' || 'unknown'),
      bottomPerformingSector: translateToFantasy(bottom?.sector + ' sector' || 'unknown'),
      averageSentiment: snapshot.fearGreedDetail?.classification ?? 'Unknown',
      venturePerformance: 'Data compiled from active guild ventures',
      inflationRate: SapphireExchangeService.inflationMeter,
      fantasyNarrative: `This month's Sapphire Exchange report shows ${
        (snapshot.stockMarket?.changePct ?? 0) > 0 ? 'growing prosperity' : 'economic caution'
      } across the merchant guilds. The ${translateToFantasy(top?.sector + ' sector' || 'unknown')} leads all sectors, while the ${
        translateToFantasy(bottom?.sector + ' sector' || 'unknown')
      } lags behind.`,
    };
  }

  // ---- Impact Simulation (T-1052) ----

  static simulateImpact(params: {
    stockChangePct: number;
    fearGreedIndex: number;
    cryptoSentiment: number;
    goldChangePct: number;
  }): Record<string, number> {
    const stock = stockMarketToMerchantEffect(params.stockChangePct);
    const fng = fearGreedToMerchantBehavior(params.fearGreedIndex);
    const gold = goldPriceToEffect(params.goldChangePct);

    return {
      tradeValueModifier: stock.tradeValueModifier,
      rareItemChanceBonus: stock.rareItemChanceBonus,
      defensiveItemDiscount: fng.defensiveItemDiscount,
      luxuryItemInflation: fng.luxuryItemInflation,
      goldCostModifier: gold.costModifier,
      goldProductionModifier: gold.productionModifier,
    };
  }

  // ---- Aggregate Anonymized Reporting (T-1059) ----

  static getAnonymizedReport(): {
    totalActiveVentures: number;
    averageReturnPct: number;
    mostPopularSector: string;
    totalGoldInvested: number;
  } {
    let totalVentures = 0;
    let totalReturn = 0;
    let totalInvested = 0;
    const sectorCounts: Record<string, number> = {};

    for (const ventures of SapphireExchangeService.ventures.values()) {
      for (const v of ventures) {
        if (v.status === 'active') {
          totalVentures++;
          totalReturn += v.returnPct;
          totalInvested += v.investedGold;
          sectorCounts[v.sector] = (sectorCounts[v.sector] || 0) + 1;
        }
      }
    }

    const mostPopular = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

    return {
      totalActiveVentures: totalVentures,
      averageReturnPct: totalVentures > 0 ? totalReturn / totalVentures : 0,
      mostPopularSector: mostPopular,
      totalGoldInvested: totalInvested,
    };
  }

  // ---- Research Tree Visualization Data (T-1050) ----

  static getResearchTreeFinancialNodes(): Array<{
    nodeId: string;
    name: string;
    description: string;
    prerequisite: string | null;
    unlocksFeature: string;
  }> {
    return [
      { nodeId: 'fin_1', name: 'Basic Market Reading', description: 'Learn to interpret Sapphire Exchange trends.', prerequisite: null, unlocksFeature: 'Market ticker display' },
      { nodeId: 'fin_2', name: 'Commodity Analysis', description: 'Understand how commodity prices affect your guild.', prerequisite: 'fin_1', unlocksFeature: 'Commodity price charts' },
      { nodeId: 'fin_3', name: 'Venture Investing', description: 'Invest guild gold in market-linked ventures.', prerequisite: 'fin_2', unlocksFeature: 'Venture investment system' },
      { nodeId: 'fin_4', name: 'Sentiment Divination', description: 'Read the Courage & Avarice Index to predict merchant behavior.', prerequisite: 'fin_1', unlocksFeature: 'Fear/Greed merchant effects' },
      { nodeId: 'fin_5', name: 'Storm Index Mastery', description: 'Use the Storm Index to plan safer expeditions.', prerequisite: 'fin_4', unlocksFeature: 'VIX-based expedition modifiers' },
      { nodeId: 'fin_6', name: 'Sector Rotation', description: 'Understand how sector cycles boost specific buildings.', prerequisite: 'fin_3', unlocksFeature: 'Sector building bonuses' },
      { nodeId: 'fin_7', name: 'Economic Forecasting', description: 'Predict economic cycle phases for strategic planning.', prerequisite: 'fin_5', unlocksFeature: 'Economic forecast display' },
      { nodeId: 'fin_8', name: 'Commodity Futures', description: 'Trade commodity futures linked to real trends.', prerequisite: 'fin_6', unlocksFeature: 'Commodity futures trading' },
    ];
  }

  // ---- Market Event Calendar (T-1046) ----

  static getMarketEventCalendar(): Array<{
    name: string;
    fantasyName: string;
    approximateDate: string;
    description: string;
    expectedEffect: string;
  }> {
    const year = new Date().getFullYear();
    return [
      { name: 'Q1 Earnings', fantasyName: 'First Reckoning', approximateDate: `${year}-01-15`, description: 'Major guild charters report first quarter results.', expectedEffect: 'Increased trade volatility' },
      { name: 'Q2 Earnings', fantasyName: 'Summer Ledgers', approximateDate: `${year}-04-15`, description: 'Mid-year financial reviews.', expectedEffect: 'Merchant mood shifts' },
      { name: 'Q3 Earnings', fantasyName: 'Harvest Count', approximateDate: `${year}-07-15`, description: 'Third quarter reports arrive.', expectedEffect: 'Sector performance changes' },
      { name: 'Q4 Earnings', fantasyName: 'Year-End Tally', approximateDate: `${year}-10-15`, description: 'Annual performance reviews.', expectedEffect: 'Major market movements possible' },
      { name: 'Fed Meeting', fantasyName: 'Lending Guild Council', approximateDate: `${year}-03-20`, description: 'The Lending Guild convenes to set interest rates.', expectedEffect: 'Building loan cost changes' },
      { name: 'Jobs Report', fantasyName: 'Idle Hands Census', approximateDate: `${year}-02-07`, description: 'Monthly employment data release.', expectedEffect: 'Morale and production adjustments' },
    ];
  }

  // ---- Loading Skeleton Config (T-1068) ----

  static getLoadingSkeletonConfig(): {
    sections: Array<{ id: string; label: string; height: number }>;
    refreshInterval: number;
  } {
    return {
      sections: [
        { id: 'exchange-index', label: 'Sapphire Exchange', height: 80 },
        { id: 'commodities', label: 'Commodity Prices', height: 120 },
        { id: 'sentiment', label: 'Courage & Avarice Index', height: 60 },
        { id: 'sectors', label: 'Sector Performance', height: 100 },
        { id: 'news', label: 'Economic Herald', height: 150 },
      ],
      refreshInterval: 30000,
    };
  }

  // ---- Financial Data Export (T-1054) ----

  static async exportFinancialData(playerId: string): Promise<{
    exportDate: string;
    playerVentures: PlayerVenture[];
    currentModifiers: Record<string, number>;
    recentEvents: SapphireExchangeEvent[];
  }> {
    const snapshot = await FinancialDataService.getFinancialSnapshot();
    return {
      exportDate: new Date().toISOString(),
      playerVentures: SapphireExchangeService.getPlayerVentures(playerId),
      currentModifiers: snapshot.modifiers as unknown as Record<string, number>,
      recentEvents: SapphireExchangeService.getActiveEvents(),
    };
  }
}
