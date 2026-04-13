import { ResourceType, BuildingType } from './enums';

/** Maximum seconds of offline progress (24 hours) */
export const MAX_OFFLINE_SECONDS = 86400;

/** Default starting resources for a new guild */
export const STARTING_RESOURCES: Record<ResourceType, number> = {
  [ResourceType.Gold]: 100,
  [ResourceType.Wood]: 50,
  [ResourceType.Stone]: 30,
  [ResourceType.Herbs]: 20,
  [ResourceType.Ore]: 15,
  [ResourceType.Water]: 40,
  [ResourceType.Food]: 60,
  [ResourceType.Essence]: 0,
};

/** Building upgrade cost multiplier per level */
export const BUILDING_COST_MULTIPLIER = 1.4;

/** Building output bonus per level (15% per level) */
export const BUILDING_LEVEL_BONUS = 0.15;

/** Hero XP curve multiplier */
export const HERO_XP_MULTIPLIER = 1.3;

/** Hero base XP to level 2 */
export const HERO_BASE_XP = 100;

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
    baseCost: { [ResourceType.Gold]: 50, [ResourceType.Wood]: 30 },
    baseOutput: { [ResourceType.Food]: 0.5 },
    maxLevel: 20,
  },
  [BuildingType.LumberMill]: {
    name: 'Lumber Mill',
    description: 'Harvests and processes timber.',
    baseCost: { [ResourceType.Gold]: 60, [ResourceType.Stone]: 20 },
    baseOutput: { [ResourceType.Wood]: 0.4 },
    maxLevel: 20,
  },
  [BuildingType.Quarry]: {
    name: 'Quarry',
    description: 'Extracts stone from the earth.',
    baseCost: { [ResourceType.Gold]: 70, [ResourceType.Wood]: 40 },
    baseOutput: { [ResourceType.Stone]: 0.3 },
    maxLevel: 20,
  },
  [BuildingType.HerbGarden]: {
    name: 'Herb Garden',
    description: 'Cultivates rare herbs and plants.',
    baseCost: { [ResourceType.Gold]: 45, [ResourceType.Water]: 20 },
    baseOutput: { [ResourceType.Herbs]: 0.25 },
    maxLevel: 20,
  },
  [BuildingType.Mine]: {
    name: 'Mine',
    description: 'Digs deep for valuable ores.',
    baseCost: { [ResourceType.Gold]: 80, [ResourceType.Wood]: 50, [ResourceType.Stone]: 30 },
    baseOutput: { [ResourceType.Ore]: 0.2 },
    maxLevel: 20,
  },
  [BuildingType.Well]: {
    name: 'Well',
    description: 'Provides fresh water to the guild.',
    baseCost: { [ResourceType.Gold]: 40, [ResourceType.Stone]: 25 },
    baseOutput: { [ResourceType.Water]: 0.45 },
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
