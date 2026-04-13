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

/** Default storage caps per resource type */
export const DEFAULT_STORAGE_CAPS: Record<ResourceType, number> = {
  [ResourceType.Gold]: 5000,
  [ResourceType.Wood]: 3000,
  [ResourceType.Stone]: 3000,
  [ResourceType.Herbs]: 1500,
  [ResourceType.Ore]: 2000,
  [ResourceType.Water]: 2500,
  [ResourceType.Food]: 2500,
  [ResourceType.Essence]: 500,
};

/** Storage cap increase per building level (for the building that produces this resource) */
export const STORAGE_CAP_PER_BUILDING_LEVEL = 0.15; // +15% per level

/** Resource decay rates per hour (only perishable resources) */
export const RESOURCE_DECAY_RATES: Partial<Record<ResourceType, number>> = {
  [ResourceType.Food]: 0.02,   // 2% per hour
  [ResourceType.Herbs]: 0.01,  // 1% per hour
};

/** Cold storage decay reduction from Workshop building */
export const COLD_STORAGE_DECAY_REDUCTION_PER_LEVEL = 0.05; // 5% reduction per Workshop level

/** Resource descriptions for UI display */
export const RESOURCE_DESCRIPTIONS: Record<ResourceType, { icon: string; description: string }> = {
  [ResourceType.Gold]:    { icon: 'coin',    description: 'Primary currency for trade and construction.' },
  [ResourceType.Wood]:    { icon: 'log',     description: 'Lumber for building structures and crafting.' },
  [ResourceType.Stone]:   { icon: 'brick',   description: 'Raw stone for fortifications and upgrades.' },
  [ResourceType.Herbs]:   { icon: 'leaf',    description: 'Medicinal plants for potions and research. Perishable.' },
  [ResourceType.Ore]:     { icon: 'pickaxe', description: 'Raw ore refined into metals for equipment.' },
  [ResourceType.Water]:   { icon: 'droplet', description: 'Fresh water for irrigation and alchemy.' },
  [ResourceType.Food]:    { icon: 'bread',   description: 'Provisions to feed your guild. Perishable.' },
  [ResourceType.Essence]: { icon: 'sparkle', description: 'Mystical energy for advanced research and crafting.' },
};

/** Resource conversion recipes */
export interface ConversionRecipe {
  id: string;
  name: string;
  description: string;
  inputs: Partial<Record<ResourceType, number>>;
  outputs: Partial<Record<ResourceType, number>>;
  /** Minimum building level required (Workshop) */
  requiredBuildingLevel: number;
}

export const CONVERSION_RECIPES: ConversionRecipe[] = [
  {
    id: 'smelt_metal',
    name: 'Smelt Metal',
    description: 'Refine raw ore into useful metal ingots.',
    inputs: { [ResourceType.Ore]: 5, [ResourceType.Wood]: 2 },
    outputs: { [ResourceType.Gold]: 15 },
    requiredBuildingLevel: 1,
  },
  {
    id: 'brew_potions',
    name: 'Brew Potions',
    description: 'Distill herbs and water into valuable potions.',
    inputs: { [ResourceType.Herbs]: 3, [ResourceType.Water]: 1 },
    outputs: { [ResourceType.Essence]: 2 },
    requiredBuildingLevel: 2,
  },
  {
    id: 'stonework',
    name: 'Masonry',
    description: 'Shape raw stone into refined building materials.',
    inputs: { [ResourceType.Stone]: 8, [ResourceType.Water]: 2 },
    outputs: { [ResourceType.Gold]: 20 },
    requiredBuildingLevel: 1,
  },
  {
    id: 'lumber_processing',
    name: 'Lumber Processing',
    description: 'Process raw timber into fine construction planks.',
    inputs: { [ResourceType.Wood]: 10 },
    outputs: { [ResourceType.Gold]: 12, [ResourceType.Stone]: 2 },
    requiredBuildingLevel: 1,
  },
  {
    id: 'feast_preparation',
    name: 'Feast Preparation',
    description: 'Prepare a grand feast to boost guild morale.',
    inputs: { [ResourceType.Food]: 10, [ResourceType.Water]: 5, [ResourceType.Herbs]: 2 },
    outputs: { [ResourceType.Essence]: 5, [ResourceType.Gold]: 10 },
    requiredBuildingLevel: 3,
  },
  {
    id: 'alchemical_transmutation',
    name: 'Alchemical Transmutation',
    description: 'Use essence to transmute base materials into gold.',
    inputs: { [ResourceType.Essence]: 3, [ResourceType.Ore]: 5 },
    outputs: { [ResourceType.Gold]: 50 },
    requiredBuildingLevel: 4,
  },
];

