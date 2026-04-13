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
  CraftingQuality,
  EnchantmentType,
  GemType,
  PlayerPresenceStatus,
  FriendRequestStatus,
  AllianceRole,
  AlliancePerm,
  ChatChannel,
  TradeRequestStatus,
  GuildWarStatus,
  GuildWarObjective,
  LeaderboardCategory,
  SocialNotificationType,
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
  log?: ExpeditionLogEntry[];
  encounters?: ExpeditionEncounterResult[];
  routeWaypoints?: RouteWaypoint[];
  supplies?: ExpeditionSupplies;
  chainId?: string | null;
  chainStep?: number;
  chainTotal?: number;
  isBoss?: boolean;
  difficultyRating?: number;
  partyMorale?: number;
  templateId?: string | null;
}

export interface ExpeditionResult {
  success: boolean;
  loot: Partial<Resources>;
  items: string[];
  xpGained: number;
  injuries: string[];
  narrative: string;
  encounterSummary?: ExpeditionEncounterResult[];
  rareDiscovery?: RareDiscovery | null;
  bossResult?: BossEncounterResult | null;
  heroPerformance?: Record<string, HeroPerformanceRating>;
  suppliesRemaining?: ExpeditionSupplies;
  milestoneUnlocked?: string | null;
  rewardMultiplier?: number;
}

// --- Expedition Log ---
export interface ExpeditionLogEntry {
  timestamp: string;
  type: 'departure' | 'encounter' | 'discovery' | 'rest' | 'hazard' | 'arrival' | 'boss' | 'camp' | 'merchant' | 'lore';
  title: string;
  narrative: string;
  effects?: Record<string, number>;
  heroId?: string;
}

// --- Expedition Encounters ---
export interface ExpeditionEncounterResult {
  encounterId: string;
  type: 'combat' | 'treasure' | 'trap' | 'npc' | 'rest' | 'weather' | 'merchant' | 'hazard';
  title: string;
  narrative: string;
  outcome: 'success' | 'failure' | 'partial';
  effects: Record<string, number>;
  loot?: Partial<Resources>;
}

// --- Route & Waypoints ---
export interface RouteWaypoint {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'start' | 'encounter' | 'rest' | 'boss' | 'destination';
  reached: boolean;
  encounterResult?: ExpeditionEncounterResult;
}

// --- Supplies ---
export interface ExpeditionSupplies {
  food: number;
  materials: number;
  maxFood: number;
  maxMaterials: number;
}

// --- Rare Discoveries ---
export interface RareDiscovery {
  id: string;
  name: string;
  description: string;
  category: 'artifact' | 'lore_fragment' | 'map_piece' | 'npc_contact' | 'resource_node';
  rarity: 'rare' | 'epic' | 'legendary';
  discoveredAt: string;
  destinationId: string;
  effects?: Record<string, number>;
}

// --- Boss Encounters ---
export interface BossEncounterResult {
  bossId: string;
  bossName: string;
  phases: number;
  phasesCleared: number;
  success: boolean;
  exclusiveLoot: string[];
}

// --- Hero Performance ---
export interface HeroPerformanceRating {
  heroId: string;
  heroName: string;
  combatScore: number;
  explorationScore: number;
  supportScore: number;
  overallRating: number; // 1-5 stars
}

// --- Expedition Achievement ---
export interface ExpeditionAchievement {
  id: string;
  name: string;
  description: string;
  category: 'explorer' | 'treasure_hunter' | 'boss_slayer' | 'veteran' | 'discoverer';
  requirement: number;
  current: number;
  unlocked: boolean;
  unlockedAt?: string;
}

// --- Expedition Statistics ---
export interface ExpeditionStatistics {
  totalExpeditions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  totalLootValue: number;
  totalXpEarned: number;
  fastestCompletion: Record<string, number>;
  bossesDefeated: number;
  rareDiscoveries: number;
  chainsCompleted: number;
  achievements: ExpeditionAchievement[];
}

