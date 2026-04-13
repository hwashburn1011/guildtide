import {
  ResourceType,
  HeroRole,
  HeroTrait,
  HeroStatus,
  BuildingType,
  WeatherCondition,
  ExpeditionType,
  ExpeditionStatus,
  ItemRarity,
  ItemCategory,
  Climate,
} from './enums';

// --- Resource Map ---
export type Resources = Record<ResourceType, number>;

// --- Player ---
export interface Player {
  id: string;
  email: string;
  username: string;
  regionId: string;
  createdAt: string;
  lastLoginAt: string;
}

// --- Guild ---
export interface GuildEmblem {
  color: string;
  symbol: string;
}

export interface GuildStats {
  totalBuildingsConstructed: number;
  totalExpeditionsCompleted: number;
  totalResourcesEarned: number;
  totalHeroesRecruited: number;
  totalResearchCompleted: number;
  totalMarketTrades: number;
  guildAgeDays: number;
  loginStreak: number;
}

export interface GuildActivityEntry {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface Guild {
  id: string;
  playerId: string;
  name: string;
  level: number;
  xp: number;
  resources: Resources;
  heroes: Hero[];
  buildings: Building[];
  inventory: Item[];
  emblem: GuildEmblem | null;
  motto: string;
  buildingSlots: number;
  lastDailyReward: string | null;
  loginStreak: number;
  createdAt: string;
}

// --- Hero ---
export interface HeroStats {
  strength: number;
  agility: number;
  intellect: number;
  endurance: number;
  luck: number;
}

export interface HeroEquipment {
  weapon: string | null;
  armor: string | null;
  charm: string | null;
  tool: string | null;
}

export interface HeroPortrait {
  hairStyle: number;
  faceShape: number;
  eyes: number;
  mouth: number;
  accessory: number;
  skinTone: string;
  hairColor: string;
  eyeColor: string;
}

export interface HeroSkillNode {
  id: string;
  name: string;
  description: string;
  branch: number;
  tier: number;
  levelRequired: number;
  prerequisiteIds: string[];
  effects: Record<string, unknown>;
}

export interface HeroSkillTree {
  role: HeroRole;
  branches: [string, string, string];
  skills: HeroSkillNode[];
}

export interface HeroRelationship {
  heroId: string;
  type: 'friendship' | 'rivalry' | 'neutral';
  strength: number;
}

export interface HeroInjury {
  injuredAt: string;
  recoveryHours: number;
  healedAt: string | null;
}

export interface HeroTraining {
  stat: string;
  startedAt: string;
  duration: number;
  xpGain: number;
  statGain: number;
}

export interface HeroQuestProgress {
  questId: string;
  status: 'active' | 'completed' | 'failed';
  progress: Record<string, number>;
  startedAt: string;
}

export interface Hero {
  id: string;
  guildId: string;
  name: string;
  role: HeroRole;
  level: number;
  xp: number;
  traits: HeroTrait[];
  stats: HeroStats;
  equipment: HeroEquipment;
  assignment: string | null;
  status: HeroStatus;
  // Extended fields (populated from metadata)
  morale?: number;
  moraleLabel?: string;
  xpToNext?: number;
  powerScore?: number;
  rarityTier?: number;
  rarityColor?: string;
  portrait?: HeroPortrait;
  unlockedSkills?: string[];
  skillPoints?: number;
  nickname?: string | null;
  favorited?: boolean;
  specialization?: string | null;
  evolution?: string | null;
  injury?: HeroInjury | null;
  training?: HeroTraining | null;
  relationships?: HeroRelationship[];
  stories?: Array<{ level: number; text: string }>;
}

export interface HeroDetail extends Hero {
  moraleModifier: number;
  biomeAffinities: string[];
  agingModifier: number;
  daysSinceHired: number;
  skillTree: HeroSkillTree | null;
  xpLog: Array<{ source: string; amount: number; timestamp: string }>;
  availableQuests: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    minLevel: number;
    rewards: Record<string, unknown>;
  }>;
  wishList: string[];
  activityLog: Array<{ action: string; timestamp: string }>;
}

export interface RetiredHero {
  id: string;
  name: string;
  role: string;
  level: number;
  retiredAt: string;
  bonuses: Array<{ statType: string; amount: number; description: string }>;
}

export interface RosterDashboard {
  totalHeroes: number;
  avgLevel: number;
  avgPowerScore: number;
  avgMorale: number;
  roleCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  highestLevel: number;
}