/** Resource milestone thresholds and rewards */
export interface ResourceMilestone {
  id: string;
  resource: ResourceType;
  threshold: number;
  label: string;
  reward: Partial<Record<ResourceType, number>>;
  xp: number;
}

export const RESOURCE_MILESTONES: ResourceMilestone[] = [
  { id: 'gold_1000', resource: ResourceType.Gold, threshold: 1000, label: 'Gold Hoarder', reward: { [ResourceType.Essence]: 5 }, xp: 25 },
  { id: 'gold_5000', resource: ResourceType.Gold, threshold: 5000, label: 'Gold Baron', reward: { [ResourceType.Essence]: 15 }, xp: 50 },
  { id: 'wood_1000', resource: ResourceType.Wood, threshold: 1000, label: 'Lumber Lord', reward: { [ResourceType.Gold]: 100 }, xp: 25 },
  { id: 'stone_1000', resource: ResourceType.Stone, threshold: 1000, label: 'Stone Mason', reward: { [ResourceType.Gold]: 100 }, xp: 25 },
  { id: 'food_1000', resource: ResourceType.Food, threshold: 1000, label: 'Feast Master', reward: { [ResourceType.Gold]: 100 }, xp: 25 },
  { id: 'essence_100', resource: ResourceType.Essence, threshold: 100, label: 'Essence Adept', reward: { [ResourceType.Gold]: 200 }, xp: 50 },
  { id: 'essence_500', resource: ResourceType.Essence, threshold: 500, label: 'Essence Master', reward: { [ResourceType.Gold]: 500 }, xp: 100 },
  { id: 'ore_500', resource: ResourceType.Ore, threshold: 500, label: 'Ore Miner', reward: { [ResourceType.Gold]: 75 }, xp: 20 },
  { id: 'herbs_500', resource: ResourceType.Herbs, threshold: 500, label: 'Herbalist', reward: { [ResourceType.Gold]: 75 }, xp: 20 },
  { id: 'water_1000', resource: ResourceType.Water, threshold: 1000, label: 'Water Bearer', reward: { [ResourceType.Gold]: 75 }, xp: 20 },
];

/** Seasonal resource bonus multipliers */
export const SEASONAL_RESOURCE_BONUSES: Record<string, Partial<Record<ResourceType, number>>> = {
  spring: { [ResourceType.Food]: 0.2, [ResourceType.Herbs]: 0.15, [ResourceType.Water]: 0.1 },
  summer: { [ResourceType.Wood]: 0.15, [ResourceType.Stone]: 0.1, [ResourceType.Food]: 0.1 },
  autumn: { [ResourceType.Food]: 0.25, [ResourceType.Ore]: 0.1, [ResourceType.Wood]: 0.1 },
  winter: { [ResourceType.Ore]: 0.15, [ResourceType.Stone]: 0.15, [ResourceType.Essence]: 0.1 },
};

/** Max resource production per tick (anti-exploit) — units per second */
export const MAX_PRODUCTION_PER_SECOND: Record<ResourceType, number> = {
  [ResourceType.Gold]: 10,
  [ResourceType.Wood]: 8,
  [ResourceType.Stone]: 6,
  [ResourceType.Herbs]: 5,
  [ResourceType.Ore]: 4,
  [ResourceType.Water]: 8,
  [ResourceType.Food]: 8,
  [ResourceType.Essence]: 2,
};

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

