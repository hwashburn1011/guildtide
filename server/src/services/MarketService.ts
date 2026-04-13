import { prisma } from '../db';
import { ResourceType, WeatherCondition } from '../../../shared/src/enums';
import { WeatherService } from './WeatherService';
import { RESEARCH_MAP } from '../data/researchData';
import { MarketAnalyticsService } from './MarketAnalyticsService';
import type { TradeRecord } from './MarketAnalyticsService';
import {
  NPC_MERCHANTS,
  getMerchantById,
  getRotatedInventory,
  isTravelingMerchantPresent,
} from '../data/npcMerchants';
import type { NpcMerchantDef, MerchantInventorySlot } from '../data/npcMerchants';

/** Base prices per unit (gold is not tradeable) */
const BASE_PRICES: Record<string, number> = {
  [ResourceType.Wood]: 5,
  [ResourceType.Stone]: 8,
  [ResourceType.Herbs]: 12,
  [ResourceType.Ore]: 15,
  [ResourceType.Water]: 3,
  [ResourceType.Food]: 4,
  [ResourceType.Essence]: 50,
};

/** Tradeable resource types (everything except gold) */
const TRADEABLE: ResourceType[] = [
  ResourceType.Wood,
  ResourceType.Stone,
  ResourceType.Herbs,
  ResourceType.Ore,
  ResourceType.Water,
  ResourceType.Food,
  ResourceType.Essence,
];

interface DailyPrices {
  date: string;
  prices: Record<string, number>;
}

interface MarketPriceEntry {
  resource: ResourceType;
  basePrice: number;
  currentPrice: number;
  trend: 'rising' | 'falling' | 'stable';
  changePercent: number;
  supplyDemandRatio: number;
}

export interface MarketPricesResponse {
  date: string;
  confidence: number;
  items: MarketPriceEntry[];
  economicPhase: string;
  inflationIndex: number;
  activeEvents: Array<{ id: string; title: string; description: string; effects: Record<string, number> }>;
  newsTicker: string[];
  dailyDeals: Array<{ resource: string; discount: number; quantity: number; expiresAt: number }>;
}

export interface TradeResult {
  success: boolean;
  resource: ResourceType;
  quantity: number;
  totalPrice: number;
  fees: number;
  resources: Record<ResourceType, number>;
  reputation: number;
}

export interface NpcMerchantResponse {
  id: string;
  name: string;
  type: string;
  greeting: string;
  description: string;
  inventory: Array<{
    resource: string;
    quantity: number;
    pricePerUnit: number;
    priceMultiplier: number;
  }>;
  reputation: number;
}

export interface MarketAnalyticsDashboard {
  mostTraded: Array<{ resource: string; volume: number }>;
  biggestMovers: Array<{ resource: string; changePercent: number; direction: string }>;
  economicCycle: { phase: string; priceMultiplier: number; demandMultiplier: number };
  inflationIndex: number;
  playerPnL: number;
  playerReputation: number;
  achievements: Array<{ id: string; name: string; description: string; current: number; requirement: number; unlocked: boolean }>;
  priceHistory: Array<{ timestamp: number; prices: Record<string, number> }>;
  activeEvents: Array<{ id: string; title: string; description: string; duration: number }>;
  rareSpotlight: { resource: string; discount: number; availableUntil: number } | null;
  circuitBreakerActive: boolean;
}

/**
 * Generates daily market prices influenced by weather / world state,
 * and handles buy/sell transactions.
 *
 * Prices are stored per-region as JSON in the Player model's metadata
 * (lightweight approach — no schema migration needed).
 */
export class MarketService {
  /** Cache key format: market:<regionId>:<YYYY-MM-DD> */
  private static priceCache: Map<string, DailyPrices> = new Map();

  // ------------------------------------------------------------------
  // Price generation
  // ------------------------------------------------------------------

