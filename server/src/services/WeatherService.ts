import { prisma } from '../db.js';
import { classifyWeather, weatherToModifiers, type RawWeatherData } from '../utils/weatherMapping.js';
import { WeatherCondition } from '../../../shared/src/enums.js';
import { CalendarService } from './CalendarService.js';

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

export class WeatherService {
  private static apiKey = process.env.OPENWEATHERMAP_API_KEY || '';

  /**
   * Fetch weather from OpenWeatherMap for a region.
   * Falls back to simulated weather if no API key is configured.
   */
  static async fetchWeather(regionId: string): Promise<RawWeatherData> {
    const coords = REGION_COORDS[regionId];
    if (!coords) {
      return WeatherService.simulateWeather(regionId);
    }

    if (!WeatherService.apiKey) {
      return WeatherService.simulateWeather(regionId);
    }

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${WeatherService.apiKey}&units=metric`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Weather API: ${response.status}`);

      const data = await response.json();

      return {
        condition: data.weather?.[0]?.main || 'Clear',
        temp: data.main?.temp ?? 20,
        humidity: data.main?.humidity ?? 50,
        windSpeed: data.wind?.speed ?? 3,
        rainMm: data.rain?.['1h'] ?? data.rain?.['3h'] ?? 0,
        description: data.weather?.[0]?.description || 'clear sky',
      };
    } catch (err) {
      console.error(`Weather fetch failed for ${regionId}:`, err);
      return WeatherService.simulateWeather(regionId);
    }
  }

  /**
   * Simulated weather for development / when no API key is set.
   * Uses time-based pseudo-randomness so it changes throughout the day.
   */
  static simulateWeather(regionId: string): RawWeatherData {
    const hour = new Date().getHours();
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const seed = regionId.length * 7 + dayOfYear * 13 + Math.floor(hour / 4);

    const conditions = ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm', 'Snow', 'Mist'];
    const conditionIndex = seed % conditions.length;
    const condition = conditions[conditionIndex];

    // Base temp varies by region
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
   */
  static async updateRegionState(regionId: string): Promise<void> {
    const weather = await WeatherService.fetchWeather(regionId);
    const modifiers = weatherToModifiers(weather);
    const condition = classifyWeather(weather.condition, weather.temp);
    const today = new Date().toISOString().split('T')[0];

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
   * Get current world state for a region. If none exists, create it.
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

    // Merge weather modifiers with seasonal modifiers (multiplicative stacking)
    const weatherMods = JSON.parse(state.modifiers);
    const mergedModifiers = { ...weatherMods };

    // Apply seasonal crop growth
    if (mergedModifiers.cropGrowth !== undefined) {
      mergedModifiers.cropGrowth *= seasonalMods.cropGrowth;
    }
    // Apply seasonal morale
    if (mergedModifiers.morale !== undefined) {
      mergedModifiers.morale *= seasonalMods.morale;
    }

    // Apply festival buffs to modifiers if active
    if (festival) {
      if (mergedModifiers.morale !== undefined) {
        mergedModifiers.morale *= (1 + festival.buffs.morale);
      }
      if (mergedModifiers.marketConfidence !== undefined) {
        mergedModifiers.marketConfidence *= (1 + festival.buffs.goldIncome);
      }
    }

    return {
      regionId: state.regionId,
      date: state.date,
      weather: JSON.parse(state.weather),
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
    };
  }
}
