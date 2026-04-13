/**
 * realWorldMappings.ts — Complete mapping rules from real-world data to game effects.
 *
 * T-0767: Weather condition mapping to in-game effects table
 * T-0768: Rain effect: +20% farm production, -10% expedition speed
 * T-0769: Sunny effect: +10% morale, +15% market activity
 * T-0770: Storm effect: -30% expedition safety, +20% mine yield
 * T-0771: Snow effect: -20% food production, +10% research speed
 * T-0772: Fog effect: +15% rogue effectiveness, -10% scout range
 * T-0773: Heatwave effect: -15% worker efficiency, +25% water value
 * T-0774: Wind effect: +10% travel speed, -5% construction speed
 * T-0793: Fear & Greed mapping to market volatility
 * T-0797: Stock index mapping to merchant guild prosperity
 * T-0801: Crypto volatility mapping to trade volatility
 * T-0806: News sentiment mapping to world event triggers
 * T-0810: Sports event mapping to tournament events
 * T-0814: Moon phase effects
 * T-0832: Cross-data correlation (compound effects)
 * T-0837: Earthquake/disaster mapping to calamity events
 * T-0838: Solar/astronomical event tracking
 * T-0839: Astronomical event bonus system
 * T-0840: Tide data mapping
 * T-0841: Air quality mapping
 * T-0846: Sunrise/sunset day-night sync
 * T-0847: UV index mapping
 * T-0848: Pollen count mapping
 * T-0856: Weather-to-biome mapping for region-specific effects
 */

// ---- Weather Effects Table ----

export interface WeatherEffect {
  farmProduction: number;
  expeditionSpeed: number;
  expeditionSafety: number;
  mineYield: number;
  morale: number;
  marketActivity: number;
  researchSpeed: number;
  rogueEffectiveness: number;
  scoutRange: number;
  workerEfficiency: number;
  waterValue: number;
  travelSpeed: number;
  constructionSpeed: number;
  magicPotency: number;
  stealthBonus: number;
}

const DEFAULT_WEATHER_EFFECT: WeatherEffect = {
  farmProduction: 1.0,
  expeditionSpeed: 1.0,
  expeditionSafety: 1.0,
  mineYield: 1.0,
  morale: 1.0,
  marketActivity: 1.0,
  researchSpeed: 1.0,
  rogueEffectiveness: 1.0,
  scoutRange: 1.0,
  workerEfficiency: 1.0,
  waterValue: 1.0,
  travelSpeed: 1.0,
  constructionSpeed: 1.0,
  magicPotency: 1.0,
  stealthBonus: 1.0,
};

/** T-0767 through T-0774: Weather condition -> game effect mapping */
export const WEATHER_EFFECTS: Record<string, Partial<WeatherEffect>> = {
  rainy: {
    farmProduction: 1.20,        // T-0768: +20% farm production
    expeditionSpeed: 0.90,       // T-0768: -10% expedition speed
    morale: 0.95,
    rogueEffectiveness: 1.05,
    scoutRange: 0.95,
  },
  clear: {
    morale: 1.10,                // T-0769: +10% morale
    marketActivity: 1.15,        // T-0769: +15% market activity
    farmProduction: 1.05,
    travelSpeed: 1.05,
  },
  stormy: {
    expeditionSafety: 0.70,      // T-0770: -30% expedition safety
    mineYield: 1.20,             // T-0770: +20% mine yield
    farmProduction: 0.85,
    morale: 0.85,
    travelSpeed: 0.70,
    magicPotency: 1.15,
  },
  snowy: {
    farmProduction: 0.80,        // T-0771: -20% food production
    researchSpeed: 1.10,         // T-0771: +10% research speed
    travelSpeed: 0.75,
    expeditionSpeed: 0.80,
    stealthBonus: 0.90,          // tracks in snow
  },
  foggy: {
    rogueEffectiveness: 1.15,    // T-0772: +15% rogue effectiveness
    scoutRange: 0.90,            // T-0772: -10% scout range
    travelSpeed: 0.85,
    magicPotency: 1.10,
    stealthBonus: 1.15,
  },
  hot: {
    workerEfficiency: 0.85,      // T-0773: -15% worker efficiency
    waterValue: 1.25,            // T-0773: +25% water resource value
    farmProduction: 0.90,
    morale: 0.90,
  },
  windy: {
    travelSpeed: 1.10,           // T-0774: +10% travel speed
    constructionSpeed: 0.95,     // T-0774: -5% construction speed
    scoutRange: 0.95,
  },
};

