/**
 * Building specialization trees for each building type.
 * Each building can specialize at level 5, choosing one of two paths.
 * Specializations provide unique bonuses and alter production.
 *
 * T-0291: Building data schema extensions
 * T-0292: Building base class shared logic
 */
import { BuildingType, ResourceType } from '../../../shared/src/enums';

export interface BuildingSpecialization {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  bonuses: {
    productionMultiplier?: Partial<Record<ResourceType, number>>;
    storageBonusPercent?: number;
    workerEfficiencyBonus?: number;
    specialAbility?: string;
    maintenanceReduction?: number;
  };
}

export interface BuildingSpecTree {
  buildingType: BuildingType;
  specializationLevel: number;
  paths: [BuildingSpecialization, BuildingSpecialization];
}

export interface BuildingBehavior {
  buildingType: BuildingType;
  /** Unique mechanic description */
  mechanic: string;
  /** Resources consumed per production tick */
  inputCosts?: Partial<Record<ResourceType, number>>;
  /** Chance-based secondary output (0-1) */
  bonusOutputChance?: number;
  bonusOutput?: Partial<Record<ResourceType, number>>;
  /** Workers matching this role get efficiency bonus */
  preferredRole?: string;
  /** Worker skill bonus multiplier when role matches */
  roleMatchBonus: number;
  /** Base maintenance cost per hour */
  maintenanceCost: Partial<Record<ResourceType, number>>;
  /** Construction time in seconds per level */
  constructionTimePerLevel: number;
  /** Possible building events */
  events: BuildingEventTemplate[];
}

export interface BuildingEventTemplate {
  id: string;
  name: string;
  description: string;
  triggerChance: number; // per hour
  timeOfDay?: 'day' | 'night' | 'any';
  effects: {
    productionBoost?: number;
    productionPenalty?: number;
    resourceGrant?: Partial<Record<ResourceType, number>>;
    resourceDrain?: Partial<Record<ResourceType, number>>;
    xpGrant?: number;
    duration?: number; // seconds
  };
}

export interface BuildingLoreEntry {
  level: number;
  title: string;
  text: string;
}

export interface BuildingMilestone {
  level: number;
  reward: {
    resources?: Partial<Record<ResourceType, number>>;
    xp?: number;
    label: string;
  };
}

