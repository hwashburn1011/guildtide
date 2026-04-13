import { WeatherCondition } from '../../../shared/src/enums.js';

export interface RawWeatherData {
  condition: string;
  temp: number;       // celsius
  humidity: number;   // 0-100
  windSpeed: number;  // m/s
  rainMm: number;     // mm in last period
  description: string;
}

export interface GameModifiers {
  cropGrowth: number;      // multiplier, 1.0 = normal
  floodRisk: number;       // 0-1 probability modifier
  travelSpeed: number;     // multiplier
  huntBonus: number;       // multiplier
  alchemyOutput: number;   // multiplier
  essenceDrops: number;    // multiplier
  morale: number;          // multiplier
  marketConfidence: number; // multiplier
}

const DEFAULT_MODIFIERS: GameModifiers = {
  cropGrowth: 1.0,
  floodRisk: 0.0,
  travelSpeed: 1.0,
  huntBonus: 1.0,
  alchemyOutput: 1.0,
  essenceDrops: 1.0,
  morale: 1.0,
  marketConfidence: 1.0,
};

/** Clamp modifier to ±50% of 1.0 */
function clampMod(value: number): number {
  return Math.max(0.5, Math.min(1.5, value));
}

function clampRisk(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Map OpenWeatherMap condition codes to our WeatherCondition enum.
 */
export function classifyWeather(owmCondition: string, temp: number): WeatherCondition {
  const lower = owmCondition.toLowerCase();

  if (lower.includes('thunderstorm')) return WeatherCondition.Stormy;
  if (lower.includes('drizzle') || lower.includes('rain')) return WeatherCondition.Rainy;
  if (lower.includes('snow') || lower.includes('sleet')) return WeatherCondition.Snowy;
  if (lower.includes('fog') || lower.includes('mist') || lower.includes('haze')) return WeatherCondition.Foggy;
  if (lower.includes('wind') || lower.includes('tornado') || lower.includes('squall')) return WeatherCondition.Windy;
  if (lower.includes('clear') || lower.includes('sun')) {
    return temp > 32 ? WeatherCondition.Hot : WeatherCondition.Clear;
  }
  if (lower.includes('cloud')) {
    return temp > 35 ? WeatherCondition.Hot : WeatherCondition.Clear;
  }

  return WeatherCondition.Clear;
}

/**
 * Transform raw weather into game modifiers.
 * This is the core "hidden logic" that players discover over time.
 */
export function weatherToModifiers(weather: RawWeatherData): GameModifiers {
  const mods = { ...DEFAULT_MODIFIERS };
  const condition = classifyWeather(weather.condition, weather.temp);

  switch (condition) {
    case WeatherCondition.Rainy:
      mods.cropGrowth = clampMod(1.0 + weather.rainMm * 0.02); // up to +30%
      mods.floodRisk = clampRisk(weather.rainMm * 0.01);
      mods.travelSpeed = clampMod(1.0 - weather.rainMm * 0.005);
      mods.huntBonus = clampMod(0.9);
      mods.alchemyOutput = clampMod(1.1); // moisture helps alchemy
      mods.morale = clampMod(0.95);
      break;

    case WeatherCondition.Stormy:
      mods.cropGrowth = clampMod(0.85);
      mods.floodRisk = clampRisk(0.3 + weather.rainMm * 0.02);
      mods.travelSpeed = clampMod(0.7);
      mods.huntBonus = clampMod(0.7);
      mods.essenceDrops = clampMod(1.4); // storms create essence
      mods.morale = clampMod(0.85);
      mods.marketConfidence = clampMod(0.9);
      break;

    case WeatherCondition.Hot:
      mods.cropGrowth = clampMod(0.9);
      mods.alchemyOutput = clampMod(1.15);
      mods.travelSpeed = clampMod(0.95);
      mods.morale = clampMod(0.9);
      break;

    case WeatherCondition.Snowy:
      mods.cropGrowth = clampMod(0.7);
      mods.travelSpeed = clampMod(0.75);
      mods.huntBonus = clampMod(1.2); // tracks in snow
      mods.alchemyOutput = clampMod(1.1); // cold preservation
      mods.morale = clampMod(0.9);
      break;

    case WeatherCondition.Foggy:
      mods.travelSpeed = clampMod(0.8);
      mods.huntBonus = clampMod(0.85);
      mods.essenceDrops = clampMod(1.2); // mystical fog
      mods.morale = clampMod(0.95);
      break;

    case WeatherCondition.Windy:
      mods.travelSpeed = clampMod(0.85);
      mods.cropGrowth = clampMod(0.95);
      mods.huntBonus = clampMod(0.9);
      break;

    case WeatherCondition.Clear:
      mods.cropGrowth = clampMod(1.1);
      mods.travelSpeed = clampMod(1.05);
      mods.morale = clampMod(1.1);
      mods.marketConfidence = clampMod(1.05);
      break;
  }

  // Temperature adjustments (layered on top)
  if (weather.temp < 0) {
    mods.cropGrowth = clampMod(mods.cropGrowth * 0.8);
    mods.travelSpeed = clampMod(mods.travelSpeed * 0.9);
  } else if (weather.temp > 35) {
    mods.cropGrowth = clampMod(mods.cropGrowth * 0.85);
  }

  // Humidity adjustments
  if (weather.humidity > 80) {
    mods.alchemyOutput = clampMod(mods.alchemyOutput * 1.05);
    mods.floodRisk = clampRisk(mods.floodRisk + 0.05);
  }

  return mods;
}
