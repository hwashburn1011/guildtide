import { ResourceType, BuildingType } from './enums';

/** Game version */
export const GAME_VERSION = '1.0.0';

/** Maximum seconds of offline progress (24 hours) */
export const MAX_OFFLINE_SECONDS = 86400;

/** Default starting resources for a new guild */
export const STARTING_RESOURCES: Record<ResourceType, number> = {
  [ResourceType.Gold]: 150,
  [ResourceType.Wood]: 80,
  [ResourceType.Stone]: 50,
  [ResourceType.Herbs]: 30,
  [ResourceType.Ore]: 20,
  [ResourceType.Water]: 60,
  [ResourceType.Food]: 80,
  [ResourceType.Essence]: 0,
};

/** Building upgrade cost multiplier per level (lower = smoother early curve) */
export const BUILDING_COST_MULTIPLIER = 1.35;

/** Building output bonus per level (18% per level for noticeable growth) */
export const BUILDING_LEVEL_BONUS = 0.18;

/** Guild XP required per level: baseXP * multiplier^(level-1) */
export const GUILD_BASE_XP = 100;
export const GUILD_XP_MULTIPLIER = 1.4;
export const GUILD_MAX_LEVEL = 50;

/** Guild XP rewards for actions */
export const GUILD_XP_REWARDS = {
  buildingConstruct: 25,
  buildingUpgrade: 15,       // per level upgraded
  expeditionComplete: 40,
  researchComplete: 50,
  marketTrade: 5,
  heroRecruit: 10,
} as const;

/** Guild level-up reward table: keys are guild levels */
export const GUILD_LEVEL_REWARDS: Record<number, {
  label: string;
  buildingSlots?: number;
  unlockBuilding?: BuildingType[];
  unlockFeature?: string;
  resourceBonus?: Partial<Record<ResourceType, number>>;
}> = {
  2:  { label: 'Unlock Workshop',         unlockBuilding: [BuildingType.Workshop],   buildingSlots: 1 },
  3:  { label: 'Unlock Expeditions',      unlockFeature: 'expeditions',              buildingSlots: 1 },
  4:  { label: 'Gold Bonus',              resourceBonus: { [ResourceType.Gold]: 200 } },
  5:  { label: 'Unlock Market',           unlockBuilding: [BuildingType.Market],     unlockFeature: 'market',   buildingSlots: 1 },
  6:  { label: 'Unlock Barracks',         unlockBuilding: [BuildingType.Barracks] },
  7:  { label: 'Resource Bonus',          resourceBonus: { [ResourceType.Wood]: 150, [ResourceType.Stone]: 150 } },
  8:  { label: 'Unlock Laboratory',       unlockBuilding: [BuildingType.Laboratory], buildingSlots: 1 },
  10: { label: 'Unlock Research',         unlockFeature: 'research',                 buildingSlots: 2 },
  12: { label: 'Large Resource Bonus',    resourceBonus: { [ResourceType.Gold]: 500, [ResourceType.Essence]: 50 } },
  15: { label: 'Guild Expansion',         buildingSlots: 3 },
  20: { label: 'Major Expansion',         buildingSlots: 4, resourceBonus: { [ResourceType.Gold]: 1000 } },
  25: { label: 'Elite Expansion',         buildingSlots: 4 },
  30: { label: 'Grand Expansion',         buildingSlots: 5, resourceBonus: { [ResourceType.Essence]: 200 } },
  35: { label: 'Legendary Expansion',     buildingSlots: 5 },
  40: { label: 'Mythic Expansion',        buildingSlots: 6, resourceBonus: { [ResourceType.Gold]: 5000 } },
  45: { label: 'Divine Expansion',        buildingSlots: 6 },
  50: { label: 'Transcendent Guild',      buildingSlots: 8, resourceBonus: { [ResourceType.Gold]: 10000, [ResourceType.Essence]: 500 } },
};

/** Buildings available at guild creation (level 1) */
export const STARTER_BUILDINGS: BuildingType[] = [
  BuildingType.Farm,
  BuildingType.LumberMill,
  BuildingType.Quarry,
  BuildingType.HerbGarden,
  BuildingType.Mine,
  BuildingType.Well,
];

/** Base building slots at guild level 1 */
export const BASE_BUILDING_SLOTS = 6;

/** Building synergy bonuses: adjacent building type pairs give a production bonus */
export const BUILDING_SYNERGIES: Array<{
  buildingA: BuildingType;
  buildingB: BuildingType;
  bonusPercent: number;
  description: string;
}> = [
  { buildingA: BuildingType.Farm,       buildingB: BuildingType.Well,       bonusPercent: 10, description: 'Irrigated Crops' },
  { buildingA: BuildingType.Mine,       buildingB: BuildingType.Workshop,   bonusPercent: 12, description: 'Efficient Smithing' },
  { buildingA: BuildingType.HerbGarden, buildingB: BuildingType.Laboratory, bonusPercent: 15, description: 'Alchemical Harmony' },
  { buildingA: BuildingType.LumberMill, buildingB: BuildingType.Workshop,   bonusPercent: 10, description: 'Timber Supply Chain' },
  { buildingA: BuildingType.Barracks,   buildingB: BuildingType.Farm,       bonusPercent: 8,  description: 'Well-Fed Troops' },
  { buildingA: BuildingType.Market,     buildingB: BuildingType.Quarry,     bonusPercent: 10, description: 'Building Materials Trade' },
];

