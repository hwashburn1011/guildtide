/**
 * Full seasonal content definitions: crops, creatures, decorations, market modifiers,
 * creature migrations, ambient sounds, and building visuals per season.
 *
 * T-0949: Season effect on Farm production rates per crop type
 * T-0950: Season effect on expedition difficulty and encounter tables
 * T-0951: Season effect on market prices for seasonal goods
 * T-0952: Season effect on hero morale (some heroes prefer certain seasons)
 * T-0977: Season-specific ambient sounds
 * T-0978: Season-specific building visual changes
 */
import type { Season } from '../services/CalendarService';
import { ResourceType } from '@shared/enums';

// --- Seasonal Crop Rotation (T-0949) ---
export interface SeasonalCrop {
  name: string;
  resource: ResourceType;
  growthMultiplier: number;
  yieldMultiplier: number;
  description: string;
}

export const SEASONAL_CROPS: Record<Season, SeasonalCrop[]> = {
  spring: [
    { name: 'Greenleaf Lettuce', resource: ResourceType.Food, growthMultiplier: 1.3, yieldMultiplier: 1.2, description: 'Thrives in mild spring weather.' },
    { name: 'Moonpetal Herb', resource: ResourceType.Herbs, growthMultiplier: 1.4, yieldMultiplier: 1.3, description: 'Rare spring herb with alchemical properties.' },
    { name: 'Dewdrop Wheat', resource: ResourceType.Food, growthMultiplier: 1.15, yieldMultiplier: 1.1, description: 'Standard spring grain crop.' },
  ],
  summer: [
    { name: 'Sunfruit', resource: ResourceType.Food, growthMultiplier: 1.4, yieldMultiplier: 1.3, description: 'Sweet fruit ripened by long sunny days.' },
    { name: 'Firebloom', resource: ResourceType.Herbs, growthMultiplier: 1.2, yieldMultiplier: 1.5, description: 'Heat-loving herb with fiery properties.' },
    { name: 'Golden Grain', resource: ResourceType.Food, growthMultiplier: 1.1, yieldMultiplier: 1.2, description: 'Hardy grain that loves the warmth.' },
  ],
  autumn: [
    { name: 'Harvest Pumpkin', resource: ResourceType.Food, growthMultiplier: 1.5, yieldMultiplier: 1.4, description: 'Classic autumn crop with massive yields.' },
    { name: 'Frostroot', resource: ResourceType.Herbs, growthMultiplier: 1.3, yieldMultiplier: 1.2, description: 'Roots that draw power from the first frost.' },
    { name: 'Amber Barley', resource: ResourceType.Food, growthMultiplier: 1.2, yieldMultiplier: 1.3, description: 'Late-season barley with rich flavor.' },
  ],
  winter: [
    { name: 'Snowcap Mushroom', resource: ResourceType.Herbs, growthMultiplier: 1.2, yieldMultiplier: 1.1, description: 'Grows under snow in sheltered spots.' },
    { name: 'Iceberry', resource: ResourceType.Food, growthMultiplier: 0.8, yieldMultiplier: 1.5, description: 'Rare winter berry, slow to grow but valuable.' },
    { name: 'Frostmint', resource: ResourceType.Herbs, growthMultiplier: 1.1, yieldMultiplier: 1.2, description: 'Refreshing herb that only grows in cold.' },
  ],
};

// --- Seasonal Creature Migration (T-0950) ---
export interface SeasonalCreature {
  name: string;
  encounterRate: number;
  difficulty: number; // multiplier on base difficulty
  lootBonus: number; // multiplier on loot drops
  description: string;
}