/** Apply weather effects to the default template */
export function getWeatherEffect(condition: string): WeatherEffect {
  const overrides = WEATHER_EFFECTS[condition] || {};
  return { ...DEFAULT_WEATHER_EFFECT, ...overrides };
}

// ---- Moon Phase System ----

export type MoonPhase =
  | 'new_moon'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full_moon'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

export interface MoonPhaseEffect {
  magicPotency: number;
  stealthBonus: number;
  essenceDrops: number;
  huntBonus: number;
  morale: number;
  label: string;
  icon: string;
}

/** T-0812, T-0814: Moon phase calculation (algorithmic — no API needed) */
export function calculateMoonPhase(date: Date = new Date()): MoonPhase {
  // Synodic month = 29.53059 days
  // Known new moon reference: Jan 6, 2000, 18:14 UTC
  const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
  const synodicMonth = 29.53059;
  const daysSince = (date.getTime() - knownNewMoon) / 86400000;
  const phase = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
  const normalized = phase / synodicMonth; // 0 to 1

  if (normalized < 0.0625) return 'new_moon';
  if (normalized < 0.1875) return 'waxing_crescent';
  if (normalized < 0.3125) return 'first_quarter';
  if (normalized < 0.4375) return 'waxing_gibbous';
  if (normalized < 0.5625) return 'full_moon';
  if (normalized < 0.6875) return 'waning_gibbous';
  if (normalized < 0.8125) return 'last_quarter';
  if (normalized < 0.9375) return 'waning_crescent';
  return 'new_moon';
}

/** T-0814: Moon phase effects (full moon: +20% magic, new moon: +20% stealth) */
export const MOON_PHASE_EFFECTS: Record<MoonPhase, MoonPhaseEffect> = {
  new_moon: {
    magicPotency: 0.90,
    stealthBonus: 1.20,
    essenceDrops: 1.05,
    huntBonus: 0.95,
    morale: 0.98,
    label: 'New Moon',
    icon: '🌑',
  },
  waxing_crescent: {
    magicPotency: 0.95,
    stealthBonus: 1.15,
    essenceDrops: 1.03,
    huntBonus: 0.98,
    morale: 1.0,
    label: 'Waxing Crescent',
    icon: '🌒',
  },
  first_quarter: {
    magicPotency: 1.0,
    stealthBonus: 1.05,
    essenceDrops: 1.0,
    huntBonus: 1.0,
    morale: 1.0,
    label: 'First Quarter',
    icon: '🌓',
  },
  waxing_gibbous: {
    magicPotency: 1.10,
    stealthBonus: 0.95,
    essenceDrops: 1.05,
    huntBonus: 1.05,
    morale: 1.02,
    label: 'Waxing Gibbous',
    icon: '🌔',
  },
  full_moon: {
    magicPotency: 1.20,
    stealthBonus: 0.85,
    essenceDrops: 1.15,
    huntBonus: 1.10,
    morale: 1.05,
    label: 'Full Moon',
    icon: '🌕',
  },
  waning_gibbous: {
    magicPotency: 1.10,
    stealthBonus: 0.95,
    essenceDrops: 1.05,
    huntBonus: 1.05,
    morale: 1.02,
    label: 'Waning Gibbous',
    icon: '🌖',
  },
  last_quarter: {
    magicPotency: 1.0,
    stealthBonus: 1.05,
    essenceDrops: 1.0,
    huntBonus: 1.0,
    morale: 1.0,
    label: 'Last Quarter',
    icon: '🌗',
  },
  waning_crescent: {
    magicPotency: 0.95,
    stealthBonus: 1.15,
    essenceDrops: 1.03,
    huntBonus: 0.98,
    morale: 1.0,
    label: 'Waning Crescent',
    icon: '🌘',
  },
};

export function getMoonPhaseEffect(date: Date = new Date()): MoonPhaseEffect {
  const phase = calculateMoonPhase(date);
  return MOON_PHASE_EFFECTS[phase];
}

// ---- Financial Data Mappings ----