/** Specialization trees for all 10 building types */
export const BUILDING_SPECIALIZATIONS: Record<BuildingType, BuildingSpecTree> = {
  [BuildingType.Farm]: {
    buildingType: BuildingType.Farm,
    specializationLevel: 5,
    paths: [
      {
        id: 'farm_orchard',
        name: 'Orchard',
        description: 'Specialize in fruit trees for steady, high-quality food production with less weather sensitivity.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Food]: 1.4 },
          specialAbility: 'weather_resistance',
          workerEfficiencyBonus: 0.1,
        },
      },
      {
        id: 'farm_greenhouse',
        name: 'Greenhouse',
        description: 'Build enclosed growing spaces for year-round herb and food production, ignoring seasons.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Food]: 1.15, [ResourceType.Herbs]: 0.8 },
          specialAbility: 'season_immunity',
          storageBonusPercent: 20,
        },
      },
    ],
  },
  [BuildingType.LumberMill]: {
    buildingType: BuildingType.LumberMill,
    specializationLevel: 5,
    paths: [
      {
        id: 'lumbermill_sawmill',
        name: 'Sawmill',
        description: 'Industrial processing for maximum wood output and reduced waste.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Wood]: 1.5 },
          maintenanceReduction: 0.2,
        },
      },
      {
        id: 'lumbermill_arborist',
        name: 'Arborist Grove',
        description: 'Sustainable forestry producing wood and rare herbs from ancient trees.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Wood]: 1.15, [ResourceType.Herbs]: 0.4 },
          workerEfficiencyBonus: 0.15,
        },
      },
    ],
  },
  [BuildingType.Quarry]: {
    buildingType: BuildingType.Quarry,
    specializationLevel: 5,
    paths: [
      {
        id: 'quarry_deep_mine',
        name: 'Deep Excavation',
        description: 'Dig deeper for premium stone and occasional ore deposits.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Stone]: 1.4, [ResourceType.Ore]: 0.3 },
          maintenanceReduction: -0.1, // increased maintenance
        },
      },
      {
        id: 'quarry_sculptor',
        name: 'Sculptor\'s Yard',
        description: 'Refined stonework that converts raw stone into gold-value artisan goods.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Stone]: 1.1, [ResourceType.Gold]: 0.5 },
          workerEfficiencyBonus: 0.2,
        },
      },
    ],
  },
  [BuildingType.HerbGarden]: {
    buildingType: BuildingType.HerbGarden,
    specializationLevel: 5,
    paths: [
      {
        id: 'herbgarden_apothecary',
        name: 'Apothecary Garden',
        description: 'Focus on potent medicinal herbs with essence extraction capabilities.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Herbs]: 1.3, [ResourceType.Essence]: 0.2 },
          specialAbility: 'essence_extraction',
        },
      },
      {
        id: 'herbgarden_wildgarden',
        name: 'Wild Garden',
        description: 'Let nature take its course for massive herb yields with bonus food.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Herbs]: 1.5, [ResourceType.Food]: 0.3 },
          storageBonusPercent: 15,
        },
      },
    ],
  },
  [BuildingType.Mine]: {
    buildingType: BuildingType.Mine,
    specializationLevel: 5,
    paths: [
      {
        id: 'mine_gemcutter',
        name: 'Gemcutter\'s Shaft',
        description: 'Specialize in gem extraction for high-value ore and essence.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Ore]: 1.2, [ResourceType.Essence]: 0.3 },
          specialAbility: 'gem_discovery',
        },
      },
      {
        id: 'mine_industrial',
        name: 'Industrial Mine',
        description: 'Maximize raw ore output through industrial techniques.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Ore]: 1.6 },
          maintenanceReduction: 0.15,
          workerEfficiencyBonus: 0.1,
        },
      },
    ],
  },
  [BuildingType.Well]: {
    buildingType: BuildingType.Well,
    specializationLevel: 5,
    paths: [
      {
        id: 'well_aqueduct',
        name: 'Aqueduct System',
        description: 'Build an irrigation network that boosts all adjacent farm-type buildings.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Water]: 1.5 },
          specialAbility: 'irrigation_network',
          workerEfficiencyBonus: 0.1,
        },
      },
      {
        id: 'well_spring',
        name: 'Sacred Spring',
        description: 'Tap into a mystical spring that produces water and essence.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Water]: 1.2, [ResourceType.Essence]: 0.15 },
          specialAbility: 'sacred_water',
        },
      },
    ],
  },
  [BuildingType.Workshop]: {
    buildingType: BuildingType.Workshop,
    specializationLevel: 5,
    paths: [
      {
        id: 'workshop_forge',
        name: 'Master Forge',
        description: 'Focus on metal and weapon crafting with faster crafting speeds.',
        requiredLevel: 5,
        bonuses: {
          specialAbility: 'fast_craft',
          workerEfficiencyBonus: 0.25,
          maintenanceReduction: 0.1,
        },
      },
      {
        id: 'workshop_tinkerer',
        name: 'Tinkerer\'s Lab',
        description: 'Experimental workshop that unlocks rare recipes and produces essence as byproduct.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Essence]: 0.2 },
          specialAbility: 'rare_recipes',
          storageBonusPercent: 10,
        },
      },
    ],
  },
  [BuildingType.Barracks]: {
    buildingType: BuildingType.Barracks,
    specializationLevel: 5,
    paths: [
      {
        id: 'barracks_academy',
        name: 'Hero Academy',
        description: 'Transform into a training academy with faster hero leveling and stat gains.',
        requiredLevel: 5,
        bonuses: {
          specialAbility: 'fast_training',
          workerEfficiencyBonus: 0.3,
        },
      },
      {
        id: 'barracks_garrison',
        name: 'Garrison',
        description: 'Fortified garrison that provides defensive bonuses and extra expedition slots.',
        requiredLevel: 5,
        bonuses: {
          specialAbility: 'extra_expedition_slots',
          maintenanceReduction: 0.2,
          storageBonusPercent: 15,
        },
      },
    ],
  },
  [BuildingType.Market]: {
    buildingType: BuildingType.Market,
    specializationLevel: 5,
    paths: [
      {
        id: 'market_bazaar',
        name: 'Grand Bazaar',
        description: 'Expand into a bustling trade hub with more merchants and lower fees.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Gold]: 1.5 },
          specialAbility: 'reduced_fees',
          workerEfficiencyBonus: 0.15,
        },
      },
      {
        id: 'market_auction',
        name: 'Auction House',
        description: 'High-risk, high-reward trading with volatile but potentially huge returns.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Gold]: 1.8 },
          specialAbility: 'auction_trading',
          maintenanceReduction: -0.15, // higher maintenance
        },
      },
    ],
  },
  [BuildingType.Laboratory]: {
    buildingType: BuildingType.Laboratory,
    specializationLevel: 5,
    paths: [
      {
        id: 'laboratory_arcane',
        name: 'Arcane Sanctum',
        description: 'Deep magical research for maximum essence production and research speed.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Essence]: 1.6 },
          specialAbility: 'research_speed',
          workerEfficiencyBonus: 0.2,
        },
      },
      {
        id: 'laboratory_alchemist',
        name: 'Alchemist\'s Tower',
        description: 'Practical alchemy turning herbs into gold and essence with conversion bonuses.',
        requiredLevel: 5,
        bonuses: {
          productionMultiplier: { [ResourceType.Essence]: 1.2, [ResourceType.Gold]: 0.4 },
          specialAbility: 'conversion_bonus',
          storageBonusPercent: 20,
        },
      },
    ],
  },
};