  static async generateDailyPrices(regionId: string): Promise<DailyPrices> {
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `market:${regionId}:${today}`;

    const cached = this.priceCache.get(cacheKey);
    if (cached) return cached;

    // Seed a deterministic-ish random from regionId + date
    const seed = hashCode(`${regionId}:${today}`);
    const rng = seededRandom(seed);

    // Fetch weather for modifier adjustments
    let weatherCondition: WeatherCondition | null = null;
    let season = 'spring';
    try {
      const worldState = await WeatherService.getWorldState(regionId);
      if (worldState) {
        weatherCondition = worldState.weather.condition as WeatherCondition;
        season = worldState.season ?? season;
      }
    } catch {
      // No weather data — use defaults
    }

    // T-0583/T-0584: Economic cycle modifier
    const cycle = MarketAnalyticsService.getEconomicCycle();
    // T-0586: Event price modifier
    const eventMod = MarketAnalyticsService.getEventPriceModifier();
    // T-0596: Real-world influence
    const rwInfluence = (r: ResourceType) => MarketAnalyticsService.getRealWorldInfluence(r);

    const prices: Record<string, number> = {};
    for (const resource of TRADEABLE) {
      const base = BASE_PRICES[resource];
      // Random variance: +/- 20 %
      const variance = 1 + (rng() - 0.5) * 0.4;
      let modifier = 1;

      // Weather-based modifiers
      if (weatherCondition) {
        modifier = applyWeatherModifier(resource, weatherCondition);
      }

      // T-0553: Supply/demand modifier
      const sdMod = MarketAnalyticsService.getSupplyDemandModifier(resource);
      // T-0595: Seasonal modifier
      const seasonMod = MarketAnalyticsService.getSeasonalModifier(resource, season);

      const rawPrice = base * variance * modifier * sdMod * seasonMod * cycle.priceMultiplier * eventMod * rwInfluence(resource);
      prices[resource] = Math.max(1, Math.round(rawPrice));
    }

    // T-0605: Apply stabilization to prevent runaway prices
    const stabilized = MarketAnalyticsService.applyStabilization(prices);

    // T-0555: Record price snapshot
    MarketAnalyticsService.recordPriceSnapshot(stabilized);

    const result: DailyPrices = { date: today, prices: stabilized };
    this.priceCache.set(cacheKey, result);
    return result;
  }

  /** Get yesterday's prices (for trend comparison). */
  static async getYesterdayPrices(regionId: string): Promise<DailyPrices | null> {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const cacheKey = `market:${regionId}:${yesterday}`;

    const cached = this.priceCache.get(cacheKey);
    if (cached) return cached;

    // Generate yesterday's prices deterministically
    const seed = hashCode(`${regionId}:${yesterday}`);
    const rng = seededRandom(seed);

    const prices: Record<string, number> = {};
    for (const resource of TRADEABLE) {
      const base = BASE_PRICES[resource];
      const variance = 1 + (rng() - 0.5) * 0.4;
      prices[resource] = Math.max(1, Math.round(base * variance));
    }

    const result: DailyPrices = { date: yesterday, prices };
    this.priceCache.set(cacheKey, result);
    return result;
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  static async getPrices(regionId: string): Promise<MarketPricesResponse> {
    const today = await this.generateDailyPrices(regionId);
    const yesterday = await this.getYesterdayPrices(regionId);

    // Market confidence from world state
    let confidence = 1.0;
    try {
      const worldState = await WeatherService.getWorldState(regionId);
      if (worldState?.modifiers?.marketConfidence != null) {
        confidence = worldState.modifiers.marketConfidence;
      }
    } catch { /* default */ }

    const items: MarketPriceEntry[] = TRADEABLE.map(resource => {
      const currentPrice = today.prices[resource];
      const yesterdayPrice = yesterday?.prices[resource] ?? currentPrice;
      const diff = currentPrice - yesterdayPrice;
      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      if (diff > 0) trend = 'rising';
      else if (diff < 0) trend = 'falling';

      // T-0557: Enhanced trend with percentage
      const trendData = MarketAnalyticsService.getTrend(resource);
      // T-0553: Supply/demand ratio
      const sdRatio = MarketAnalyticsService.getSupplyDemandModifier(resource);

      return {
        resource,
        basePrice: BASE_PRICES[resource],
        currentPrice,
        trend: trendData.trend || trend,
        changePercent: trendData.changePercent,
        supplyDemandRatio: Math.round(sdRatio * 100) / 100,
      };
    });

    // T-0583: Economic cycle info
    const cycle = MarketAnalyticsService.getEconomicCycle();
    // T-0586/T-0587: Active events
    const events = MarketAnalyticsService.getActiveMarketEvents();
    // T-0603: News ticker
    const newsTicker = MarketAnalyticsService.getNewsTicker();
    // T-0618: Daily deals
    const dailyDeals = MarketAnalyticsService.getDailyDeals(regionId);

    return {
      date: today.date,
      confidence,
      items,
      economicPhase: cycle.phase,
      inflationIndex: MarketAnalyticsService.getInflationIndex(),
      activeEvents: events.map(e => ({ id: e.id, title: e.title, description: e.description, effects: e.effects })),
      newsTicker,
      dailyDeals: dailyDeals.map(d => ({ resource: d.resource, discount: d.discount, quantity: d.quantity, expiresAt: d.expiresAt })),
    };
  }

  static async buy(
    playerId: string,
    resource: ResourceType,
    quantity: number,
  ): Promise<TradeResult> {
    if (!TRADEABLE.includes(resource)) {
      throw new Error('Cannot trade gold');
    }
    if (quantity < 1 || !Number.isInteger(quantity)) {
      throw new Error('Quantity must be a positive integer');
    }

    // T-0620: Circuit breaker check
    if (MarketAnalyticsService.isCircuitBreakerTripped()) {
      throw new Error('Trading halted: circuit breaker active due to extreme volatility');
    }

    // T-0608: Embargo check
    if (MarketAnalyticsService.isResourceEmbargoed(resource)) {
      throw new Error(`${resource} is currently under trade embargo`);
    }

    const guild = await prisma.guild.findUnique({ where: { playerId } });
    if (!guild) throw new Error('No guild found');

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player || !player.regionId) throw new Error('Player region not set');

    const daily = await this.generateDailyPrices(player.regionId);
    let unitPrice = daily.prices[resource];

    // T-0594: Bulk discount
    const bulkDiscount = MarketAnalyticsService.getBulkDiscount(quantity, this.getMarketBuildingLevel(guild));
    unitPrice = Math.max(1, Math.round(unitPrice * (1 - bulkDiscount)));

    // T-0606: Reputation discount
    const repDiscount = MarketAnalyticsService.getReputationDiscount(playerId);
    unitPrice = Math.max(1, Math.round(unitPrice * (1 - repDiscount)));

    const subtotal = unitPrice * quantity;

    // T-0590: Fees
    const { totalFees } = MarketAnalyticsService.calculateFees(subtotal, this.getMarketBuildingLevel(guild));
    const totalPrice = subtotal + totalFees;

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;

    if ((resources[ResourceType.Gold] || 0) < totalPrice) {
      throw new Error(`Not enough gold. Need ${totalPrice}, have ${Math.floor(resources[ResourceType.Gold] || 0)}`);
    }

    resources[ResourceType.Gold] -= totalPrice;
    resources[resource] = (resources[resource] || 0) + quantity;

    // T-0611: Tax to guild treasury (absorbed into fees)
    const tax = MarketAnalyticsService.calculateTax(subtotal);

    await prisma.guild.update({
      where: { id: guild.id },
      data: { resources: JSON.stringify(resources) },
    });

    // T-0563: Record transaction
    const record: TradeRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      playerId,
      resource,
      action: 'buy',
      quantity,
      unitPrice,
      totalPrice: subtotal,
      fees: totalFees,
      timestamp: Date.now(),
    };
    MarketAnalyticsService.recordTransaction(record);