export const SEASONAL_CREATURES: Record<Season, SeasonalCreature[]> = {
  spring: [
    { name: 'Fawnling Deer', encounterRate: 0.3, difficulty: 0.8, lootBonus: 1.0, description: 'Young deer emerge from winter shelter.' },
    { name: 'Bloom Sprite', encounterRate: 0.15, difficulty: 1.0, lootBonus: 1.3, description: 'Magical sprites riding the spring breeze.' },
    { name: 'Mudcrawler', encounterRate: 0.2, difficulty: 0.9, lootBonus: 1.1, description: 'Creatures stirring from muddy burrows.' },
  ],
  summer: [
    { name: 'Sand Basilisk', encounterRate: 0.2, difficulty: 1.3, lootBonus: 1.4, description: 'Dangerous reptiles basking in the heat.' },
    { name: 'Sunwing Eagle', encounterRate: 0.15, difficulty: 1.1, lootBonus: 1.2, description: 'Majestic eagles soaring on warm thermals.' },
    { name: 'Fire Ant Swarm', encounterRate: 0.25, difficulty: 1.2, lootBonus: 1.0, description: 'Aggressive swarms active in the heat.' },
  ],
  autumn: [
    { name: 'Harvest Golem', encounterRate: 0.15, difficulty: 1.2, lootBonus: 1.5, description: 'Animated scarecrows protect autumn fields.' },
    { name: 'Shadow Fox', encounterRate: 0.2, difficulty: 1.0, lootBonus: 1.3, description: 'Clever foxes hunting in the twilight.' },
    { name: 'Ironbark Treant', encounterRate: 0.1, difficulty: 1.4, lootBonus: 1.6, description: 'Ancient trees awakened by falling leaves.' },
  ],
  winter: [
    { name: 'Frost Wolf', encounterRate: 0.25, difficulty: 1.3, lootBonus: 1.2, description: 'Pack hunters emboldened by the cold.' },
    { name: 'Ice Wraith', encounterRate: 0.1, difficulty: 1.5, lootBonus: 1.8, description: 'Spirits of frozen travelers haunt the snow.' },
    { name: 'Snowbear', encounterRate: 0.15, difficulty: 1.4, lootBonus: 1.3, description: 'Massive bears desperate for food.' },
  ],
};

// --- Seasonal Market Price Fluctuations (T-0951) ---
export interface SeasonalMarketModifier {
  resource: ResourceType;
  buyMultiplier: number;
  sellMultiplier: number;
  reason: string;
}

export const SEASONAL_MARKET_MODIFIERS: Record<Season, SeasonalMarketModifier[]> = {
  spring: [
    { resource: ResourceType.Herbs, buyMultiplier: 0.85, sellMultiplier: 1.2, reason: 'Spring herbs flood the market' },
    { resource: ResourceType.Food, buyMultiplier: 0.9, sellMultiplier: 1.1, reason: 'Fresh spring produce available' },
    { resource: ResourceType.Wood, buyMultiplier: 1.1, sellMultiplier: 0.9, reason: 'Lumber in demand for spring building' },
  ],
  summer: [
    { resource: ResourceType.Water, buyMultiplier: 1.3, sellMultiplier: 1.4, reason: 'Water scarce in summer heat' },
    { resource: ResourceType.Food, buyMultiplier: 0.8, sellMultiplier: 1.0, reason: 'Summer harvests bring abundance' },
    { resource: ResourceType.Ore, buyMultiplier: 1.1, sellMultiplier: 1.1, reason: 'Mining conditions excellent' },
  ],
  autumn: [
    { resource: ResourceType.Food, buyMultiplier: 0.7, sellMultiplier: 0.9, reason: 'Harvest surplus drives prices down' },
    { resource: ResourceType.Herbs, buyMultiplier: 1.2, sellMultiplier: 1.3, reason: 'Rare autumn mushrooms sought after' },
    { resource: ResourceType.Wood, buyMultiplier: 0.9, sellMultiplier: 1.0, reason: 'Fallen timber plentiful' },
  ],
  winter: [
    { resource: ResourceType.Food, buyMultiplier: 1.4, sellMultiplier: 1.5, reason: 'Food scarce in frozen months' },
    { resource: ResourceType.Wood, buyMultiplier: 1.3, sellMultiplier: 1.4, reason: 'Firewood demand surges' },
    { resource: ResourceType.Water, buyMultiplier: 0.8, sellMultiplier: 0.7, reason: 'Snow melt provides water' },
  ],
};

// --- Hero Season Preferences (T-0952) ---
export interface HeroSeasonPreference {
  role: string;
  preferredSeason: Season;
  moraleBuff: number;
  dislikedSeason: Season;
  moraleDebuff: number;
}