/** Building behaviors defining unique mechanics per building type */
export const BUILDING_BEHAVIORS: Record<BuildingType, BuildingBehavior> = {
  [BuildingType.Farm]: {
    buildingType: BuildingType.Farm,
    mechanic: 'Crop cycles with seasonal and weather modifiers. Harvest button collects stored crops.',
    preferredRole: 'farmer',
    roleMatchBonus: 1.25,
    maintenanceCost: { [ResourceType.Gold]: 2, [ResourceType.Water]: 1 },
    constructionTimePerLevel: 30,
    events: [
      {
        id: 'farm_bountiful_harvest',
        name: 'Bountiful Harvest',
        description: 'Unusually rich soil produces extra food this cycle.',
        triggerChance: 0.08,
        timeOfDay: 'day',
        effects: { productionBoost: 0.5, duration: 3600 },
      },
      {
        id: 'farm_pest_infestation',
        name: 'Pest Infestation',
        description: 'Pests have invaded the fields, reducing crop yields.',
        triggerChance: 0.05,
        timeOfDay: 'any',
        effects: { productionPenalty: 0.3, duration: 1800 },
      },
    ],
  },
  [BuildingType.LumberMill]: {
    buildingType: BuildingType.LumberMill,
    mechanic: 'Steady wood production. Higher levels unlock rare wood types.',
    preferredRole: 'hunter',
    roleMatchBonus: 1.2,
    maintenanceCost: { [ResourceType.Gold]: 3 },
    constructionTimePerLevel: 35,
    events: [
      {
        id: 'lumbermill_ancient_tree',
        name: 'Ancient Tree Discovered',
        description: 'Workers found an ancient tree yielding premium timber.',
        triggerChance: 0.06,
        timeOfDay: 'day',
        effects: { resourceGrant: { [ResourceType.Wood]: 50, [ResourceType.Essence]: 2 }, xpGrant: 10 },
      },
    ],
  },
  [BuildingType.Quarry]: {
    buildingType: BuildingType.Quarry,
    mechanic: 'Stone extraction with occasional ore bonus from deep veins.',
    preferredRole: 'blacksmith',
    roleMatchBonus: 1.2,
    maintenanceCost: { [ResourceType.Gold]: 4, [ResourceType.Wood]: 1 },
    constructionTimePerLevel: 40,
    events: [
      {
        id: 'quarry_cave_in',
        name: 'Minor Cave-In',
        description: 'A small collapse slows production temporarily.',
        triggerChance: 0.04,
        timeOfDay: 'any',
        effects: { productionPenalty: 0.4, duration: 2400 },
      },
    ],
  },
  [BuildingType.HerbGarden]: {
    buildingType: BuildingType.HerbGarden,
    mechanic: 'Herb cultivation with water consumption. Rain boosts output.',
    inputCosts: { [ResourceType.Water]: 0.1 },
    preferredRole: 'alchemist',
    roleMatchBonus: 1.3,
    maintenanceCost: { [ResourceType.Gold]: 2, [ResourceType.Water]: 2 },
    constructionTimePerLevel: 25,
    events: [
      {
        id: 'herbgarden_rare_bloom',
        name: 'Rare Bloom',
        description: 'A rare flower has bloomed, yielding precious essence.',
        triggerChance: 0.07,
        timeOfDay: 'day',
        effects: { resourceGrant: { [ResourceType.Herbs]: 20, [ResourceType.Essence]: 5 }, xpGrant: 15 },
      },
    ],
  },
  [BuildingType.Mine]: {
    buildingType: BuildingType.Mine,
    mechanic: 'Ore extraction with gem discovery chance. Deeper veins at higher levels.',
    bonusOutputChance: 0.08,
    bonusOutput: { [ResourceType.Essence]: 3 },
    preferredRole: 'blacksmith',
    roleMatchBonus: 1.3,
    maintenanceCost: { [ResourceType.Gold]: 5, [ResourceType.Wood]: 2 },
    constructionTimePerLevel: 45,
    events: [
      {
        id: 'mine_gem_vein',
        name: 'Gem Vein Discovered',
        description: 'Miners struck a rich gem vein deep underground!',
        triggerChance: 0.05,
        timeOfDay: 'any',
        effects: { resourceGrant: { [ResourceType.Ore]: 30, [ResourceType.Essence]: 8 }, xpGrant: 20 },
      },
      {
        id: 'mine_flood',
        name: 'Underground Flood',
        description: 'Water seeping into the mine shafts slows extraction.',
        triggerChance: 0.03,
        timeOfDay: 'any',
        effects: { productionPenalty: 0.5, duration: 3600 },
      },
    ],
  },
  [BuildingType.Well]: {
    buildingType: BuildingType.Well,
    mechanic: 'Water production. Boosts adjacent farm buildings through irrigation.',
    preferredRole: 'farmer',
    roleMatchBonus: 1.15,
    maintenanceCost: { [ResourceType.Gold]: 1 },
    constructionTimePerLevel: 20,
    events: [
      {
        id: 'well_spring_surge',
        name: 'Spring Surge',
        description: 'Underground spring surges, doubling water output temporarily.',
        triggerChance: 0.06,
        timeOfDay: 'any',
        effects: { productionBoost: 1.0, duration: 1800 },
      },
    ],
  },
  [BuildingType.Workshop]: {
    buildingType: BuildingType.Workshop,
    mechanic: 'Crafting station. Consumes ore and wood to produce tools and equipment.',
    inputCosts: { [ResourceType.Ore]: 0.15, [ResourceType.Wood]: 0.1 },
    preferredRole: 'blacksmith',
    roleMatchBonus: 1.35,
    maintenanceCost: { [ResourceType.Gold]: 6, [ResourceType.Ore]: 1 },
    constructionTimePerLevel: 50,
    events: [
      {
        id: 'workshop_masterwork',
        name: 'Masterwork Created',
        description: 'A craftsman produced a masterwork item of exceptional quality.',
        triggerChance: 0.04,
        timeOfDay: 'day',
        effects: { resourceGrant: { [ResourceType.Gold]: 50 }, xpGrant: 25 },
      },
    ],
  },
  [BuildingType.Barracks]: {
    buildingType: BuildingType.Barracks,
    mechanic: 'Hero training. Assigned heroes gain XP over time. More slots at higher levels.',
    inputCosts: { [ResourceType.Food]: 0.2 },
    preferredRole: 'defender',
    roleMatchBonus: 1.2,
    maintenanceCost: { [ResourceType.Gold]: 5, [ResourceType.Food]: 3 },
    constructionTimePerLevel: 45,
    events: [
      {
        id: 'barracks_sparring',
        name: 'Sparring Tournament',
        description: 'Heroes hold a sparring tournament, boosting training speed.',
        triggerChance: 0.06,
        timeOfDay: 'day',
        effects: { productionBoost: 0.4, duration: 3600, xpGrant: 15 },
      },
    ],
  },
  [BuildingType.Market]: {
    buildingType: BuildingType.Market,
    mechanic: 'Trade interface. Generates passive gold. Commission reduces with upgrades.',
    preferredRole: 'merchant',
    roleMatchBonus: 1.4,
    maintenanceCost: { [ResourceType.Gold]: 4 },
    constructionTimePerLevel: 40,
    events: [
      {
        id: 'market_merchant_caravan',
        name: 'Merchant Caravan Arrives',
        description: 'A traveling merchant caravan offers rare goods at discount.',
        triggerChance: 0.07,
        timeOfDay: 'day',
        effects: { resourceGrant: { [ResourceType.Gold]: 30 }, xpGrant: 10, duration: 7200 },
      },
      {
        id: 'market_thief',
        name: 'Pickpocket Spotted',
        description: 'A thief was caught stealing from market stalls.',
        triggerChance: 0.03,
        timeOfDay: 'night',
        effects: { resourceDrain: { [ResourceType.Gold]: 15 } },
      },
    ],
  },
  [BuildingType.Laboratory]: {
    buildingType: BuildingType.Laboratory,
    mechanic: 'Research and essence production. Boosts research speed globally.',
    inputCosts: { [ResourceType.Herbs]: 0.1 },
    preferredRole: 'alchemist',
    roleMatchBonus: 1.35,
    maintenanceCost: { [ResourceType.Gold]: 7, [ResourceType.Herbs]: 2 },
    constructionTimePerLevel: 55,
    events: [
      {
        id: 'lab_breakthrough',
        name: 'Research Breakthrough',
        description: 'A researcher made a significant discovery!',
        triggerChance: 0.05,
        timeOfDay: 'any',
        effects: { resourceGrant: { [ResourceType.Essence]: 10 }, xpGrant: 30, productionBoost: 0.3, duration: 3600 },
      },
      {
        id: 'lab_explosion',
        name: 'Chemical Mishap',
        description: 'An experiment went wrong, damaging some supplies.',
        triggerChance: 0.03,
        timeOfDay: 'any',
        effects: { resourceDrain: { [ResourceType.Herbs]: 10, [ResourceType.Essence]: 3 } },
      },
    ],
  },
};

