/**
 * Expanded region definitions for the world map system.
 *
 * T-1071: World map layout with 8 distinct regions
 * T-1074–T-1081: Individual biome regions
 * T-1086: Region-specific expedition encounter tables
 * T-1087: Region-specific NPC merchant inventories
 * T-1088: Region-specific weather effects
 * T-1092–T-1094: Outpost system
 * T-1095: Region danger level
 * T-1096: Region event pools
 * T-1097: Region lore entries
 * T-1098: Region achievement system
 * T-1099: Region resource node markers
 * T-1100–T-1102: Region faction system
 * T-1103: Region boss markers
 * T-1109: Region connectivity graph
 * T-1111: Region unlock requirements
 * T-1112: Hidden region discovery
 * T-1113: Resource depletion and regeneration
 * T-1122: Region-specific crafting recipes
 * T-1129: Region ambient music themes
 * T-1131–T-1132: Region claim and defense
 * T-1135: Trade embargo effects
 * T-1137: NPC caravan routes
 * T-1138–T-1139: Landmark discovery system
 */

export interface Biome {
  id: string;
  name: string;
  color: number;      // hex color for map rendering
  bgColor: string;    // CSS hex for UI
  icon: string;       // emoji icon
  description: string;
}

export interface RegionResource {
  type: string;
  name: string;
  abundance: number;    // 0–1
  regenRatePerDay: number;
  maxCapacity: number;
  depleted: boolean;
}

export interface RegionFaction {
  id: string;
  name: string;
  disposition: 'friendly' | 'neutral' | 'hostile';
  tradeModifier: number;     // 1.0 = normal
  expeditionModifier: number; // 1.0 = normal
}

export interface RegionLore {
  id: string;
  title: string;
  text: string;
  discoveredByExploration: boolean;
}

export interface Landmark {
  id: string;
  name: string;
  icon: string;
  description: string;
  benefit: string;
  mapX: number;
  mapY: number;
  discovered: boolean;
}

export interface RegionBoss {
  id: string;
  name: string;
  level: number;
  icon: string;
  mapX: number;
  mapY: number;
}

export interface OutpostSlot {
  index: number;
  buildingType: string | null;
  level: number;
}

export interface RegionDefinition {
  id: string;
  name: string;
  biome: Biome;
  mapX: number;        // 0–100 coordinate on world map
  mapY: number;
  mapRadius: number;   // visual size on map
  climate: string;
  difficulty: number;  // 1–10
  dangerLevel: number; // scales with distance from guild hall
  resources: RegionResource[];
  factions: RegionFaction[];
  lore: RegionLore[];
  landmarks: Landmark[];
  bosses: RegionBoss[];
  connections: string[];  // connected region IDs
  unlockRequirements: {
    guildLevel: number;
    researchIds: string[];
    questIds: string[];
  };
  isHidden: boolean;
  discoveredByDefault: boolean;
  weatherOverrides: Record<string, boolean>; // e.g. { rain: false } for desert
  encounterTable: Array<{
    id: string;
    name: string;
    weight: number;
    minLevel: number;
  }>;
  merchantInventory: Array<{
    itemId: string;
    name: string;
    price: number;
    stock: number;
  }>;
  craftingRecipes: string[];
  outpostSlots: number;
  musicTheme: string;
  claimable: boolean;
  caravanRoutes: Array<{ targetRegionId: string; travelDays: number; goods: string[] }>;
}

// --- Biome Definitions ---
export const BIOMES: Record<string, Biome> = {
  forest: {
    id: 'forest',
    name: 'Forest',
    color: 0x2d6a4f,
    bgColor: '#2d6a4f',
    icon: '\u{1F332}',
    description: 'Dense canopy of ancient oaks and towering pines. Rich in timber and wild herbs.',
  },
  mountain: {
    id: 'mountain',
    name: 'Mountain',
    color: 0x6b705c,
    bgColor: '#6b705c',
    icon: '\u{26F0}',
    description: 'Jagged peaks and deep caverns. Ore veins and rare minerals abound.',
  },
  desert: {
    id: 'desert',
    name: 'Desert',
    color: 0xc9a227,
    bgColor: '#c9a227',
    icon: '\u{1F3DC}',
    description: 'Sun-scorched dunes hiding precious gems beneath endless sand.',
  },
  coastal: {
    id: 'coastal',
    name: 'Coastal',
    color: 0x219ebc,
    bgColor: '#219ebc',
    icon: '\u{1F3D6}',
    description: 'Bustling harbors and tidal pools. Trade routes converge at the shore.',
  },
  tundra: {
    id: 'tundra',
    name: 'Tundra',
    color: 0xa8dadc,
    bgColor: '#a8dadc',
    icon: '\u{2744}',
    description: 'Frost-bound permafrost hides rare materials beneath the ice.',
  },
  swamp: {
    id: 'swamp',
    name: 'Swamp',
    color: 0x588157,
    bgColor: '#588157',
    icon: '\u{1FAB8}',
    description: 'Murky wetlands teeming with rare herbs and alchemical ingredients.',
  },
  plains: {
    id: 'plains',
    name: 'Plains',
    color: 0x90be6d,
    bgColor: '#90be6d',
    icon: '\u{1F33E}',
    description: 'Rolling grasslands perfect for farming and livestock.',
  },
  volcanic: {
    id: 'volcanic',
    name: 'Volcanic',
    color: 0xd62828,
    bgColor: '#d62828',
    icon: '\u{1F30B}',
    description: 'Active volcanic terrain. Extreme heat forges rare metals.',
  },
};

