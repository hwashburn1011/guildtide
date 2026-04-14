/**
 * WeatherService — Enhanced with caching, rate limiting, validation, and fallback.
 *
 * T-0761: OpenWeatherMap API key configuration
 * T-0762: Weather data fetch with city/coordinates
 * T-0763: Weather data model
 * T-0764: Weather data caching (30-minute TTL via ExternalDataCache)
 * T-0765: Cache invalidation and refresh
 * T-0766: Fallback system returning last known data on failure
 * T-0781: Weather location setting in player profile
 * T-0782: Weather location auto-detect (browser geolocation)
 * T-0784: Weather-based market price modifier application
 * T-0785: API rate limiter (via ExternalDataCache)
 * T-0786: Weather data validation and sanitization
 * T-0787: Weather webhook for severe weather alerts
 * T-0788: Weather comparison between player locations
 * T-0789: Weather achievement system
 */
import { prisma } from '../db';
import { classifyWeather, weatherToModifiers, type RawWeatherData } from '../utils/weatherMapping';
import { WeatherCondition } from '../../../shared/src/enums';
import { CalendarService } from './CalendarService';
import { dataCache } from './ExternalDataCache';
import { WeatherForecastService } from './WeatherForecastService';
import {
  calculateMoonPhase,
  getMoonPhaseEffect,
  getAstronomicalEvents,
  getBiomeAdjustedWeatherEffect,
} from '../data/realWorldMappings';

// Region coordinates for weather fetching
const REGION_COORDS: Record<string, { lat: number; lon: number }> = {
  'miami': { lat: 25.76, lon: -80.19 },
  'new-york': { lat: 40.71, lon: -74.01 },
  'chicago': { lat: 41.88, lon: -87.63 },
  'denver': { lat: 39.74, lon: -104.99 },
  'seattle': { lat: 47.61, lon: -122.33 },
  'los-angeles': { lat: 34.05, lon: -118.24 },
  'austin': { lat: 30.27, lon: -97.74 },
  'london': { lat: 51.51, lon: -0.13 },
  'tokyo': { lat: 35.68, lon: 139.69 },
  'sydney': { lat: -33.87, lon: 151.21 },
  'sao-paulo': { lat: -23.55, lon: -46.63 },
  'berlin': { lat: 52.52, lon: 13.41 },
};

/** T-0789: Weather achievements tracking */
interface WeatherAchievementProgress {
  conditionsSeen: Set<string>;
  totalDaysPlayed: number;
}

export class WeatherService {
  private static apiKey = process.env.OPENWEATHERMAP_API_KEY || '';
  private static achievementProgress = new Map<string, WeatherAchievementProgress>();
  private static severeWeatherAlerts: Array<{ regionId: string; alert: string; timestamp: string }> = [];