// --- Party Template ---
export interface PartyTemplate {
  id: string;
  name: string;
  heroIds: string[];
  destinationId?: string;
  createdAt: string;
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
  /** Weapon sub-type for visual rendering */
  weaponType?: 'sword' | 'staff' | 'bow' | 'dagger' | 'mace';
  /** Number of gem sockets (0 = none) */
  sockets?: number;
  /** Base durability points */
  durability?: number;
  /** Lore text unlocked on first discovery */
  lore?: string;
  /** Level requirement to equip */
  levelRequired?: number;
  /** Item set this item belongs to */
  setId?: string;
  /** Whether this is a legendary quest item */
  isLegendaryQuest?: boolean;
  /** Visual tier for rendering (0-4 maps to rarity) */
  visualTier?: number;
  /** Sell value in gold */
  sellValue?: number;
  /** Salvage yield when disenchanted */
  salvageYield?: Partial<Record<ResourceType, number>>;
}

// --- Crafting System ---
export interface CraftingRecipe {
  id: string;
  name: string;
  resultTemplateId: string;
  ingredients: Partial<Record<ResourceType, number>>;
  /** Item ingredients (templateId -> quantity) */
  itemIngredients?: Record<string, number>;
  craftTimeSeconds: number;
  requiredBuildingLevel: number;
  /** Minimum skill level to discover */
  discoveryLevel?: number;
  /** Category tag for recipe browser */
  category: ItemCategory;
}

export interface CraftingQueueEntry {
  recipeId: string;
  startedAt: string;
  completesAt: string;
  quality: CraftingQuality;
}

export interface CraftingState {
  discoveredRecipes: string[];
  craftingQueue: CraftingQueueEntry[];
  craftingHistory: Array<{
    recipeId: string;
    quality: CraftingQuality;
    craftedAt: string;
  }>;
  totalCrafted: number;
}

// --- Item Sets ---
export interface ItemSetBonus {
  piecesRequired: number;
  statBonuses?: Partial<Record<string, number>>;
  expeditionBonus?: number;
  buildingBonus?: number;
  specialEffect?: string;
}

export interface ItemSetDefinition {
  id: string;
  name: string;
  description: string;
  pieceTemplateIds: string[];
  bonuses: ItemSetBonus[];
}

// --- Enchanting ---
export interface EnchantmentDefinition {
  id: EnchantmentType;
  name: string;
  description: string;
  effects: Partial<Record<string, number>>;
  essenceCost: number;
  goldCost: number;
  applicableSlots: string[];
  rarity: ItemRarity;
}

export interface AppliedEnchantment {
  enchantmentId: EnchantmentType;
  level: number;
}

// --- Gems & Sockets ---
export interface GemDefinition {
  type: GemType;
  name: string;
  description: string;
  effects: Partial<Record<string, number>>;
  rarity: ItemRarity;
}

export interface SocketedGem {
  socketIndex: number;
  gemType: GemType;
}

// --- Item Instance Metadata ---
export interface ItemInstanceMetadata {
  durability?: number;
  maxDurability?: number;
  enchantments?: AppliedEnchantment[];
  socketedGems?: SocketedGem[];
  quality?: CraftingQuality;
  locked?: boolean;
  transmogId?: string | null;
  /** Random stat rolls within rarity range */
  statRolls?: Record<string, number>;
  /** Age in game days for patina */
  createdDay?: number;
  /** Loadout assignment */
  loadoutId?: string | null;
}

// --- Trading ---
export interface TradeOffer {
  id: string;
  fromGuildId: string;
  toGuildId: string;
  offeredItems: Array<{ templateId: string; quantity: number }>;
  requestedItems: Array<{ templateId: string; quantity: number }>;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
}

// --- Equipment Loadout ---
export interface EquipmentLoadout {
  id: string;
  name: string;
  slots: Record<string, string | null>;
}