/** Lore entries unlocked by upgrading buildings */
export const BUILDING_LORE: Record<BuildingType, BuildingLoreEntry[]> = {
  [BuildingType.Farm]: [
    { level: 1, title: 'First Seeds', text: 'The soil here is rich and dark. With care, it will sustain the guild for generations.' },
    { level: 5, title: 'The Green Revolution', text: 'Advanced irrigation techniques have transformed these simple plots into thriving farmland.' },
    { level: 10, title: 'Harvest Festival', text: 'The farm produces so bountifully that the guild holds an annual harvest celebration.' },
    { level: 15, title: 'Living Soil', text: 'The earth itself seems alive, responding to the farmers\' touch with abundant growth.' },
    { level: 20, title: 'Eden\'s Garden', text: 'Legends say the farm rivals the mythical gardens of old, where anything can grow.' },
  ],
  [BuildingType.LumberMill]: [
    { level: 1, title: 'First Timber', text: 'The steady rhythm of axes marks the beginning of the guild\'s lumber operations.' },
    { level: 5, title: 'Sawmill Innovation', text: 'A new saw design cuts through logs twice as fast as before.' },
    { level: 10, title: 'The Whispering Woods', text: 'Lumberjacks speak of hearing the trees whisper ancient secrets.' },
    { level: 15, title: 'Ironwood Discovery', text: 'Deep in the forest, wood as hard as iron has been found.' },
    { level: 20, title: 'World Tree Scion', text: 'A cutting from a mythical World Tree takes root near the mill.' },
  ],
  [BuildingType.Quarry]: [
    { level: 1, title: 'Stone Foundation', text: 'The quarry\'s first blocks will form the backbone of the guild\'s construction.' },
    { level: 5, title: 'Marble Veins', text: 'White marble veins discovered deep in the quarry walls.' },
    { level: 10, title: 'Fossil Records', text: 'Ancient fossils in the stone tell tales of creatures long forgotten.' },
    { level: 15, title: 'Crystal Cavern', text: 'A natural crystal cavern lies beneath the deepest quarry level.' },
    { level: 20, title: 'Primordial Stone', text: 'Stone from the earth\'s earliest days, infused with primal energy.' },
  ],
  [BuildingType.HerbGarden]: [
    { level: 1, title: 'Seedling Care', text: 'Delicate herbs require patience and a gentle hand to cultivate.' },
    { level: 5, title: 'Medicinal Mastery', text: 'The garden now produces herbs potent enough to cure most common ailments.' },
    { level: 10, title: 'Moonlight Herbs', text: 'Certain rare herbs only bloom under the light of a full moon.' },
    { level: 15, title: 'Living Pharmacy', text: 'Every plant in this garden serves a purpose, medicinal or magical.' },
    { level: 20, title: 'Eternal Bloom', text: 'The garden transcends seasons, blooming perpetually with magical vitality.' },
  ],
  [BuildingType.Mine]: [
    { level: 1, title: 'First Strike', text: 'The pickaxe bites into rock, revealing glints of raw ore.' },
    { level: 5, title: 'Deep Veins', text: 'Miners have reached a rich deposit that promises years of extraction.' },
    { level: 10, title: 'The Underdark', text: 'Strange luminescent crystals light the deepest tunnels naturally.' },
    { level: 15, title: 'Mithril Trace', text: 'Traces of the legendary mithril metal appear in the ore samples.' },
    { level: 20, title: 'Heart of the Mountain', text: 'At the mine\'s deepest point lies a chamber pulsing with earth magic.' },
  ],
  [BuildingType.Well]: [
    { level: 1, title: 'Clear Water', text: 'The well draws pure, clean water from an underground spring.' },
    { level: 5, title: 'Irrigation Channels', text: 'Water flows through carved channels to nourish nearby buildings.' },
    { level: 10, title: 'Artesian Flow', text: 'The well taps an artesian aquifer, water rising without pumping.' },
    { level: 15, title: 'Healing Waters', text: 'The water gains subtle healing properties from deep mineral deposits.' },
    { level: 20, title: 'Wellspring of Life', text: 'An ancient wellspring of magical water, said to grant vitality to all who drink.' },
  ],
  [BuildingType.Workshop]: [
    { level: 1, title: 'Hammer and Anvil', text: 'Simple tools and repairs keep the guild running.' },
    { level: 5, title: 'Precision Tools', text: 'New precision instruments enable finer, more valuable craftsmanship.' },
    { level: 10, title: 'Invention Age', text: 'The workshop becomes a hub of innovation, producing novel contraptions.' },
    { level: 15, title: 'Master\'s Touch', text: 'Every item crafted here bears the mark of true mastery.' },
  ],
  [BuildingType.Barracks]: [
    { level: 1, title: 'Training Grounds', text: 'A simple sparring area where heroes hone their skills.' },
    { level: 5, title: 'War Room', text: 'Strategic maps and battle plans cover the walls of the expanded barracks.' },
    { level: 10, title: 'Elite Training', text: 'Only the finest techniques are taught in these hallowed halls.' },
    { level: 15, title: 'Legendary Arena', text: 'Heroes from across the land seek to train in this renowned facility.' },
  ],
  [BuildingType.Market]: [
    { level: 1, title: 'Open Stalls', text: 'A few market stalls attract local traders with basic goods.' },
    { level: 5, title: 'Trade Routes', text: 'Established trade routes bring diverse merchants to the market.' },
    { level: 10, title: 'Merchant Guild', text: 'The market has become a recognized trade hub with its own merchant guild.' },
    { level: 15, title: 'Grand Exchange', text: 'Rare goods from distant lands flow through this legendary marketplace.' },
  ],
  [BuildingType.Laboratory]: [
    { level: 1, title: 'First Experiments', text: 'Bubbling flasks and mysterious vapors fill the fledgling laboratory.' },
    { level: 5, title: 'Distillation Mastery', text: 'The ability to distill pure essence from raw materials is achieved.' },
    { level: 10, title: 'Arcane Library', text: 'Ancient tomes and scrolls line the laboratory walls.' },
    { level: 15, title: 'Philosopher\'s Sanctum', text: 'The laboratory approaches the mythical ideal of the philosopher\'s sanctum.' },
  ],
};

