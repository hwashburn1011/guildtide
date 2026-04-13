import { ResourceType } from '../../../shared/src/enums';

export interface ResearchNode {
  id: string;
  name: string;
  description: string;
  branch: ResearchBranch;
  prerequisites: string[];
  cost: { resources: Partial<Record<ResourceType, number>>; timeSeconds: number };
  effects: Record<string, number>;
}

export enum ResearchBranch {
  Agriculture = 'agriculture',
  Logistics = 'logistics',
  Knowledge = 'knowledge',
  Military = 'military',
  Mastery = 'mastery',
}

export const RESEARCH_NODES: ResearchNode[] = [
  // ── Agriculture ──
  {
    id: 'agri_irrigation',
    name: 'Irrigation',
    description: 'Advanced water channels boost crop output.',
    branch: ResearchBranch.Agriculture,
    prerequisites: [],
    cost: { resources: { [ResourceType.Gold]: 200, [ResourceType.Wood]: 80, [ResourceType.Stone]: 40 }, timeSeconds: 300 },
    effects: { crop_bonus: 0.15 },
  },
  {
    id: 'agri_flood_control',
    name: 'Flood Control',
    description: 'Levees and drainage reduce flood damage.',
    branch: ResearchBranch.Agriculture,
    prerequisites: ['agri_irrigation'],
    cost: { resources: { [ResourceType.Gold]: 350, [ResourceType.Stone]: 120, [ResourceType.Wood]: 60 }, timeSeconds: 600 },
    effects: { flood_damage_reduction: 0.50 },
  },
  {
    id: 'agri_greenhouse',
    name: 'Greenhouse',
    description: 'Controlled environments improve herb yields.',
    branch: ResearchBranch.Agriculture,
    prerequisites: ['agri_irrigation'],
    cost: { resources: { [ResourceType.Gold]: 400, [ResourceType.Wood]: 150, [ResourceType.Herbs]: 50 }, timeSeconds: 900 },
    effects: { herb_bonus: 0.25 },
  },
  {
    id: 'agri_hydroponics',
    name: 'Hydroponics',
    description: 'Soil-free growing boosts all crop production.',
    branch: ResearchBranch.Agriculture,
    prerequisites: ['agri_flood_control', 'agri_greenhouse'],
    cost: { resources: { [ResourceType.Gold]: 600, [ResourceType.Water]: 200, [ResourceType.Essence]: 10 }, timeSeconds: 1200 },
    effects: { all_crop_bonus: 0.20 },
  },

  // ── Logistics ──
  {
    id: 'logi_pathfinding',
    name: 'Pathfinding',
    description: 'Optimized routes speed up travel.',
    branch: ResearchBranch.Logistics,
    prerequisites: [],
    cost: { resources: { [ResourceType.Gold]: 200, [ResourceType.Wood]: 60 }, timeSeconds: 300 },
    effects: { travel_speed: 0.10 },
  },
  {
    id: 'logi_weather_routing',
    name: 'Weather Routing',
    description: 'Forecasts help avoid bad weather on the road.',
    branch: ResearchBranch.Logistics,
    prerequisites: ['logi_pathfinding'],
    cost: { resources: { [ResourceType.Gold]: 350, [ResourceType.Herbs]: 40, [ResourceType.Essence]: 5 }, timeSeconds: 600 },
    effects: { weather_travel_penalty_reduction: 0.30 },
  },
  {
    id: 'logi_caravan_armor',
    name: 'Caravan Armor',
    description: 'Reinforced wagons reduce expedition risk.',
    branch: ResearchBranch.Logistics,
    prerequisites: ['logi_pathfinding'],
    cost: { resources: { [ResourceType.Gold]: 400, [ResourceType.Ore]: 100, [ResourceType.Stone]: 60 }, timeSeconds: 900 },
    effects: { expedition_risk_reduction: 0.25 },
  },
  {
    id: 'logi_trade_insurance',
    name: 'Trade Insurance',
    description: 'Contractual protections improve market sell prices.',
    branch: ResearchBranch.Logistics,
    prerequisites: ['logi_weather_routing', 'logi_caravan_armor'],
    cost: { resources: { [ResourceType.Gold]: 700, [ResourceType.Essence]: 15 }, timeSeconds: 1200 },
    effects: { market_sell_bonus: 0.15 },
  },

  // ── Knowledge ──
  {
    id: 'know_almanac',
    name: 'Almanac',
    description: 'Historical records reveal weather forecasts.',
    branch: ResearchBranch.Knowledge,
    prerequisites: [],
    cost: { resources: { [ResourceType.Gold]: 250, [ResourceType.Herbs]: 30 }, timeSeconds: 300 },
    effects: { show_weather_forecast: 1 },
  },
  {
    id: 'know_forecast_tower',
    name: 'Forecast Tower',
    description: 'A watchtower reveals the sources of world modifiers.',
    branch: ResearchBranch.Knowledge,
    prerequisites: ['know_almanac'],
    cost: { resources: { [ResourceType.Gold]: 400, [ResourceType.Stone]: 100, [ResourceType.Wood]: 80 }, timeSeconds: 600 },
    effects: { reveal_modifier_sources: 1 },
  },
  {
    id: 'know_market_observatory',
    name: 'Market Observatory',
    description: 'Traders share intel on price trends.',
    branch: ResearchBranch.Knowledge,
    prerequisites: ['know_almanac'],
    cost: { resources: { [ResourceType.Gold]: 450, [ResourceType.Essence]: 8 }, timeSeconds: 900 },
    effects: { show_price_trends: 1 },
  },
  {
    id: 'know_pattern_recognition',
    name: 'Pattern Recognition',
    description: 'Deep analysis reveals hidden world logic.',
    branch: ResearchBranch.Knowledge,
    prerequisites: ['know_forecast_tower', 'know_market_observatory'],
    cost: { resources: { [ResourceType.Gold]: 800, [ResourceType.Essence]: 25 }, timeSeconds: 1200 },
    effects: { reveal_hidden_logic: 1 },
  },

  // ── Military ──
  {
    id: 'mil_scouting',
    name: 'Scouting',
    description: 'Advance scouts improve hunting efficiency.',
    branch: ResearchBranch.Military,
    prerequisites: [],
    cost: { resources: { [ResourceType.Gold]: 200, [ResourceType.Food]: 60 }, timeSeconds: 300 },
    effects: { hunt_bonus: 0.20 },
  },
  {
    id: 'mil_advanced_trapping',
    name: 'Advanced Trapping',
    description: 'Better traps reduce dangerous trap event risk.',
    branch: ResearchBranch.Military,
    prerequisites: ['mil_scouting'],
    cost: { resources: { [ResourceType.Gold]: 350, [ResourceType.Wood]: 80, [ResourceType.Ore]: 40 }, timeSeconds: 600 },
    effects: { trap_event_risk_reduction: 0.40 },
  },
  {
    id: 'mil_siege_defense',
    name: 'Siege Defense',
    description: 'Fortifications increase building durability.',
    branch: ResearchBranch.Military,
    prerequisites: ['mil_scouting'],
    cost: { resources: { [ResourceType.Gold]: 450, [ResourceType.Stone]: 150, [ResourceType.Ore]: 80 }, timeSeconds: 900 },
    effects: { building_durability: 0.30 },
  },
  {
    id: 'mil_elite_training',
    name: 'Elite Training',
    description: 'Rigorous drills accelerate hero experience gain.',
    branch: ResearchBranch.Military,
    prerequisites: ['mil_advanced_trapping', 'mil_siege_defense'],
    cost: { resources: { [ResourceType.Gold]: 700, [ResourceType.Food]: 200, [ResourceType.Essence]: 12 }, timeSeconds: 1200 },
    effects: { hero_xp_bonus: 0.30 },
  },

  // ── Mastery (capstones) ──
  {
    id: 'mastery_farmer',
    name: 'Master Farmer',
    description: 'Ultimate agricultural mastery doubles farm output.',
    branch: ResearchBranch.Mastery,
    prerequisites: ['agri_flood_control', 'agri_greenhouse', 'agri_hydroponics'],
    cost: { resources: { [ResourceType.Gold]: 1500, [ResourceType.Essence]: 50 }, timeSeconds: 2400 },
    effects: { farm_output_multiplier: 1.0 },
  },
  {
    id: 'mastery_explorer',
    name: 'Master Explorer',
    description: 'Ultimate logistics mastery halves expedition time.',
    branch: ResearchBranch.Mastery,
    prerequisites: ['logi_weather_routing', 'logi_caravan_armor', 'logi_trade_insurance'],
    cost: { resources: { [ResourceType.Gold]: 1500, [ResourceType.Essence]: 50 }, timeSeconds: 2400 },
    effects: { expedition_time_multiplier: -0.50 },
  },
  {
    id: 'mastery_trader',
    name: 'Master Trader',
    description: 'Ultimate knowledge mastery gives market price advantage.',
    branch: ResearchBranch.Mastery,
    prerequisites: ['know_forecast_tower', 'know_market_observatory', 'know_pattern_recognition'],
    cost: { resources: { [ResourceType.Gold]: 1500, [ResourceType.Essence]: 50 }, timeSeconds: 2400 },
    effects: { market_price_advantage: 0.25 },
  },
  {
    id: 'mastery_scholar',
    name: 'Master Scholar',
    description: 'Ultimate military mastery unlocks elite hero abilities.',
    branch: ResearchBranch.Mastery,
    prerequisites: ['mil_advanced_trapping', 'mil_siege_defense', 'mil_elite_training'],
    cost: { resources: { [ResourceType.Gold]: 1500, [ResourceType.Essence]: 50 }, timeSeconds: 2400 },
    effects: { elite_hero_abilities: 1 },
  },
];

export const RESEARCH_MAP: Map<string, ResearchNode> = new Map(
  RESEARCH_NODES.map((n) => [n.id, n]),
);
