/**
 * WeatherForecastService — Multi-day weather forecasting.
 *
 * T-0777: Weather forecast display showing next 24 hours
 * T-0778: Weather history log showing past 7 days
 * T-0790: Weather pattern analysis for prediction accuracy bonuses
 */
import { dataCache } from './ExternalDataCache';
import { classifyWeather, type RawWeatherData } from '../utils/weatherMapping';
import { WeatherCondition } from '../../../shared/src/enums';

// Region coordinates — same as WeatherService
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

export interface ForecastEntry {
  date: string;
  hour: number;
  condition: WeatherCondition;
  rawCondition: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainMm: number;
  description: string;
}

export interface DailyForecast {
  date: string;
  highTemp: number;
  lowTemp: number;
  dominantCondition: WeatherCondition;
  avgHumidity: number;
  avgWindSpeed: number;
  totalRainMm: number;
  entries: ForecastEntry[];
}

export interface WeatherHistoryEntry {
  date: string;
  condition: WeatherCondition;
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainMm: number;
}

export interface WeatherPattern {
  consecutiveDays: number;
  condition: WeatherCondition;
  trend: 'warming' | 'cooling' | 'stable';
  predictionBonus: number;
}

export class WeatherForecastService {
  private static apiKey = process.env.OPENWEATHERMAP_API_KEY || '';

  /** Store weather history in memory (per region) */
  private static weatherHistory = new Map<string, WeatherHistoryEntry[]>();