export const HERO_SEASON_PREFERENCES: HeroSeasonPreference[] = [
  { role: 'farmer', preferredSeason: 'spring', moraleBuff: 0.15, dislikedSeason: 'winter', moraleDebuff: -0.10 },
  { role: 'scout', preferredSeason: 'autumn', moraleBuff: 0.10, dislikedSeason: 'summer', moraleDebuff: -0.05 },
  { role: 'merchant', preferredSeason: 'summer', moraleBuff: 0.10, dislikedSeason: 'winter', moraleDebuff: -0.10 },
  { role: 'blacksmith', preferredSeason: 'winter', moraleBuff: 0.10, dislikedSeason: 'summer', moraleDebuff: -0.10 },
  { role: 'alchemist', preferredSeason: 'autumn', moraleBuff: 0.15, dislikedSeason: 'spring', moraleDebuff: -0.05 },
  { role: 'hunter', preferredSeason: 'autumn', moraleBuff: 0.10, dislikedSeason: 'winter', moraleDebuff: -0.10 },
  { role: 'defender', preferredSeason: 'winter', moraleBuff: 0.10, dislikedSeason: 'summer', moraleDebuff: -0.05 },
  { role: 'mystic', preferredSeason: 'winter', moraleBuff: 0.15, dislikedSeason: 'spring', moraleDebuff: -0.05 },
  { role: 'caravan_master', preferredSeason: 'summer', moraleBuff: 0.10, dislikedSeason: 'winter', moraleDebuff: -0.15 },
  { role: 'archivist', preferredSeason: 'spring', moraleBuff: 0.10, dislikedSeason: 'summer', moraleDebuff: -0.05 },
];

// --- Season Visual Decorations (T-0978) ---
export interface SeasonalDecoration {
  buildingType: string;
  description: string;
  visualKey: string;
}

export const SEASONAL_DECORATIONS: Record<Season, SeasonalDecoration[]> = {
  spring: [
    { buildingType: 'farm', description: 'Flower boxes on windows', visualKey: 'farm_flowers' },
    { buildingType: 'herb_garden', description: 'Blooming canopy', visualKey: 'garden_bloom' },
    { buildingType: '*', description: 'Vine-covered walls', visualKey: 'spring_vines' },
  ],
  summer: [
    { buildingType: 'market', description: 'Sun awnings and banners', visualKey: 'market_awnings' },
    { buildingType: 'well', description: 'Fountain sparkling', visualKey: 'well_fountain' },
    { buildingType: '*', description: 'Sun-bleached wood tones', visualKey: 'summer_wood' },
  ],
  autumn: [
    { buildingType: 'farm', description: 'Harvest baskets at entrance', visualKey: 'farm_harvest' },
    { buildingType: 'lumber_mill', description: 'Amber-leaved surroundings', visualKey: 'mill_leaves' },
    { buildingType: '*', description: 'Fallen leaf piles', visualKey: 'autumn_leaves' },
  ],
  winter: [
    { buildingType: '*', description: 'Snow on rooftops', visualKey: 'snow_roof' },
    { buildingType: 'barracks', description: 'Icicles hanging from eaves', visualKey: 'barracks_icicles' },
    { buildingType: 'workshop', description: 'Frosted windows', visualKey: 'workshop_frost' },
  ],
};

// --- Season Ambient Sounds (T-0977) ---
export interface SeasonalAmbience {
  key: string;
  label: string;
  description: string;
}

export const SEASONAL_AMBIENCE: Record<Season, SeasonalAmbience[]> = {
  spring: [
    { key: 'birds_chirping', label: 'Birdsong', description: 'Cheerful birds singing in the morning' },
    { key: 'gentle_rain', label: 'Light Rain', description: 'Gentle spring showers on leaves' },
    { key: 'flowing_stream', label: 'Stream', description: 'Snowmelt streams babbling nearby' },
  ],
  summer: [
    { key: 'crickets', label: 'Crickets', description: 'Crickets chirping in the warm evening' },
    { key: 'cicadas', label: 'Cicadas', description: 'Buzzing cicadas in the midday heat' },
    { key: 'distant_thunder', label: 'Distant Thunder', description: 'Summer storms rumbling in the distance' },
  ],
  autumn: [
    { key: 'wind_leaves', label: 'Rustling Leaves', description: 'Wind through dry autumn leaves' },
    { key: 'crows', label: 'Crows', description: 'Crows calling over harvested fields' },
    { key: 'crackling_fire', label: 'Hearthfire', description: 'Crackling fires in the guild hearth' },
  ],
  winter: [
    { key: 'howling_wind', label: 'Winter Wind', description: 'Cold wind howling past the guild hall' },
    { key: 'snow_crunch', label: 'Snow Steps', description: 'Crunching footsteps in fresh snow' },
    { key: 'fireplace', label: 'Fireplace', description: 'Warm fire crackling indoors' },
  ],
};