/** Building upgrade milestone rewards */
export const BUILDING_MILESTONES: Record<BuildingType, BuildingMilestone[]> = {
  [BuildingType.Farm]: [
    { level: 5, reward: { resources: { [ResourceType.Food]: 100 }, xp: 20, label: 'Farm Apprentice' } },
    { level: 10, reward: { resources: { [ResourceType.Food]: 300, [ResourceType.Gold]: 50 }, xp: 50, label: 'Farm Expert' } },
    { level: 15, reward: { resources: { [ResourceType.Food]: 500, [ResourceType.Essence]: 10 }, xp: 80, label: 'Farm Master' } },
    { level: 20, reward: { resources: { [ResourceType.Food]: 1000, [ResourceType.Essence]: 25 }, xp: 150, label: 'Legendary Farmer' } },
  ],
  [BuildingType.LumberMill]: [
    { level: 5, reward: { resources: { [ResourceType.Wood]: 100 }, xp: 20, label: 'Lumber Apprentice' } },
    { level: 10, reward: { resources: { [ResourceType.Wood]: 300, [ResourceType.Gold]: 50 }, xp: 50, label: 'Lumber Expert' } },
    { level: 15, reward: { resources: { [ResourceType.Wood]: 500, [ResourceType.Essence]: 10 }, xp: 80, label: 'Lumber Master' } },
    { level: 20, reward: { resources: { [ResourceType.Wood]: 1000, [ResourceType.Essence]: 25 }, xp: 150, label: 'Legendary Logger' } },
  ],
  [BuildingType.Quarry]: [
    { level: 5, reward: { resources: { [ResourceType.Stone]: 100 }, xp: 20, label: 'Quarry Apprentice' } },
    { level: 10, reward: { resources: { [ResourceType.Stone]: 300, [ResourceType.Gold]: 50 }, xp: 50, label: 'Quarry Expert' } },
    { level: 15, reward: { resources: { [ResourceType.Stone]: 500, [ResourceType.Essence]: 10 }, xp: 80, label: 'Quarry Master' } },
    { level: 20, reward: { resources: { [ResourceType.Stone]: 1000, [ResourceType.Essence]: 25 }, xp: 150, label: 'Legendary Mason' } },
  ],
  [BuildingType.HerbGarden]: [
    { level: 5, reward: { resources: { [ResourceType.Herbs]: 50 }, xp: 20, label: 'Herbalist Apprentice' } },
    { level: 10, reward: { resources: { [ResourceType.Herbs]: 150, [ResourceType.Gold]: 50 }, xp: 50, label: 'Herbalist Expert' } },
    { level: 15, reward: { resources: { [ResourceType.Herbs]: 300, [ResourceType.Essence]: 15 }, xp: 80, label: 'Herbalist Master' } },
    { level: 20, reward: { resources: { [ResourceType.Herbs]: 500, [ResourceType.Essence]: 30 }, xp: 150, label: 'Legendary Herbalist' } },
  ],
  [BuildingType.Mine]: [
    { level: 5, reward: { resources: { [ResourceType.Ore]: 80 }, xp: 20, label: 'Mine Apprentice' } },
    { level: 10, reward: { resources: { [ResourceType.Ore]: 200, [ResourceType.Gold]: 75 }, xp: 50, label: 'Mine Expert' } },
    { level: 15, reward: { resources: { [ResourceType.Ore]: 400, [ResourceType.Essence]: 15 }, xp: 80, label: 'Mine Master' } },
    { level: 20, reward: { resources: { [ResourceType.Ore]: 700, [ResourceType.Essence]: 30 }, xp: 150, label: 'Legendary Miner' } },
  ],
  [BuildingType.Well]: [
    { level: 5, reward: { resources: { [ResourceType.Water]: 100 }, xp: 20, label: 'Well Apprentice' } },
    { level: 10, reward: { resources: { [ResourceType.Water]: 300, [ResourceType.Gold]: 50 }, xp: 50, label: 'Well Expert' } },
    { level: 15, reward: { resources: { [ResourceType.Water]: 500, [ResourceType.Essence]: 10 }, xp: 80, label: 'Well Master' } },
    { level: 20, reward: { resources: { [ResourceType.Water]: 800, [ResourceType.Essence]: 20 }, xp: 150, label: 'Legendary Wellkeeper' } },
  ],
  [BuildingType.Workshop]: [
    { level: 5, reward: { resources: { [ResourceType.Gold]: 100 }, xp: 25, label: 'Workshop Apprentice' } },
    { level: 10, reward: { resources: { [ResourceType.Gold]: 250, [ResourceType.Essence]: 10 }, xp: 60, label: 'Workshop Expert' } },
    { level: 15, reward: { resources: { [ResourceType.Gold]: 500, [ResourceType.Essence]: 25 }, xp: 100, label: 'Workshop Master' } },
  ],
  [BuildingType.Barracks]: [
    { level: 5, reward: { resources: { [ResourceType.Gold]: 100 }, xp: 25, label: 'Barracks Apprentice' } },
    { level: 10, reward: { resources: { [ResourceType.Gold]: 250, [ResourceType.Essence]: 10 }, xp: 60, label: 'Barracks Expert' } },
    { level: 15, reward: { resources: { [ResourceType.Gold]: 500, [ResourceType.Essence]: 25 }, xp: 100, label: 'Barracks Master' } },
  ],
  [BuildingType.Market]: [
    { level: 5, reward: { resources: { [ResourceType.Gold]: 150 }, xp: 25, label: 'Market Apprentice' } },
    { level: 10, reward: { resources: { [ResourceType.Gold]: 400, [ResourceType.Essence]: 10 }, xp: 60, label: 'Market Expert' } },
    { level: 15, reward: { resources: { [ResourceType.Gold]: 800, [ResourceType.Essence]: 25 }, xp: 100, label: 'Market Master' } },
  ],
  [BuildingType.Laboratory]: [
    { level: 5, reward: { resources: { [ResourceType.Essence]: 20 }, xp: 30, label: 'Lab Apprentice' } },
    { level: 10, reward: { resources: { [ResourceType.Essence]: 50, [ResourceType.Gold]: 200 }, xp: 70, label: 'Lab Expert' } },
    { level: 15, reward: { resources: { [ResourceType.Essence]: 100, [ResourceType.Gold]: 500 }, xp: 120, label: 'Lab Master' } },
  ],
};