  /**
   * T-0777: Fetch 5-day forecast from OpenWeatherMap.
   * Uses 3-hour interval data and groups by day.
   */
  static async getForecast(regionId: string): Promise<DailyForecast[]> {
    const coords = REGION_COORDS[regionId];
    if (!coords || !WeatherForecastService.apiKey) {
      return WeatherForecastService.simulateForecast(regionId);
    }

    const cacheKey = `forecast:${regionId}`;
    const ttl = 60 * 60 * 1000; // 1 hour cache

    try {
      return await dataCache.fetchWithRetry<DailyForecast[]>(
        'openweathermap',
        cacheKey,
        async () => {
          const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${WeatherForecastService.apiKey}&units=metric`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Forecast API: ${response.status}`);

          const data = await response.json();
          return WeatherForecastService.parseForecastResponse(data);
        },
        ttl,
      );
    } catch {
      return WeatherForecastService.simulateForecast(regionId);
    }
  }

  /** Parse OpenWeatherMap 5-day forecast response */
  private static parseForecastResponse(data: any): DailyForecast[] {
    const entries: ForecastEntry[] = (data.list || []).map((item: any) => {
      const dt = new Date(item.dt * 1000);
      const rawCondition = item.weather?.[0]?.main || 'Clear';
      const temp = item.main?.temp ?? 20;
      return {
        date: dt.toISOString().split('T')[0],
        hour: dt.getHours(),
        condition: classifyWeather(rawCondition, temp),
        rawCondition,
        temperature: temp,
        humidity: item.main?.humidity ?? 50,
        windSpeed: item.wind?.speed ?? 3,
        rainMm: item.rain?.['3h'] ?? 0,
        description: item.weather?.[0]?.description || 'clear',
      };
    });

    return WeatherForecastService.groupByDay(entries);
  }

  /** Group forecast entries by day */
  private static groupByDay(entries: ForecastEntry[]): DailyForecast[] {
    const byDay = new Map<string, ForecastEntry[]>();
    for (const entry of entries) {
      const existing = byDay.get(entry.date) || [];
      existing.push(entry);
      byDay.set(entry.date, existing);
    }

    const result: DailyForecast[] = [];
    for (const [date, dayEntries] of byDay.entries()) {
      const temps = dayEntries.map((e) => e.temperature);
      const humidities = dayEntries.map((e) => e.humidity);
      const winds = dayEntries.map((e) => e.windSpeed);

      // Dominant condition = most frequent
      const conditionCounts = new Map<WeatherCondition, number>();
      for (const e of dayEntries) {
        conditionCounts.set(e.condition, (conditionCounts.get(e.condition) || 0) + 1);
      }
      let dominantCondition = WeatherCondition.Clear;
      let maxCount = 0;
      for (const [cond, count] of conditionCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          dominantCondition = cond;
        }
      }

      result.push({
        date,
        highTemp: Math.max(...temps),
        lowTemp: Math.min(...temps),
        dominantCondition,
        avgHumidity: Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length),
        avgWindSpeed: Math.round(winds.reduce((a, b) => a + b, 0) / winds.length * 10) / 10,
        totalRainMm: Math.round(dayEntries.reduce((sum, e) => sum + e.rainMm, 0) * 10) / 10,
        entries: dayEntries,
      });
    }

    return result.slice(0, 5);
  }

  /** Simulated forecast for when no API key is configured */
  static simulateForecast(regionId: string): DailyForecast[] {
    const days: DailyForecast[] = [];
    const now = new Date();
    const conditions = [
      WeatherCondition.Clear, WeatherCondition.Rainy, WeatherCondition.Clear,
      WeatherCondition.Foggy, WeatherCondition.Windy,
    ];

    const baseTempByRegion: Record<string, number> = {
      'miami': 28, 'austin': 25, 'sao-paulo': 24,
      'los-angeles': 22, 'new-york': 15, 'chicago': 12,
      'london': 12, 'berlin': 10, 'denver': 14,
      'seattle': 13, 'tokyo': 18, 'sydney': 20,
    };
    const baseTemp = baseTempByRegion[regionId] ?? 18;

    for (let i = 0; i < 5; i++) {
      const day = new Date(now);
      day.setDate(day.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];
      const seed = regionId.length * 7 + day.getDate() * 13;
      const tempVariance = ((seed + i * 31) % 15) - 7;
      const highTemp = baseTemp + tempVariance + 4;
      const lowTemp = baseTemp + tempVariance - 4;
      const cond = conditions[(seed + i) % conditions.length];

      days.push({
        date: dateStr,
        highTemp: Math.round(highTemp),
        lowTemp: Math.round(lowTemp),
        dominantCondition: cond,
        avgHumidity: 40 + ((seed + i * 17) % 40),
        avgWindSpeed: 2 + ((seed + i * 3) % 12),
        totalRainMm: cond === WeatherCondition.Rainy ? 5 + ((seed + i * 7) % 20) : 0,
        entries: [],
      });
    }

    return days;
  }

  /**
   * T-0778: Record today's weather into history.
   */
  static recordWeatherHistory(regionId: string, weather: RawWeatherData): void {
    const today = new Date().toISOString().split('T')[0];
    const history = WeatherForecastService.weatherHistory.get(regionId) || [];

    // Don't duplicate today
    if (history.length > 0 && history[history.length - 1].date === today) {
      return;
    }

    history.push({
      date: today,
      condition: classifyWeather(weather.condition, weather.temp),
      temperature: weather.temp,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      rainMm: weather.rainMm,
    });

    // Keep last 30 days
    if (history.length > 30) {
      history.splice(0, history.length - 30);
    }

    WeatherForecastService.weatherHistory.set(regionId, history);
  }

  /** Get weather history for past N days */
  static getWeatherHistory(regionId: string, days: number = 7): WeatherHistoryEntry[] {
    const history = WeatherForecastService.weatherHistory.get(regionId) || [];
    return history.slice(-days);
  }

  /**
   * T-0790: Analyze weather patterns for prediction accuracy bonuses.
   */
  static analyzePatterns(regionId: string): WeatherPattern | null {
    const history = WeatherForecastService.getWeatherHistory(regionId, 14);
    if (history.length < 3) return null;

    // Find consecutive days with same condition
    let consecutiveCount = 1;
    const latestCondition = history[history.length - 1].condition;
    for (let i = history.length - 2; i >= 0; i--) {
      if (history[i].condition === latestCondition) {
        consecutiveCount++;
      } else {
        break;
      }
    }

    // Temperature trend
    const recentTemps = history.slice(-5).map((h) => h.temperature);
    let trend: 'warming' | 'cooling' | 'stable' = 'stable';
    if (recentTemps.length >= 3) {
      const first = recentTemps[0];
      const last = recentTemps[recentTemps.length - 1];
      if (last - first > 3) trend = 'warming';
      else if (first - last > 3) trend = 'cooling';
    }

    // Prediction bonus: more consecutive days = easier to predict
    const predictionBonus = Math.min(0.25, consecutiveCount * 0.05);

    return {
      consecutiveDays: consecutiveCount,
      condition: latestCondition,
      trend,
      predictionBonus,
    };
  }
}
