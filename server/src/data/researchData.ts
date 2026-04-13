import { ResourceType } from '../../../shared/src/enums';

export interface ResearchNode {
  id: string;
  name: string;
  description: string;
  branch: ResearchBranch;
  tier: number;
  prerequisites: string[];
  cost: { resources: Partial<Record<ResourceType, number>>; timeSeconds: number };
  effects: Record<string, number>;
  lore?: string;
  gatedBuildings?: string[];
  gatedDestinations?: string[];
  gatedRecipes?: string[];
}

export enum ResearchBranch {
  Agriculture = 'agriculture',
  Logistics = 'logistics',
  Knowledge = 'knowledge',
  Military = 'military',
  Mastery = 'mastery',
  // ── Expanded branches (T-0624 through T-0628) ──
  Combat = 'combat',
  Economic = 'economic',
  Exploration = 'exploration',
  Arcane = 'arcane',
  Civic = 'civic',
}

/** Branch completion bonus applied when every non-mastery node in a branch is done */
export interface BranchCompletionBonus {
  branch: ResearchBranch;
  label: string;
  effects: Record<string, number>;
}

export const BRANCH_COMPLETION_BONUSES: BranchCompletionBonus[] = [
  { branch: ResearchBranch.Combat, label: 'Warlord', effects: { all_combat_bonus: 0.20, hero_xp_bonus: 0.10 } },
  { branch: ResearchBranch.Economic, label: 'Tycoon', effects: { all_trade_bonus: 0.20, market_sell_bonus: 0.10 } },
  { branch: ResearchBranch.Exploration, label: 'Pathfinder', effects: { all_expedition_bonus: 0.20, travel_speed: 0.15 } },
  { branch: ResearchBranch.Arcane, label: 'Archmage', effects: { all_magic_bonus: 0.25, essence_production: 0.20 } },
  { branch: ResearchBranch.Civic, label: 'Chancellor', effects: { all_civic_bonus: 0.20, morale_bonus: 0.15 } },
  { branch: ResearchBranch.Agriculture, label: 'Master Farmer', effects: { all_crop_bonus: 0.25 } },
  { branch: ResearchBranch.Logistics, label: 'Logistics Master', effects: { travel_speed: 0.20 } },
  { branch: ResearchBranch.Knowledge, label: 'Sage', effects: { research_speed: 0.15 } },
  { branch: ResearchBranch.Military, label: 'General', effects: { hunt_bonus: 0.20 } },
];

/** Cost scaling formula: base * (1 + 0.15 * depth) */
export function scaledCost(
  baseCost: Partial<Record<ResourceType, number>>,
  baseTime: number,
  tier: number,
): { resources: Partial<Record<ResourceType, number>>; timeSeconds: number } {
  const scale = 1 + 0.15 * (tier - 1);
  const resources: Partial<Record<ResourceType, number>> = {};
  for (const [k, v] of Object.entries(baseCost)) {
    resources[k as ResourceType] = Math.round((v as number) * scale);
  }
  return { resources, timeSeconds: Math.round(baseTime * scale) };
}

/** Research milestone thresholds — rewards at 25%, 50%, 75%, 100% completion */
export interface ResearchMilestone {
  percent: number;
  label: string;
  rewards: Record<string, number>;
}

export const RESEARCH_MILESTONES: ResearchMilestone[] = [
  { percent: 25, label: 'Novice Researcher', rewards: { gold: 500, essence: 10 } },
  { percent: 50, label: 'Adept Scholar', rewards: { gold: 1500, essence: 30 } },
  { percent: 75, label: 'Expert Researcher', rewards: { gold: 3000, essence: 60 } },
  { percent: 100, label: 'Grand Scholar', rewards: { gold: 10000, essence: 200 } },
];

/** Research synergy: completing nodes in two different branches yields a bonus */
export interface ResearchSynergy {
  branchA: ResearchBranch;
  branchB: ResearchBranch;
  minNodesEach: number;
  label: string;
  effects: Record<string, number>;
}

export const RESEARCH_SYNERGIES: ResearchSynergy[] = [
  { branchA: ResearchBranch.Combat, branchB: ResearchBranch.Exploration, minNodesEach: 4, label: 'Raider', effects: { expedition_loot_bonus: 0.15 } },
  { branchA: ResearchBranch.Economic, branchB: ResearchBranch.Civic, minNodesEach: 4, label: 'Statesman', effects: { market_buy_discount: 0.10 } },
  { branchA: ResearchBranch.Arcane, branchB: ResearchBranch.Knowledge, minNodesEach: 4, label: 'Mystic Scholar', effects: { research_speed: 0.10 } },
  { branchA: ResearchBranch.Agriculture, branchB: ResearchBranch.Economic, minNodesEach: 4, label: 'Merchant Farmer', effects: { crop_sale_bonus: 0.15 } },
  { branchA: ResearchBranch.Military, branchB: ResearchBranch.Combat, minNodesEach: 4, label: 'Warmonger', effects: { hero_combat_power: 0.20 } },
];

/** Seasonal modifiers for research speed */
export const SEASONAL_RESEARCH_MODIFIERS: Record<string, Record<string, number>> = {
  spring: { [ResearchBranch.Agriculture]: 0.20, [ResearchBranch.Civic]: 0.10 },
  summer: { [ResearchBranch.Exploration]: 0.20, [ResearchBranch.Military]: 0.10 },
  autumn: { [ResearchBranch.Economic]: 0.20, [ResearchBranch.Knowledge]: 0.10 },
  winter: { [ResearchBranch.Arcane]: 0.20, [ResearchBranch.Combat]: 0.10 },
};