/** T-0793: Fear & Greed Index -> market volatility */
export function fearGreedToModifier(index: number): {
  marketVolatility: number;
  marketConfidence: number;
  label: string;
} {
  // Index: 0 = extreme fear, 100 = extreme greed
  if (index <= 20) {
    return { marketVolatility: 1.40, marketConfidence: 0.70, label: 'Extreme Fear' };
  } else if (index <= 40) {
    return { marketVolatility: 1.20, marketConfidence: 0.85, label: 'Fear' };
  } else if (index <= 60) {
    return { marketVolatility: 1.0, marketConfidence: 1.0, label: 'Neutral' };
  } else if (index <= 80) {
    return { marketVolatility: 0.90, marketConfidence: 1.15, label: 'Greed' };
  } else {
    return { marketVolatility: 1.30, marketConfidence: 1.25, label: 'Extreme Greed' };
  }
}

/** T-0797: Stock index daily change -> merchant guild prosperity */
export function stockIndexToModifier(dailyChangePct: number): {
  merchantProsperity: number;
  tradeVolume: number;
  label: string;
} {
  if (dailyChangePct < -3) {
    return { merchantProsperity: 0.75, tradeVolume: 1.30, label: 'Market Crash' };
  } else if (dailyChangePct < -1) {
    return { merchantProsperity: 0.90, tradeVolume: 1.15, label: 'Declining' };
  } else if (dailyChangePct < 1) {
    return { merchantProsperity: 1.0, tradeVolume: 1.0, label: 'Stable' };
  } else if (dailyChangePct < 3) {
    return { merchantProsperity: 1.10, tradeVolume: 1.10, label: 'Growing' };
  } else {
    return { merchantProsperity: 1.25, tradeVolume: 1.25, label: 'Bull Run' };
  }
}

/** T-0801: Crypto volatility -> in-game trade volatility */
export function cryptoSentimentToModifier(sentiment: number): {
  tradeVolatility: number;
  essenceDropBonus: number;
  label: string;
} {
  // sentiment: -100 to 100
  if (sentiment < -50) {
    return { tradeVolatility: 1.50, essenceDropBonus: 1.10, label: 'Crypto Winter' };
  } else if (sentiment < -10) {
    return { tradeVolatility: 1.20, essenceDropBonus: 1.05, label: 'Bearish' };
  } else if (sentiment < 10) {
    return { tradeVolatility: 1.0, essenceDropBonus: 1.0, label: 'Neutral' };
  } else if (sentiment < 50) {
    return { tradeVolatility: 1.15, essenceDropBonus: 1.05, label: 'Bullish' };
  } else {
    return { tradeVolatility: 1.40, essenceDropBonus: 1.15, label: 'Moon Mode' };
  }
}

// ---- News Sentiment Mappings ----

export type NewsSentiment = 'positive' | 'negative' | 'neutral';

/** T-0805, T-0806: News sentiment -> world event triggers */
export function newsSentimentToModifier(sentiment: NewsSentiment, magnitude: number): {
  morale: number;
  eventTriggerChance: number;
  label: string;
} {
  const mag = Math.min(1, Math.max(0, magnitude)); // 0-1
  switch (sentiment) {
    case 'positive':
      return {
        morale: 1.0 + mag * 0.15,
        eventTriggerChance: 0.3 + mag * 0.2,
        label: 'Good Tidings',
      };
    case 'negative':
      return {
        morale: 1.0 - mag * 0.10,
        eventTriggerChance: 0.4 + mag * 0.3,
        label: 'Ill Omens',
      };
    case 'neutral':
    default:
      return {
        morale: 1.0,
        eventTriggerChance: 0.2,
        label: 'Quiet Times',
      };
  }
}

// ---- Sports Event Mappings ----

/** T-0810: Sports event -> tournament event */
export interface SportsTournamentMapping {
  fantasyName: string;
  description: string;
  buffs: {
    morale: number;
    xpBonus: number;
    combatBonus: number;
  };
  duration: number; // hours
}

