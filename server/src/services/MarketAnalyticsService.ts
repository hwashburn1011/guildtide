/**
 * Market analytics: price history, trend analysis, economic cycles,
 * supply/demand model, market events, reputation, fees, forecasts.
 *
 * T-0551: Market data schema
 * T-0553: Dynamic supply/demand pricing
 * T-0554: Price calculation formula
 * T-0555: Price history with hourly snapshots
 * T-0557: Price trend indicators
 * T-0563: Transaction history per player
 * T-0583: Economic cycle system
 * T-0584: Economic cycle effects on prices
 * T-0586: Market event system
 * T-0588: Market watchlist
 * T-0589: Price alert system
 * T-0590: Market fee system
 * T-0591: Fee reduction through building upgrades
 * T-0592: Market analytics (most traded, biggest movers)
 * T-0595: Seasonal price modifiers
 * T-0596: Real-world stock market influence on metal prices
 * T-0599: Market order book
 * T-0601: Market achievement system
 * T-0602: Commodity futures
 * T-0604: Market crash event
 * T-0605: Market stabilization mechanics
 * T-0606: Merchant guild reputation
 * T-0608: Trade embargo events
 * T-0609: Profit/loss tracker
 * T-0610: Currency exchange placeholder
 * T-0611: Market tax to guild treasury
 * T-0613: Demand forecast from historical patterns
 * T-0614: Rare item spotlight
 * T-0615: Trading post upgrade path
 * T-0616: Arbitrage detection
 * T-0617: Escrow system
 * T-0618: Daily deals rotation
 * T-0619: Inflation tracking
 * T-0620: Circuit breaker
 */
import { ResourceType } from '../../../shared/src/enums';

// ---------------------------------------------------------------------------
// T-0551: Market data schema types
// ---------------------------------------------------------------------------

export interface PriceSnapshot {
  timestamp: number;
  prices: Record<string, number>;
}

export interface TradeRecord {
  id: string;
  playerId: string;
  resource: ResourceType;
  action: 'buy' | 'sell';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fees: number;
  timestamp: number;
}

export interface MarketListing {
  id: string;
  sellerId: string;
  resource: ResourceType;
  quantity: number;
  pricePerUnit: number;
  listedAt: number;
  expiresAt: number;
}

export interface AuctionListing {
  id: string;
  sellerId: string;
  resource: ResourceType;
  quantity: number;
  startingPrice: number;
  buyoutPrice: number | null;
  currentBid: number;
  currentBidderId: string | null;
  bids: AuctionBid[];
  listedAt: number;
  expiresAt: number;
  resolved: boolean;
}

export interface AuctionBid {
  bidderId: string;
  amount: number;
  timestamp: number;
}

export interface TradeRoute {
  id: string;
  fromRegion: string;
  toRegion: string;
  resource: ResourceType;
  quantity: number;
  departedAt: number;
  arrivesAt: number;
  risk: number;
  status: 'in_transit' | 'delivered' | 'lost';
  playerId: string;
}

export interface MarketWatchItem {
  resource: ResourceType;
  targetPrice: number;
  direction: 'above' | 'below';
}

export interface MarketAchievement {
  id: string;
  name: string;
  description: string;
  category: 'volume' | 'profit' | 'special';
  requirement: number;
  current: number;
  unlocked: boolean;
}

export interface CommodityFuture {
  id: string;
  playerId: string;
  resource: ResourceType;
  quantity: number;
  purchasePrice: number;
  maturityTimestamp: number;
  settled: boolean;
}

export interface DailyDeal {
  resource: ResourceType;
  discount: number;       // 0-1 multiplier (e.g. 0.3 = 30% off)
  quantity: number;
  expiresAt: number;
}

export type EconomicPhase = 'boom' | 'stable' | 'recession' | 'depression' | 'recovery';

export interface EconomicCycleState {
  phase: EconomicPhase;
  phaseStartDay: number;
  phaseDuration: number;
  priceMultiplier: number;
  demandMultiplier: number;
}

export type MarketEventType =
  | 'trade_festival'
  | 'supply_shortage'
  | 'trade_war'
  | 'merchant_festival'
  | 'market_crash'
  | 'trade_embargo';

export interface MarketEvent {
  id: string;
  type: MarketEventType;
  title: string;
  description: string;
  effects: Record<string, number>;
  startedAt: number;
  duration: number;       // hours
  affectedResources?: ResourceType[];
  affectedRegions?: string[];
}

// ---------------------------------------------------------------------------
// In-memory stores (production would use DB)
// ---------------------------------------------------------------------------