// --- Full Region Definitions (T-1074 through T-1081) ---
export const REGION_DEFINITIONS: RegionDefinition[] = [
  // T-1074: Forest region
  {
    id: 'elderwood-forest',
    name: 'Elderwood Forest',
    biome: BIOMES.forest,
    mapX: 25, mapY: 30, mapRadius: 14,
    climate: 'temperate',
    difficulty: 2,
    dangerLevel: 2,
    resources: [
      { type: 'wood', name: 'Elderwood Timber', abundance: 0.9, regenRatePerDay: 50, maxCapacity: 500, depleted: false },
      { type: 'herbs', name: 'Forest Herbs', abundance: 0.7, regenRatePerDay: 30, maxCapacity: 300, depleted: false },
      { type: 'food', name: 'Wild Berries', abundance: 0.5, regenRatePerDay: 20, maxCapacity: 200, depleted: false },
    ],
    factions: [
      { id: 'woodwardens', name: 'Woodwardens', disposition: 'friendly', tradeModifier: 0.9, expeditionModifier: 0.85 },
      { id: 'shadowfae', name: 'Shadow Fae', disposition: 'neutral', tradeModifier: 1.0, expeditionModifier: 1.1 },
    ],
    lore: [
      { id: 'elderwood-origin', title: 'The First Grove', text: 'Legend says the Elderwood was planted by the world\'s first druid, long before guilds existed.', discoveredByExploration: false },
      { id: 'elderwood-secret', title: 'The Whispering Hollow', text: 'Deep within the forest lies a clearing where the trees seem to speak.', discoveredByExploration: true },
    ],
    landmarks: [
      { id: 'ancient-tree', name: 'The Ancient Tree', icon: '\u{1F333}', description: 'A tree older than recorded history. Its sap has magical properties.', benefit: '+10% herb yield', mapX: 28, mapY: 32, discovered: false },
    ],
    bosses: [
      { id: 'forest-guardian', name: 'Elderwood Guardian', level: 5, icon: '\u{1F43B}', mapX: 22, mapY: 27 },
    ],
    connections: ['silverstone-mountains', 'verdant-plains', 'mistfen-swamp'],
    unlockRequirements: { guildLevel: 1, researchIds: [], questIds: [] },
    isHidden: false,
    discoveredByDefault: true,
    weatherOverrides: {},
    encounterTable: [
      { id: 'wolf-pack', name: 'Wolf Pack', weight: 30, minLevel: 1 },
      { id: 'treant', name: 'Awakened Treant', weight: 15, minLevel: 3 },
      { id: 'herb-merchant', name: 'Wandering Herbalist', weight: 25, minLevel: 1 },
      { id: 'bandit-camp', name: 'Forest Bandits', weight: 20, minLevel: 2 },
      { id: 'fairy-ring', name: 'Fairy Ring', weight: 10, minLevel: 1 },
    ],
    merchantInventory: [
      { itemId: 'wooden-shield', name: 'Wooden Shield', price: 50, stock: 5 },
      { itemId: 'herb-pouch', name: 'Herb Pouch', price: 30, stock: 10 },
      { itemId: 'forest-map', name: 'Forest Map', price: 100, stock: 1 },
    ],
    craftingRecipes: ['wooden-bow', 'herbal-salve', 'bark-armor'],
    outpostSlots: 3,
    musicTheme: 'forest_ambient',
    claimable: true,
    caravanRoutes: [
      { targetRegionId: 'verdant-plains', travelDays: 1, goods: ['wood', 'herbs'] },
      { targetRegionId: 'silverstone-mountains', travelDays: 2, goods: ['wood'] },
    ],
  },

  // T-1075: Mountain region
  {
    id: 'silverstone-mountains',
    name: 'Silverstone Mountains',
    biome: BIOMES.mountain,
    mapX: 50, mapY: 15, mapRadius: 16,
    climate: 'cold',
    difficulty: 5,
    dangerLevel: 5,
    resources: [
      { type: 'ore', name: 'Silverstone Ore', abundance: 0.85, regenRatePerDay: 25, maxCapacity: 400, depleted: false },
      { type: 'stone', name: 'Mountain Granite', abundance: 0.9, regenRatePerDay: 40, maxCapacity: 600, depleted: false },
      { type: 'essence', name: 'Peak Essence', abundance: 0.3, regenRatePerDay: 5, maxCapacity: 50, depleted: false },
    ],
    factions: [
      { id: 'dwarven-miners', name: 'Dwarven Miners', disposition: 'neutral', tradeModifier: 1.0, expeditionModifier: 1.0 },
      { id: 'frost-giants', name: 'Frost Giants', disposition: 'hostile', tradeModifier: 1.5, expeditionModifier: 1.4 },
    ],
    lore: [
      { id: 'silverstone-veins', title: 'The Silver Veins', text: 'The mountains are laced with pure silver, giving them their name.', discoveredByExploration: false },
    ],
    landmarks: [
      { id: 'summit-forge', name: 'Summit Forge', icon: '\u{1F525}', description: 'An ancient forge at the mountain peak, heated by volcanic vents.', benefit: '+15% smithing quality', mapX: 52, mapY: 12, discovered: false },
    ],
    bosses: [
      { id: 'mountain-drake', name: 'Silverstone Drake', level: 8, icon: '\u{1F409}', mapX: 48, mapY: 10 },
    ],
    connections: ['elderwood-forest', 'tundra-wastes', 'volcanic-caldera'],
    unlockRequirements: { guildLevel: 3, researchIds: [], questIds: [] },
    isHidden: false,
    discoveredByDefault: false,
    weatherOverrides: {},
    encounterTable: [
      { id: 'rock-golem', name: 'Rock Golem', weight: 25, minLevel: 3 },
      { id: 'mountain-troll', name: 'Mountain Troll', weight: 20, minLevel: 4 },
      { id: 'ore-deposit', name: 'Rich Ore Deposit', weight: 25, minLevel: 1 },
      { id: 'avalanche', name: 'Avalanche!', weight: 15, minLevel: 2 },
      { id: 'eagle-nest', name: 'Giant Eagle Nest', weight: 15, minLevel: 3 },
    ],
    merchantInventory: [
      { itemId: 'pickaxe', name: 'Reinforced Pickaxe', price: 120, stock: 3 },
      { itemId: 'ore-sack', name: 'Ore Sack', price: 40, stock: 8 },
      { itemId: 'mountain-rope', name: 'Climbing Rope', price: 60, stock: 5 },
    ],
    craftingRecipes: ['steel-sword', 'stone-wall', 'ore-refining'],
    outpostSlots: 2,
    musicTheme: 'mountain_epic',
    claimable: true,
    caravanRoutes: [
      { targetRegionId: 'elderwood-forest', travelDays: 2, goods: ['ore', 'stone'] },
      { targetRegionId: 'tundra-wastes', travelDays: 3, goods: ['ore'] },
    ],
  },

  // T-1076: Desert region
  {
    id: 'sunscorch-desert',
    name: 'Sunscorch Desert',
    biome: BIOMES.desert,
    mapX: 75, mapY: 60, mapRadius: 18,
    climate: 'arid',
    difficulty: 6,
    dangerLevel: 6,
    resources: [
      { type: 'essence', name: 'Desert Gems', abundance: 0.6, regenRatePerDay: 10, maxCapacity: 100, depleted: false },
      { type: 'stone', name: 'Sandite', abundance: 0.7, regenRatePerDay: 20, maxCapacity: 250, depleted: false },
      { type: 'gold', name: 'Gold Dust', abundance: 0.4, regenRatePerDay: 8, maxCapacity: 80, depleted: false },
    ],
    factions: [
      { id: 'sand-nomads', name: 'Sand Nomads', disposition: 'neutral', tradeModifier: 1.1, expeditionModifier: 1.0 },
      { id: 'scorpion-cult', name: 'Scorpion Cult', disposition: 'hostile', tradeModifier: 1.8, expeditionModifier: 1.5 },
    ],
    lore: [
      { id: 'lost-oasis', title: 'The Lost Oasis', text: 'Ancient texts speak of an oasis that appears only during sandstorms.', discoveredByExploration: true },
    ],
    landmarks: [
      { id: 'sun-temple', name: 'Temple of the Sun', icon: '\u{1F3DB}', description: 'A ruined temple dedicated to the sun god, still radiating heat.', benefit: '+20% gold income', mapX: 78, mapY: 55, discovered: false },
    ],
    bosses: [
      { id: 'sand-wyrm', name: 'Great Sand Wyrm', level: 10, icon: '\u{1F40D}', mapX: 72, mapY: 65 },
    ],
    connections: ['suncrest-coast', 'verdant-plains', 'volcanic-caldera'],
    unlockRequirements: { guildLevel: 5, researchIds: ['desert-navigation'], questIds: [] },
    isHidden: false,
    discoveredByDefault: false,
    weatherOverrides: { rain: false, snowy: false },
    encounterTable: [
      { id: 'sandstorm', name: 'Sandstorm', weight: 20, minLevel: 3 },
      { id: 'scorpion-swarm', name: 'Scorpion Swarm', weight: 25, minLevel: 4 },
      { id: 'oasis', name: 'Hidden Oasis', weight: 15, minLevel: 1 },
      { id: 'sand-bandit', name: 'Desert Bandit', weight: 25, minLevel: 3 },
      { id: 'mirage', name: 'Mirage Merchant', weight: 15, minLevel: 2 },
    ],
    merchantInventory: [
      { itemId: 'water-flask', name: 'Enchanted Water Flask', price: 80, stock: 5 },
      { itemId: 'gem-chisel', name: 'Gem Chisel', price: 150, stock: 2 },
      { itemId: 'sun-cloak', name: 'Sun Cloak', price: 200, stock: 1 },
    ],
    craftingRecipes: ['gem-cutting', 'desert-armor', 'sun-talisman'],
    outpostSlots: 2,
    musicTheme: 'desert_wind',
    claimable: true,
    caravanRoutes: [
      { targetRegionId: 'suncrest-coast', travelDays: 2, goods: ['essence', 'gold'] },
      { targetRegionId: 'verdant-plains', travelDays: 3, goods: ['stone'] },
    ],
  },

  // T-1077: Coastal region
  {
    id: 'suncrest-coast',
    name: 'Suncrest Coast',
    biome: BIOMES.coastal,
    mapX: 80, mapY: 35, mapRadius: 14,
    climate: 'mediterranean',
    difficulty: 3,
    dangerLevel: 3,
    resources: [
      { type: 'food', name: 'Fresh Fish', abundance: 0.85, regenRatePerDay: 45, maxCapacity: 450, depleted: false },
      { type: 'gold', name: 'Trade Gold', abundance: 0.6, regenRatePerDay: 15, maxCapacity: 200, depleted: false },
      { type: 'water', name: 'Seawater', abundance: 0.95, regenRatePerDay: 60, maxCapacity: 600, depleted: false },
    ],
    factions: [
      { id: 'merchant-guild', name: 'Merchant Guild', disposition: 'friendly', tradeModifier: 0.8, expeditionModifier: 1.0 },
      { id: 'pirates', name: 'Corsairs', disposition: 'hostile', tradeModifier: 1.3, expeditionModifier: 1.3 },
    ],
    lore: [
      { id: 'suncrest-harbor', title: 'The Grand Harbor', text: 'Ships from across the known world dock at Suncrest, bringing exotic goods.', discoveredByExploration: false },
    ],
    landmarks: [
      { id: 'lighthouse', name: 'Ancient Lighthouse', icon: '\u{1F6E2}', description: 'A lighthouse that guides traders and warns of storms.', benefit: '+10% trade income', mapX: 85, mapY: 30, discovered: false },
    ],
    bosses: [
      { id: 'kraken', name: 'The Kraken', level: 9, icon: '\u{1F419}', mapX: 88, mapY: 38 },
    ],
    connections: ['sunscorch-desert', 'verdant-plains', 'mistfen-swamp'],
    unlockRequirements: { guildLevel: 2, researchIds: [], questIds: [] },
    isHidden: false,
    discoveredByDefault: false,
    weatherOverrides: { snowy: false },
    encounterTable: [
      { id: 'pirate-ship', name: 'Pirate Ship', weight: 20, minLevel: 3 },
      { id: 'sea-serpent', name: 'Sea Serpent', weight: 15, minLevel: 5 },
      { id: 'trade-ship', name: 'Merchant Vessel', weight: 30, minLevel: 1 },
      { id: 'shipwreck', name: 'Shipwreck Salvage', weight: 20, minLevel: 2 },
      { id: 'tidal-pool', name: 'Tidal Pool Discovery', weight: 15, minLevel: 1 },
    ],
    merchantInventory: [
      { itemId: 'compass', name: 'Navigator\'s Compass', price: 100, stock: 3 },
      { itemId: 'trade-license', name: 'Trade License', price: 250, stock: 1 },
      { itemId: 'salted-fish', name: 'Salted Fish Barrel', price: 30, stock: 20 },
    ],
    craftingRecipes: ['fishing-net', 'ship-repair', 'sailor-charm'],
    outpostSlots: 4,
    musicTheme: 'coastal_waves',
    claimable: true,
    caravanRoutes: [
      { targetRegionId: 'sunscorch-desert', travelDays: 2, goods: ['food', 'water'] },
      { targetRegionId: 'verdant-plains', travelDays: 1, goods: ['food', 'gold'] },
    ],
  },

  // T-1078: Tundra region
  {
    id: 'tundra-wastes',
    name: 'Frosthollow Tundra',
    biome: BIOMES.tundra,
    mapX: 40, mapY: 5, mapRadius: 15,
    climate: 'cold',
    difficulty: 7,
    dangerLevel: 7,
    resources: [
      { type: 'essence', name: 'Frost Essence', abundance: 0.5, regenRatePerDay: 8, maxCapacity: 80, depleted: false },
      { type: 'ore', name: 'Permafrost Iron', abundance: 0.6, regenRatePerDay: 15, maxCapacity: 200, depleted: false },
      { type: 'herbs', name: 'Ice Moss', abundance: 0.3, regenRatePerDay: 5, maxCapacity: 50, depleted: false },
    ],
    factions: [
      { id: 'ice-elves', name: 'Ice Elves', disposition: 'neutral', tradeModifier: 1.2, expeditionModifier: 0.9 },
      { id: 'frost-beasts', name: 'Frost Beasts', disposition: 'hostile', tradeModifier: 2.0, expeditionModifier: 1.6 },
    ],
    lore: [
      { id: 'frozen-citadel', title: 'The Frozen Citadel', text: 'A fortress of ice stands eternal, guarding secrets of a lost civilization.', discoveredByExploration: true },
    ],
    landmarks: [
      { id: 'ice-cave', name: 'Crystal Ice Cave', icon: '\u{1F9CA}', description: 'A cave lined with crystalline ice that amplifies magical energy.', benefit: '+25% essence drops', mapX: 38, mapY: 3, discovered: false },
    ],
    bosses: [
      { id: 'frost-titan', name: 'Frost Titan', level: 12, icon: '\u{1F9CC}', mapX: 42, mapY: 2 },
    ],
    connections: ['silverstone-mountains'],
    unlockRequirements: { guildLevel: 6, researchIds: ['cold-resistance'], questIds: [] },
    isHidden: false,
    discoveredByDefault: false,
    weatherOverrides: { hot: false },
    encounterTable: [
      { id: 'blizzard', name: 'Blizzard', weight: 25, minLevel: 5 },
      { id: 'ice-wolf', name: 'Dire Ice Wolf', weight: 20, minLevel: 4 },
      { id: 'frozen-treasure', name: 'Frozen Treasure', weight: 15, minLevel: 3 },
      { id: 'ice-elemental', name: 'Ice Elemental', weight: 25, minLevel: 6 },
      { id: 'aurora', name: 'Aurora Phenomenon', weight: 15, minLevel: 1 },
    ],
    merchantInventory: [
      { itemId: 'fur-cloak', name: 'Frostguard Cloak', price: 180, stock: 2 },
      { itemId: 'ice-pick', name: 'Enchanted Ice Pick', price: 140, stock: 3 },
    ],
    craftingRecipes: ['frost-blade', 'ice-armor', 'warming-potion'],
    outpostSlots: 2,
    musicTheme: 'tundra_wind',
    claimable: true,
    caravanRoutes: [
      { targetRegionId: 'silverstone-mountains', travelDays: 3, goods: ['essence', 'ore'] },
    ],
  },

  // T-1079: Swamp region
  {
    id: 'mistfen-swamp',
    name: 'Mistfen Marshes',
    biome: BIOMES.swamp,
    mapX: 35, mapY: 65, mapRadius: 13,
    climate: 'tropical',
    difficulty: 4,
    dangerLevel: 4,
    resources: [
      { type: 'herbs', name: 'Swamp Lotus', abundance: 0.85, regenRatePerDay: 35, maxCapacity: 350, depleted: false },
      { type: 'water', name: 'Bog Water', abundance: 0.9, regenRatePerDay: 50, maxCapacity: 500, depleted: false },
      { type: 'essence', name: 'Miasma Essence', abundance: 0.4, regenRatePerDay: 10, maxCapacity: 100, depleted: false },
    ],
    factions: [
      { id: 'marsh-witches', name: 'Marsh Witches', disposition: 'neutral', tradeModifier: 1.1, expeditionModifier: 1.0 },
      { id: 'bog-trolls', name: 'Bog Trolls', disposition: 'hostile', tradeModifier: 1.5, expeditionModifier: 1.3 },
    ],
    lore: [
      { id: 'mistfen-legend', title: 'The Sinking City', text: 'An entire city sank into the marshes centuries ago. Its treasures remain below.', discoveredByExploration: true },
    ],
    landmarks: [
      { id: 'witch-hut', name: 'Witch\'s Hut', icon: '\u{1F3E0}', description: 'A rickety hut where a powerful alchemist plies her trade.', benefit: '+15% alchemy output', mapX: 33, mapY: 68, discovered: false },
    ],
    bosses: [
      { id: 'swamp-hydra', name: 'Mistfen Hydra', level: 7, icon: '\u{1F40A}', mapX: 37, mapY: 70 },
    ],
    connections: ['elderwood-forest', 'suncrest-coast', 'verdant-plains'],
    unlockRequirements: { guildLevel: 3, researchIds: [], questIds: [] },
    isHidden: false,
    discoveredByDefault: false,
    weatherOverrides: { snowy: false },
    encounterTable: [
      { id: 'bog-creature', name: 'Bog Creature', weight: 25, minLevel: 2 },
      { id: 'will-o-wisp', name: 'Will-o\'-the-Wisp', weight: 20, minLevel: 3 },
      { id: 'herb-patch', name: 'Rare Herb Patch', weight: 25, minLevel: 1 },
      { id: 'quicksand', name: 'Quicksand Trap', weight: 15, minLevel: 2 },
      { id: 'sunken-ruin', name: 'Sunken Ruins', weight: 15, minLevel: 4 },
    ],
    merchantInventory: [
      { itemId: 'antidote', name: 'Universal Antidote', price: 60, stock: 10 },
      { itemId: 'glow-lantern', name: 'Glow Lantern', price: 90, stock: 3 },
      { itemId: 'bog-boots', name: 'Bog Waders', price: 110, stock: 2 },
    ],
    craftingRecipes: ['poison-blade', 'healing-potion', 'swamp-shield'],
    outpostSlots: 3,
    musicTheme: 'swamp_eerie',
    claimable: true,
    caravanRoutes: [
      { targetRegionId: 'elderwood-forest', travelDays: 2, goods: ['herbs', 'essence'] },
      { targetRegionId: 'verdant-plains', travelDays: 1, goods: ['herbs', 'water'] },
    ],
  },

  // T-1080: Plains region
  {
    id: 'verdant-plains',
    name: 'Verdant Plains',
    biome: BIOMES.plains,
    mapX: 50, mapY: 50, mapRadius: 18,
    climate: 'temperate',
    difficulty: 1,
    dangerLevel: 1,
    resources: [
      { type: 'food', name: 'Wheat & Grain', abundance: 0.95, regenRatePerDay: 60, maxCapacity: 700, depleted: false },
      { type: 'wood', name: 'Plains Wood', abundance: 0.4, regenRatePerDay: 15, maxCapacity: 150, depleted: false },
      { type: 'water', name: 'River Water', abundance: 0.8, regenRatePerDay: 40, maxCapacity: 400, depleted: false },
    ],
    factions: [
      { id: 'farmers-union', name: 'Farmers\' Union', disposition: 'friendly', tradeModifier: 0.85, expeditionModifier: 0.9 },
    ],
    lore: [
      { id: 'plains-founding', title: 'The Founding Fields', text: 'The first guilds were established here, in the fertile heart of the plains.', discoveredByExploration: false },
    ],
    landmarks: [
      { id: 'windmill', name: 'Grand Windmill', icon: '\u{1F3E1}', description: 'A massive windmill that feeds the region. A symbol of prosperity.', benefit: '+10% food production', mapX: 52, mapY: 48, discovered: false },
    ],
    bosses: [
      { id: 'plains-colossus', name: 'Plains Colossus', level: 4, icon: '\u{1F9CC}', mapX: 55, mapY: 52 },
    ],
    connections: ['elderwood-forest', 'suncrest-coast', 'mistfen-swamp', 'sunscorch-desert'],
    unlockRequirements: { guildLevel: 1, researchIds: [], questIds: [] },
    isHidden: false,
    discoveredByDefault: true,
    weatherOverrides: {},
    encounterTable: [
      { id: 'wild-horse', name: 'Wild Horse Herd', weight: 25, minLevel: 1 },
      { id: 'bandit-raid', name: 'Bandit Raid', weight: 20, minLevel: 2 },
      { id: 'travelling-merchant', name: 'Travelling Merchant', weight: 30, minLevel: 1 },
      { id: 'crop-blight', name: 'Crop Blight', weight: 10, minLevel: 1 },
      { id: 'harvest-festival', name: 'Harvest Festival', weight: 15, minLevel: 1 },
    ],
    merchantInventory: [
      { itemId: 'grain-sack', name: 'Grain Sack', price: 20, stock: 30 },
      { itemId: 'ox-cart', name: 'Ox Cart', price: 200, stock: 1 },
      { itemId: 'farm-tools', name: 'Farm Tool Set', price: 75, stock: 5 },
    ],
    craftingRecipes: ['bread', 'leather-armor', 'farm-expansion'],
    outpostSlots: 5,
    musicTheme: 'plains_pastoral',
    claimable: true,
    caravanRoutes: [
      { targetRegionId: 'elderwood-forest', travelDays: 1, goods: ['food', 'water'] },
      { targetRegionId: 'suncrest-coast', travelDays: 1, goods: ['food'] },
      { targetRegionId: 'mistfen-swamp', travelDays: 1, goods: ['food', 'wood'] },
    ],
  },

  // T-1081: Volcanic region
  {
    id: 'volcanic-caldera',
    name: 'Embercrest Caldera',
    biome: BIOMES.volcanic,
    mapX: 65, mapY: 10, mapRadius: 12,
    climate: 'arid',
    difficulty: 9,
    dangerLevel: 9,
    resources: [
      { type: 'ore', name: 'Obsidian Ore', abundance: 0.7, regenRatePerDay: 12, maxCapacity: 120, depleted: false },
      { type: 'essence', name: 'Fire Essence', abundance: 0.6, regenRatePerDay: 10, maxCapacity: 100, depleted: false },
      { type: 'stone', name: 'Volcanic Rock', abundance: 0.8, regenRatePerDay: 30, maxCapacity: 350, depleted: false },
    ],
    factions: [
      { id: 'fire-dwarves', name: 'Fire Dwarves', disposition: 'neutral', tradeModifier: 1.3, expeditionModifier: 1.0 },
      { id: 'lava-drakes', name: 'Lava Drakes', disposition: 'hostile', tradeModifier: 2.0, expeditionModifier: 1.8 },
    ],
    lore: [
      { id: 'caldera-secret', title: 'The Heart of Fire', text: 'Deep within the caldera burns a fire that has never gone out — the Heart of the World.', discoveredByExploration: true },
    ],
    landmarks: [
      { id: 'obsidian-forge', name: 'Obsidian Forge', icon: '\u{2694}', description: 'A legendary forge powered by magma. Only the bravest smiths dare use it.', benefit: '+25% weapon quality', mapX: 67, mapY: 8, discovered: false },
    ],
    bosses: [
      { id: 'fire-lord', name: 'The Fire Lord', level: 15, icon: '\u{1F525}', mapX: 63, mapY: 7 },
    ],
    connections: ['silverstone-mountains', 'sunscorch-desert'],
    unlockRequirements: { guildLevel: 8, researchIds: ['heat-resistance', 'advanced-mining'], questIds: ['mountain-drake-slain'] },
    isHidden: false,
    discoveredByDefault: false,
    weatherOverrides: { rain: false, snowy: false, foggy: false },
    encounterTable: [
      { id: 'lava-flow', name: 'Lava Flow', weight: 20, minLevel: 6 },
      { id: 'fire-elemental', name: 'Fire Elemental', weight: 25, minLevel: 7 },
      { id: 'magma-pool', name: 'Magma Pool Discovery', weight: 15, minLevel: 5 },
      { id: 'lava-drake', name: 'Young Lava Drake', weight: 25, minLevel: 8 },
      { id: 'obsidian-deposit', name: 'Obsidian Deposit', weight: 15, minLevel: 5 },
    ],
    merchantInventory: [
      { itemId: 'fireproof-cloak', name: 'Fireproof Cloak', price: 350, stock: 1 },
      { itemId: 'obsidian-blade', name: 'Obsidian Blade', price: 500, stock: 1 },
    ],
    craftingRecipes: ['obsidian-armor', 'fire-enchant', 'lava-forge-mastery'],
    outpostSlots: 1,
    musicTheme: 'volcanic_rumble',
    claimable: false,
    caravanRoutes: [
      { targetRegionId: 'silverstone-mountains', travelDays: 3, goods: ['ore', 'essence'] },
    ],
  },
];