/** Guild emblem options */
export const EMBLEM_COLORS = [
  '#e94560', '#ffd700', '#4ecca3', '#2980b9', '#8e44ad',
  '#e67e22', '#1abc9c', '#ecf0f1', '#c0392b', '#3498db',
];
export const EMBLEM_SYMBOLS = [
  'sword', 'shield', 'crown', 'star', 'dragon',
  'tree', 'hammer', 'book', 'gem', 'skull',
  'moon', 'sun', 'tower', 'wolf', 'eagle',
];

/** Daily login reward cycle (7-day rotating) */
export const DAILY_LOGIN_REWARDS: Array<{
  day: number;
  resources: Partial<Record<ResourceType, number>>;
  xp: number;
  label: string;
}> = [
  { day: 1, resources: { [ResourceType.Gold]: 50 },   xp: 10, label: 'Day 1: Gold' },
  { day: 2, resources: { [ResourceType.Wood]: 40, [ResourceType.Stone]: 30 },  xp: 10, label: 'Day 2: Materials' },
  { day: 3, resources: { [ResourceType.Food]: 50, [ResourceType.Water]: 40 },  xp: 15, label: 'Day 3: Provisions' },
  { day: 4, resources: { [ResourceType.Herbs]: 25, [ResourceType.Ore]: 20 },   xp: 15, label: 'Day 4: Rare Goods' },
  { day: 5, resources: { [ResourceType.Gold]: 100 },  xp: 20, label: 'Day 5: Gold Stash' },
  { day: 6, resources: { [ResourceType.Essence]: 10 }, xp: 25, label: 'Day 6: Essence' },
  { day: 7, resources: { [ResourceType.Gold]: 200, [ResourceType.Essence]: 20 }, xp: 50, label: 'Day 7: Jackpot!' },
];

/** Hero XP curve multiplier */
export const HERO_XP_MULTIPLIER = 1.25;

/** Hero base XP to level 2 */
export const HERO_BASE_XP = 80;

/** Max modifier swing from world state (±50%) */
export const MAX_MODIFIER_SWING = 0.5;

/** Base building definitions */
export const BUILDING_DEFINITIONS: Record<BuildingType, {
  name: string;
  description: string;
  baseCost: Partial<Record<ResourceType, number>>;
  baseOutput: Partial<Record<ResourceType, number>>;
  maxLevel: number;
}> = {
  [BuildingType.Farm]: {
    name: 'Farm',
    description: 'Grows food and crops for your guild.',
    baseCost: { [ResourceType.Gold]: 30, [ResourceType.Wood]: 15 },
    baseOutput: { [ResourceType.Food]: 0.6 },
    maxLevel: 20,
  },
  [BuildingType.LumberMill]: {
    name: 'Lumber Mill',
    description: 'Harvests and processes timber.',
    baseCost: { [ResourceType.Gold]: 40, [ResourceType.Stone]: 15 },
    baseOutput: { [ResourceType.Wood]: 0.5 },
    maxLevel: 20,
  },
  [BuildingType.Quarry]: {
    name: 'Quarry',
    description: 'Extracts stone from the earth.',
    baseCost: { [ResourceType.Gold]: 50, [ResourceType.Wood]: 25 },
    baseOutput: { [ResourceType.Stone]: 0.4 },
    maxLevel: 20,
  },
  [BuildingType.HerbGarden]: {
    name: 'Herb Garden',
    description: 'Cultivates rare herbs and plants.',
    baseCost: { [ResourceType.Gold]: 35, [ResourceType.Water]: 15 },
    baseOutput: { [ResourceType.Herbs]: 0.3 },
    maxLevel: 20,
  },
  [BuildingType.Mine]: {
    name: 'Mine',
    description: 'Digs deep for valuable ores.',
    baseCost: { [ResourceType.Gold]: 60, [ResourceType.Wood]: 35, [ResourceType.Stone]: 20 },
    baseOutput: { [ResourceType.Ore]: 0.25 },
    maxLevel: 20,
  },
  [BuildingType.Well]: {
    name: 'Well',
    description: 'Provides fresh water to the guild.',
    baseCost: { [ResourceType.Gold]: 25, [ResourceType.Stone]: 15 },
    baseOutput: { [ResourceType.Water]: 0.55 },
    maxLevel: 20,
  },
  [BuildingType.Workshop]: {
    name: 'Workshop',
    description: 'Crafts tools, gear, and equipment.',
    baseCost: { [ResourceType.Gold]: 100, [ResourceType.Wood]: 60, [ResourceType.Stone]: 40 },
    baseOutput: {},
    maxLevel: 15,
  },
  [BuildingType.Barracks]: {
    name: 'Barracks',
    description: 'Houses and trains guild members.',
    baseCost: { [ResourceType.Gold]: 90, [ResourceType.Wood]: 50, [ResourceType.Stone]: 50 },
    baseOutput: {},
    maxLevel: 15,
  },
  [BuildingType.Market]: {
    name: 'Market',
    description: 'Trade goods with visiting merchants.',
    baseCost: { [ResourceType.Gold]: 120, [ResourceType.Wood]: 40 },
    baseOutput: { [ResourceType.Gold]: 0.3 },
    maxLevel: 15,
  },
  [BuildingType.Laboratory]: {
    name: 'Laboratory',
    description: 'Research new technologies and brew potions.',
    baseCost: { [ResourceType.Gold]: 150, [ResourceType.Stone]: 60, [ResourceType.Herbs]: 30 },
    baseOutput: { [ResourceType.Essence]: 0.1 },
    maxLevel: 15,
  },
};