const priceHistory: PriceSnapshot[] = [];
const tradeHistory: TradeRecord[] = [];
const auctionListings: AuctionListing[] = [];
const orderBook: MarketListing[] = [];
const tradeRoutes: TradeRoute[] = [];
const watchlists: Map<string, MarketWatchItem[]> = new Map();
const achievements: Map<string, MarketAchievement[]> = new Map();
const futures: CommodityFuture[] = [];
const activeEvents: MarketEvent[] = [];
const reputation: Map<string, number> = new Map();   // playerId -> rep
const profitLoss: Map<string, number> = new Map();    // playerId -> net P&L
const escrowHolds: Map<string, { amount: number; heldAt: number }> = new Map();

// Supply/demand tracking
const supplyLevels: Record<string, number> = {};
const demandLevels: Record<string, number> = {};

// Inflation tracker
let inflationIndex = 100;  // base 100

// Circuit breaker
let circuitBreakerTripped = false;
let circuitBreakerResetAt = 0;

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class MarketAnalyticsService {

  // -----------------------------------------------------------------------
  // T-0555: Price history snapshots
  // -----------------------------------------------------------------------

  static recordPriceSnapshot(prices: Record<string, number>): void {
    priceHistory.push({ timestamp: Date.now(), prices: { ...prices } });
    // Keep last 168 snapshots (7 days of hourly)
    if (priceHistory.length > 168) priceHistory.shift();
    this.updateInflationIndex(prices);
  }

  static getPriceHistory(resource?: ResourceType, limit: number = 24): PriceSnapshot[] {
    const history = priceHistory.slice(-limit);
    if (!resource) return history;
    return history.map(s => ({
      timestamp: s.timestamp,
      prices: { [resource]: s.prices[resource] ?? 0 },
    }));
  }

  // -----------------------------------------------------------------------
  // T-0553/T-0554: Supply & demand pricing model
  // -----------------------------------------------------------------------

  static recordSupplyChange(resource: ResourceType, delta: number): void {
    supplyLevels[resource] = (supplyLevels[resource] ?? 100) + delta;
    if (supplyLevels[resource] < 10) supplyLevels[resource] = 10;
  }

  static recordDemandChange(resource: ResourceType, delta: number): void {
    demandLevels[resource] = (demandLevels[resource] ?? 100) + delta;
    if (demandLevels[resource] < 10) demandLevels[resource] = 10;
  }

  static getSupplyDemandModifier(resource: ResourceType): number {
    const supply = supplyLevels[resource] ?? 100;
    const demand = demandLevels[resource] ?? 100;
    // Higher demand vs supply = higher prices
    const ratio = demand / Math.max(supply, 1);
    // Clamp between 0.5 and 2.0
    return Math.max(0.5, Math.min(2.0, ratio));
  }

  // -----------------------------------------------------------------------
  // T-0563: Transaction history
  // -----------------------------------------------------------------------

  static recordTransaction(record: TradeRecord): void {
    tradeHistory.push(record);
    // Update P&L
    const key = record.playerId;
    const current = profitLoss.get(key) ?? 0;
    const pnl = record.action === 'sell' ? record.totalPrice - record.fees : -(record.totalPrice + record.fees);
    profitLoss.set(key, current + pnl);

    // Update supply/demand
    if (record.action === 'buy') {
      this.recordDemandChange(record.resource, record.quantity);
      this.recordSupplyChange(record.resource, -record.quantity);
    } else {
      this.recordSupplyChange(record.resource, record.quantity);
      this.recordDemandChange(record.resource, -record.quantity * 0.5);
    }

    // Update reputation
    this.addReputation(record.playerId, 1);

    // Check achievements
    this.checkAchievements(record.playerId);

    // Check circuit breaker
    this.checkCircuitBreaker(record);
  }

  static getTransactionHistory(playerId: string, limit: number = 50): TradeRecord[] {
    return tradeHistory
      .filter(t => t.playerId === playerId)
      .slice(-limit);
  }

  // -----------------------------------------------------------------------
  // T-0557: Trend indicators
  // -----------------------------------------------------------------------

  static getTrend(resource: ResourceType): { trend: 'rising' | 'falling' | 'stable'; changePercent: number } {
    const history = this.getPriceHistory(resource, 6);
    if (history.length < 2) return { trend: 'stable', changePercent: 0 };

    const recent = history[history.length - 1].prices[resource] ?? 0;
    const older = history[0].prices[resource] ?? recent;
    if (older === 0) return { trend: 'stable', changePercent: 0 };

    const changePercent = ((recent - older) / older) * 100;
    const trend = changePercent > 2 ? 'rising' : changePercent < -2 ? 'falling' : 'stable';
    return { trend, changePercent: Math.round(changePercent * 10) / 10 };
  }

  // -----------------------------------------------------------------------
  // T-0571-T-0577: Auction system
  // -----------------------------------------------------------------------

  static createAuction(
    sellerId: string,
    resource: ResourceType,
    quantity: number,
    startingPrice: number,
    buyoutPrice: number | null,
    durationHours: number,
  ): AuctionListing {
    const listing: AuctionListing = {
      id: `auction_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sellerId,
      resource,
      quantity,
      startingPrice,
      buyoutPrice,
      currentBid: 0,
      currentBidderId: null,
      bids: [],
      listedAt: Date.now(),
      expiresAt: Date.now() + durationHours * 3600000,
      resolved: false,
    };
    auctionListings.push(listing);
    return listing;
  }

  static placeBid(auctionId: string, bidderId: string, amount: number): AuctionListing | null {
    const auction = auctionListings.find(a => a.id === auctionId && !a.resolved);
    if (!auction) return null;
    if (Date.now() > auction.expiresAt) return null;
    if (amount <= auction.currentBid && amount < (auction.buyoutPrice ?? Infinity)) return null;

    auction.bids.push({ bidderId, amount, timestamp: Date.now() });
    auction.currentBid = amount;
    auction.currentBidderId = bidderId;

    // Buyout check
    if (auction.buyoutPrice && amount >= auction.buyoutPrice) {
      auction.resolved = true;
    }

    return auction;
  }

  static resolveExpiredAuctions(): AuctionListing[] {
    const now = Date.now();
    const resolved: AuctionListing[] = [];
    for (const auction of auctionListings) {
      if (!auction.resolved && now > auction.expiresAt) {
        auction.resolved = true;
        resolved.push(auction);
      }
    }
    return resolved;
  }

  static getActiveAuctions(resource?: ResourceType): AuctionListing[] {
    const now = Date.now();
    return auctionListings.filter(a =>
      !a.resolved && a.expiresAt > now && (!resource || a.resource === resource),
    );
  }

  static getAuctionHistory(playerId: string): AuctionListing[] {
    return auctionListings.filter(a =>
      a.resolved && (a.sellerId === playerId || a.currentBidderId === playerId),
    );
  }

  // -----------------------------------------------------------------------
  // T-0578-T-0582: Trade routes
  // -----------------------------------------------------------------------

  static createTradeRoute(
    playerId: string,
    fromRegion: string,
    toRegion: string,
    resource: ResourceType,
    quantity: number,
    travelHours: number,
  ): TradeRoute {
    const risk = 0.05 + Math.random() * 0.15; // 5-20% risk
    const route: TradeRoute = {
      id: `route_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fromRegion,
      toRegion,
      resource,
      quantity,
      departedAt: Date.now(),
      arrivesAt: Date.now() + travelHours * 3600000,
      risk,
      status: 'in_transit',
      playerId,
    };
    tradeRoutes.push(route);
    return route;
  }

  static getActiveTradeRoutes(playerId: string): TradeRoute[] {
    return tradeRoutes.filter(r => r.playerId === playerId && r.status === 'in_transit');
  }

  static resolveArrivedRoutes(): TradeRoute[] {
    const now = Date.now();
    const resolved: TradeRoute[] = [];
    for (const route of tradeRoutes) {
      if (route.status === 'in_transit' && now >= route.arrivesAt) {
        // Roll for success based on risk
        route.status = Math.random() < route.risk ? 'lost' : 'delivered';
        resolved.push(route);
      }
    }
    return resolved;
  }

  static getTradeRouteProfitEstimate(
    resource: ResourceType,
    quantity: number,
    buyPrice: number,
    sellPrice: number,
  ): { grossProfit: number; estimatedFees: number; netProfit: number; roi: number } {
    const grossProfit = (sellPrice - buyPrice) * quantity;
    const estimatedFees = Math.floor(buyPrice * quantity * 0.05);
    const netProfit = grossProfit - estimatedFees;
    const roi = buyPrice > 0 ? (netProfit / (buyPrice * quantity)) * 100 : 0;
    return { grossProfit, estimatedFees, netProfit, roi: Math.round(roi * 10) / 10 };
  }

  // -----------------------------------------------------------------------
  // T-0583/T-0584: Economic cycles
  // -----------------------------------------------------------------------

  static getEconomicCycle(): EconomicCycleState {
    const dayIndex = Math.floor(Date.now() / 86400000);
    const cycleLength = 30; // 30-day full cycle
    const position = dayIndex % cycleLength;

    let phase: EconomicPhase;
    let priceMultiplier: number;
    let demandMultiplier: number;

    if (position < 8) {
      phase = 'boom';
      priceMultiplier = 1.15;
      demandMultiplier = 1.25;
    } else if (position < 14) {
      phase = 'stable';
      priceMultiplier = 1.0;
      demandMultiplier = 1.0;
    } else if (position < 20) {
      phase = 'recession';
      priceMultiplier = 0.9;
      demandMultiplier = 0.8;
    } else if (position < 24) {
      phase = 'depression';
      priceMultiplier = 0.75;
      demandMultiplier = 0.6;
    } else {
      phase = 'recovery';
      priceMultiplier = 0.95;
      demandMultiplier = 0.9;
    }

    return {
      phase,
      phaseStartDay: dayIndex - position,
      phaseDuration: cycleLength,
      priceMultiplier,
      demandMultiplier,
    };
  }

  // -----------------------------------------------------------------------
  // T-0586/T-0587: Market events
  // -----------------------------------------------------------------------

  static getActiveMarketEvents(): MarketEvent[] {
    const now = Date.now();
    return activeEvents.filter(e => now < e.startedAt + e.duration * 3600000);
  }

  static triggerMarketEvent(type: MarketEventType, affectedResources?: ResourceType[]): MarketEvent {
    const defs: Record<MarketEventType, Omit<MarketEvent, 'id' | 'startedAt' | 'affectedResources' | 'affectedRegions'>> = {
      trade_festival: {
        type: 'trade_festival',
        title: 'Trade Festival',
        description: 'Merchants gather from far and wide! Fees reduced by 50%.',
        effects: { feeMultiplier: 0.5, demandBoost: 1.2 },
        duration: 24,
      },
      supply_shortage: {
        type: 'supply_shortage',
        title: 'Supply Shortage',
        description: 'A critical shortage has driven prices up!',
        effects: { priceMultiplier: 1.5, supplyDrain: 0.5 },
        duration: 12,
      },
      trade_war: {
        type: 'trade_war',
        title: 'Trade War',
        description: 'Regional tensions disrupt normal commerce.',
        effects: { priceMultiplier: 1.3, feeMultiplier: 1.5 },
        duration: 18,
      },
      merchant_festival: {
        type: 'merchant_festival',
        title: 'Merchant Festival',
        description: 'A grand merchant festival with special deals!',
        effects: { feeMultiplier: 0.0, priceMultiplier: 0.85 },
        duration: 8,
      },
      market_crash: {
        type: 'market_crash',
        title: 'Market Crash',
        description: 'A sudden collapse in commodity prices!',
        effects: { priceMultiplier: 0.5, demandBoost: 0.3 },
        duration: 6,
      },
      trade_embargo: {
        type: 'trade_embargo',
        title: 'Trade Embargo',
        description: 'Certain resources cannot be traded temporarily.',
        effects: { tradeBlocked: 1 },
        duration: 12,
      },
    };

    const def = defs[type];
    const event: MarketEvent = {
      ...def,
      id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      startedAt: Date.now(),
      affectedResources,
    };
    activeEvents.push(event);
    return event;
  }

  static getEventPriceModifier(): number {
    const events = this.getActiveMarketEvents();
    let modifier = 1.0;
    for (const e of events) {
      modifier *= e.effects['priceMultiplier'] ?? 1.0;
    }
    return modifier;
  }

  static getEventFeeModifier(): number {
    const events = this.getActiveMarketEvents();
    let modifier = 1.0;
    for (const e of events) {
      modifier *= e.effects['feeMultiplier'] ?? 1.0;
    }
    return modifier;
  }

  // -----------------------------------------------------------------------
  // T-0588/T-0589: Watchlist & price alerts
  // -----------------------------------------------------------------------

  static setWatchlist(playerId: string, items: MarketWatchItem[]): void {
    watchlists.set(playerId, items);
  }

  static getWatchlist(playerId: string): MarketWatchItem[] {
    return watchlists.get(playerId) ?? [];
  }

  static checkPriceAlerts(playerId: string, currentPrices: Record<string, number>): MarketWatchItem[] {
    const list = this.getWatchlist(playerId);
    return list.filter(item => {
      const price = currentPrices[item.resource] ?? 0;
      if (item.direction === 'above' && price >= item.targetPrice) return true;
      if (item.direction === 'below' && price <= item.targetPrice) return true;
      return false;
    });
  }

  // -----------------------------------------------------------------------
  // T-0590/T-0591: Market fee system
  // -----------------------------------------------------------------------

  static calculateFees(
    totalPrice: number,
    marketBuildingLevel: number = 1,
  ): { listingFee: number; transactionFee: number; totalFees: number } {
    const baseListing = 0.02; // 2%
    const baseTx = 0.05;     // 5%

    // T-0591: Building reduces fees by 0.5% per level
    const reduction = Math.min(marketBuildingLevel * 0.005, 0.04);
    const eventMod = this.getEventFeeModifier();

    const listingFee = Math.max(1, Math.floor(totalPrice * Math.max(0.005, baseListing - reduction) * eventMod));
    const transactionFee = Math.max(1, Math.floor(totalPrice * Math.max(0.01, baseTx - reduction) * eventMod));

    return { listingFee, transactionFee, totalFees: listingFee + transactionFee };
  }

  // -----------------------------------------------------------------------
  // T-0592: Analytics - most traded, biggest movers
  // -----------------------------------------------------------------------

  static getMostTradedItems(limit: number = 5): Array<{ resource: string; volume: number }> {
    const volumeMap: Record<string, number> = {};
    for (const t of tradeHistory) {
      volumeMap[t.resource] = (volumeMap[t.resource] ?? 0) + t.quantity;
    }
    return Object.entries(volumeMap)
      .map(([resource, volume]) => ({ resource, volume }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);
  }

  static getBiggestMovers(): Array<{ resource: string; changePercent: number; direction: string }> {
    const resources = [
      ResourceType.Wood, ResourceType.Stone, ResourceType.Herbs,
      ResourceType.Ore, ResourceType.Water, ResourceType.Food, ResourceType.Essence,
    ];
    return resources
      .map(r => {
        const { changePercent, trend } = this.getTrend(r);
        return { resource: r, changePercent: Math.abs(changePercent), direction: trend };
      })
      .sort((a, b) => b.changePercent - a.changePercent);
  }

  // -----------------------------------------------------------------------
  // T-0595: Seasonal price modifiers
  // -----------------------------------------------------------------------

  static getSeasonalModifier(resource: ResourceType, season: string): number {
    const mods: Record<string, Partial<Record<string, number>>> = {
      winter: { [ResourceType.Food]: 1.4, [ResourceType.Wood]: 1.2, [ResourceType.Water]: 0.8 },
      spring: { [ResourceType.Herbs]: 0.8, [ResourceType.Food]: 0.9, [ResourceType.Water]: 1.1 },
      summer: { [ResourceType.Water]: 1.3, [ResourceType.Food]: 1.1, [ResourceType.Wood]: 0.9 },
      autumn: { [ResourceType.Food]: 0.85, [ResourceType.Herbs]: 1.15, [ResourceType.Ore]: 0.95 },
    };
    return mods[season]?.[resource] ?? 1.0;
  }

  // -----------------------------------------------------------------------
  // T-0596: Real-world stock influence (simulated)
  // -----------------------------------------------------------------------

  static getRealWorldInfluence(resource: ResourceType): number {
    // Simulate with deterministic day-based variance
    const day = Math.floor(Date.now() / 86400000);
    const seed = hashCode(`rw:${resource}:${day}`);
    const rng = seededRandom(seed);
    // Small influence: +/- 5%
    return 0.95 + rng() * 0.1;
  }

  // -----------------------------------------------------------------------
  // T-0599: Order book
  // -----------------------------------------------------------------------

  static addOrder(listing: MarketListing): void {
    orderBook.push(listing);
  }

  static getOrderBook(resource?: ResourceType): MarketListing[] {
    const now = Date.now();
    return orderBook.filter(o =>
      o.expiresAt > now && (!resource || o.resource === resource),
    );
  }

  static cancelOrder(listingId: string): boolean {
    const idx = orderBook.findIndex(o => o.id === listingId);
    if (idx >= 0) { orderBook.splice(idx, 1); return true; }
    return false;
  }

  // -----------------------------------------------------------------------
  // T-0601: Achievements
  // -----------------------------------------------------------------------

  static getAchievements(playerId: string): MarketAchievement[] {
    if (!achievements.has(playerId)) {
      achievements.set(playerId, [
        { id: 'volume_100', name: 'Novice Trader', description: 'Complete 100 trades', category: 'volume', requirement: 100, current: 0, unlocked: false },
        { id: 'volume_1000', name: 'Seasoned Merchant', description: 'Complete 1000 trades', category: 'volume', requirement: 1000, current: 0, unlocked: false },
        { id: 'profit_1000', name: 'Profitable', description: 'Earn 1000g net profit', category: 'profit', requirement: 1000, current: 0, unlocked: false },
        { id: 'profit_10000', name: 'Market Mogul', description: 'Earn 10000g net profit', category: 'profit', requirement: 10000, current: 0, unlocked: false },
        { id: 'special_crash', name: 'Crisis Trader', description: 'Trade during a market crash', category: 'special', requirement: 1, current: 0, unlocked: false },
        { id: 'special_futures', name: 'Speculator', description: 'Settle 5 commodity futures', category: 'special', requirement: 5, current: 0, unlocked: false },
      ]);
    }
    return achievements.get(playerId)!;
  }

  private static checkAchievements(playerId: string): void {
    const achs = this.getAchievements(playerId);
    const tradeCount = tradeHistory.filter(t => t.playerId === playerId).length;
    const pnl = profitLoss.get(playerId) ?? 0;

    for (const a of achs) {
      if (a.unlocked) continue;
      if (a.category === 'volume') { a.current = tradeCount; }
      if (a.category === 'profit') { a.current = Math.max(0, pnl); }
      if (a.current >= a.requirement) a.unlocked = true;
    }
  }

  // -----------------------------------------------------------------------
  // T-0602: Commodity futures
  // -----------------------------------------------------------------------

  static createFuture(
    playerId: string,
    resource: ResourceType,
    quantity: number,
    purchasePrice: number,
    maturityHours: number,
  ): CommodityFuture {
    const future: CommodityFuture = {
      id: `future_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      playerId,
      resource,
      quantity,
      purchasePrice,
      maturityTimestamp: Date.now() + maturityHours * 3600000,
      settled: false,
    };
    futures.push(future);
    return future;
  }

  static getActiveFutures(playerId: string): CommodityFuture[] {
    return futures.filter(f => f.playerId === playerId && !f.settled);
  }

  static settleMatureFutures(currentPrices: Record<string, number>): Array<CommodityFuture & { settlementPrice: number; profit: number }> {
    const now = Date.now();
    const settled: Array<CommodityFuture & { settlementPrice: number; profit: number }> = [];
    for (const f of futures) {
      if (!f.settled && now >= f.maturityTimestamp) {
        f.settled = true;
        const settlementPrice = (currentPrices[f.resource] ?? 0) * f.quantity;
        const profit = settlementPrice - f.purchasePrice;
        settled.push({ ...f, settlementPrice, profit });
      }
    }
    return settled;
  }

  // -----------------------------------------------------------------------
  // T-0604/T-0605: Market crash & stabilization
  // -----------------------------------------------------------------------

  static checkForCrash(currentPrices: Record<string, number>): boolean {
    // Crash if average price drops > 30% from 24h ago
    const history24h = this.getPriceHistory(undefined, 24);
    if (history24h.length < 2) return false;

    const oldAvg = avgPrices(history24h[0].prices);
    const newAvg = avgPrices(currentPrices);
    if (oldAvg === 0) return false;

    const drop = (oldAvg - newAvg) / oldAvg;
    return drop > 0.3;
  }

  static applyStabilization(prices: Record<string, number>): Record<string, number> {
    // T-0605: Prevent runaway inflation/deflation by clamping per-tick changes
    const history = this.getPriceHistory(undefined, 1);
    if (history.length === 0) return prices;

    const lastPrices = history[history.length - 1].prices;
    const stabilized = { ...prices };
    const maxChange = 0.15; // Max 15% change per snapshot

    for (const key of Object.keys(stabilized)) {
      const last = lastPrices[key] ?? stabilized[key];
      const change = (stabilized[key] - last) / Math.max(last, 1);
      if (Math.abs(change) > maxChange) {
        stabilized[key] = Math.round(last * (1 + Math.sign(change) * maxChange));
      }
    }
    return stabilized;
  }

  // -----------------------------------------------------------------------
  // T-0606: Merchant guild reputation
  // -----------------------------------------------------------------------

  static getReputation(playerId: string): number {
    return reputation.get(playerId) ?? 0;
  }

  static addReputation(playerId: string, amount: number): number {
    const current = reputation.get(playerId) ?? 0;
    const next = Math.min(current + amount, 100);
    reputation.set(playerId, next);
    return next;
  }

  static getReputationDiscount(playerId: string): number {
    const rep = this.getReputation(playerId);
    // 0.5% per rep level, max 10%
    return Math.min(rep * 0.005, 0.1);
  }

  // -----------------------------------------------------------------------
  // T-0608: Trade embargo
  // -----------------------------------------------------------------------

  static isResourceEmbargoed(resource: ResourceType): boolean {
    const events = this.getActiveMarketEvents();
    return events.some(e =>
      e.type === 'trade_embargo' &&
      (e.affectedResources?.includes(resource) ?? false),
    );
  }

  // -----------------------------------------------------------------------
  // T-0609: Profit/loss tracker
  // -----------------------------------------------------------------------

  static getProfitLoss(playerId: string): number {
    return profitLoss.get(playerId) ?? 0;
  }

  // -----------------------------------------------------------------------
  // T-0610: Currency exchange placeholder
  // -----------------------------------------------------------------------

  static getExchangeRates(): Record<string, number> {
    return { gold: 1.0, premium_currency: 0, gems: 0 };
  }

  // -----------------------------------------------------------------------
  // T-0611: Market tax -> guild treasury
  // -----------------------------------------------------------------------

  static calculateTax(totalPrice: number): number {
    return Math.max(1, Math.floor(totalPrice * 0.02)); // 2% tax
  }

  // -----------------------------------------------------------------------
  // T-0613: Demand forecast
  // -----------------------------------------------------------------------

  static getDemandForecast(resource: ResourceType): { nextDay: number; trend: string } {
    const history = tradeHistory.filter(t => t.resource === resource);
    const recent = history.slice(-20);
    if (recent.length < 5) return { nextDay: 0, trend: 'insufficient_data' };

    const avgQty = recent.reduce((s, t) => s + t.quantity, 0) / recent.length;
    const last5 = recent.slice(-5);
    const recentAvg = last5.reduce((s, t) => s + t.quantity, 0) / last5.length;

    const trend = recentAvg > avgQty * 1.1 ? 'increasing' : recentAvg < avgQty * 0.9 ? 'decreasing' : 'stable';
    return { nextDay: Math.round(recentAvg), trend };
  }

  // -----------------------------------------------------------------------
  // T-0614: Rare item spotlight
  // -----------------------------------------------------------------------

  static getRareItemSpotlight(): { resource: ResourceType; discount: number; availableUntil: number } | null {
    const day = Math.floor(Date.now() / 86400000);
    const seed = hashCode(`spotlight:${day}`);
    const rng = seededRandom(seed);

    if (rng() > 0.4) return null; // 40% chance per day

    const rareResources = [ResourceType.Essence, ResourceType.Ore, ResourceType.Herbs];
    const idx = Math.floor(rng() * rareResources.length);
    return {
      resource: rareResources[idx],
      discount: 0.15 + rng() * 0.15, // 15-30% discount
      availableUntil: (day + 1) * 86400000,
    };
  }

  // -----------------------------------------------------------------------
  // T-0615: Trading post upgrade path
  // -----------------------------------------------------------------------

  static getTradingPostUpgradeEffects(level: number): {
    maxListings: number;
    feeReduction: number;
    bulkDiscountThreshold: number;
  } {
    return {
      maxListings: 5 + level * 2,
      feeReduction: Math.min(level * 0.005, 0.04),
      bulkDiscountThreshold: Math.max(50 - level * 5, 10),
    };
  }

  // -----------------------------------------------------------------------
  // T-0616: Arbitrage detection
  // -----------------------------------------------------------------------

  static detectArbitrage(playerId: string): boolean {
    const recent = tradeHistory.filter(t => t.playerId === playerId && t.timestamp > Date.now() - 300000);
    if (recent.length < 4) return false;

    // Detect rapid buy-sell of same resource
    const resources = new Set(recent.map(t => t.resource));
    for (const r of resources) {
      const buys = recent.filter(t => t.resource === r && t.action === 'buy');
      const sells = recent.filter(t => t.resource === r && t.action === 'sell');
      if (buys.length >= 2 && sells.length >= 2) return true;
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // T-0617: Escrow system
  // -----------------------------------------------------------------------

  static holdEscrow(tradeId: string, amount: number): void {
    escrowHolds.set(tradeId, { amount, heldAt: Date.now() });
  }

  static releaseEscrow(tradeId: string): number {
    const hold = escrowHolds.get(tradeId);
    if (!hold) return 0;
    escrowHolds.delete(tradeId);
    return hold.amount;
  }

  static getEscrowAmount(tradeId: string): number {
    return escrowHolds.get(tradeId)?.amount ?? 0;
  }

  // -----------------------------------------------------------------------
  // T-0618: Daily deals
  // -----------------------------------------------------------------------

  static getDailyDeals(regionId: string): DailyDeal[] {
    const day = Math.floor(Date.now() / 86400000);
    const seed = hashCode(`deals:${regionId}:${day}`);
    const rng = seededRandom(seed);

    const resources = [
      ResourceType.Wood, ResourceType.Stone, ResourceType.Herbs,
      ResourceType.Ore, ResourceType.Water, ResourceType.Food, ResourceType.Essence,
    ];

    // 2-3 daily deals
    const count = 2 + (rng() > 0.5 ? 1 : 0);
    const shuffled = [...resources].sort(() => rng() - 0.5);

    return shuffled.slice(0, count).map(r => ({
      resource: r,
      discount: 0.15 + rng() * 0.2, // 15-35% discount
      quantity: 20 + Math.floor(rng() * 80),
      expiresAt: (day + 1) * 86400000,
    }));
  }

  // -----------------------------------------------------------------------
  // T-0619: Inflation tracking
  // -----------------------------------------------------------------------

  private static updateInflationIndex(prices: Record<string, number>): void {
    const basePrices: Record<string, number> = {
      [ResourceType.Wood]: 5, [ResourceType.Stone]: 8, [ResourceType.Herbs]: 12,
      [ResourceType.Ore]: 15, [ResourceType.Water]: 3, [ResourceType.Food]: 4,
      [ResourceType.Essence]: 50,
    };

    const baseTotal = Object.values(basePrices).reduce((s, v) => s + v, 0);
    const currentTotal = Object.keys(basePrices).reduce((s, k) => s + (prices[k] ?? basePrices[k]), 0);
    inflationIndex = Math.round((currentTotal / baseTotal) * 100);
  }

  static getInflationIndex(): number {
    return inflationIndex;
  }

  // -----------------------------------------------------------------------
  // T-0620: Circuit breaker
  // -----------------------------------------------------------------------

  private static checkCircuitBreaker(record: TradeRecord): void {
    // Trip if > 50 trades in 5 minutes across all players
    const recent = tradeHistory.filter(t => t.timestamp > Date.now() - 300000);
    if (recent.length > 50) {
      circuitBreakerTripped = true;
      circuitBreakerResetAt = Date.now() + 600000; // 10 minute halt
    }
  }

  static isCircuitBreakerTripped(): boolean {
    if (circuitBreakerTripped && Date.now() > circuitBreakerResetAt) {
      circuitBreakerTripped = false;
    }
    return circuitBreakerTripped;
  }

  static resetCircuitBreaker(): void {
    circuitBreakerTripped = false;
    circuitBreakerResetAt = 0;
  }

  // -----------------------------------------------------------------------
  // T-0594: Bulk trading discounts
  // -----------------------------------------------------------------------

  static getBulkDiscount(quantity: number, buildingLevel: number = 1): number {
    const threshold = Math.max(50 - buildingLevel * 5, 10);
    if (quantity < threshold) return 0;
    // 1% per 10 units above threshold, max 15%
    const discount = Math.min(Math.floor((quantity - threshold) / 10) * 0.01, 0.15);
    return discount;
  }

  // -----------------------------------------------------------------------
  // T-0597: Price comparison across merchants
  // -----------------------------------------------------------------------

  static compareMerchantPrices(
    basePrices: Record<string, number>,
    merchantMultipliers: Array<{ merchantId: string; multiplier: number }>,
  ): Array<{ merchantId: string; prices: Record<string, number> }> {
    return merchantMultipliers.map(m => ({
      merchantId: m.merchantId,
      prices: Object.fromEntries(
        Object.entries(basePrices).map(([r, p]) => [r, Math.round(p * m.multiplier)]),
      ),
    }));
  }

  // -----------------------------------------------------------------------
  // T-0600: Market mini-widget data
  // -----------------------------------------------------------------------

  static getQuickTradeData(currentPrices: Record<string, number>): Array<{
    resource: string;
    price: number;
    trend: string;
  }> {
    return Object.entries(currentPrices).map(([resource, price]) => ({
      resource,
      price,
      trend: this.getTrend(resource as ResourceType).trend,
    }));
  }

  // -----------------------------------------------------------------------
  // T-0603: Market news ticker
  // -----------------------------------------------------------------------

  static getNewsTicker(): string[] {
    const news: string[] = [];
    const events = this.getActiveMarketEvents();
    for (const e of events) {
      news.push(`[EVENT] ${e.title}: ${e.description}`);
    }

    const movers = this.getBiggestMovers();
    if (movers.length > 0 && movers[0].changePercent > 3) {
      news.push(`${movers[0].resource.toUpperCase()} is ${movers[0].direction} ${movers[0].changePercent}%!`);
    }

    const spotlight = this.getRareItemSpotlight();
    if (spotlight) {
      news.push(`[SPOTLIGHT] ${spotlight.resource} available at ${Math.round(spotlight.discount * 100)}% off!`);
    }

    if (this.isCircuitBreakerTripped()) {
      news.push('[ALERT] Trading halted: Circuit breaker activated due to extreme volatility.');
    }

    if (news.length === 0) {
      news.push('Markets are calm. Trade wisely!');
    }

    return news;
  }

  // -----------------------------------------------------------------------
  // T-0607: Market stall rental placeholder
  // -----------------------------------------------------------------------

  static getStallRentalCost(tier: number): number {
    return [0, 50, 150, 400, 1000][tier] ?? 50;
  }

  // -----------------------------------------------------------------------
  // T-0598: Market tutorial
  // -----------------------------------------------------------------------

  static getMarketTutorialSteps(): Array<{ title: string; text: string }> {
    return [
      { title: 'Welcome to the Market', text: 'Here you can buy and sell resources to grow your guild.' },
      { title: 'Price Trends', text: 'Arrows show whether prices are rising, falling, or stable.' },
      { title: 'Supply & Demand', text: 'Popular resources cost more. Sell high, buy low!' },
      { title: 'NPC Merchants', text: 'Visit specialized merchants for unique deals and discounts.' },
      { title: 'Bulk Trading', text: 'Trade in large quantities for automatic volume discounts.' },
      { title: 'Market Events', text: 'Special events can temporarily change prices and fees.' },
    ];
  }
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function avgPrices(prices: Record<string, number>): number {
  const vals = Object.values(prices);
  if (vals.length === 0) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