/**
 * T-1112: Hidden regions discovered through rare expedition findings
 */
export const HIDDEN_REGIONS: RegionDefinition[] = [
  {
    id: 'celestial-isle',
    name: 'Celestial Isle',
    biome: { id: 'celestial', name: 'Celestial', color: 0x9d4edd, bgColor: '#9d4edd', icon: '\u{2728}', description: 'A floating island bathed in perpetual twilight. Reality itself is thin here.' },
    mapX: 15, mapY: 85, mapRadius: 10,
    climate: 'temperate',
    difficulty: 10,
    dangerLevel: 10,
    resources: [
      { type: 'essence', name: 'Celestial Essence', abundance: 0.9, regenRatePerDay: 15, maxCapacity: 150, depleted: false },
    ],
    factions: [
      { id: 'starborn', name: 'The Starborn', disposition: 'neutral', tradeModifier: 1.5, expeditionModifier: 0.8 },
    ],
    lore: [
      { id: 'celestial-origin', title: 'Beyond the Veil', text: 'The isle exists between worlds, visible only to those who have proven their worth.', discoveredByExploration: true },
    ],
    landmarks: [
      { id: 'star-altar', name: 'Star Altar', icon: '\u{2B50}', description: 'An altar that channels celestial energy. Offerings here yield great power.', benefit: '+50% essence drops', mapX: 17, mapY: 83, discovered: false },
    ],
    bosses: [
      { id: 'celestial-warden', name: 'Celestial Warden', level: 20, icon: '\u{1F47C}', mapX: 13, mapY: 87 },
    ],
    connections: [],
    unlockRequirements: { guildLevel: 10, researchIds: ['planar-navigation'], questIds: ['fire-lord-defeated'] },
    isHidden: true,
    discoveredByDefault: false,
    weatherOverrides: {},
    encounterTable: [
      { id: 'star-guardian', name: 'Star Guardian', weight: 30, minLevel: 10 },
      { id: 'celestial-puzzle', name: 'Celestial Puzzle', weight: 25, minLevel: 8 },
      { id: 'astral-rift', name: 'Astral Rift', weight: 20, minLevel: 9 },
      { id: 'star-shower', name: 'Star Shower', weight: 25, minLevel: 7 },
    ],
    merchantInventory: [
      { itemId: 'starlight-shard', name: 'Starlight Shard', price: 1000, stock: 1 },
    ],
    craftingRecipes: ['celestial-weapon', 'astral-armor'],
    outpostSlots: 1,
    musicTheme: 'celestial_ethereal',
    claimable: false,
    caravanRoutes: [],
  },
];

