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
  Legendary = 'legendary',
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
}

export enum Climate {
  Tropical = 'tropical',
  Temperate = 'temperate',
  Arid = 'arid',
  Cold = 'cold',
  Mediterranean = 'mediterranean',
  Continental = 'continental',
}
