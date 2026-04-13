import { prisma } from '../db.js';
import { ResourceType, WeatherCondition } from '../../../shared/src/enums.js';
import { WeatherService } from './WeatherService.js';

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
}

export interface MarketPricesResponse {
  date: string;
  confidence: number;
  items: MarketPriceEntry[];
}

export interface TradeResult {
  success: boolean;
  resource: ResourceType;
  quantity: number;
  totalPrice: number;
  resources: Record<ResourceType, number>;
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
    try {
      const worldState = await WeatherService.getWorldState(regionId);
      if (worldState) {
        weatherCondition = worldState.weather.condition as WeatherCondition;
      }
    } catch {
      // No weather data — use defaults
    }

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

      prices[resource] = Math.max(1, Math.round(base * variance * modifier));
    }

    const result: DailyPrices = { date: today, prices };
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

      return {
        resource,
        basePrice: BASE_PRICES[resource],
        currentPrice,
        trend,
      };
    });

    return {
      date: today.date,
      confidence,
      items,
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

    const guild = await prisma.guild.findUnique({ where: { playerId } });
    if (!guild) throw new Error('No guild found');

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player || !player.regionId) throw new Error('Player region not set');

    const daily = await this.generateDailyPrices(player.regionId);
    const unitPrice = daily.prices[resource];
    const totalPrice = unitPrice * quantity;

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;

    if ((resources[ResourceType.Gold] || 0) < totalPrice) {
      throw new Error(`Not enough gold. Need ${totalPrice}, have ${Math.floor(resources[ResourceType.Gold] || 0)}`);
    }

    resources[ResourceType.Gold] -= totalPrice;
    resources[resource] = (resources[resource] || 0) + quantity;

    await prisma.guild.update({
      where: { id: guild.id },
      data: { resources: JSON.stringify(resources) },
    });

    return { success: true, resource, quantity, totalPrice, resources };
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

    const guild = await prisma.guild.findUnique({ where: { playerId } });
    if (!guild) throw new Error('No guild found');

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player || !player.regionId) throw new Error('Player region not set');

    const daily = await this.generateDailyPrices(player.regionId);
    const unitPrice = daily.prices[resource];
    // Sell at 80 % of buy price
    const totalPrice = Math.max(1, Math.floor(unitPrice * 0.8 * quantity));

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

    return { success: true, resource, quantity, totalPrice, resources };
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