export const SPORTS_TOURNAMENT_MAP: Record<string, SportsTournamentMapping> = {
  'world_cup': {
    fantasyName: 'Grand Arena Championship',
    description: 'The greatest warriors from all regions compete in an epic tournament!',
    buffs: { morale: 0.25, xpBonus: 0.20, combatBonus: 0.15 },
    duration: 48,
  },
  'olympics': {
    fantasyName: 'Festival of Champions',
    description: 'Heroes from across the realm test their skills in legendary trials.',
    buffs: { morale: 0.20, xpBonus: 0.25, combatBonus: 0.10 },
    duration: 72,
  },
  'super_bowl': {
    fantasyName: 'Colosseum Clash',
    description: 'Two legendary guilds face off in the ultimate battle.',
    buffs: { morale: 0.15, xpBonus: 0.15, combatBonus: 0.20 },
    duration: 24,
  },
  'nba_finals': {
    fantasyName: 'Sky Court Finals',
    description: 'The tallest warriors duel in the floating arena.',
    buffs: { morale: 0.15, xpBonus: 0.15, combatBonus: 0.10 },
    duration: 24,
  },
  'champions_league': {
    fantasyName: 'Continental Cup',
    description: 'Elite guilds from every continent clash for glory.',
    buffs: { morale: 0.20, xpBonus: 0.15, combatBonus: 0.15 },
    duration: 24,
  },
  'default': {
    fantasyName: 'Regional Tournament',
    description: 'Local champions gather for a spirited contest.',
    buffs: { morale: 0.10, xpBonus: 0.10, combatBonus: 0.10 },
    duration: 12,
  },
};

// ---- Natural Disaster Mappings ----

/** T-0837: Earthquake/disaster -> calamity events */
export interface CalamityMapping {
  fantasyName: string;
  description: string;
  effects: {
    buildingDamage: number;    // % damage to buildings
    expeditionCancel: boolean;
    resourceLoss: number;      // % of stored resources lost
    duration: number;          // hours
    morale: number;            // multiplier
  };
}

export function earthquakeMagnitudeToCalamity(magnitude: number): CalamityMapping | null {
  if (magnitude < 4.0) return null; // too minor
  if (magnitude < 5.5) {
    return {
      fantasyName: 'Minor Tremor',
      description: 'The ground shakes briefly — minor disruptions to daily life.',
      effects: { buildingDamage: 0.02, expeditionCancel: false, resourceLoss: 0.01, duration: 6, morale: 0.95 },
    };
  }
  if (magnitude < 7.0) {
    return {
      fantasyName: 'Great Quake',
      description: 'A powerful earthquake rocks the region — buildings crack and supplies scatter.',
      effects: { buildingDamage: 0.10, expeditionCancel: true, resourceLoss: 0.05, duration: 24, morale: 0.80 },
    };
  }
  return {
    fantasyName: 'Cataclysm',
    description: 'The very earth splits apart — the guild must rebuild from the rubble.',
    effects: { buildingDamage: 0.25, expeditionCancel: true, resourceLoss: 0.15, duration: 48, morale: 0.65 },
  };
}

// ---- Astronomical Events ----

/** T-0838, T-0839: Solar/astronomical events -> bonuses */
export interface AstronomicalEvent {
  name: string;
  fantasyName: string;
  effects: {
    magicPotency: number;
    essenceDrops: number;
    researchSpeed: number;
    morale: number;
  };
}

export function getAstronomicalEvents(date: Date): AstronomicalEvent[] {
  const events: AstronomicalEvent[] = [];
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Solstices
  if (month === 6 && day >= 20 && day <= 22) {
    events.push({
      name: 'Summer Solstice',
      fantasyName: 'Sunpeak',
      effects: { magicPotency: 1.25, essenceDrops: 1.20, researchSpeed: 1.15, morale: 1.10 },
    });
  }
  if (month === 12 && day >= 20 && day <= 22) {
    events.push({
      name: 'Winter Solstice',
      fantasyName: 'Darknight',
      effects: { magicPotency: 1.30, essenceDrops: 1.25, researchSpeed: 1.20, morale: 0.95 },
    });
  }

  // Equinoxes
  if (month === 3 && day >= 19 && day <= 21) {
    events.push({
      name: 'Vernal Equinox',
      fantasyName: 'Balance Dawn',
      effects: { magicPotency: 1.15, essenceDrops: 1.10, researchSpeed: 1.10, morale: 1.05 },
    });
  }
  if (month === 9 && day >= 22 && day <= 24) {
    events.push({
      name: 'Autumnal Equinox',
      fantasyName: 'Twilight Balance',
      effects: { magicPotency: 1.15, essenceDrops: 1.10, researchSpeed: 1.10, morale: 1.05 },
    });
  }

  return events;
}

// ---- Environmental Data Mappings ----

/** T-0840: Tide data -> coastal expedition modifiers */
export function tideToModifier(tideHeightM: number): {
  coastalExpedition: number;
  fishingBonus: number;
  label: string;
} {
  if (tideHeightM > 3.0) {
    return { coastalExpedition: 0.75, fishingBonus: 1.25, label: 'High Tide' };
  } else if (tideHeightM > 1.5) {
    return { coastalExpedition: 1.0, fishingBonus: 1.10, label: 'Rising Tide' };
  } else {
    return { coastalExpedition: 1.15, fishingBonus: 0.85, label: 'Low Tide' };
  }
}