/** Production chain definitions linking buildings */
export interface ProductionChain {
  id: string;
  name: string;
  description: string;
  steps: ProductionChainStep[];
}

export interface ProductionChainStep {
  building: BuildingType;
  input: Partial<Record<ResourceType, number>>;
  output: Partial<Record<ResourceType, number>>;
}

export const PRODUCTION_CHAINS: ProductionChain[] = [
  {
    id: 'food_supply',
    name: 'Food Supply Chain',
    description: 'Well provides water to Farm, which produces food for Barracks training.',
    steps: [
      { building: BuildingType.Well, input: {}, output: { [ResourceType.Water]: 1 } },
      { building: BuildingType.Farm, input: { [ResourceType.Water]: 0.5 }, output: { [ResourceType.Food]: 1 } },
      { building: BuildingType.Barracks, input: { [ResourceType.Food]: 0.5 }, output: {} },
    ],
  },
  {
    id: 'equipment_chain',
    name: 'Equipment Crafting Chain',
    description: 'Mine produces ore, Lumber Mill provides wood, Workshop combines them into equipment.',
    steps: [
      { building: BuildingType.Mine, input: {}, output: { [ResourceType.Ore]: 1 } },
      { building: BuildingType.LumberMill, input: {}, output: { [ResourceType.Wood]: 1 } },
      { building: BuildingType.Workshop, input: { [ResourceType.Ore]: 0.5, [ResourceType.Wood]: 0.3 }, output: { [ResourceType.Gold]: 1 } },
    ],
  },
  {
    id: 'alchemy_chain',
    name: 'Alchemy Chain',
    description: 'Herb Garden grows herbs, Well provides water, Laboratory distills essence.',
    steps: [
      { building: BuildingType.HerbGarden, input: { [ResourceType.Water]: 0.3 }, output: { [ResourceType.Herbs]: 1 } },
      { building: BuildingType.Well, input: {}, output: { [ResourceType.Water]: 1 } },
      { building: BuildingType.Laboratory, input: { [ResourceType.Herbs]: 0.3 }, output: { [ResourceType.Essence]: 1 } },
    ],
  },
  {
    id: 'trade_chain',
    name: 'Trade Economy Chain',
    description: 'Quarry and Farm produce goods, Market sells them for gold profit.',
    steps: [
      { building: BuildingType.Quarry, input: {}, output: { [ResourceType.Stone]: 1 } },
      { building: BuildingType.Farm, input: {}, output: { [ResourceType.Food]: 1 } },
      { building: BuildingType.Market, input: { [ResourceType.Stone]: 0.2, [ResourceType.Food]: 0.2 }, output: { [ResourceType.Gold]: 1 } },
    ],
  },
];

