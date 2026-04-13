export enum ResourceType {
  Gold = 'gold',
  Wood = 'wood',
  Stone = 'stone',
  Herbs = 'herbs',
  Ore = 'ore',
  Water = 'water',
  Food = 'food',
  Essence = 'essence',
}

export enum HeroRole {
  Farmer = 'farmer',
  Scout = 'scout',
  Merchant = 'merchant',
  Blacksmith = 'blacksmith',
  Alchemist = 'alchemist',
  Hunter = 'hunter',
  Defender = 'defender',
  Mystic = 'mystic',
  CaravanMaster = 'caravan_master',
  Archivist = 'archivist',
}

export enum HeroTrait {
  Stormborn = 'stormborn',
  Sunblessed = 'sunblessed',
  Frostward = 'frostward',
  ShrewdTrader = 'shrewd_trader',
  LuckyForager = 'lucky_forager',
  Salvager = 'salvager',
  Hardy = 'hardy',
  Nimble = 'nimble',
  Brave = 'brave',
  Greedy = 'greedy',
  Cautious = 'cautious',
  Loyal = 'loyal',
  Scholarly = 'scholarly',
  Charismatic = 'charismatic',
  Stubborn = 'stubborn',
  Inventive = 'inventive',
}

export enum HeroStatus {
  Idle = 'idle',
  Assigned = 'assigned',
  Expedition = 'expedition',
  Recovering = 'recovering',
  Training = 'training',
  Resting = 'resting',
}

export enum BuildingType {
  Farm = 'farm',
  LumberMill = 'lumber_mill',
  Quarry = 'quarry',
  HerbGarden = 'herb_garden',
  Mine = 'mine',
  Well = 'well',
  Workshop = 'workshop',
  Barracks = 'barracks',
  Market = 'market',
  Laboratory = 'laboratory',
}

export enum WeatherCondition {
  Clear = 'clear',
  Rainy = 'rainy',
  Stormy = 'stormy',
  Snowy = 'snowy',
  Hot = 'hot',
  Foggy = 'foggy',
  Windy = 'windy',
}

export enum ExpeditionType {
  Scavenge = 'scavenge',
  Hunt = 'hunt',
  Explore = 'explore',
  TradeCaravan = 'trade_caravan',
}

export enum ExpeditionStatus {
  Active = 'active',
  Resolved = 'resolved',
  Failed = 'failed',
}

export enum ItemRarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary',
}

export enum CraftingQuality {
  Normal = 'normal',
  Fine = 'fine',
  Masterwork = 'masterwork',
}

export enum EnchantmentType {
  FireDamage = 'fire_damage',
  ColdResist = 'cold_resist',
  SpeedBoost = 'speed_boost',
  LifeSteal = 'life_steal',
  CritChance = 'crit_chance',
  ManaRegen = 'mana_regen',
  Thorns = 'thorns',
  Fortify = 'fortify',
  Haste = 'haste',
  Berserk = 'berserk',
  Vampiric = 'vampiric',
  Arcane = 'arcane',
  NatureBlessing = 'nature_blessing',
  ShadowStrike = 'shadow_strike',
  HolyShield = 'holy_shield',
  StormCall = 'storm_call',
  EarthShatter = 'earth_shatter',
  WindWalk = 'wind_walk',
  PoisonCoat = 'poison_coat',
  LuckCharm = 'luck_charm',
}

export enum GemType {
  Ruby = 'ruby',
  Sapphire = 'sapphire',
  Emerald = 'emerald',
  Topaz = 'topaz',
  Diamond = 'diamond',
  Amethyst = 'amethyst',
  Onyx = 'onyx',
  Opal = 'opal',
}

export enum ItemCategory {
  Tool = 'tool',
  Charm = 'charm',
  Armor = 'armor',
  Weapon = 'weapon',
  Relic = 'relic',
  Seed = 'seed',
  TradePermit = 'trade_permit',
  TransportUpgrade = 'transport_upgrade',
  Consumable = 'consumable',
  Material = 'material',
  Gem = 'gem',
  Helmet = 'helmet',
  Boots = 'boots',
  Shield = 'shield',
  Ring = 'ring',
  Amulet = 'amulet',
  Belt = 'belt',
  Cloak = 'cloak',
}

export enum Climate {
  Tropical = 'tropical',
  Temperate = 'temperate',
  Arid = 'arid',
  Cold = 'cold',
  Mediterranean = 'mediterranean',
  Continental = 'continental',
}

// --- Social / Multiplayer Enums ---

export enum PlayerPresenceStatus {
  Online = 'online',
  Idle = 'idle',
  Offline = 'offline',
}

export enum FriendRequestStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Declined = 'declined',
}

export enum AllianceRole {
  Leader = 'leader',
  Officer = 'officer',
  Member = 'member',
}

export enum AlliancePerm {
  Invite = 'invite',
  Kick = 'kick',
  Manage = 'manage',
  Chat = 'chat',
  Treasury = 'treasury',
  War = 'war',
}

export enum ChatChannel {
  Global = 'global',
  Alliance = 'alliance',
  Private = 'private',
}

export enum TradeRequestStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Declined = 'declined',
  Expired = 'expired',
}

export enum GuildWarStatus {
  Pending = 'pending',
  Active = 'active',
  Resolved = 'resolved',
  Cancelled = 'cancelled',
}

export enum GuildWarObjective {
  MostExpeditions = 'most_expeditions',
  HighestTradeVolume = 'highest_trade_volume',
  MostResources = 'most_resources',
  MostXP = 'most_xp',
}

export enum LeaderboardCategory {
  GuildLevel = 'guild_level',
  Wealth = 'wealth',
  ExpeditionCount = 'expedition_count',
  TradeVolume = 'trade_volume',
  HeroPower = 'hero_power',
  AllianceRank = 'alliance_rank',
}

export enum SocialNotificationType {
  FriendOnline = 'friend_online',
  FriendRequest = 'friend_request',
  TradeRequest = 'trade_request',
  AllianceInvite = 'alliance_invite',
  WarDeclared = 'war_declared',
  GiftReceived = 'gift_received',
  ChatMention = 'chat_mention',
  RankChange = 'rank_change',
  WorldBoss = 'world_boss',
  AllianceEvent = 'alliance_event',
}