// --- Expedition Difficulty by Season (T-0950) ---
export interface SeasonalExpeditionModifier {
  expeditionType: string;
  difficultyMultiplier: number;
  encounterShift: string; // which creature table to favor
  description: string;
}

export const SEASONAL_EXPEDITION_MODIFIERS: Record<Season, SeasonalExpeditionModifier[]> = {
  spring: [
    { expeditionType: 'scavenge', difficultyMultiplier: 0.9, encounterShift: 'passive', description: 'Mild weather makes foraging easy.' },
    { expeditionType: 'hunt', difficultyMultiplier: 0.85, encounterShift: 'young', description: 'Young animals are easier to track.' },
    { expeditionType: 'explore', difficultyMultiplier: 1.0, encounterShift: 'neutral', description: 'Standard exploration conditions.' },
    { expeditionType: 'trade_caravan', difficultyMultiplier: 0.9, encounterShift: 'safe', description: 'Roads are clear after winter.' },
  ],
  summer: [
    { expeditionType: 'scavenge', difficultyMultiplier: 1.0, encounterShift: 'neutral', description: 'Abundant resources but hot conditions.' },
    { expeditionType: 'hunt', difficultyMultiplier: 1.1, encounterShift: 'aggressive', description: 'Heat makes beasts aggressive.' },
    { expeditionType: 'explore', difficultyMultiplier: 1.15, encounterShift: 'dangerous', description: 'Long days but harsh conditions.' },
    { expeditionType: 'trade_caravan', difficultyMultiplier: 1.0, encounterShift: 'bandit', description: 'Bandits active on summer roads.' },
  ],
  autumn: [
    { expeditionType: 'scavenge', difficultyMultiplier: 0.85, encounterShift: 'harvest', description: 'Fallen supplies everywhere.' },
    { expeditionType: 'hunt', difficultyMultiplier: 1.0, encounterShift: 'migratory', description: 'Creatures on the move.' },
    { expeditionType: 'explore', difficultyMultiplier: 1.05, encounterShift: 'neutral', description: 'Shorter days limit exploration.' },
    { expeditionType: 'trade_caravan', difficultyMultiplier: 1.1, encounterShift: 'stormy', description: 'Autumn storms threaten caravans.' },
  ],
  winter: [
    { expeditionType: 'scavenge', difficultyMultiplier: 1.3, encounterShift: 'scarce', description: 'Frozen ground hides resources.' },
    { expeditionType: 'hunt', difficultyMultiplier: 1.25, encounterShift: 'desperate', description: 'Hungry predators are dangerous.' },
    { expeditionType: 'explore', difficultyMultiplier: 1.4, encounterShift: 'blizzard', description: 'Snow and ice make travel treacherous.' },
    { expeditionType: 'trade_caravan', difficultyMultiplier: 1.35, encounterShift: 'frozen', description: 'Roads blocked by snow.' },
  ],
};

// --- Lunar Cycle (T-0963 through T-0968) ---
export type MoonPhase = 'new_moon' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' | 'full_moon' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';

export interface MoonPhaseEffect {
  phase: MoonPhase;
  label: string;
  icon: string;
  magicModifier: number;
  stealthModifier: number;
  encounterModifier: string;
  description: string;
}

export const MOON_PHASE_EFFECTS: MoonPhaseEffect[] = [
  { phase: 'new_moon', label: 'New Moon', icon: '🌑', magicModifier: 0.85, stealthModifier: 1.25, encounterModifier: 'dark_creatures', description: 'Darkness empowers stealth; dark creatures emerge.' },
  { phase: 'waxing_crescent', label: 'Waxing Crescent', icon: '🌒', magicModifier: 0.90, stealthModifier: 1.15, encounterModifier: 'neutral', description: 'A sliver of light returns. Stealth fading slightly.' },
  { phase: 'first_quarter', label: 'First Quarter', icon: '🌓', magicModifier: 0.95, stealthModifier: 1.05, encounterModifier: 'neutral', description: 'Half moon — balanced conditions.' },
  { phase: 'waxing_gibbous', label: 'Waxing Gibbous', icon: '🌔', magicModifier: 1.10, stealthModifier: 0.95, encounterModifier: 'magical', description: 'Magic crescendos as the full moon approaches.' },
  { phase: 'full_moon', label: 'Full Moon', icon: '🌕', magicModifier: 1.25, stealthModifier: 0.80, encounterModifier: 'werewolf', description: 'Magic surges +25%! Werewolf encounters possible.' },
  { phase: 'waning_gibbous', label: 'Waning Gibbous', icon: '🌖', magicModifier: 1.10, stealthModifier: 0.90, encounterModifier: 'magical', description: 'Magic wanes from its peak but remains potent.' },
  { phase: 'last_quarter', label: 'Last Quarter', icon: '🌗', magicModifier: 0.95, stealthModifier: 1.05, encounterModifier: 'neutral', description: 'Half moon — conditions rebalancing.' },
  { phase: 'waning_crescent', label: 'Waning Crescent', icon: '🌘', magicModifier: 0.90, stealthModifier: 1.15, encounterModifier: 'shadow', description: 'Growing darkness favors the stealthy.' },
];