// ============================================================
// Social / Multiplayer Constants (Epic 16)
// ============================================================

import { AllianceRole, AlliancePerm, LeaderboardCategory, GuildWarObjective } from './enums';

/** Maximum friends per player */
export const MAX_FRIENDS = 50;

/** Maximum alliance members */
export const MAX_ALLIANCE_MEMBERS = 25;

/** Maximum alliance level */
export const ALLIANCE_MAX_LEVEL = 20;

/** Alliance base XP to level 2 */
export const ALLIANCE_BASE_XP = 200;

/** Alliance XP multiplier per level */
export const ALLIANCE_XP_MULTIPLIER = 1.5;

/** Alliance role permissions */
export const ALLIANCE_ROLE_PERMISSIONS: Record<AllianceRole, AlliancePerm[]> = {
  [AllianceRole.Leader]: [
    AlliancePerm.Invite, AlliancePerm.Kick, AlliancePerm.Manage,
    AlliancePerm.Chat, AlliancePerm.Treasury, AlliancePerm.War,
  ],
  [AllianceRole.Officer]: [
    AlliancePerm.Invite, AlliancePerm.Kick, AlliancePerm.Chat, AlliancePerm.Treasury,
  ],
  [AllianceRole.Member]: [AlliancePerm.Chat],
};

/** Alliance level perks */
export const ALLIANCE_LEVEL_PERKS: Array<{
  level: number;
  name: string;
  description: string;
  effects: Record<string, number>;
}> = [
  { level: 2, name: 'Shared Knowledge', description: 'All members get +5% XP', effects: { xpBonus: 0.05 } },
  { level: 5, name: 'Trade Routes', description: '+10% trade value for members', effects: { tradeBonus: 0.10 } },
  { level: 8, name: 'Allied Scouts', description: '+10% expedition success', effects: { expeditionBonus: 0.10 } },
  { level: 10, name: 'Shared Treasury', description: 'Unlock alliance treasury', effects: { treasuryUnlock: 1 } },
  { level: 12, name: 'War Machine', description: '+15% guild war score', effects: { warBonus: 0.15 } },
  { level: 15, name: 'Grand Alliance', description: '+20% resource production', effects: { resourceBonus: 0.20 } },
  { level: 18, name: 'Pinnacle', description: '+25% all bonuses', effects: { allBonus: 0.25 } },
  { level: 20, name: 'Legendary Alliance', description: 'Exclusive cosmetics + 30% all', effects: { allBonus: 0.30 } },
];

/** Chat rate limits (messages per minute) */
export const CHAT_RATE_LIMIT_GLOBAL = 10;
export const CHAT_RATE_LIMIT_ALLIANCE = 30;
export const CHAT_RATE_LIMIT_PRIVATE = 20;

/** Chat message max length */
export const CHAT_MESSAGE_MAX_LENGTH = 500;

/** Trade expiry duration in hours */
export const TRADE_EXPIRY_HOURS = 24;

/** Maximum active trade requests per player */
export const MAX_ACTIVE_TRADES = 10;

/** Gift daily limit */
export const GIFT_DAILY_LIMIT = 5;

/** Gift max resource amount per gift */
export const GIFT_MAX_RESOURCES: Partial<Record<ResourceType, number>> = {
  [ResourceType.Gold]: 500,
  [ResourceType.Wood]: 300,
  [ResourceType.Stone]: 300,
  [ResourceType.Herbs]: 150,
  [ResourceType.Ore]: 200,
  [ResourceType.Water]: 250,
  [ResourceType.Food]: 250,
  [ResourceType.Essence]: 50,
};

/** Guild war duration in hours */
export const GUILD_WAR_DURATION_HOURS = 48;

/** Guild war minimum wager (gold) */
export const GUILD_WAR_MIN_WAGER = 100;