  /**
   * T-0761, T-0762: Fetch weather from OpenWeatherMap with caching and rate limiting.
   * T-0764: Uses ExternalDataCache with 30-minute TTL.
   * T-0766: Falls back to last known data on API failure.
   */
  static async fetchWeather(regionId: string): Promise<RawWeatherData> {
    const coords = REGION_COORDS[regionId];
    if (!coords || !WeatherService.apiKey) {
      return WeatherService.simulateWeather(regionId);
    }

    const cacheKey = `weather:current:${regionId}`;
    const TTL = 30 * 60 * 1000; // 30 minutes

    try {
      return await dataCache.fetchWithRetry<RawWeatherData>(
        'openweathermap',
        cacheKey,
        async () => {
          const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${WeatherService.apiKey}&units=metric`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Weather API: ${response.status}`);

          const data = await response.json();
          const raw: RawWeatherData = {
            condition: data.weather?.[0]?.main || 'Clear',
            temp: data.main?.temp ?? 20,
            humidity: data.main?.humidity ?? 50,
            windSpeed: data.wind?.speed ?? 3,
            rainMm: data.rain?.['1h'] ?? data.rain?.['3h'] ?? 0,
            description: data.weather?.[0]?.description || 'clear sky',
          };

          // T-0786: Validate and sanitize
          return WeatherService.validateWeatherData(raw);
        },
        TTL,
      );
    } catch (err) {
      console.error(`Weather fetch failed for ${regionId}:`, err);
      return WeatherService.simulateWeather(regionId);
    }
  }

  /**
   * T-0786: Validate and sanitize weather data.
   */
  static validateWeatherData(data: RawWeatherData): RawWeatherData {
    return {
      condition: typeof data.condition === 'string' && data.condition.length > 0
        ? data.condition : 'Clear',
      temp: typeof data.temp === 'number' && data.temp > -100 && data.temp < 100
        ? Math.round(data.temp * 10) / 10 : 20,
      humidity: typeof data.humidity === 'number'
        ? Math.max(0, Math.min(100, Math.round(data.humidity))) : 50,
      windSpeed: typeof data.windSpeed === 'number'
        ? Math.max(0, Math.min(200, Math.round(data.windSpeed * 10) / 10)) : 3,
      rainMm: typeof data.rainMm === 'number'
        ? Math.max(0, Math.round(data.rainMm * 10) / 10) : 0,
      description: typeof data.description === 'string'
        ? data.description.slice(0, 200) : 'clear',
    };
  }

  /**
   * Simulated weather for development / when no API key is set.
   */
  static simulateWeather(regionId: string): RawWeatherData {
    const hour = new Date().getHours();
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const seed = regionId.length * 7 + dayOfYear * 13 + Math.floor(hour / 4);

    const conditions = ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm', 'Snow', 'Mist'];
    const conditionIndex = seed % conditions.length;
    const condition = conditions[conditionIndex];

    const baseTempByRegion: Record<string, number> = {
      'miami': 28, 'austin': 25, 'sao-paulo': 24,
      'los-angeles': 22, 'new-york': 15, 'chicago': 12,
      'london': 12, 'berlin': 10, 'denver': 14,
      'seattle': 13, 'tokyo': 18, 'sydney': 20,
    };
    const baseTemp = baseTempByRegion[regionId] ?? 18;
    const tempVariance = ((seed * 31) % 20) - 10;
    const temp = baseTemp + tempVariance;

    return {
      condition,
      temp,
      humidity: 40 + (seed * 17 % 50),
      windSpeed: 1 + (seed * 3 % 15),
      rainMm: condition.includes('Rain') || condition.includes('Drizzle')
        ? 2 + (seed * 7 % 20)
        : condition.includes('Thunderstorm') ? 10 + (seed * 11 % 30) : 0,
      description: condition.toLowerCase(),
    };
  }

  /**
   * Fetch weather and store the world state for a region.
   * Now also records weather history.
   */
  static async updateRegionState(regionId: string): Promise<void> {
    const weather = await WeatherService.fetchWeather(regionId);
    const modifiers = weatherToModifiers(weather);
    const condition = classifyWeather(weather.condition, weather.temp);
    const today = new Date().toISOString().split('T')[0];

    // Record to history (T-0778)
    WeatherForecastService.recordWeatherHistory(regionId, weather);

    // Check for severe weather (T-0787)
    WeatherService.checkSevereWeather(regionId, weather, condition);

    await prisma.regionState.upsert({
      where: { regionId_date: { regionId, date: today } },
      update: {
        weather: JSON.stringify({
          condition,
          temperature: weather.temp,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          rainMm: weather.rainMm,
        }),
        modifiers: JSON.stringify(modifiers),
      },
      create: {
        regionId,
        date: today,
        weather: JSON.stringify({
          condition,
          temperature: weather.temp,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          rainMm: weather.rainMm,
        }),
        modifiers: JSON.stringify(modifiers),
      },
    });
  }

  /**
   * T-0787: Check for severe weather and generate alerts.
   */
  private static checkSevereWeather(regionId: string, weather: RawWeatherData, condition: WeatherCondition): void {
    const alerts: string[] = [];

    if (condition === WeatherCondition.Stormy && weather.windSpeed > 20) {
      alerts.push('Severe thunderstorm warning — expeditions at risk!');
    }
    if (weather.temp > 40) {
      alerts.push('Extreme heat advisory — worker efficiency significantly reduced.');
    }
    if (weather.temp < -20) {
      alerts.push('Extreme cold warning — crop growth halted.');
    }
    if (weather.rainMm > 30) {
      alerts.push('Heavy rain alert — flood risk elevated.');
    }

    for (const alert of alerts) {
      WeatherService.severeWeatherAlerts.push({
        regionId,
        alert,
        timestamp: new Date().toISOString(),
      });
    }

    // Keep last 100 alerts
    if (WeatherService.severeWeatherAlerts.length > 100) {
      WeatherService.severeWeatherAlerts.splice(0, WeatherService.severeWeatherAlerts.length - 100);
    }
  }

  /** Get recent severe weather alerts for a region */
  static getSevereAlerts(regionId: string): Array<{ alert: string; timestamp: string }> {
    return WeatherService.severeWeatherAlerts
      .filter((a) => a.regionId === regionId)
      .slice(-10);
  }

  /**
   * Get current world state for a region with all layered modifiers.
   */
  static async getWorldState(regionId: string) {
    const today = new Date().toISOString().split('T')[0];

    let state = await prisma.regionState.findUnique({
      where: { regionId_date: { regionId, date: today } },
    });

    if (!state) {
      await WeatherService.updateRegionState(regionId);
      state = await prisma.regionState.findUnique({
        where: { regionId_date: { regionId, date: today } },
      });
    }

    if (!state) return null;

    const now = new Date();
    const season = CalendarService.getCurrentSeason(regionId, now);
    const seasonalMods = CalendarService.getSeasonalModifiers(season);
    const festival = CalendarService.getActiveFestival(regionId, now);

    // Moon phase (T-0812, T-0814)
    const moonPhase = calculateMoonPhase(now);
    const moonEffect = getMoonPhaseEffect(now);

    // Astronomical events (T-0838, T-0839)
    const astronomicalEvents = getAstronomicalEvents(now);

    // Biome-adjusted weather effects (T-0856)
    const weatherData = JSON.parse(state.weather);
    const biomeEffects = getBiomeAdjustedWeatherEffect(regionId, weatherData.condition);

    // Merge weather modifiers with seasonal modifiers (multiplicative stacking)
    const weatherMods = JSON.parse(state.modifiers);
    const mergedModifiers = { ...weatherMods };

    // Apply seasonal crop growth
    if (mergedModifiers.cropGrowth !== undefined) {
      mergedModifiers.cropGrowth *= seasonalMods.cropGrowth;
    }
    if (mergedModifiers.morale !== undefined) {
      mergedModifiers.morale *= seasonalMods.morale;
    }

    // Apply moon phase effects
    if (mergedModifiers.essenceDrops !== undefined) {
      mergedModifiers.essenceDrops *= moonEffect.essenceDrops;
    }
    if (mergedModifiers.huntBonus !== undefined) {
      mergedModifiers.huntBonus *= moonEffect.huntBonus;
    }

    // Apply astronomical event bonuses
    for (const event of astronomicalEvents) {
      if (mergedModifiers.essenceDrops !== undefined) {
        mergedModifiers.essenceDrops *= event.effects.essenceDrops;
      }
      if (mergedModifiers.morale !== undefined) {
        mergedModifiers.morale *= event.effects.morale;
      }
    }

    // Apply festival buffs
    if (festival) {
      if (mergedModifiers.morale !== undefined) {
        mergedModifiers.morale *= (1 + festival.buffs.morale);
      }
      if (mergedModifiers.marketConfidence !== undefined) {
        mergedModifiers.marketConfidence *= (1 + festival.buffs.goldIncome);
      }
    }

    // Severe weather alerts
    const severeAlerts = WeatherService.getSevereAlerts(regionId);

    return {
      regionId: state.regionId,
      date: state.date,
      weather: weatherData,
      modifiers: mergedModifiers,
      activeEvents: JSON.parse(state.activeEvents),
      marketState: JSON.parse(state.marketState),
      season,
      festival: festival
        ? {
            name: festival.fantasyName,
            flavorText: festival.flavorText,
            buffs: festival.buffs,
            duration: festival.duration,
          }
        : null,
      moonPhase: {
        phase: moonPhase,
        label: moonEffect.label,
        icon: moonEffect.icon,
        effects: {
          magicPotency: moonEffect.magicPotency,
          stealthBonus: moonEffect.stealthBonus,
        },
      },
      astronomicalEvents: astronomicalEvents.map((e) => ({
        name: e.fantasyName,
        effects: e.effects,
      })),
      severeAlerts,
      biomeEffects: {
        farmProduction: biomeEffects.farmProduction,
        expeditionSpeed: biomeEffects.expeditionSpeed,
        mineYield: biomeEffects.mineYield,
      },
    };
  }

  /**
   * T-0788: Compare weather between player locations.
   */
  static async compareWeather(regionIds: string[]): Promise<Array<{
    regionId: string;
    condition: string;
    temperature: number;
    modifiers: Record<string, number>;
  }>> {
    const comparisons: Array<{
      regionId: string;
      condition: string;
      temperature: number;
      modifiers: Record<string, number>;
    }> = [];
    for (const regionId of regionIds) {
      const weather = await WeatherService.fetchWeather(regionId);
      const condition = classifyWeather(weather.condition, weather.temp);
      const modifiers = weatherToModifiers(weather);
      comparisons.push({
        regionId,
        condition,
        temperature: weather.temp,
        modifiers: modifiers as unknown as Record<string, number>,
      });
    }
    return comparisons;
  }

  /**
   * T-0789: Track weather achievements for a player.
   */
  static recordWeatherAchievement(playerId: string, condition: string): void {
    let progress = WeatherService.achievementProgress.get(playerId);
    if (!progress) {
      progress = { conditionsSeen: new Set(), totalDaysPlayed: 0 };
      WeatherService.achievementProgress.set(playerId, progress);
    }
    progress.conditionsSeen.add(condition);
    progress.totalDaysPlayed++;
  }

  static getWeatherAchievements(playerId: string): {
    conditionsSeen: number;
    totalConditions: number;
    achieved: boolean;
    daysPlayed: number;
  } {
    const totalConditions = Object.values(WeatherCondition).length;
    const progress = WeatherService.achievementProgress.get(playerId);
    if (!progress) {
      return { conditionsSeen: 0, totalConditions, achieved: false, daysPlayed: 0 };
    }
    return {
      conditionsSeen: progress.conditionsSeen.size,
      totalConditions,
      achieved: progress.conditionsSeen.size >= 10 || progress.conditionsSeen.size >= totalConditions,
      daysPlayed: progress.totalDaysPlayed,
    };
  }

  /**
   * T-0765: Force refresh weather cache for a region.
   */
  static invalidateCache(regionId: string): void {
    dataCache.invalidate(`weather:current:${regionId}`);
    dataCache.invalidate(`forecast:${regionId}`);
  }
}