// --- Season Pass Rewards (T-0987, T-0988) ---
export interface SeasonPassTier {
  tier: number;
  xpRequired: number;
  reward: {
    label: string;
    resources?: Partial<Record<ResourceType, number>>;
    items?: string[];
    title?: string;
    cosmetic?: string;
  };
}

export const SEASON_PASS_TIERS: SeasonPassTier[] = [
  { tier: 1, xpRequired: 100, reward: { label: 'Starter Bounty', resources: { [ResourceType.Gold]: 50, [ResourceType.Food]: 30 } } },
  { tier: 2, xpRequired: 250, reward: { label: 'Resource Cache', resources: { [ResourceType.Wood]: 40, [ResourceType.Stone]: 40 } } },
  { tier: 3, xpRequired: 500, reward: { label: 'Herb Bundle', resources: { [ResourceType.Herbs]: 50 } } },
  { tier: 4, xpRequired: 800, reward: { label: 'Ore Shipment', resources: { [ResourceType.Ore]: 40, [ResourceType.Gold]: 75 } } },
  { tier: 5, xpRequired: 1200, reward: { label: 'Season Badge', title: 'Seasonal Adventurer', cosmetic: 'season_badge' } },
  { tier: 6, xpRequired: 1700, reward: { label: 'Essence Vial', resources: { [ResourceType.Essence]: 25 } } },
  { tier: 7, xpRequired: 2300, reward: { label: 'Grand Haul', resources: { [ResourceType.Gold]: 150, [ResourceType.Food]: 80 } } },
  { tier: 8, xpRequired: 3000, reward: { label: 'Rare Equipment', items: ['seasonal_weapon'] } },
  { tier: 9, xpRequired: 4000, reward: { label: 'Major Cache', resources: { [ResourceType.Gold]: 250, [ResourceType.Essence]: 40 } } },
  { tier: 10, xpRequired: 5000, reward: { label: 'Season Champion', title: 'Champion of the Season', items: ['season_trophy'], cosmetic: 'champion_frame' } },
];

// --- Festival Activities/Mini-Games (T-0955 through T-0962) ---
export interface FestivalActivity {
  id: string;
  festivalId: string;
  name: string;
  description: string;
  type: 'mini_game' | 'collection' | 'social' | 'competition';
  duration: number; // minutes
  rewards: {
    resources?: Partial<Record<ResourceType, number>>;
    xp: number;
    items?: string[];
  };
  cooldownHours: number;
}