/** Leaderboard weekly reward tiers */
export const LEADERBOARD_WEEKLY_REWARDS: Array<{
  minRank: number;
  maxRank: number;
  resources: Partial<Record<ResourceType, number>>;
}> = [
  { minRank: 1, maxRank: 1, resources: { [ResourceType.Gold]: 1000, [ResourceType.Essence]: 50 } },
  { minRank: 2, maxRank: 3, resources: { [ResourceType.Gold]: 500, [ResourceType.Essence]: 25 } },
  { minRank: 4, maxRank: 10, resources: { [ResourceType.Gold]: 250, [ResourceType.Essence]: 10 } },
  { minRank: 11, maxRank: 25, resources: { [ResourceType.Gold]: 100 } },
  { minRank: 26, maxRank: 50, resources: { [ResourceType.Gold]: 50 } },
];

/** Regional synergy bonuses when alliance controls complementary climates */
export const REGIONAL_SYNERGY_BONUSES: Array<{
  climateA: string;
  climateB: string;
  bonus: string;
  amount: number;
}> = [
  { climateA: 'tropical', climateB: 'arid', bonus: 'herb_production', amount: 0.15 },
  { climateA: 'temperate', climateB: 'cold', bonus: 'ore_production', amount: 0.15 },
  { climateA: 'mediterranean', climateB: 'continental', bonus: 'trade_bonus', amount: 0.10 },
  { climateA: 'tropical', climateB: 'cold', bonus: 'essence_production', amount: 0.20 },
  { climateA: 'arid', climateB: 'temperate', bonus: 'food_production', amount: 0.12 },
];

/** Profanity filter word list (basic) */
export const PROFANITY_WORDS = [
  'badword1', 'badword2', 'badword3',
];

/** Social achievements */
export const SOCIAL_ACHIEVEMENTS: Array<{
  id: string;
  name: string;
  description: string;
  requirement: number;
  type: string;
}> = [
  { id: 'social_friends_5', name: 'Social Butterfly', description: 'Make 5 friends', requirement: 5, type: 'friends' },
  { id: 'social_friends_10', name: 'Popular', description: 'Make 10 friends', requirement: 10, type: 'friends' },
  { id: 'social_friends_25', name: 'Celebrity', description: 'Make 25 friends', requirement: 25, type: 'friends' },
  { id: 'social_trades_5', name: 'Trader', description: 'Complete 5 player trades', requirement: 5, type: 'trades' },
  { id: 'social_trades_25', name: 'Merchant Prince', description: 'Complete 25 player trades', requirement: 25, type: 'trades' },
  { id: 'social_joint_5', name: 'Cooperative', description: 'Complete 5 joint expeditions', requirement: 5, type: 'joint_expeditions' },
  { id: 'social_gifts_10', name: 'Generous', description: 'Send 10 gifts', requirement: 10, type: 'gifts' },
  { id: 'social_mentor_1', name: 'Mentor', description: 'Mentor 1 new player', requirement: 1, type: 'mentorship' },
  { id: 'social_war_win_3', name: 'Warlord', description: 'Win 3 guild wars', requirement: 3, type: 'wars_won' },
  { id: 'social_alliance_leader', name: 'Alliance Founder', description: 'Create an alliance', requirement: 1, type: 'alliance_created' },
];

/** Mentorship XP reward per mentee level gained */
export const MENTORSHIP_XP_PER_LEVEL = 25;

/** Inactive member kick threshold (days) */
export const INACTIVE_MEMBER_DEFAULT_DAYS = 14;

/** Season duration in days */
export const MULTIPLAYER_SEASON_DURATION_DAYS = 30;

/** WebSocket heartbeat interval (ms) */
export const WS_HEARTBEAT_INTERVAL = 30000;

/** WebSocket reconnect delays (ms) */
export const WS_RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

/** World boss base HP */
export const WORLD_BOSS_BASE_HP = 100000;

/** Matchmaking power tolerance (±%) */
export const MATCHMAKING_POWER_TOLERANCE = 0.25;