export const RESEARCH_NODES: ResearchNode[] = [
  // ── Agriculture (original 4) ──
  {
    id: 'agri_irrigation', name: 'Irrigation', description: 'Advanced water channels boost crop output.',
    branch: ResearchBranch.Agriculture, tier: 1, prerequisites: [],
    cost: { resources: { [ResourceType.Gold]: 200, [ResourceType.Wood]: 80, [ResourceType.Stone]: 40 }, timeSeconds: 300 },
    effects: { crop_bonus: 0.15 }, lore: 'The first canals turned barren soil into lush fields.',
  },
  {
    id: 'agri_flood_control', name: 'Flood Control', description: 'Levees and drainage reduce flood damage.',
    branch: ResearchBranch.Agriculture, tier: 2, prerequisites: ['agri_irrigation'],
    cost: { resources: { [ResourceType.Gold]: 350, [ResourceType.Stone]: 120, [ResourceType.Wood]: 60 }, timeSeconds: 600 },
    effects: { flood_damage_reduction: 0.50 }, lore: 'Dykes held back the deluge, saving countless harvests.',
  },
  {
    id: 'agri_greenhouse', name: 'Greenhouse', description: 'Controlled environments improve herb yields.',
    branch: ResearchBranch.Agriculture, tier: 2, prerequisites: ['agri_irrigation'],
    cost: { resources: { [ResourceType.Gold]: 400, [ResourceType.Wood]: 150, [ResourceType.Herbs]: 50 }, timeSeconds: 900 },
    effects: { herb_bonus: 0.25 }, lore: 'Glass panes trap the warmth, coaxing herbs to bloom year-round.',
  },
  {
    id: 'agri_hydroponics', name: 'Hydroponics', description: 'Soil-free growing boosts all crop production.',
    branch: ResearchBranch.Agriculture, tier: 3, prerequisites: ['agri_flood_control', 'agri_greenhouse'],
    cost: { resources: { [ResourceType.Gold]: 600, [ResourceType.Water]: 200, [ResourceType.Essence]: 10 }, timeSeconds: 1200 },
    effects: { all_crop_bonus: 0.20 }, lore: 'Plants float on nutrient mist in crystalline vats.',
  },

  // ── Logistics (original 4) ──
  {
    id: 'logi_pathfinding', name: 'Pathfinding', description: 'Optimized routes speed up travel.',
    branch: ResearchBranch.Logistics, tier: 1, prerequisites: [],
    cost: { resources: { [ResourceType.Gold]: 200, [ResourceType.Wood]: 60 }, timeSeconds: 300 },
    effects: { travel_speed: 0.10 }, lore: 'Scouts charted the fastest roads through untamed wilds.',
  },
  {
    id: 'logi_weather_routing', name: 'Weather Routing', description: 'Forecasts help avoid bad weather on the road.',
    branch: ResearchBranch.Logistics, tier: 2, prerequisites: ['logi_pathfinding'],
    cost: { resources: { [ResourceType.Gold]: 350, [ResourceType.Herbs]: 40, [ResourceType.Essence]: 5 }, timeSeconds: 600 },
    effects: { weather_travel_penalty_reduction: 0.30 }, lore: 'Cloud-readers whisper the sky\'s secrets to travelers.',
  },
  {
    id: 'logi_caravan_armor', name: 'Caravan Armor', description: 'Reinforced wagons reduce expedition risk.',
    branch: ResearchBranch.Logistics, tier: 2, prerequisites: ['logi_pathfinding'],
    cost: { resources: { [ResourceType.Gold]: 400, [ResourceType.Ore]: 100, [ResourceType.Stone]: 60 }, timeSeconds: 900 },
    effects: { expedition_risk_reduction: 0.25 }, lore: 'Iron plates bolt onto wooden frames, a mobile fortress.',
  },
  {
    id: 'logi_trade_insurance', name: 'Trade Insurance', description: 'Contractual protections improve market sell prices.',
    branch: ResearchBranch.Logistics, tier: 3, prerequisites: ['logi_weather_routing', 'logi_caravan_armor'],
    cost: { resources: { [ResourceType.Gold]: 700, [ResourceType.Essence]: 15 }, timeSeconds: 1200 },
    effects: { market_sell_bonus: 0.15 }, lore: 'Merchants guild underwriters guarantee safe passage of goods.',
  },

  // ── Knowledge (original 4) ──
  {
    id: 'know_almanac', name: 'Almanac', description: 'Historical records reveal weather forecasts.',
    branch: ResearchBranch.Knowledge, tier: 1, prerequisites: [],
    cost: { resources: { [ResourceType.Gold]: 250, [ResourceType.Herbs]: 30 }, timeSeconds: 300 },
    effects: { show_weather_forecast: 1 }, lore: 'Bound in leather, centuries of weather patterns preserved.',
  },
  {
    id: 'know_forecast_tower', name: 'Forecast Tower', description: 'A watchtower reveals the sources of world modifiers.',
    branch: ResearchBranch.Knowledge, tier: 2, prerequisites: ['know_almanac'],
    cost: { resources: { [ResourceType.Gold]: 400, [ResourceType.Stone]: 100, [ResourceType.Wood]: 80 }, timeSeconds: 600 },
    effects: { reveal_modifier_sources: 1 }, lore: 'From the tower\'s peak, the currents of fate become visible.',
  },
  {
    id: 'know_market_observatory', name: 'Market Observatory', description: 'Traders share intel on price trends.',
    branch: ResearchBranch.Knowledge, tier: 2, prerequisites: ['know_almanac'],
    cost: { resources: { [ResourceType.Gold]: 450, [ResourceType.Essence]: 8 }, timeSeconds: 900 },
    effects: { show_price_trends: 1 }, lore: 'Carrier pigeons bring price reports from distant markets.',
  },
  {
    id: 'know_pattern_recognition', name: 'Pattern Recognition', description: 'Deep analysis reveals hidden world logic.',
    branch: ResearchBranch.Knowledge, tier: 3, prerequisites: ['know_forecast_tower', 'know_market_observatory'],
    cost: { resources: { [ResourceType.Gold]: 800, [ResourceType.Essence]: 25 }, timeSeconds: 1200 },
    effects: { reveal_hidden_logic: 1 }, lore: 'Reality bends to those who understand its underlying patterns.',
  },

  // ── Military (original 4) ──
  {
    id: 'mil_scouting', name: 'Scouting', description: 'Advance scouts improve hunting efficiency.',
    branch: ResearchBranch.Military, tier: 1, prerequisites: [],
    cost: { resources: { [ResourceType.Gold]: 200, [ResourceType.Food]: 60 }, timeSeconds: 300 },
    effects: { hunt_bonus: 0.20 }, lore: 'Silent scouts range ahead, tracking prey through the brush.',
  },
  {
    id: 'mil_advanced_trapping', name: 'Advanced Trapping', description: 'Better traps reduce dangerous trap event risk.',
    branch: ResearchBranch.Military, tier: 2, prerequisites: ['mil_scouting'],
    cost: { resources: { [ResourceType.Gold]: 350, [ResourceType.Wood]: 80, [ResourceType.Ore]: 40 }, timeSeconds: 600 },
    effects: { trap_event_risk_reduction: 0.40 }, lore: 'Spring-loaded mechanisms snap shut with lethal precision.',
  },
  {
    id: 'mil_siege_defense', name: 'Siege Defense', description: 'Fortifications increase building durability.',
    branch: ResearchBranch.Military, tier: 2, prerequisites: ['mil_scouting'],
    cost: { resources: { [ResourceType.Gold]: 450, [ResourceType.Stone]: 150, [ResourceType.Ore]: 80 }, timeSeconds: 900 },
    effects: { building_durability: 0.30 }, lore: 'Thick walls and murder holes repel the boldest attackers.',
  },
  {
    id: 'mil_elite_training', name: 'Elite Training', description: 'Rigorous drills accelerate hero experience gain.',
    branch: ResearchBranch.Military, tier: 3, prerequisites: ['mil_advanced_trapping', 'mil_siege_defense'],
    cost: { resources: { [ResourceType.Gold]: 700, [ResourceType.Food]: 200, [ResourceType.Essence]: 12 }, timeSeconds: 1200 },
    effects: { hero_xp_bonus: 0.30 }, lore: 'Only the relentless grind of daily drills forges true warriors.',
  },

  // ── Mastery (original 4) ──
  {
    id: 'mastery_farmer', name: 'Master Farmer', description: 'Ultimate agricultural mastery doubles farm output.',
    branch: ResearchBranch.Mastery, tier: 4, prerequisites: ['agri_flood_control', 'agri_greenhouse', 'agri_hydroponics'],
    cost: { resources: { [ResourceType.Gold]: 1500, [ResourceType.Essence]: 50 }, timeSeconds: 2400 },
    effects: { farm_output_multiplier: 1.0 }, lore: 'The land itself seems to bow before the Master Farmer.',
  },
  {
    id: 'mastery_explorer', name: 'Master Explorer', description: 'Ultimate logistics mastery halves expedition time.',
    branch: ResearchBranch.Mastery, tier: 4, prerequisites: ['logi_weather_routing', 'logi_caravan_armor', 'logi_trade_insurance'],
    cost: { resources: { [ResourceType.Gold]: 1500, [ResourceType.Essence]: 50 }, timeSeconds: 2400 },
    effects: { expedition_time_multiplier: -0.50 }, lore: 'Maps rewrite themselves as the Explorer passes.',
  },
  {
    id: 'mastery_trader', name: 'Master Trader', description: 'Ultimate knowledge mastery gives market price advantage.',
    branch: ResearchBranch.Mastery, tier: 4, prerequisites: ['know_forecast_tower', 'know_market_observatory', 'know_pattern_recognition'],
    cost: { resources: { [ResourceType.Gold]: 1500, [ResourceType.Essence]: 50 }, timeSeconds: 2400 },
    effects: { market_price_advantage: 0.25 }, lore: 'Coins dance to the Trader\'s tune, always in their favor.',
  },
  {
    id: 'mastery_scholar', name: 'Master Scholar', description: 'Ultimate military mastery unlocks elite hero abilities.',
    branch: ResearchBranch.Mastery, tier: 4, prerequisites: ['mil_advanced_trapping', 'mil_siege_defense', 'mil_elite_training'],
    cost: { resources: { [ResourceType.Gold]: 1500, [ResourceType.Essence]: 50 }, timeSeconds: 2400 },
    effects: { elite_hero_abilities: 1 }, lore: 'Wisdom distilled from a thousand battles grants true mastery.',
  },

  // ══════════════════════════════════════════════════════════════════════
  // T-0624: Combat branch (12 nodes — combat upgrades)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'cmb_weapon_drills', name: 'Weapon Drills', description: 'Basic training increases hero melee damage.',
    branch: ResearchBranch.Combat, tier: 1, prerequisites: [],
    cost: scaledCost({ [ResourceType.Gold]: 200, [ResourceType.Ore]: 50 }, 300, 1),
    effects: { melee_damage: 0.10 }, lore: 'Wooden swords clatter in the training yard at dawn.',
    gatedRecipes: ['iron_sword'],
  },
  {
    id: 'cmb_archery_fundamentals', name: 'Archery Fundamentals', description: 'Ranged attacks gain accuracy and damage.',
    branch: ResearchBranch.Combat, tier: 1, prerequisites: [],
    cost: scaledCost({ [ResourceType.Gold]: 200, [ResourceType.Wood]: 60 }, 300, 1),
    effects: { ranged_damage: 0.10 }, lore: 'A steady hand and keen eye turn arrows into bolts of lightning.',
  },
  {
    id: 'cmb_shield_wall', name: 'Shield Wall', description: 'Heroes take reduced damage in formation.',
    branch: ResearchBranch.Combat, tier: 2, prerequisites: ['cmb_weapon_drills'],
    cost: scaledCost({ [ResourceType.Gold]: 350, [ResourceType.Ore]: 80, [ResourceType.Stone]: 40 }, 600, 2),
    effects: { damage_reduction: 0.15 }, lore: 'Overlapping shields form an impenetrable barrier.',
  },
  {
    id: 'cmb_flanking', name: 'Flanking Tactics', description: 'Outmaneuvering enemies increases critical hit chance.',
    branch: ResearchBranch.Combat, tier: 2, prerequisites: ['cmb_weapon_drills'],
    cost: scaledCost({ [ResourceType.Gold]: 350, [ResourceType.Food]: 60 }, 600, 2),
    effects: { crit_chance: 0.10 }, lore: 'Attack where they least expect it — from behind.',
  },
  {
    id: 'cmb_volley_fire', name: 'Volley Fire', description: 'Coordinated ranged volleys hit multiple enemies.',
    branch: ResearchBranch.Combat, tier: 2, prerequisites: ['cmb_archery_fundamentals'],
    cost: scaledCost({ [ResourceType.Gold]: 350, [ResourceType.Wood]: 100 }, 600, 2),
    effects: { ranged_aoe: 0.20 }, lore: 'The sky darkens as arrows fall like rain.',
  },
  {
    id: 'cmb_battle_rage', name: 'Battle Rage', description: 'Heroes deal more damage when wounded.',
    branch: ResearchBranch.Combat, tier: 3, prerequisites: ['cmb_shield_wall', 'cmb_flanking'],
    cost: scaledCost({ [ResourceType.Gold]: 500, [ResourceType.Ore]: 100, [ResourceType.Essence]: 8 }, 900, 3),
    effects: { wounded_damage_bonus: 0.30 }, lore: 'Pain becomes fury; fury becomes power.',
  },
  {
    id: 'cmb_precision_strikes', name: 'Precision Strikes', description: 'Critical hits deal increased damage.',
    branch: ResearchBranch.Combat, tier: 3, prerequisites: ['cmb_flanking', 'cmb_volley_fire'],
    cost: scaledCost({ [ResourceType.Gold]: 500, [ResourceType.Ore]: 80, [ResourceType.Food]: 80 }, 900, 3),
    effects: { crit_damage: 0.25 }, lore: 'Every strike finds the gap in the armor.',
  },
  {
    id: 'cmb_war_chant', name: 'War Chant', description: 'Morale boost increases all party combat stats.',
    branch: ResearchBranch.Combat, tier: 3, prerequisites: ['cmb_shield_wall'],
    cost: scaledCost({ [ResourceType.Gold]: 500, [ResourceType.Food]: 100, [ResourceType.Essence]: 5 }, 900, 3),
    effects: { party_combat_stats: 0.10 }, lore: 'Ancient chants stir the blood and steady the hand.',
  },
  {
    id: 'cmb_siege_weapons', name: 'Siege Weapons', description: 'Unlocks catapults and battering rams for expeditions.',
    branch: ResearchBranch.Combat, tier: 4, prerequisites: ['cmb_battle_rage'],
    cost: scaledCost({ [ResourceType.Gold]: 800, [ResourceType.Ore]: 150, [ResourceType.Wood]: 150 }, 1500, 4),
    effects: { siege_power: 0.40 }, lore: 'Massive engines of war rumble across the battlefield.',
    gatedBuildings: ['siege_workshop'],
  },
  {
    id: 'cmb_legendary_arms', name: 'Legendary Arms', description: 'Unlock crafting of legendary-tier weapons.',
    branch: ResearchBranch.Combat, tier: 4, prerequisites: ['cmb_precision_strikes'],
    cost: scaledCost({ [ResourceType.Gold]: 800, [ResourceType.Ore]: 200, [ResourceType.Essence]: 20 }, 1500, 4),
    effects: { legendary_weapon_craft: 1 }, lore: 'Names are etched into blades that will outlast empires.',
    gatedRecipes: ['legendary_blade'],
  },
  {
    id: 'cmb_commander_aura', name: 'Commander Aura', description: 'Party leader grants passive bonuses to all members.',
    branch: ResearchBranch.Combat, tier: 5, prerequisites: ['cmb_siege_weapons', 'cmb_legendary_arms', 'cmb_war_chant'],
    cost: scaledCost({ [ResourceType.Gold]: 1200, [ResourceType.Essence]: 35 }, 2100, 5),
    effects: { commander_aura: 0.15 }, lore: 'In their presence, soldiers fight like legends.',
  },
  {
    id: 'cmb_unstoppable', name: 'Unstoppable', description: 'Heroes can push through lethal encounters without falling.',
    branch: ResearchBranch.Combat, tier: 6, prerequisites: ['cmb_commander_aura'],
    cost: scaledCost({ [ResourceType.Gold]: 1800, [ResourceType.Essence]: 60 }, 3000, 6),
    effects: { death_prevention_chance: 0.25 }, lore: 'Death itself hesitates before those who will not yield.',
  },

  // ══════════════════════════════════════════════════════════════════════
  // T-0625: Economic branch (12 nodes — resource and trade upgrades)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'eco_barter', name: 'Barter', description: 'Basic trade negotiations reduce buy prices.',
    branch: ResearchBranch.Economic, tier: 1, prerequisites: [],
    cost: scaledCost({ [ResourceType.Gold]: 200, [ResourceType.Food]: 40 }, 300, 1),
    effects: { market_buy_discount: 0.05 }, lore: 'A shrewd eye and a firm handshake go a long way.',
  },
  {
    id: 'eco_currency', name: 'Currency Standards', description: 'Standardized coinage improves trade volume.',
    branch: ResearchBranch.Economic, tier: 1, prerequisites: [],
    cost: scaledCost({ [ResourceType.Gold]: 250, [ResourceType.Ore]: 30 }, 300, 1),
    effects: { trade_volume: 0.10 }, lore: 'Golden coins bearing the guild seal flow freely between merchants.',
  },
  {
    id: 'eco_tax_collection', name: 'Tax Collection', description: 'Efficient taxation generates passive gold income.',
    branch: ResearchBranch.Economic, tier: 2, prerequisites: ['eco_barter'],
    cost: scaledCost({ [ResourceType.Gold]: 350, [ResourceType.Stone]: 50 }, 600, 2),
    effects: { passive_gold: 0.10 }, lore: 'The tax collector\'s ledger knows every coin.',
  },
  {
    id: 'eco_banking', name: 'Banking', description: 'Gold reserves earn interest over time.',
    branch: ResearchBranch.Economic, tier: 2, prerequisites: ['eco_currency'],
    cost: scaledCost({ [ResourceType.Gold]: 400, [ResourceType.Stone]: 80 }, 600, 2),
    effects: { gold_interest: 0.02 }, lore: 'Vaults of stone guard growing piles of gleaming gold.',
    gatedBuildings: ['bank'],
  },
  {
    id: 'eco_trade_agreements', name: 'Trade Agreements', description: 'Formal contracts with other guilds improve sell prices.',
    branch: ResearchBranch.Economic, tier: 2, prerequisites: ['eco_barter'],
    cost: scaledCost({ [ResourceType.Gold]: 380, [ResourceType.Essence]: 5 }, 600, 2),
    effects: { market_sell_bonus: 0.08 }, lore: 'Ink-signed parchments seal deals that benefit all parties.',
  },
  {
    id: 'eco_supply_chains', name: 'Supply Chains', description: 'Optimized logistics reduce building costs.',
    branch: ResearchBranch.Economic, tier: 3, prerequisites: ['eco_tax_collection', 'eco_banking'],
    cost: scaledCost({ [ResourceType.Gold]: 600, [ResourceType.Wood]: 80, [ResourceType.Ore]: 60 }, 900, 3),
    effects: { building_cost_reduction: 0.10 }, lore: 'Goods flow seamlessly from quarry to construction site.',
  },
  {
    id: 'eco_merchant_guild', name: 'Merchant Guild', description: 'Join a merchant network for exclusive deals.',
    branch: ResearchBranch.Economic, tier: 3, prerequisites: ['eco_trade_agreements'],
    cost: scaledCost({ [ResourceType.Gold]: 550, [ResourceType.Essence]: 10 }, 900, 3),
    effects: { exclusive_deals: 1 }, lore: 'The merchant guild\'s secret handshake opens locked doors.',
  },
  {
    id: 'eco_commodity_exchange', name: 'Commodity Exchange', description: 'Establish a formal exchange for bulk resource trading.',
    branch: ResearchBranch.Economic, tier: 3, prerequisites: ['eco_banking'],
    cost: scaledCost({ [ResourceType.Gold]: 600, [ResourceType.Stone]: 100 }, 900, 3),
    effects: { bulk_trade_bonus: 0.15 }, lore: 'Traders shout bids across the crowded exchange floor.',
  },
  {
    id: 'eco_monopoly', name: 'Monopoly', description: 'Corner the market on a resource for higher profits.',
    branch: ResearchBranch.Economic, tier: 4, prerequisites: ['eco_supply_chains', 'eco_merchant_guild'],
    cost: scaledCost({ [ResourceType.Gold]: 900, [ResourceType.Essence]: 20 }, 1500, 4),
    effects: { resource_monopoly: 0.25 }, lore: 'Control the supply and you control the world.',
  },
  {
    id: 'eco_futures_trading', name: 'Futures Trading', description: 'Speculate on future prices for extra returns.',
    branch: ResearchBranch.Economic, tier: 4, prerequisites: ['eco_commodity_exchange'],
    cost: scaledCost({ [ResourceType.Gold]: 850, [ResourceType.Essence]: 18 }, 1500, 4),
    effects: { futures_profit: 0.20 }, lore: 'Predicting tomorrow\'s prices is an art and a science.',
  },
  {
    id: 'eco_trade_empire', name: 'Trade Empire', description: 'Massive network of trade routes across all regions.',
    branch: ResearchBranch.Economic, tier: 5, prerequisites: ['eco_monopoly', 'eco_futures_trading'],
    cost: scaledCost({ [ResourceType.Gold]: 1400, [ResourceType.Essence]: 40 }, 2100, 5),
    effects: { all_trade_bonus: 0.20 }, lore: 'From coast to coast, the guild\'s trade wagons never stop.',
  },
  {
    id: 'eco_golden_age', name: 'Golden Age', description: 'All economic activities produce 25% more gold.',
    branch: ResearchBranch.Economic, tier: 6, prerequisites: ['eco_trade_empire'],
    cost: scaledCost({ [ResourceType.Gold]: 2000, [ResourceType.Essence]: 60 }, 3000, 6),
    effects: { gold_production: 0.25 }, lore: 'The guild treasury overflows — a golden age dawns.',
  },

  // ══════════════════════════════════════════════════════════════════════
  // T-0626: Exploration branch (12 nodes — expedition upgrades)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'exp_cartography', name: 'Cartography', description: 'Better maps reveal hidden expedition destinations.',
    branch: ResearchBranch.Exploration, tier: 1, prerequisites: [],
    cost: scaledCost({ [ResourceType.Gold]: 200, [ResourceType.Herbs]: 30 }, 300, 1),
    effects: { reveal_destinations: 1 }, lore: 'Ink-stained fingers trace coastlines no eye has seen.',
    gatedDestinations: ['hidden_grove'],
  },
  {
    id: 'exp_compass', name: 'Compass Navigation', description: 'Reduces expedition travel time.',
    branch: ResearchBranch.Exploration, tier: 1, prerequisites: [],
    cost: scaledCost({ [ResourceType.Gold]: 220, [ResourceType.Ore]: 40 }, 300, 1),
    effects: { expedition_speed: 0.10 }, lore: 'A needle spinning north saves days of wandering.',
  },
  {
    id: 'exp_survival_kit', name: 'Survival Kit', description: 'Heroes consume less food on expeditions.',
    branch: ResearchBranch.Exploration, tier: 2, prerequisites: ['exp_cartography'],
    cost: scaledCost({ [ResourceType.Gold]: 350, [ResourceType.Food]: 80, [ResourceType.Herbs]: 40 }, 600, 2),
    effects: { expedition_food_reduction: 0.20 }, lore: 'Dried rations and fire steel keep explorers alive.',
  },
  {
    id: 'exp_mountaineering', name: 'Mountaineering', description: 'Unlock mountain expedition destinations.',
    branch: ResearchBranch.Exploration, tier: 2, prerequisites: ['exp_compass'],
    cost: scaledCost({ [ResourceType.Gold]: 380, [ResourceType.Stone]: 80, [ResourceType.Wood]: 60 }, 600, 2),
    effects: { mountain_access: 1 }, lore: 'Pitons and rope open paths to the highest peaks.',
    gatedDestinations: ['frozen_peak', 'crystal_cavern'],
  },
  {
    id: 'exp_deep_diving', name: 'Deep Diving', description: 'Unlock underwater expedition destinations.',
    branch: ResearchBranch.Exploration, tier: 2, prerequisites: ['exp_cartography'],
    cost: scaledCost({ [ResourceType.Gold]: 400, [ResourceType.Water]: 100, [ResourceType.Essence]: 5 }, 600, 2),
    effects: { underwater_access: 1 }, lore: 'Breathing apparatus lets divers explore sunken ruins.',
    gatedDestinations: ['sunken_temple'],
  },
  {
    id: 'exp_night_vision', name: 'Night Vision', description: 'Heroes can explore dangerous areas at night.',
    branch: ResearchBranch.Exploration, tier: 3, prerequisites: ['exp_survival_kit', 'exp_mountaineering'],
    cost: scaledCost({ [ResourceType.Gold]: 550, [ResourceType.Essence]: 10, [ResourceType.Herbs]: 60 }, 900, 3),
    effects: { night_exploration: 1 }, lore: 'Alchemical drops sharpen the eye to see in utter darkness.',
  },
  {
    id: 'exp_treasure_sense', name: 'Treasure Sense', description: 'Higher chance to find rare loot on expeditions.',
    branch: ResearchBranch.Exploration, tier: 3, prerequisites: ['exp_deep_diving'],
    cost: scaledCost({ [ResourceType.Gold]: 500, [ResourceType.Essence]: 12 }, 900, 3),
    effects: { rare_loot_chance: 0.20 }, lore: 'A tingling in the fingertips guides hands to hidden caches.',
  },
  {
    id: 'exp_artifact_recovery', name: 'Artifact Recovery', description: 'Chance to recover ancient artifacts from ruins.',
    branch: ResearchBranch.Exploration, tier: 3, prerequisites: ['exp_survival_kit'],
    cost: scaledCost({ [ResourceType.Gold]: 520, [ResourceType.Stone]: 60, [ResourceType.Essence]: 8 }, 900, 3),
    effects: { artifact_chance: 0.15 }, lore: 'Careful excavation reveals relics of a forgotten age.',
  },
  {
    id: 'exp_portal_mapping', name: 'Portal Mapping', description: 'Discover and use ancient teleportation portals.',
    branch: ResearchBranch.Exploration, tier: 4, prerequisites: ['exp_night_vision', 'exp_treasure_sense'],
    cost: scaledCost({ [ResourceType.Gold]: 800, [ResourceType.Essence]: 25 }, 1500, 4),
    effects: { portal_access: 1, expedition_speed: 0.20 }, lore: 'Arcane glyphs shimmer as dormant portals flicker to life.',
    gatedDestinations: ['void_rift'],
  },
  {
    id: 'exp_auto_scout', name: 'Auto-Scout', description: 'Scouts explore automatically when idle.',
    branch: ResearchBranch.Exploration, tier: 4, prerequisites: ['exp_artifact_recovery'],
    cost: scaledCost({ [ResourceType.Gold]: 750, [ResourceType.Food]: 100, [ResourceType.Essence]: 15 }, 1500, 4),
    effects: { auto_scout: 1 }, lore: 'Trained scouts venture out without orders, returning with maps.',
  },
  {
    id: 'exp_dimensional_rift', name: 'Dimensional Rift', description: 'Unlock expeditions to other dimensions.',
    branch: ResearchBranch.Exploration, tier: 5, prerequisites: ['exp_portal_mapping', 'exp_auto_scout'],
    cost: scaledCost({ [ResourceType.Gold]: 1300, [ResourceType.Essence]: 45 }, 2100, 5),
    effects: { dimension_access: 1 }, lore: 'Reality tears open, revealing impossible landscapes beyond.',
    gatedDestinations: ['shadow_realm'],
  },
  {
    id: 'exp_world_walker', name: 'World Walker', description: 'Maximum expedition rewards and minimum travel time.',
    branch: ResearchBranch.Exploration, tier: 6, prerequisites: ['exp_dimensional_rift'],
    cost: scaledCost({ [ResourceType.Gold]: 1800, [ResourceType.Essence]: 65 }, 3000, 6),
    effects: { expedition_reward_bonus: 0.30, travel_speed: 0.25 }, lore: 'Distances mean nothing to one who walks between worlds.',
  },

  // ══════════════════════════════════════════════════════════════════════
  // T-0627: Arcane branch (12 nodes — magic and special abilities)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'arc_essence_tap', name: 'Essence Tap', description: 'Basic essence extraction from the environment.',
    branch: ResearchBranch.Arcane, tier: 1, prerequisites: [],
    cost: scaledCost({ [ResourceType.Gold]: 250, [ResourceType.Essence]: 5 }, 300, 1),
    effects: { essence_production: 0.10 }, lore: 'Crystals hum as they draw power from the ether.',
  },
  {
    id: 'arc_rune_reading', name: 'Rune Reading', description: 'Decipher ancient runes for research speed bonus.',
    branch: ResearchBranch.Arcane, tier: 1, prerequisites: [],
    cost: scaledCost({ [ResourceType.Gold]: 230, [ResourceType.Herbs]: 40 }, 300, 1),
    effects: { research_speed: 0.05 }, lore: 'Glowing symbols whisper secrets to the initiated.',
  },
  {
    id: 'arc_enchanting', name: 'Enchanting', description: 'Imbue items with magical properties.',
    branch: ResearchBranch.Arcane, tier: 2, prerequisites: ['arc_essence_tap'],
    cost: scaledCost({ [ResourceType.Gold]: 400, [ResourceType.Essence]: 15, [ResourceType.Ore]: 50 }, 600, 2),
    effects: { enchant_power: 0.15 }, lore: 'Hammered metal glows as arcane energy binds to its surface.',
    gatedRecipes: ['enchanted_ring'],
  },
  {
    id: 'arc_alchemy', name: 'Advanced Alchemy', description: 'Create powerful potions and elixirs.',
    branch: ResearchBranch.Arcane, tier: 2, prerequisites: ['arc_rune_reading'],
    cost: scaledCost({ [ResourceType.Gold]: 380, [ResourceType.Herbs]: 80, [ResourceType.Essence]: 10 }, 600, 2),
    effects: { potion_potency: 0.20 }, lore: 'Bubbling cauldrons yield elixirs of impossible potency.',
    gatedRecipes: ['potent_elixir'],
  },
  {
    id: 'arc_ward_magic', name: 'Ward Magic', description: 'Protective wards shield buildings and heroes.',
    branch: ResearchBranch.Arcane, tier: 2, prerequisites: ['arc_essence_tap'],
    cost: scaledCost({ [ResourceType.Gold]: 420, [ResourceType.Essence]: 12, [ResourceType.Stone]: 60 }, 600, 2),
    effects: { ward_protection: 0.20 }, lore: 'Invisible shields ripple when struck, deflecting harm.',
  },
  {
    id: 'arc_summoning', name: 'Summoning', description: 'Summon elemental allies to aid expeditions.',
    branch: ResearchBranch.Arcane, tier: 3, prerequisites: ['arc_enchanting', 'arc_ward_magic'],
    cost: scaledCost({ [ResourceType.Gold]: 600, [ResourceType.Essence]: 20 }, 900, 3),
    effects: { summon_power: 0.25 }, lore: 'Creatures of flame and frost answer the summoner\'s call.',
  },
  {
    id: 'arc_transmutation', name: 'Transmutation', description: 'Convert one resource type into another.',
    branch: ResearchBranch.Arcane, tier: 3, prerequisites: ['arc_alchemy'],
    cost: scaledCost({ [ResourceType.Gold]: 550, [ResourceType.Essence]: 18, [ResourceType.Herbs]: 60 }, 900, 3),
    effects: { transmute_efficiency: 0.80 }, lore: 'Lead becomes gold in the alchemist\'s crucible.',
  },
  {
    id: 'arc_scrying', name: 'Scrying', description: 'See into the future to predict events.',
    branch: ResearchBranch.Arcane, tier: 3, prerequisites: ['arc_rune_reading'],
    cost: scaledCost({ [ResourceType.Gold]: 500, [ResourceType.Essence]: 15, [ResourceType.Water]: 40 }, 900, 3),
    effects: { event_prediction: 1 }, lore: 'Crystal balls reveal what has been and what will be.',
  },
  {
    id: 'arc_elemental_forge', name: 'Elemental Forge', description: 'Forge items with elemental affinities.',
    branch: ResearchBranch.Arcane, tier: 4, prerequisites: ['arc_summoning'],
    cost: scaledCost({ [ResourceType.Gold]: 850, [ResourceType.Essence]: 30, [ResourceType.Ore]: 120 }, 1500, 4),
    effects: { elemental_craft: 1 }, lore: 'Fire and ice merge in the forge to create wondrous arms.',
    gatedBuildings: ['elemental_forge'],
  },
  {
    id: 'arc_time_magic', name: 'Time Magic', description: 'Slow time to accelerate production and research.',
    branch: ResearchBranch.Arcane, tier: 4, prerequisites: ['arc_scrying', 'arc_transmutation'],
    cost: scaledCost({ [ResourceType.Gold]: 900, [ResourceType.Essence]: 35 }, 1500, 4),
    effects: { time_bonus: 0.15 }, lore: 'Clocks run backward and forward at the mage\'s whim.',
  },
  {
    id: 'arc_arcane_nexus', name: 'Arcane Nexus', description: 'A convergence of ley lines amplifies all magic.',
    branch: ResearchBranch.Arcane, tier: 5, prerequisites: ['arc_elemental_forge', 'arc_time_magic'],
    cost: scaledCost({ [ResourceType.Gold]: 1400, [ResourceType.Essence]: 50 }, 2100, 5),
    effects: { all_magic_bonus: 0.20, essence_production: 0.15 }, lore: 'Where ley lines cross, magic surges beyond comprehension.',
    gatedBuildings: ['arcane_nexus'],
  },
  {
    id: 'arc_reality_weave', name: 'Reality Weave', description: 'Bend reality to your will for supreme arcane power.',
    branch: ResearchBranch.Arcane, tier: 6, prerequisites: ['arc_arcane_nexus'],
    cost: scaledCost({ [ResourceType.Gold]: 2000, [ResourceType.Essence]: 80 }, 3000, 6),
    effects: { reality_warp: 1, all_magic_bonus: 0.15 }, lore: 'The fabric of existence reshapes at the weaver\'s touch.',
  },

  // ══════════════════════════════════════════════════════════════════════
  // T-0628: Civic branch (12 nodes — guild and social upgrades)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'civ_town_charter', name: 'Town Charter', description: 'Establishes formal governance boosting morale.',
    branch: ResearchBranch.Civic, tier: 1, prerequisites: [],
    cost: scaledCost({ [ResourceType.Gold]: 200, [ResourceType.Wood]: 40 }, 300, 1),
    effects: { morale_bonus: 0.05 }, lore: 'A charter on parchment, binding the community in purpose.',
  },
  {
    id: 'civ_public_works', name: 'Public Works', description: 'Infrastructure projects reduce building upgrade costs.',
    branch: ResearchBranch.Civic, tier: 1, prerequisites: [],
    cost: scaledCost({ [ResourceType.Gold]: 250, [ResourceType.Stone]: 50 }, 300, 1),
    effects: { upgrade_cost_reduction: 0.05 }, lore: 'Roads, sewers, and bridges — the bones of civilization.',
  },
  {
    id: 'civ_education', name: 'Education', description: 'Schools increase hero XP gain rate.',
    branch: ResearchBranch.Civic, tier: 2, prerequisites: ['civ_town_charter'],
    cost: scaledCost({ [ResourceType.Gold]: 380, [ResourceType.Wood]: 80, [ResourceType.Herbs]: 30 }, 600, 2),
    effects: { hero_xp_bonus: 0.10 }, lore: 'Chalk dust fills the air as young heroes learn their craft.',
    gatedBuildings: ['school'],
  },
  {
    id: 'civ_festival_grounds', name: 'Festival Grounds', description: 'Regular festivals boost morale and attract visitors.',
    branch: ResearchBranch.Civic, tier: 2, prerequisites: ['civ_town_charter'],
    cost: scaledCost({ [ResourceType.Gold]: 350, [ResourceType.Food]: 80, [ResourceType.Wood]: 60 }, 600, 2),
    effects: { morale_bonus: 0.10, gold_from_visitors: 0.05 }, lore: 'Music and laughter echo across the festival grounds.',
  },
  {
    id: 'civ_diplomacy', name: 'Diplomacy', description: 'Better relations with allied guilds open collaboration.',
    branch: ResearchBranch.Civic, tier: 2, prerequisites: ['civ_public_works'],
    cost: scaledCost({ [ResourceType.Gold]: 400, [ResourceType.Essence]: 5 }, 600, 2),
    effects: { alliance_bonus: 0.10 }, lore: 'Ambassadors carry olive branches to distant guildhalls.',
  },
  {
    id: 'civ_judiciary', name: 'Judiciary', description: 'A court system reduces crime and increases stability.',
    branch: ResearchBranch.Civic, tier: 3, prerequisites: ['civ_education', 'civ_diplomacy'],
    cost: scaledCost({ [ResourceType.Gold]: 550, [ResourceType.Stone]: 80, [ResourceType.Essence]: 8 }, 900, 3),
    effects: { stability_bonus: 0.15 }, lore: 'Justice is blind, but her scales are perfectly balanced.',
  },
  {
    id: 'civ_hospital', name: 'Hospital', description: 'Heroes recover from injuries faster.',
    branch: ResearchBranch.Civic, tier: 3, prerequisites: ['civ_education'],
    cost: scaledCost({ [ResourceType.Gold]: 500, [ResourceType.Herbs]: 80, [ResourceType.Water]: 60 }, 900, 3),
    effects: { recovery_speed: 0.25 }, lore: 'Clean beds and skilled healers mend broken bodies.',
    gatedBuildings: ['hospital'],
  },
  {
    id: 'civ_grand_library', name: 'Grand Library', description: 'Research speed bonus for all branches.',
    branch: ResearchBranch.Civic, tier: 3, prerequisites: ['civ_festival_grounds'],
    cost: scaledCost({ [ResourceType.Gold]: 600, [ResourceType.Wood]: 100, [ResourceType.Essence]: 10 }, 900, 3),
    effects: { research_speed: 0.10 }, lore: 'Shelves groan under the weight of accumulated knowledge.',
    gatedBuildings: ['grand_library'],
  },
  {
    id: 'civ_parliament', name: 'Parliament', description: 'Democratic governance increases all civic bonuses.',
    branch: ResearchBranch.Civic, tier: 4, prerequisites: ['civ_judiciary'],
    cost: scaledCost({ [ResourceType.Gold]: 850, [ResourceType.Stone]: 120, [ResourceType.Essence]: 20 }, 1500, 4),
    effects: { civic_multiplier: 0.15 }, lore: 'Elected representatives debate the guild\'s future.',
  },
  {
    id: 'civ_cultural_exchange', name: 'Cultural Exchange', description: 'Share knowledge with allies for mutual benefit.',
    branch: ResearchBranch.Civic, tier: 4, prerequisites: ['civ_grand_library', 'civ_hospital'],
    cost: scaledCost({ [ResourceType.Gold]: 800, [ResourceType.Essence]: 18 }, 1500, 4),
    effects: { alliance_research_share: 0.10 }, lore: 'Scholars travel between guilds, carrying wisdom as currency.',
  },
  {
    id: 'civ_golden_charter', name: 'Golden Charter', description: 'Supreme civic achievement granting major guild bonuses.',
    branch: ResearchBranch.Civic, tier: 5, prerequisites: ['civ_parliament', 'civ_cultural_exchange'],
    cost: scaledCost({ [ResourceType.Gold]: 1400, [ResourceType.Essence]: 45 }, 2100, 5),
    effects: { all_civic_bonus: 0.20, morale_bonus: 0.10 }, lore: 'A charter gilded in gold — the pinnacle of governance.',
  },
  {
    id: 'civ_utopia', name: 'Utopia', description: 'A perfect society with maximum happiness and efficiency.',
    branch: ResearchBranch.Civic, tier: 6, prerequisites: ['civ_golden_charter'],
    cost: scaledCost({ [ResourceType.Gold]: 2000, [ResourceType.Essence]: 70 }, 3000, 6),
    effects: { utopia_bonus: 1, morale_bonus: 0.20 }, lore: 'A place of perfect harmony — the dream made real.',
  },
];