/** T-0841: Air quality -> atmospheric effects */
export function airQualityToModifier(aqi: number): {
  workerEfficiency: number;
  herbGrowth: number;
  morale: number;
  label: string;
} {
  if (aqi <= 50) {
    return { workerEfficiency: 1.05, herbGrowth: 1.10, morale: 1.05, label: 'Clean Air' };
  } else if (aqi <= 100) {
    return { workerEfficiency: 1.0, herbGrowth: 1.0, morale: 1.0, label: 'Moderate Air' };
  } else if (aqi <= 150) {
    return { workerEfficiency: 0.95, herbGrowth: 0.90, morale: 0.95, label: 'Hazy' };
  } else {
    return { workerEfficiency: 0.85, herbGrowth: 0.75, morale: 0.85, label: 'Smog' };
  }
}

/** T-0846: Sunrise/sunset -> day/night cycle */
export function getDayNightPhase(
  currentHour: number,
  sunriseHour: number,
  sunsetHour: number,
): { phase: 'dawn' | 'day' | 'dusk' | 'night'; productionMultiplier: number } {
  if (currentHour >= sunriseHour - 1 && currentHour < sunriseHour + 1) {
    return { phase: 'dawn', productionMultiplier: 0.90 };
  } else if (currentHour >= sunriseHour + 1 && currentHour < sunsetHour - 1) {
    return { phase: 'day', productionMultiplier: 1.0 };
  } else if (currentHour >= sunsetHour - 1 && currentHour < sunsetHour + 1) {
    return { phase: 'dusk', productionMultiplier: 0.90 };
  } else {
    return { phase: 'night', productionMultiplier: 0.75 };
  }
}

/** T-0847: UV index -> outdoor expedition modifiers */
export function uvIndexToModifier(uvIndex: number): {
  outdoorExpedition: number;
  herbGrowth: number;
  label: string;
} {
  if (uvIndex <= 2) {
    return { outdoorExpedition: 1.05, herbGrowth: 0.95, label: 'Low UV' };
  } else if (uvIndex <= 5) {
    return { outdoorExpedition: 1.0, herbGrowth: 1.05, label: 'Moderate UV' };
  } else if (uvIndex <= 7) {
    return { outdoorExpedition: 0.95, herbGrowth: 1.10, label: 'High UV' };
  } else {
    return { outdoorExpedition: 0.85, herbGrowth: 1.15, label: 'Extreme UV' };
  }
}

/** T-0848: Pollen count -> nature resource production */
export function pollenToModifier(pollenLevel: number): {
  herbProduction: number;
  alchemyOutput: number;
  morale: number;
  label: string;
} {
  // pollenLevel: 0-12 scale
  if (pollenLevel <= 3) {
    return { herbProduction: 0.95, alchemyOutput: 1.0, morale: 1.05, label: 'Low Pollen' };
  } else if (pollenLevel <= 6) {
    return { herbProduction: 1.10, alchemyOutput: 1.10, morale: 1.0, label: 'Moderate Pollen' };
  } else if (pollenLevel <= 9) {
    return { herbProduction: 1.20, alchemyOutput: 1.15, morale: 0.95, label: 'High Pollen' };
  } else {
    return { herbProduction: 1.30, alchemyOutput: 1.20, morale: 0.90, label: 'Very High Pollen' };
  }
}

// ---- Biome-Weather Mapping ----

export type BiomeType = 'forest' | 'desert' | 'tundra' | 'coastal' | 'mountain' | 'plains' | 'swamp';

/** T-0856: Weather-to-biome mapping for region-specific effects */
export const REGION_BIOMES: Record<string, BiomeType> = {
  'miami': 'coastal',
  'new-york': 'plains',
  'chicago': 'plains',
  'denver': 'mountain',
  'seattle': 'forest',
  'los-angeles': 'coastal',
  'austin': 'plains',
  'london': 'plains',
  'tokyo': 'coastal',
  'sydney': 'coastal',
  'sao-paulo': 'forest',
  'berlin': 'plains',
};