/** Building achievement definitions */
export interface BuildingAchievement {
  id: string;
  name: string;
  description: string;
  condition: {
    type: 'single_max_level' | 'all_built' | 'all_max_level' | 'total_building_levels' | 'specialization_count';
    buildingType?: BuildingType;
    threshold?: number;
  };
  reward: {
    resources?: Partial<Record<ResourceType, number>>;
    xp?: number;
  };
}

export const BUILDING_ACHIEVEMENTS: BuildingAchievement[] = [
  {
    id: 'first_builder',
    name: 'First Builder',
    description: 'Build your first building.',
    condition: { type: 'total_building_levels', threshold: 1 },
    reward: { resources: { [ResourceType.Gold]: 50 }, xp: 10 },
  },
  {
    id: 'diverse_guild',
    name: 'Diverse Guild',
    description: 'Build one of every building type.',
    condition: { type: 'all_built' },
    reward: { resources: { [ResourceType.Gold]: 500, [ResourceType.Essence]: 25 }, xp: 100 },
  },
  {
    id: 'max_farm',
    name: 'Master Farmer',
    description: 'Upgrade the Farm to maximum level.',
    condition: { type: 'single_max_level', buildingType: BuildingType.Farm },
    reward: { resources: { [ResourceType.Food]: 1000, [ResourceType.Essence]: 50 }, xp: 200 },
  },
  {
    id: 'max_mine',
    name: 'Deep Delver',
    description: 'Upgrade the Mine to maximum level.',
    condition: { type: 'single_max_level', buildingType: BuildingType.Mine },
    reward: { resources: { [ResourceType.Ore]: 500, [ResourceType.Essence]: 50 }, xp: 200 },
  },
  {
    id: 'max_workshop',
    name: 'Master Craftsman',
    description: 'Upgrade the Workshop to maximum level.',
    condition: { type: 'single_max_level', buildingType: BuildingType.Workshop },
    reward: { resources: { [ResourceType.Gold]: 1000, [ResourceType.Essence]: 50 }, xp: 200 },
  },
  {
    id: 'max_market',
    name: 'Trade Baron',
    description: 'Upgrade the Market to maximum level.',
    condition: { type: 'single_max_level', buildingType: BuildingType.Market },
    reward: { resources: { [ResourceType.Gold]: 1500, [ResourceType.Essence]: 50 }, xp: 200 },
  },
  {
    id: 'max_lab',
    name: 'Arcane Scholar',
    description: 'Upgrade the Laboratory to maximum level.',
    condition: { type: 'single_max_level', buildingType: BuildingType.Laboratory },
    reward: { resources: { [ResourceType.Essence]: 100, [ResourceType.Gold]: 500 }, xp: 200 },
  },
  {
    id: 'all_maxed',
    name: 'Architectural Wonder',
    description: 'Upgrade all buildings to maximum level.',
    condition: { type: 'all_max_level' },
    reward: { resources: { [ResourceType.Gold]: 5000, [ResourceType.Essence]: 200 }, xp: 1000 },
  },
  {
    id: 'building_total_50',
    name: 'Construction Magnate',
    description: 'Reach a total of 50 combined building levels.',
    condition: { type: 'total_building_levels', threshold: 50 },
    reward: { resources: { [ResourceType.Gold]: 300, [ResourceType.Essence]: 15 }, xp: 75 },
  },
  {
    id: 'building_total_100',
    name: 'Empire Builder',
    description: 'Reach a total of 100 combined building levels.',
    condition: { type: 'total_building_levels', threshold: 100 },
    reward: { resources: { [ResourceType.Gold]: 1000, [ResourceType.Essence]: 50 }, xp: 200 },
  },
  {
    id: 'specialization_3',
    name: 'Specialist Guild',
    description: 'Specialize at least 3 buildings.',
    condition: { type: 'specialization_count', threshold: 3 },
    reward: { resources: { [ResourceType.Gold]: 400, [ResourceType.Essence]: 20 }, xp: 80 },
  },
];

/** Visual state configuration for building rendering */
export interface BuildingVisualState {
  state: 'constructing' | 'idle' | 'producing' | 'damaged' | 'boosted' | 'upgrading' | 'max_level';
  tint: number;
  overlayIcon: string;
  animationSpeed: number;
}

export const BUILDING_VISUAL_STATES: Record<string, BuildingVisualState> = {
  constructing: { state: 'constructing', tint: 0x888888, overlayIcon: 'hammer', animationSpeed: 0.5 },
  idle: { state: 'idle', tint: 0xffffff, overlayIcon: 'pause', animationSpeed: 0 },
  producing: { state: 'producing', tint: 0xffffff, overlayIcon: 'gear', animationSpeed: 1.0 },
  damaged: { state: 'damaged', tint: 0xff6666, overlayIcon: 'warning', animationSpeed: 0.3 },
  boosted: { state: 'boosted', tint: 0xffff88, overlayIcon: 'star', animationSpeed: 1.5 },
  upgrading: { state: 'upgrading', tint: 0x88ccff, overlayIcon: 'arrow_up', animationSpeed: 0.8 },
  max_level: { state: 'max_level', tint: 0xffd700, overlayIcon: 'crown', animationSpeed: 0.7 },
};