export const RESEARCH_MAP: Map<string, ResearchNode> = new Map(
  RESEARCH_NODES.map((n) => [n.id, n]),
);

/** Get all nodes for a specific branch */
export function getNodesForBranch(branch: ResearchBranch): ResearchNode[] {
  return RESEARCH_NODES.filter((n) => n.branch === branch);
}

/** Get branch completion percentage */
export function getBranchCompletion(branch: ResearchBranch, completed: string[]): number {
  const branchNodes = getNodesForBranch(branch);
  if (branchNodes.length === 0) return 0;
  const doneCount = branchNodes.filter((n) => completed.includes(n.id)).length;
  return doneCount / branchNodes.length;
}

/** Get overall research completion percentage */
export function getOverallCompletion(completed: string[]): number {
  if (RESEARCH_NODES.length === 0) return 0;
  return completed.length / RESEARCH_NODES.length;
}

/** Research advisor: suggest next research based on playstyle heuristics */
export function suggestNextResearch(completed: string[], available: ResearchNode[]): ResearchNode | null {
  if (available.length === 0) return null;

  // Heuristic: prefer branches with more progress (specialize) then lower tier
  const branchProgress: Record<string, number> = {};
  for (const id of completed) {
    const node = RESEARCH_MAP.get(id);
    if (node) {
      branchProgress[node.branch] = (branchProgress[node.branch] || 0) + 1;
    }
  }

  const scored = available.map((node) => {
    let score = 0;
    // Prefer branches we've already invested in
    score += (branchProgress[node.branch] || 0) * 10;
    // Prefer lower tier (easier to complete)
    score -= node.tier * 5;
    // Prefer nodes with more effects
    score += Object.keys(node.effects).length * 3;
    return { node, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.node ?? null;
}