// --- Building ---
export interface Building {
  id: string;
  guildId: string;
  type: BuildingType;
  level: number;
  slot: number;
  metadata: Record<string, unknown> | null;
}

// --- Item ---
export interface Item {
  id: string;
  guildId: string;
  templateId: string;
  quantity: number;
  metadata: Record<string, unknown> | null;
}

// --- Expedition ---
export interface Expedition {
  id: string;
  guildId: string;
  type: ExpeditionType;
  heroIds: string[];
  destination: string;
  startedAt: string;
  duration: number;
  resolvedAt: string | null;
  result: ExpeditionResult | null;
  status: ExpeditionStatus;
}

export interface ExpeditionResult {
  success: boolean;
  loot: Partial<Resources>;
  items: string[];
  xpGained: number;
  injuries: string[];
  narrative: string;
}

// --- World State ---
export interface WeatherData {
  condition: WeatherCondition;
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainMm: number;
}

export interface WorldModifiers {
  cropGrowth: number;
  floodRisk: number;
  travelSpeed: number;
  huntBonus: number;
  alchemyOutput: number;
  essenceDrops: number;
  morale: number;
  marketConfidence: number;
}

export interface WorldEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  expiresAt: string;
  choices: EventChoice[];
}

export interface EventChoice {
  label: string;
  requires?: Record<string, unknown>;
  risk: number;
}

export interface WorldState {
  regionId: string;
  date: string;
  weather: WeatherData;
  modifiers: WorldModifiers;
  activeEvents: WorldEvent[];
  marketState: MarketState;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  festival: {
    name: string;
    flavorText: string;
    buffs: Record<string, number>;
    duration: number;
  } | null;
}

// --- Market ---
export interface MarketState {
  trend: 'rising' | 'stable' | 'falling';
  volatility: number;
  priceMods: Partial<Record<ResourceType, number>>;
}

// --- Region ---
export interface Region {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  climate: Climate;
  timezone: string;
}

// --- Resource System ---
export interface ResourceState {
  current: Record<ResourceType, number>;
  caps: Record<ResourceType, number>;
  rates: Record<ResourceType, number>;
  netRates: Record<ResourceType, number>;
  decayRates: Partial<Record<ResourceType, number>>;
  multipliers: ResourceMultipliers;
}

export interface ResourceMultipliers {
  weather: Partial<Record<ResourceType, number>>;
  season: Partial<Record<ResourceType, number>>;
  research: Partial<Record<ResourceType, number>>;
  items: Partial<Record<ResourceType, number>>;
}

export interface ResourceBreakdown {
  resource: ResourceType;
  production: Array<{ source: string; amount: number }>;
  consumption: Array<{ source: string; amount: number }>;
  netRate: number;
}

export interface ResourceSnapshot {
  timestamp: string;
  resources: Record<ResourceType, number>;
}

export interface ResourceAlert {
  resource: ResourceType;
  threshold: number;
  direction: 'below' | 'above';
  enabled: boolean;
}

export interface ResourceAuditEntry {
  id: string;
  guildId: string;
  resource: ResourceType;
  amount: number;
  balanceAfter: number;
  action: string;
  details: string;
  timestamp: string;
}

export interface ResourceForecast {
  resource: ResourceType;
  currentAmount: number;
  cap: number;
  netRatePerHour: number;
  hoursUntilFull: number | null;
  hoursUntilEmpty: number | null;
}

// --- API Request/Response Types ---
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  player: Player;
  guild: Guild | null;
  offlineGains: Partial<Resources> | null;
}

export interface CreateGuildRequest {
  name: string;
}

export interface SetRegionRequest {
  regionId: string;
}

export interface ApiError {
  error: string;
  message: string;
}

// --- Research ---
export interface ResearchState {
  completed: string[];
  active: {
    researchId: string;
    startedAt: string;
    duration: number;
  } | null;
  available: string[];
  tree: any;
}

// --- Item Templates & Effects ---
export interface ItemEffect {
  statBonuses?: Record<string, number>;
  expeditionBonus?: number;
  buildingBonus?: number;
  resourceBonuses?: Record<string, number>;
  weatherResistance?: Record<string, number>;
}

export interface ItemTemplate {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  slot: string;
  effects: ItemEffect;
  craftCost: Partial<Record<ResourceType, number>>;
  requiredBuilding: string | null;
  requiredBuildingLevel: number;
  maxStack: number;
}
