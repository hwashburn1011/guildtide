import { ItemCategory, ItemRarity, ResourceType } from '../../../shared/src/enums.js';

export interface ItemEffect {
  /** Stat bonuses applied when equipped (additive) */
  statBonuses?: Partial<Record<'strength' | 'agility' | 'intellect' | 'endurance' | 'luck', number>>;
  /** Multiplier on resource production when hero is assigned to a building (1.0 = no change) */
  resourceBonuses?: Partial<Record<ResourceType, number>>;
  /** Weather resistance — reduces penalty from matching weather conditions */
  weatherResistances?: string[];
  /** Expedition success bonus (additive percentage, e.g. 5 = +5%) */
  expeditionBonus?: number;
  /** Building production multiplier (e.g. 0.1 = +10%) */
  buildingBonus?: number;
}

export interface ItemTemplate {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  effects: ItemEffect;
  craftable: boolean;
  craftCost: Partial<Record<ResourceType, number>> | null;
}

export const ITEM_TEMPLATES: ItemTemplate[] = [
  // ========== WEAPONS (5) ==========
  {
    id: 'weapon_rusty_sword',
    name: 'Rusty Sword',
    description: 'A battered blade that still holds an edge. Better than bare fists.',
    category: ItemCategory.Weapon,
    rarity: ItemRarity.Common,
    effects: {
      statBonuses: { strength: 2 },
      expeditionBonus: 3,
    },
    craftable: true,
    craftCost: { [ResourceType.Ore]: 10, [ResourceType.Gold]: 5 },
  },
  {
    id: 'weapon_iron_axe',
    name: 'Iron Axe',
    description: 'A sturdy axe forged from solid iron. Cleaves through obstacles with ease.',
    category: ItemCategory.Weapon,
    rarity: ItemRarity.Common,
    effects: {
      statBonuses: { strength: 3, endurance: 1 },
      expeditionBonus: 5,
    },
    craftable: true,
    craftCost: { [ResourceType.Ore]: 15, [ResourceType.Wood]: 5, [ResourceType.Gold]: 10 },
  },
  {
    id: 'weapon_hunters_bow',
    name: "Hunter's Bow",
    description: 'A recurve bow crafted from flexible yew. Ideal for ranging and scouting.',
    category: ItemCategory.Weapon,
    rarity: ItemRarity.Uncommon,
    effects: {
      statBonuses: { agility: 3, luck: 1 },
      expeditionBonus: 7,
    },
    craftable: true,
    craftCost: { [ResourceType.Wood]: 20, [ResourceType.Herbs]: 5, [ResourceType.Gold]: 15 },
  },
  {
    id: 'weapon_storm_staff',
    name: 'Storm Staff',
    description: 'A gnarled staff crackling with residual lightning. Channels arcane energy.',
    category: ItemCategory.Weapon,
    rarity: ItemRarity.Rare,
    effects: {
      statBonuses: { intellect: 4, luck: 2 },
      expeditionBonus: 10,
      weatherResistances: ['stormy'],
    },
    craftable: true,
    craftCost: { [ResourceType.Wood]: 15, [ResourceType.Essence]: 10, [ResourceType.Gold]: 30 },
  },
  {
    id: 'weapon_legendary_blade',
    name: 'Legendary Blade',
    description: 'An ancient weapon of immense power. Its edge never dulls.',
    category: ItemCategory.Weapon,
    rarity: ItemRarity.Legendary,
    effects: {
      statBonuses: { strength: 6, agility: 3, endurance: 2 },
      expeditionBonus: 15,
    },
    craftable: true,
    craftCost: { [ResourceType.Ore]: 40, [ResourceType.Essence]: 20, [ResourceType.Gold]: 100 },
  },

  // ========== ARMOR (5) ==========
  {
    id: 'armor_leather_vest',
    name: 'Leather Vest',
    description: 'Simple but reliable protection made from tanned hides.',
    category: ItemCategory.Armor,
    rarity: ItemRarity.Common,
    effects: {
      statBonuses: { endurance: 2 },
      expeditionBonus: 2,
    },
    craftable: true,
    craftCost: { [ResourceType.Food]: 5, [ResourceType.Gold]: 5 },
  },
  {
    id: 'armor_chainmail',
    name: 'Chainmail',
    description: 'Interlocking iron rings woven into a sturdy shirt. Excellent defense.',
    category: ItemCategory.Armor,
    rarity: ItemRarity.Uncommon,
    effects: {
      statBonuses: { endurance: 4, strength: 1 },
      expeditionBonus: 5,
    },
    craftable: true,
    craftCost: { [ResourceType.Ore]: 20, [ResourceType.Gold]: 15 },
  },
  {
    id: 'armor_scouts_cloak',
    name: "Scout's Cloak",
    description: 'A light cloak that blends with the environment. Favored by scouts and rangers.',
    category: ItemCategory.Armor,
    rarity: ItemRarity.Uncommon,
    effects: {
      statBonuses: { agility: 3, luck: 2 },
      expeditionBonus: 6,
      weatherResistances: ['rainy'],
    },
    craftable: true,
    craftCost: { [ResourceType.Herbs]: 10, [ResourceType.Wood]: 5, [ResourceType.Gold]: 15 },
  },
  {
    id: 'armor_mystic_robes',
    name: 'Mystic Robes',
    description: 'Enchanted robes that amplify magical potential and shield the mind.',
    category: ItemCategory.Armor,
    rarity: ItemRarity.Rare,
    effects: {
      statBonuses: { intellect: 3, endurance: 2, luck: 1 },
      expeditionBonus: 8,
      weatherResistances: ['foggy'],
    },
    craftable: true,
    craftCost: { [ResourceType.Herbs]: 15, [ResourceType.Essence]: 10, [ResourceType.Gold]: 25 },
  },
  {
    id: 'armor_dragonscale_plate',
    name: 'Dragonscale Plate',
    description: 'Legendary armor forged from the scales of an ancient wyrm. Nearly impervious.',
    category: ItemCategory.Armor,
    rarity: ItemRarity.Legendary,
    effects: {
      statBonuses: { endurance: 7, strength: 3 },
      expeditionBonus: 12,
      weatherResistances: ['stormy', 'snowy', 'hot'],
    },
    craftable: true,
    craftCost: { [ResourceType.Ore]: 50, [ResourceType.Essence]: 25, [ResourceType.Gold]: 120 },
  },

  // ========== CHARMS (5) ==========
  {
    id: 'charm_lucky_coin',
    name: 'Lucky Coin',
    description: 'A worn coin said to bring fortune to its bearer.',
    category: ItemCategory.Charm,
    rarity: ItemRarity.Common,
    effects: {
      statBonuses: { luck: 3 },
      expeditionBonus: 2,
    },
    craftable: true,
    craftCost: { [ResourceType.Gold]: 20 },
  },
  {
    id: 'charm_rain_charm',
    name: 'Rain Charm',
    description: 'A small blue crystal that hums softly during downpours.',
    category: ItemCategory.Charm,
    rarity: ItemRarity.Common,
    effects: {
      statBonuses: { endurance: 1 },
      weatherResistances: ['rainy', 'stormy'],
    },
    craftable: true,
    craftCost: { [ResourceType.Water]: 15, [ResourceType.Gold]: 10 },
  },
  {
    id: 'charm_sun_pendant',
    name: 'Sun Pendant',
    description: 'A golden pendant that radiates gentle warmth.',
    category: ItemCategory.Charm,
    rarity: ItemRarity.Uncommon,
    effects: {
      statBonuses: { endurance: 2 },
      weatherResistances: ['snowy', 'hot'],
      resourceBonuses: { [ResourceType.Food]: 0.1 },
    },
    craftable: true,
    craftCost: { [ResourceType.Gold]: 30, [ResourceType.Essence]: 5 },
  },
  {
    id: 'charm_frost_ward',
    name: 'Frost Ward',
    description: 'An enchanted ward that shields against bitter cold.',
    category: ItemCategory.Charm,
    rarity: ItemRarity.Rare,
    effects: {
      statBonuses: { endurance: 3, intellect: 1 },
      weatherResistances: ['snowy', 'windy'],
    },
    craftable: true,
    craftCost: { [ResourceType.Water]: 15, [ResourceType.Essence]: 10, [ResourceType.Gold]: 25 },
  },
  {
    id: 'charm_essence_shard',
    name: 'Essence Shard',
    description: 'A crystallized fragment of pure magical essence. Amplifies all abilities.',
    category: ItemCategory.Charm,
    rarity: ItemRarity.Legendary,
    effects: {
      statBonuses: { strength: 2, agility: 2, intellect: 2, endurance: 2, luck: 2 },
      expeditionBonus: 8,
      weatherResistances: ['stormy', 'snowy', 'hot', 'foggy'],
    },
    craftable: true,
    craftCost: { [ResourceType.Essence]: 30, [ResourceType.Gold]: 80 },
  },

  // ========== TOOLS (5) ==========
  {
    id: 'tool_farming_hoe',
    name: 'Farming Hoe',
    description: 'A well-balanced hoe that makes tilling effortless.',
    category: ItemCategory.Tool,
    rarity: ItemRarity.Common,
    effects: {
      buildingBonus: 0.1,
      resourceBonuses: { [ResourceType.Food]: 0.15 },
    },
    craftable: true,
    craftCost: { [ResourceType.Wood]: 10, [ResourceType.Ore]: 5 },
  },
  {
    id: 'tool_mining_pick',
    name: 'Mining Pick',
    description: 'A reinforced pick designed for breaking through stone and ore.',
    category: ItemCategory.Tool,
    rarity: ItemRarity.Common,
    effects: {
      buildingBonus: 0.1,
      resourceBonuses: { [ResourceType.Ore]: 0.15, [ResourceType.Stone]: 0.1 },
    },
    craftable: true,
    craftCost: { [ResourceType.Ore]: 10, [ResourceType.Wood]: 5 },
  },
  {
    id: 'tool_alchemy_kit',
    name: 'Alchemy Kit',
    description: 'A portable kit containing vials, burners, and reagents for field alchemy.',
    category: ItemCategory.Tool,
    rarity: ItemRarity.Uncommon,
    effects: {
      buildingBonus: 0.15,
      resourceBonuses: { [ResourceType.Herbs]: 0.15, [ResourceType.Essence]: 0.1 },
    },
    craftable: true,
    craftCost: { [ResourceType.Herbs]: 15, [ResourceType.Gold]: 20 },
  },
  {
    id: 'tool_cartographers_lens',
    name: "Cartographer's Lens",
    description: 'A magical lens that reveals hidden paths and distant landmarks.',
    category: ItemCategory.Tool,
    rarity: ItemRarity.Rare,
    effects: {
      expeditionBonus: 10,
      statBonuses: { intellect: 2 },
    },
    craftable: true,
    craftCost: { [ResourceType.Essence]: 10, [ResourceType.Gold]: 30 },
  },
  {
    id: 'tool_master_toolkit',
    name: 'Master Toolkit',
    description: 'A comprehensive set of precision instruments for any trade.',
    category: ItemCategory.Tool,
    rarity: ItemRarity.Legendary,
    effects: {
      buildingBonus: 0.25,
      resourceBonuses: {
        [ResourceType.Food]: 0.1,
        [ResourceType.Wood]: 0.1,
        [ResourceType.Stone]: 0.1,
        [ResourceType.Ore]: 0.1,
        [ResourceType.Herbs]: 0.1,
      },
    },
    craftable: true,
    craftCost: { [ResourceType.Ore]: 30, [ResourceType.Wood]: 20, [ResourceType.Essence]: 15, [ResourceType.Gold]: 60 },
  },

  // ========== RELICS (4) ==========
  {
    id: 'relic_ancient_compass',
    name: 'Ancient Compass',
    description: 'A compass that points toward hidden treasures and lost places.',
    category: ItemCategory.Relic,
    rarity: ItemRarity.Rare,
    effects: {
      expeditionBonus: 12,
      statBonuses: { luck: 3 },
    },
    craftable: false,
    craftCost: null,
  },
  {
    id: 'relic_storm_crystal',
    name: 'Storm Crystal',
    description: 'A pulsating crystal that absorbs storm energy and converts it to power.',
    category: ItemCategory.Relic,
    rarity: ItemRarity.Rare,
    effects: {
      statBonuses: { intellect: 3, endurance: 2 },
      weatherResistances: ['stormy', 'rainy', 'windy'],
      resourceBonuses: { [ResourceType.Essence]: 0.2 },
    },
    craftable: false,
    craftCost: null,
  },
  {
    id: 'relic_merchants_seal',
    name: "Merchant's Seal",
    description: 'An official seal granting favorable trade terms across regions.',
    category: ItemCategory.Relic,
    rarity: ItemRarity.Rare,
    effects: {
      statBonuses: { luck: 2, intellect: 2 },
      resourceBonuses: { [ResourceType.Gold]: 0.15 },
    },
    craftable: false,
    craftCost: null,
  },
  {
    id: 'relic_scholars_tome',
    name: "Scholar's Tome",
    description: 'A thick tome of accumulated knowledge. Accelerates learning and research.',
    category: ItemCategory.Relic,
    rarity: ItemRarity.Legendary,
    effects: {
      statBonuses: { intellect: 5, luck: 2 },
      buildingBonus: 0.15,
      resourceBonuses: { [ResourceType.Essence]: 0.15 },
    },
    craftable: false,
    craftCost: null,
  },

  // ========== SEEDS (3) ==========
  {
    id: 'seed_moonpetal',
    name: 'Moonpetal Seed',
    description: 'A luminescent seed that blooms under moonlight, yielding rare herbs.',
    category: ItemCategory.Seed,
    rarity: ItemRarity.Uncommon,
    effects: {
      resourceBonuses: { [ResourceType.Herbs]: 0.2 },
      buildingBonus: 0.1,
    },
    craftable: true,
    craftCost: { [ResourceType.Herbs]: 10, [ResourceType.Water]: 10, [ResourceType.Gold]: 10 },
  },
  {
    id: 'seed_ironwood',
    name: 'Ironwood Sapling',
    description: 'A sapling of the legendary ironwood tree. Produces exceptionally hard timber.',
    category: ItemCategory.Seed,
    rarity: ItemRarity.Rare,
    effects: {
      resourceBonuses: { [ResourceType.Wood]: 0.25 },
      buildingBonus: 0.1,
    },
    craftable: true,
    craftCost: { [ResourceType.Wood]: 20, [ResourceType.Water]: 15, [ResourceType.Gold]: 20 },
  },
  {
    id: 'seed_cloudberry',
    name: 'Cloudberry Bush',
    description: 'A bush that grows berries infused with sky essence. Sustains and invigorates.',
    category: ItemCategory.Seed,
    rarity: ItemRarity.Rare,
    effects: {
      resourceBonuses: { [ResourceType.Food]: 0.2, [ResourceType.Essence]: 0.05 },
      buildingBonus: 0.1,
    },
    craftable: true,
    craftCost: { [ResourceType.Food]: 15, [ResourceType.Essence]: 5, [ResourceType.Gold]: 25 },
  },

  // ========== TRADE PERMITS (3) ==========
  {
    id: 'permit_local_trade',
    name: 'Local Trade License',
    description: 'An official permit allowing trade within the local region.',
    category: ItemCategory.TradePermit,
    rarity: ItemRarity.Common,
    effects: {
      resourceBonuses: { [ResourceType.Gold]: 0.05 },
    },
    craftable: true,
    craftCost: { [ResourceType.Gold]: 25 },
  },
  {
    id: 'permit_regional_caravan',
    name: 'Regional Caravan Pass',
    description: 'A pass authorizing caravans to traverse regional borders.',
    category: ItemCategory.TradePermit,
    rarity: ItemRarity.Uncommon,
    effects: {
      resourceBonuses: { [ResourceType.Gold]: 0.1 },
      expeditionBonus: 5,
    },
    craftable: true,
    craftCost: { [ResourceType.Gold]: 50 },
  },
  {
    id: 'permit_master_merchant',
    name: 'Master Merchant Writ',
    description: 'A prestigious writ granting access to exclusive trade networks.',
    category: ItemCategory.TradePermit,
    rarity: ItemRarity.Rare,
    effects: {
      resourceBonuses: { [ResourceType.Gold]: 0.2 },
      expeditionBonus: 8,
      statBonuses: { luck: 2 },
    },
    craftable: true,
    craftCost: { [ResourceType.Gold]: 100, [ResourceType.Essence]: 10 },
  },
];

/** Look up a template by ID */
export function getItemTemplate(templateId: string): ItemTemplate | undefined {
  return ITEM_TEMPLATES.find(t => t.id === templateId);
}

/** Get all templates in a category */
export function getTemplatesByCategory(category: ItemCategory): ItemTemplate[] {
  return ITEM_TEMPLATES.filter(t => t.category === category);
}

/** Get all craftable templates */
export function getCraftableTemplates(): ItemTemplate[] {
  return ITEM_TEMPLATES.filter(t => t.craftable);
}