// --- Gear Score ---
export interface GearScore {
  heroId: string;
  totalScore: number;
  slotScores: Record<string, number>;
  setBonusScore: number;
  enchantmentScore: number;
  gemScore: number;
}

// --- Loot Table ---
export interface LootTableEntry {
  templateId: string;
  weight: number;
  minQuantity: number;
  maxQuantity: number;
  guaranteed?: boolean;
}

export interface LootTable {
  id: string;
  entries: LootTableEntry[];
  guaranteedDrops?: string[];
  rarityWeights: Record<ItemRarity, number>;
}

// ============================================================
// Social / Multiplayer Types (Epic 16)
// ============================================================

// --- Player Presence ---
export interface PlayerPresence {
  playerId: string;
  username: string;
  status: PlayerPresenceStatus;
  lastSeen: string;
  statusMessage: string;
}

// --- Player Profile (public view) ---
export interface PlayerProfile {
  id: string;
  username: string;
  guildName: string;
  guildLevel: number;
  guildEmblem: GuildEmblem | null;
  regionId: string;
  totalExpeditions: number;
  totalTradeVolume: number;
  heroPower: number;
  achievements: string[];
  joinedAt: string;
  statusMessage: string;
  presence: PlayerPresenceStatus;
  mentorLevel: number;
}

// --- Friend System ---
export interface FriendRequest {
  id: string;
  fromPlayerId: string;
  fromUsername: string;
  toPlayerId: string;
  toUsername: string;
  status: FriendRequestStatus;
  createdAt: string;
}

export interface Friend {
  playerId: string;
  username: string;
  guildName: string;
  guildLevel: number;
  presence: PlayerPresenceStatus;
  lastSeen: string;
  addedAt: string;
}

// --- Alliance System ---
export interface AllianceEmblem {
  layers: Array<{ shape: string; color: string }>;
}

export interface Alliance {
  id: string;
  name: string;
  description: string;
  rules: string;
  emblem: AllianceEmblem | null;
  leaderId: string;
  level: number;
  xp: number;
  members: AllianceMember[];
  treasury: Partial<Resources>;
  createdAt: string;
  maxMembers: number;
  isRecruiting: boolean;
  tags: string[];
}

export interface AllianceMember {
  playerId: string;
  username: string;
  guildName: string;
  guildLevel: number;
  role: AllianceRole;
  joinedAt: string;
  activityScore: number;
  contributionXP: number;
  lastActive: string;
}