export const BIOME_WEATHER_MULTIPLIERS: Record<BiomeType, Partial<Record<string, Partial<WeatherEffect>>>> = {
  forest: {
    rainy: { farmProduction: 1.10, rogueEffectiveness: 1.10 },
    foggy: { stealthBonus: 1.20, magicPotency: 1.10 },
  },
  desert: {
    hot: { waterValue: 1.50, workerEfficiency: 0.75 },
    clear: { farmProduction: 0.90 },
  },
  tundra: {
    snowy: { researchSpeed: 1.15, farmProduction: 0.70 },
    stormy: { expeditionSafety: 0.60 },
  },
  coastal: {
    stormy: { expeditionSafety: 0.60, mineYield: 1.10 },
    rainy: { farmProduction: 1.15 },
  },
  mountain: {
    windy: { travelSpeed: 0.90, mineYield: 1.15 },
    snowy: { travelSpeed: 0.65 },
  },
  plains: {
    clear: { farmProduction: 1.15, marketActivity: 1.10 },
    windy: { travelSpeed: 1.15 },
  },
  swamp: {
    rainy: { rogueEffectiveness: 1.20, farmProduction: 0.95 },
    foggy: { stealthBonus: 1.25, scoutRange: 0.80 },
  },
};

/** Get biome-adjusted weather effect for a region */
export function getBiomeAdjustedWeatherEffect(regionId: string, condition: string): WeatherEffect {
  const base = getWeatherEffect(condition);
  const biome = REGION_BIOMES[regionId];
  if (!biome) return base;

  const biomeOverrides = BIOME_WEATHER_MULTIPLIERS[biome]?.[condition];
  if (!biomeOverrides) return base;

  const result = { ...base };
  for (const [key, value] of Object.entries(biomeOverrides)) {
    const k = key as keyof WeatherEffect;
    result[k] = base[k] * (value as number);
  }
  return result;
}

// ---- Compound Effect Engine ----

/** T-0832: Cross-data correlation engine */
export interface CompoundEffect {
  name: string;
  description: string;
  conditions: string[];
  modifiers: Partial<WeatherEffect>;
}

export const COMPOUND_EFFECTS: CompoundEffect[] = [
  {
    name: 'Perfect Storm',
    description: 'Stormy weather during market fear creates chaos in the trading halls.',
    conditions: ['weather:stormy', 'market:fear'],
    modifiers: { marketActivity: 0.60, mineYield: 1.30 },
  },
  {
    name: 'Golden Harvest',
    description: 'Rain during a bullish market leads to unprecedented farm prosperity.',
    conditions: ['weather:rainy', 'market:greed'],
    modifiers: { farmProduction: 1.40, morale: 1.15 },
  },
  {
    name: 'Full Moon Storm',
    description: 'Magic surges uncontrollably as storms rage under the full moon.',
    conditions: ['weather:stormy', 'moon:full_moon'],
    modifiers: { magicPotency: 1.40, expeditionSafety: 0.60 },
  },
  {
    name: 'New Moon Fog',
    description: 'The deepest darkness meets the thickest fog — rogues thrive.',
    conditions: ['weather:foggy', 'moon:new_moon'],
    modifiers: { stealthBonus: 1.40, rogueEffectiveness: 1.30 },
  },
  {
    name: 'Celebration Rally',
    description: 'Festival day during good markets — double the joy!',
    conditions: ['festival:active', 'market:greed'],
    modifiers: { morale: 1.25, marketActivity: 1.30 },
  },
];

/** Check which compound effects are active given current conditions */
export function getActiveCompoundEffects(
  conditions: Set<string>,
): CompoundEffect[] {
  return COMPOUND_EFFECTS.filter((effect) =>
    effect.conditions.every((c) => conditions.has(c)),
  );
}

// ---- Global Event Significance Scoring ----

/** T-0853: Global event significance scoring */
export function scoreEventSignificance(event: {
  type: string;
  magnitude?: number;
  affectedPopulation?: number;
  sentiment?: NewsSentiment;
}): number {
  let score = 0;

  switch (event.type) {
    case 'earthquake': score += (event.magnitude || 0) * 10; break;
    case 'sports_final': score += 40; break;
    case 'election': score += 60; break;
    case 'market_crash': score += 70; break;
    case 'holiday': score += 30; break;
    case 'eclipse': score += 50; break;
    default: score += 10;
  }

  if (event.affectedPopulation) {
    score += Math.log10(event.affectedPopulation) * 5;
  }

  if (event.sentiment === 'negative') score *= 1.2;

  return Math.min(100, Math.round(score));
}