/**
 * Get all region definitions (visible + hidden that have been discovered).
 */
export function getAllRegions(): RegionDefinition[] {
  return [...REGION_DEFINITIONS, ...HIDDEN_REGIONS];
}

/**
 * Find a region by ID.
 */
export function getRegionById(id: string): RegionDefinition | undefined {
  return getAllRegions().find(r => r.id === id);
}

/**
 * T-1109: Get connectivity graph.
 */
export function getRegionConnections(): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const region of getAllRegions()) {
    graph[region.id] = region.connections;
  }
  return graph;
}

/**
 * T-1089: Calculate travel time between two connected regions.
 * Returns days, or -1 if not directly connected.
 */
export function getTravelTime(fromId: string, toId: string): number {
  const from = getRegionById(fromId);
  if (!from) return -1;

  const route = from.caravanRoutes.find(r => r.targetRegionId === toId);
  if (route) return route.travelDays;

  // Check if directly connected
  if (from.connections.includes(toId)) {
    // Estimate based on map distance
    const to = getRegionById(toId);
    if (!to) return -1;
    const dx = from.mapX - to.mapX;
    const dy = from.mapY - to.mapY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return Math.max(1, Math.round(dist / 15));
  }

  return -1;
}

/**
 * T-1134: Calculate distance between two map points.
 */
export function calculateMapDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * T-1133: Grid coordinate for a region.
 */
export function getGridCoordinate(mapX: number, mapY: number): string {
  const col = String.fromCharCode(65 + Math.floor(mapX / 10)); // A-J
  const row = Math.floor(mapY / 10) + 1; // 1-10
  return `${col}${row}`;
}
