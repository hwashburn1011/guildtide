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