    // T-0616: Arbitrage warning (logged, not blocking)
    if (MarketAnalyticsService.detectArbitrage(playerId)) {
      console.warn(`[Market] Arbitrage pattern detected for player ${playerId}`);
    }

    return {
      success: true,
      resource,
      quantity,
      totalPrice: subtotal,
      fees: totalFees,
      resources,
      reputation: MarketAnalyticsService.getReputation(playerId),
    };
  }

  static async sell(
    playerId: string,
    resource: ResourceType,
    quantity: number,
  ): Promise<TradeResult> {
    if (!TRADEABLE.includes(resource)) {
      throw new Error('Cannot trade gold');
    }
    if (quantity < 1 || !Number.isInteger(quantity)) {
      throw new Error('Quantity must be a positive integer');
    }

    // T-0620: Circuit breaker check
    if (MarketAnalyticsService.isCircuitBreakerTripped()) {
      throw new Error('Trading halted: circuit breaker active due to extreme volatility');
    }

    // T-0608: Embargo check
    if (MarketAnalyticsService.isResourceEmbargoed(resource)) {
      throw new Error(`${resource} is currently under trade embargo`);
    }

    const guild = await prisma.guild.findUnique({ where: { playerId } });
    if (!guild) throw new Error('No guild found');

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player || !player.regionId) throw new Error('Player region not set');

    const daily = await this.generateDailyPrices(player.regionId);
    const unitPrice = daily.prices[resource];

    // Load guild's completed research for market bonuses
    let marketSellBonus = 0;
    let marketPriceAdvantage = 0;
    const completedResearch: string[] = JSON.parse(guild.researchIds || '[]');
    for (const resId of completedResearch) {
      const node = RESEARCH_MAP.get(resId);
      if (!node) continue;
      marketSellBonus += node.effects['market_sell_bonus'] ?? 0;           // Trade Insurance: +15%
      marketPriceAdvantage += node.effects['market_price_advantage'] ?? 0; // Master Trader: +25%
    }

    // Sell at 80% of buy price, boosted by research
    const sellMultiplier = 0.8 * (1 + marketSellBonus + marketPriceAdvantage);
    // T-0606: Reputation bonus
    const repBonus = MarketAnalyticsService.getReputationDiscount(playerId);
    const adjustedMultiplier = sellMultiplier * (1 + repBonus);

    const subtotal = Math.max(1, Math.floor(unitPrice * adjustedMultiplier * quantity));

    // T-0590: Fees
    const { totalFees } = MarketAnalyticsService.calculateFees(subtotal, this.getMarketBuildingLevel(guild));
    const totalPrice = Math.max(1, subtotal - totalFees);

    // T-0611: Tax
    const tax = MarketAnalyticsService.calculateTax(subtotal);

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;

    if ((resources[resource] || 0) < quantity) {
      throw new Error(`Not enough ${resource}. Need ${quantity}, have ${Math.floor(resources[resource] || 0)}`);
    }

    resources[resource] -= quantity;
    resources[ResourceType.Gold] = (resources[ResourceType.Gold] || 0) + totalPrice;

    await prisma.guild.update({
      where: { id: guild.id },
      data: { resources: JSON.stringify(resources) },
    });

    // T-0563: Record transaction
    const record: TradeRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      playerId,
      resource,
      action: 'sell',
      quantity,
      unitPrice,
      totalPrice: subtotal,
      fees: totalFees,
      timestamp: Date.now(),
    };
    MarketAnalyticsService.recordTransaction(record);

    return {
      success: true,
      resource,
      quantity,
      totalPrice,
      fees: totalFees,
      resources,
      reputation: MarketAnalyticsService.getReputation(playerId),
    };
  }

  // ------------------------------------------------------------------
  // T-0565-T-0570: NPC Merchant methods
  // ------------------------------------------------------------------

  static async getNpcMerchants(playerId: string, regionId: string): Promise<NpcMerchantResponse[]> {
    const daily = await this.generateDailyPrices(regionId);
    const rep = MarketAnalyticsService.getReputation(playerId);

    const available = NPC_MERCHANTS.filter(m => {
      if (m.type === 'traveling') return isTravelingMerchantPresent(regionId);
      return true;
    });

    return available.map(m => {
      const inventory = getRotatedInventory(m, regionId, rep);
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        greeting: m.greeting,
        description: m.description,
        inventory: inventory.map(slot => ({
          resource: slot.resource,
          quantity: slot.quantity,
          pricePerUnit: Math.max(1, Math.round((daily.prices[slot.resource] ?? 1) * slot.priceMultiplier)),
          priceMultiplier: slot.priceMultiplier,
        })),
        reputation: rep,
      };
    });
  }

  static async buyFromMerchant(
    playerId: string,
    merchantId: string,
    resource: ResourceType,
    quantity: number,
  ): Promise<TradeResult> {
    const guild = await prisma.guild.findUnique({ where: { playerId } });
    if (!guild) throw new Error('No guild found');

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player || !player.regionId) throw new Error('Player region not set');

    const merchant = getMerchantById(merchantId);
    if (!merchant) throw new Error('Unknown merchant');

    if (merchant.type === 'traveling' && !isTravelingMerchantPresent(player.regionId)) {
      throw new Error('The traveling merchant is not here today');
    }

    const rep = MarketAnalyticsService.getReputation(playerId);
    const inventory = getRotatedInventory(merchant, player.regionId, rep);
    const slot = inventory.find(s => s.resource === resource);
    if (!slot) throw new Error(`${merchant.name} does not have ${resource} in stock`);
    if (quantity > slot.quantity) throw new Error(`Only ${slot.quantity} available`);

    const daily = await this.generateDailyPrices(player.regionId);
    const unitPrice = Math.max(1, Math.round((daily.prices[resource] ?? 1) * slot.priceMultiplier));
    const totalPrice = unitPrice * quantity;

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    if ((resources[ResourceType.Gold] || 0) < totalPrice) {
      throw new Error(`Not enough gold. Need ${totalPrice}`);
    }

    resources[ResourceType.Gold] -= totalPrice;
    resources[resource] = (resources[resource] || 0) + quantity;

    await prisma.guild.update({
      where: { id: guild.id },
      data: { resources: JSON.stringify(resources) },
    });

    // T-0568: Reputation gain from NPC trades
    MarketAnalyticsService.addReputation(playerId, 2);

    const record: TradeRecord = {
      id: `tx_npc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      playerId,
      resource,
      action: 'buy',
      quantity,
      unitPrice,
      totalPrice,
      fees: 0,
      timestamp: Date.now(),
    };
    MarketAnalyticsService.recordTransaction(record);

    return {
      success: true,
      resource,
      quantity,
      totalPrice,
      fees: 0,
      resources,
      reputation: MarketAnalyticsService.getReputation(playerId),
    };
  }

  // ------------------------------------------------------------------
  // T-0592: Analytics dashboard
  // ------------------------------------------------------------------

  static getAnalyticsDashboard(playerId: string): MarketAnalyticsDashboard {
    const cycle = MarketAnalyticsService.getEconomicCycle();
    return {
      mostTraded: MarketAnalyticsService.getMostTradedItems(),
      biggestMovers: MarketAnalyticsService.getBiggestMovers(),
      economicCycle: {
        phase: cycle.phase,
        priceMultiplier: cycle.priceMultiplier,
        demandMultiplier: cycle.demandMultiplier,
      },
      inflationIndex: MarketAnalyticsService.getInflationIndex(),
      playerPnL: MarketAnalyticsService.getProfitLoss(playerId),
      playerReputation: MarketAnalyticsService.getReputation(playerId),
      achievements: MarketAnalyticsService.getAchievements(playerId),
      priceHistory: MarketAnalyticsService.getPriceHistory(undefined, 48),
      activeEvents: MarketAnalyticsService.getActiveMarketEvents().map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        duration: e.duration,
      })),
      rareSpotlight: MarketAnalyticsService.getRareItemSpotlight(),
      circuitBreakerActive: MarketAnalyticsService.isCircuitBreakerTripped(),
    };
  }

  // ------------------------------------------------------------------
  // T-0612: Quick-sell at floor price
  // ------------------------------------------------------------------

  static async quickSell(
    playerId: string,
    resource: ResourceType,
    quantity: number,
  ): Promise<TradeResult> {
    // Quick sell at 60% of base price (floor) - no fees
    if (!TRADEABLE.includes(resource)) throw new Error('Cannot trade gold');
    if (quantity < 1) throw new Error('Quantity must be positive');

    const guild = await prisma.guild.findUnique({ where: { playerId } });
    if (!guild) throw new Error('No guild found');

    const floorPrice = Math.max(1, Math.floor(BASE_PRICES[resource] * 0.6));
    const totalPrice = floorPrice * quantity;

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    if ((resources[resource] || 0) < quantity) {
      throw new Error(`Not enough ${resource}`);
    }

    resources[resource] -= quantity;
    resources[ResourceType.Gold] = (resources[ResourceType.Gold] || 0) + totalPrice;

    await prisma.guild.update({
      where: { id: guild.id },
      data: { resources: JSON.stringify(resources) },
    });

    return {
      success: true,
      resource,
      quantity,
      totalPrice,
      fees: 0,
      resources,
      reputation: MarketAnalyticsService.getReputation(playerId),
    };
  }

  // ------------------------------------------------------------------
  // Helper: get market building level from guild
  // ------------------------------------------------------------------

  private static getMarketBuildingLevel(guild: any): number {
    try {
      const buildings = JSON.parse(guild.buildings || '[]');
      const market = buildings.find((b: any) => b.type === 'market');
      return market?.level ?? 1;
    } catch {
      return 1;
    }
  }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function applyWeatherModifier(resource: ResourceType, weather: WeatherCondition): number {
  switch (weather) {
    case WeatherCondition.Rainy:
      if (resource === ResourceType.Herbs) return 0.7;   // cheap herbs in rain
      if (resource === ResourceType.Wood) return 1.15;    // harder to log
      break;
    case WeatherCondition.Hot:
      if (resource === ResourceType.Water) return 1.5;    // drought = expensive water
      if (resource === ResourceType.Food) return 1.2;
      break;
    case WeatherCondition.Stormy:
      if (resource === ResourceType.Wood) return 1.3;
      if (resource === ResourceType.Ore) return 1.2;
      break;
    case WeatherCondition.Snowy:
      if (resource === ResourceType.Food) return 1.4;
      if (resource === ResourceType.Water) return 0.8;    // snow = cheap water
      break;
    case WeatherCondition.Windy:
      if (resource === ResourceType.Essence) return 1.15;
      break;
    default:
      break;
  }
  return 1;
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