export interface AllianceInvite {
  id: string;
  allianceId: string;
  allianceName: string;
  fromPlayerId: string;
  fromUsername: string;
  toPlayerId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface AllianceRolePermissions {
  [AllianceRole.Leader]: AlliancePerm[];
  [AllianceRole.Officer]: AlliancePerm[];
  [AllianceRole.Member]: AlliancePerm[];
}

export interface AllianceDailyChallenge {
  id: string;
  allianceId: string;
  objective: string;
  target: number;
  current: number;
  reward: Partial<Resources>;
  expiresAt: string;
}

export interface AllianceEvent {
  id: string;
  allianceId: string;
  title: string;
  description: string;
  objective: string;
  target: number;
  current: number;
  participants: string[];
  reward: Partial<Resources>;
  startsAt: string;
  endsAt: string;
}

export interface AllianceAnnouncement {
  id: string;
  allianceId: string;
  authorId: string;
  authorUsername: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
}

export interface AllianceRecruitmentPost {
  id: string;
  allianceId: string;
  allianceName: string;
  description: string;
  minGuildLevel: number;
  tags: string[];
  memberCount: number;
  maxMembers: number;
  allianceLevel: number;
  createdAt: string;
}

export interface AllianceCalendarEntry {
  id: string;
  allianceId: string;
  title: string;
  description: string;
  scheduledAt: string;
  createdBy: string;
}

export interface AllianceWeeklyReport {
  allianceId: string;
  weekStart: string;
  weekEnd: string;
  totalXpEarned: number;
  topContributors: Array<{ playerId: string; username: string; xp: number }>;
  expeditionsCompleted: number;
  warResults: Array<{ opponentName: string; won: boolean }>;
  newMembers: number;
  membersLeft: number;
}

export interface AlliancePerk {
  id: string;
  name: string;
  description: string;
  levelRequired: number;
  effects: Record<string, number>;
}

export interface AllianceStatsDashboard {
  memberCount: number;
  totalPower: number;
  avgGuildLevel: number;
  activeMembers24h: number;
  totalExpeditions: number;
  treasuryValue: number;
  allianceLevel: number;
  allianceXP: number;
  xpToNextLevel: number;
}

// --- Chat System ---
export interface ChatMessage {
  id: string;
  channel: ChatChannel;
  channelId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  reactions: Record<string, string[]>;
  imageUrl: string | null;
  createdAt: string;
}

export interface ChatConversation {
  playerId: string;
  username: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

// --- Player Trade System ---
export interface PlayerTradeRequest {
  id: string;
  fromPlayerId: string;
  fromUsername: string;
  toPlayerId: string;
  toUsername: string;
  offeredResources: Partial<Resources>;
  offeredItems: Array<{ templateId: string; quantity: number }>;
  requestedResources: Partial<Resources>;
  requestedItems: Array<{ templateId: string; quantity: number }>;
  status: TradeRequestStatus;
  createdAt: string;
  expiresAt: string;
}

export interface TradeHistoryEntry {
  id: string;
  fromPlayerId: string;
  fromUsername: string;
  toPlayerId: string;
  toUsername: string;
  offeredResources: Partial<Resources>;
  requestedResources: Partial<Resources>;
  completedAt: string;
}

// --- Joint Expeditions ---
export interface JointExpedition {
  id: string;
  initiatorGuildId: string;
  initiatorGuildName: string;
  allianceId: string;
  participants: JointExpeditionParticipant[];
  destination: string;
  startedAt: string;
  duration: number;
  status: ExpeditionStatus;
  result: JointExpeditionResult | null;
}

export interface JointExpeditionParticipant {
  guildId: string;
  guildName: string;
  heroIds: string[];
  contribution: number;
}

export interface JointExpeditionResult {
  success: boolean;
  totalLoot: Partial<Resources>;
  xpGained: number;
  splits: Array<{ guildId: string; loot: Partial<Resources>; xp: number }>;
}

// --- Leaderboards ---
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  guildName: string;
  score: number;
  previousRank: number | null;
}

export interface Leaderboard {
  category: LeaderboardCategory;
  period: 'weekly' | 'alltime';
  entries: LeaderboardEntry[];
  updatedAt: string;
  playerRank: LeaderboardEntry | null;
}

export interface LeaderboardReward {
  minRank: number;
  maxRank: number;
  resources: Partial<Resources>;
}

// --- Guild Wars ---
export interface GuildWar {
  id: string;
  challengerGuildId: string;
  challengerGuildName: string;
  defenderGuildId: string;
  defenderGuildName: string;
  objective: GuildWarObjective;
  wager: Partial<Resources>;
  challengerScore: number;
  defenderScore: number;
  status: GuildWarStatus;
  startsAt: string;
  endsAt: string;
  winnerId: string | null;
}

export interface GuildWarHistory {
  id: string;
  opponentName: string;
  objective: GuildWarObjective;
  myScore: number;
  opponentScore: number;
  won: boolean;
  wager: Partial<Resources>;
  resolvedAt: string;
}

export interface TerritoryWarRegion {
  regionId: string;
  regionName: string;
  controllingAllianceId: string | null;
  controllingAllianceName: string | null;
  contestedBy: string[];
  contestPoints: Record<string, number>;
}

// --- Regional Synergy ---
export interface RegionalSynergy {
  allianceId: string;
  regions: string[];
  bonuses: Record<string, number>;
  synergyPairs: Array<{ regionA: string; regionB: string; bonus: string; amount: number }>;
}

// --- Gift System ---
export interface GiftEntry {
  id: string;
  fromPlayerId: string;
  fromUsername: string;
  toPlayerId: string;
  toUsername: string;
  resources: Partial<Resources>;
  message: string;
  createdAt: string;
  claimed: boolean;
}

// --- Social Feed ---
export interface SocialFeedEntry {
  id: string;
  playerId: string;
  username: string;
  type: string;
  message: string;
  data: Record<string, unknown>;
  createdAt: string;
}

// --- Social Notification ---
export interface SocialNotification {
  id: string;
  playerId: string;
  type: SocialNotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface SocialNotificationPrefs {
  [SocialNotificationType.FriendOnline]: boolean;
  [SocialNotificationType.FriendRequest]: boolean;
  [SocialNotificationType.TradeRequest]: boolean;
  [SocialNotificationType.AllianceInvite]: boolean;
  [SocialNotificationType.WarDeclared]: boolean;
  [SocialNotificationType.GiftReceived]: boolean;
  [SocialNotificationType.ChatMention]: boolean;
  [SocialNotificationType.RankChange]: boolean;
  [SocialNotificationType.WorldBoss]: boolean;
  [SocialNotificationType.AllianceEvent]: boolean;
}

// --- World Boss ---
export interface WorldBossEvent {
  id: string;
  bossName: string;
  totalHP: number;
  currentHP: number;
  contributors: WorldBossContributor[];
  startsAt: string;
  endsAt: string;
  defeated: boolean;
  rewards: Partial<Resources>;
}

export interface WorldBossContributor {
  playerId: string;
  username: string;
  allianceId: string | null;
  damage: number;
  hits: number;
}

// --- Mentorship ---
export interface MentorshipLink {
  id: string;
  mentorId: string;
  mentorUsername: string;
  menteeId: string;
  menteeUsername: string;
  startedAt: string;
  mentorXpEarned: number;
  menteeLevel: number;
}

// --- Player Comparison ---
export interface PlayerComparison {
  playerA: PlayerProfile;
  playerB: PlayerProfile;
  differences: Record<string, { a: number; b: number }>;
}

// --- Seasons ---
export interface MultiplayerSeason {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  rewardTrack: SeasonRewardTier[];
  currentTier: number;
}

export interface SeasonRewardTier {
  tier: number;
  pointsRequired: number;
  rewards: Partial<Resources>;
  label: string;
}

// --- Player Card ---
export interface PlayerCard {
  playerId: string;
  username: string;
  guildName: string;
  guildLevel: number;
  emblem: GuildEmblem | null;
  topHeroName: string;
  topHeroLevel: number;
  expeditionCount: number;
  achievements: string[];
  shareUrl: string;
}

// --- Follow System ---
export interface FollowEntry {
  playerId: string;
  username: string;
  guildName: string;
  followedAt: string;
}

// --- Blocked Player ---
export interface BlockedPlayer {
  playerId: string;
  username: string;
  blockedAt: string;
}

// --- Player Report ---
export interface PlayerReport {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  details: string;
  createdAt: string;
}

// --- Cross-Alliance Trade Fair ---
export interface TradeFairEvent {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  participants: Array<{ allianceId: string; allianceName: string; offerings: Partial<Resources> }>;
  bonusMultiplier: number;
}

// --- Alliance Diplomacy ---
export interface DiplomacyPact {
  id: string;
  type: 'non_aggression' | 'trade_agreement';
  allianceAId: string;
  allianceAName: string;
  allianceBId: string;
  allianceBName: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

// --- Matchmaking ---
export interface MatchmakingResult {
  matchedGuildId: string;
  matchedGuildName: string;
  matchedGuildLevel: number;
  matchedPowerScore: number;
  compatibilityScore: number;
}

// --- Anti-Cheat ---
export interface AntiCheatValidation {
  action: string;
  playerId: string;
  valid: boolean;
  reason: string;
  timestamp: string;
}