export const FESTIVAL_ACTIVITIES: FestivalActivity[] = [
  // T-0955: New Year celebration
  {
    id: 'new_year_fireworks',
    festivalId: 'holiday_new_year',
    name: 'Fireworks Display',
    description: 'Launch arcane fireworks to light up the sky. Time your launches for combos!',
    type: 'mini_game',
    duration: 5,
    rewards: { resources: { [ResourceType.Gold]: 30, [ResourceType.Essence]: 5 }, xp: 25 },
    cooldownHours: 12,
  },
  {
    id: 'new_year_resolution',
    festivalId: 'holiday_new_year',
    name: 'Year Resolution Board',
    description: 'Set guild goals for the coming year and earn bonus rewards.',
    type: 'social',
    duration: 3,
    rewards: { resources: { [ResourceType.Gold]: 20 }, xp: 30 },
    cooldownHours: 24,
  },
  // T-0956: Valentine's Day
  {
    id: 'valentines_matchmaker',
    festivalId: 'holiday_valentines',
    name: 'Hero Matchmaker',
    description: 'Pair heroes based on compatibility. Better matches yield relationship bonuses.',
    type: 'social',
    duration: 5,
    rewards: { resources: { [ResourceType.Essence]: 8 }, xp: 30 },
    cooldownHours: 12,
  },
  {
    id: 'valentines_gift_craft',
    festivalId: 'holiday_valentines',
    name: 'Gift Crafting',
    description: 'Craft special Valentine gifts for your heroes to boost morale.',
    type: 'collection',
    duration: 5,
    rewards: { resources: { [ResourceType.Gold]: 25, [ResourceType.Herbs]: 10 }, xp: 20 },
    cooldownHours: 12,
  },
  // T-0957: Easter/Spring Festival
  {
    id: 'easter_egg_hunt',
    festivalId: 'holiday_easter',
    name: 'Egg Hunt',
    description: 'Search the guild grounds for hidden treasure eggs!',
    type: 'mini_game',
    duration: 5,
    rewards: { resources: { [ResourceType.Gold]: 40, [ResourceType.Essence]: 10 }, xp: 35 },
    cooldownHours: 12,
  },
  {
    id: 'easter_planting',
    festivalId: 'holiday_easter',
    name: 'Ceremonial Planting',
    description: 'Plant blessed seeds in the spring soil for bonus harvests.',
    type: 'collection',
    duration: 3,
    rewards: { resources: { [ResourceType.Food]: 35, [ResourceType.Herbs]: 15 }, xp: 20 },
    cooldownHours: 24,
  },
  // T-0958: Summer Solstice
  {
    id: 'solstice_sun_ritual',
    festivalId: 'holiday_independence',
    name: 'Sun Ritual',
    description: 'Channel the longest day\'s energy into guild blessings.',
    type: 'social',
    duration: 5,
    rewards: { resources: { [ResourceType.Essence]: 15, [ResourceType.Gold]: 20 }, xp: 30 },
    cooldownHours: 24,
  },
  {
    id: 'solstice_daylight_challenge',
    festivalId: 'holiday_independence',
    name: 'Daylight Endurance',
    description: 'Complete as many tasks as possible during the longest day!',
    type: 'competition',
    duration: 10,
    rewards: { resources: { [ResourceType.Gold]: 50 }, xp: 45 },
    cooldownHours: 24,
  },
  // T-0959: Halloween
  {
    id: 'halloween_shadow_hunt',
    festivalId: 'holiday_halloween',
    name: 'Shadow Creature Hunt',
    description: 'Hunt spooky shadow creatures that appear only on this night.',
    type: 'mini_game',
    duration: 8,
    rewards: { resources: { [ResourceType.Essence]: 20, [ResourceType.Gold]: 30 }, xp: 40, items: ['shadow_trophy'] },
    cooldownHours: 24,
  },
  {
    id: 'halloween_costume_contest',
    festivalId: 'holiday_halloween',
    name: 'Costume Contest',
    description: 'Dress up your heroes and compete for prizes!',
    type: 'social',
    duration: 3,
    rewards: { resources: { [ResourceType.Gold]: 25 }, xp: 20 },
    cooldownHours: 24,
  },
  // T-0960: Thanksgiving/Harvest
  {
    id: 'thanksgiving_feast_prep',
    festivalId: 'holiday_thanksgiving',
    name: 'Feast Preparation',
    description: 'Gather ingredients and prepare a legendary feast for the guild.',
    type: 'collection',
    duration: 10,
    rewards: { resources: { [ResourceType.Food]: 60, [ResourceType.Gold]: 20 }, xp: 35 },
    cooldownHours: 24,
  },
  {
    id: 'thanksgiving_gratitude',
    festivalId: 'holiday_thanksgiving',
    name: 'Gratitude Ceremony',
    description: 'Share what you\'re grateful for — boosts guild morale.',
    type: 'social',
    duration: 3,
    rewards: { resources: { [ResourceType.Essence]: 8 }, xp: 25 },
    cooldownHours: 24,
  },
  // T-0961: Winter Solstice / Gift Exchange
  {
    id: 'winter_gift_exchange',
    festivalId: 'holiday_christmas',
    name: 'Gift Exchange',
    description: 'Exchange mystery gifts with guild heroes. Each gift is a surprise!',
    type: 'social',
    duration: 5,
    rewards: { resources: { [ResourceType.Gold]: 40, [ResourceType.Essence]: 12 }, xp: 35, items: ['mystery_gift'] },
    cooldownHours: 24,
  },
  {
    id: 'winter_feast_legendary',
    festivalId: 'holiday_christmas',
    name: 'Legendary Winter Feast',
    description: 'The grandest feast of the year — everyone celebrates!',
    type: 'social',
    duration: 8,
    rewards: { resources: { [ResourceType.Food]: 30, [ResourceType.Gold]: 50, [ResourceType.Essence]: 15 }, xp: 50 },
    cooldownHours: 24,
  },
  // T-0962: New Year's Eve review
  {
    id: 'nye_year_review',
    festivalId: 'holiday_new_year',
    name: 'Year-in-Review',
    description: 'Review your guild\'s achievements from the past year and receive milestone rewards.',
    type: 'social',
    duration: 5,
    rewards: { resources: { [ResourceType.Gold]: 50, [ResourceType.Essence]: 10 }, xp: 40 },
    cooldownHours: 24,
  },
];

// --- Daily Challenge Templates (T-0970) ---
export interface DailyChallenge {
  id: string;
  name: string;
  description: string;
  objectiveType: 'collect' | 'build' | 'expedition' | 'trade' | 'train';
  target: number;
  rewards: {
    resources?: Partial<Record<ResourceType, number>>;
    xp: number;
  };
}

export const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: 'dc_gather_food', name: 'Feed the Guild', description: 'Collect 50 food from farms.', objectiveType: 'collect', target: 50, rewards: { resources: { [ResourceType.Gold]: 15 }, xp: 20 } },
  { id: 'dc_gather_wood', name: 'Timber!', description: 'Collect 40 wood.', objectiveType: 'collect', target: 40, rewards: { resources: { [ResourceType.Gold]: 15 }, xp: 20 } },
  { id: 'dc_gather_ore', name: 'Deep Dig', description: 'Mine 30 ore.', objectiveType: 'collect', target: 30, rewards: { resources: { [ResourceType.Gold]: 20 }, xp: 25 } },
  { id: 'dc_expedition', name: 'Bold Explorers', description: 'Complete 1 expedition.', objectiveType: 'expedition', target: 1, rewards: { resources: { [ResourceType.Gold]: 25, [ResourceType.Essence]: 3 }, xp: 30 } },
  { id: 'dc_trade', name: 'Market Day', description: 'Complete 2 market trades.', objectiveType: 'trade', target: 2, rewards: { resources: { [ResourceType.Gold]: 20 }, xp: 20 } },
  { id: 'dc_train_hero', name: 'Drill Sergeant', description: 'Train 1 hero.', objectiveType: 'train', target: 1, rewards: { resources: { [ResourceType.Essence]: 5 }, xp: 25 } },
  { id: 'dc_build', name: 'Builder\'s Day', description: 'Upgrade or build 1 building.', objectiveType: 'build', target: 1, rewards: { resources: { [ResourceType.Gold]: 30 }, xp: 30 } },
  { id: 'dc_gather_herbs', name: 'Herbalist', description: 'Collect 25 herbs.', objectiveType: 'collect', target: 25, rewards: { resources: { [ResourceType.Essence]: 3 }, xp: 20 } },
];

// --- Month-Specific Event Pools (T-0986) ---
export const MONTH_EVENT_POOLS: Record<number, string[]> = {
  1: ['new_year_bonus', 'winter_challenge', 'frost_festival'],
  2: ['valentines_special', 'love_potion_quest', 'heart_collection'],
  3: ['spring_equinox', 'planting_race', 'renewal_blessing'],
  4: ['bloom_festival', 'egg_hunt', 'april_showers'],
  5: ['may_day_celebration', 'flower_crown_contest', 'golden_week_trade'],
  6: ['midsummer_fair', 'sun_blessing', 'harvest_prep'],
  7: ['independence_celebration', 'starweave', 'summer_games'],
  8: ['obon_lanterns', 'dog_days_challenge', 'late_summer_feast'],
  9: ['oktoberfest', 'equinox_balance', 'harvest_moon'],
  10: ['halloween_special', 'shadow_hunt', 'unity_festival'],
  11: ['thanksgiving_feast', 'ember_night', 'november_challenge'],
  12: ['winter_feast', 'gift_exchange', 'year_review'],
};
