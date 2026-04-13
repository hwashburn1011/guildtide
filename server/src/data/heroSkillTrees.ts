import { HeroRole } from '../../../shared/src/enums';

// ── Skill tree data structure ──
export interface SkillNode {
  id: string;
  name: string;
  description: string;
  branch: number;          // 0, 1, or 2
  tier: number;            // 0-4 (5 skills per branch)
  levelRequired: number;   // minimum hero level to unlock
  prerequisiteIds: string[];
  effects: SkillEffect;
}

export interface SkillEffect {
  statBonuses?: Partial<Record<string, number>>;
  passiveLabel?: string;
  expeditionBonus?: number;
  buildingBonus?: number;
  moraleBonus?: number;
  xpBonus?: number;
  specialAbility?: string;
}

export interface SkillTree {
  role: HeroRole;
  branches: [string, string, string]; // branch names
  skills: SkillNode[];
}

function skill(
  id: string, name: string, description: string,
  branch: number, tier: number, levelRequired: number,
  prerequisiteIds: string[], effects: SkillEffect,
): SkillNode {
  return { id, name, description, branch, tier, levelRequired, prerequisiteIds, effects };
}

// ── FARMER ──
const farmerTree: SkillTree = {
  role: HeroRole.Farmer,
  branches: ['Green Thumb', 'Husbandry', 'Harvest Lord'],
  skills: [
    skill('farmer_b0_t0', 'Fertile Soil', 'Increases crop yield by 5%', 0, 0, 1, [], { buildingBonus: 0.05, passiveLabel: '+5% crop yield' }),
    skill('farmer_b0_t1', 'Irrigation', 'Water-based crop bonus +8%', 0, 1, 3, ['farmer_b0_t0'], { buildingBonus: 0.08, statBonuses: { endurance: 1 } }),
    skill('farmer_b0_t2', 'Crop Rotation', 'Reduces herb garden decay', 0, 2, 5, ['farmer_b0_t1'], { buildingBonus: 0.1, passiveLabel: 'Reduced decay' }),
    skill('farmer_b0_t3', 'Greenhouse', 'Weather immunity for farming', 0, 3, 10, ['farmer_b0_t2'], { specialAbility: 'weather_immune_farm' }),
    skill('farmer_b0_t4', 'Verdant Blessing', 'All plant yields +20%', 0, 4, 15, ['farmer_b0_t3'], { buildingBonus: 0.2, passiveLabel: '+20% plant yield' }),
    skill('farmer_b1_t0', 'Animal Care', 'Food production +5%', 1, 0, 1, [], { buildingBonus: 0.05 }),
    skill('farmer_b1_t1', 'Breeding', '+10% food from farm', 1, 1, 3, ['farmer_b1_t0'], { buildingBonus: 0.1 }),
    skill('farmer_b1_t2', 'Herding', 'Endurance +2', 1, 2, 5, ['farmer_b1_t1'], { statBonuses: { endurance: 2 } }),
    skill('farmer_b1_t3', 'Beastmaster', 'Expedition scout bonus', 1, 3, 10, ['farmer_b1_t2'], { expeditionBonus: 0.1, specialAbility: 'beast_scout' }),
    skill('farmer_b1_t4', 'Shepherd King', 'All animal output doubled', 1, 4, 15, ['farmer_b1_t3'], { buildingBonus: 0.25 }),
    skill('farmer_b2_t0', 'Quick Harvest', 'Collect speed +5%', 2, 0, 1, [], { buildingBonus: 0.05 }),
    skill('farmer_b2_t1', 'Abundance', 'Lucky harvest chance', 2, 1, 3, ['farmer_b2_t0'], { statBonuses: { luck: 1 } }),
    skill('farmer_b2_t2', 'Storage Mastery', 'Resource cap +10%', 2, 2, 5, ['farmer_b2_t1'], { passiveLabel: '+10% resource cap' }),
    skill('farmer_b2_t3', 'Festival Feast', 'Morale boost from harvests', 2, 3, 10, ['farmer_b2_t2'], { moraleBonus: 5 }),
    skill('farmer_b2_t4', 'Harvest Lord', 'Massive end-of-season bonus', 2, 4, 15, ['farmer_b2_t3'], { buildingBonus: 0.3, xpBonus: 0.15 }),
  ],
};

// ── SCOUT ──
const scoutTree: SkillTree = {
  role: HeroRole.Scout,
  branches: ['Pathfinder', 'Survivalist', 'Cartographer'],
  skills: [
    skill('scout_b0_t0', 'Keen Eyes', 'Expedition discovery +5%', 0, 0, 1, [], { expeditionBonus: 0.05 }),
    skill('scout_b0_t1', 'Trailblazer', 'Travel speed +10%', 0, 1, 3, ['scout_b0_t0'], { expeditionBonus: 0.1, passiveLabel: '+10% travel speed' }),
    skill('scout_b0_t2', 'Shortcut', 'Expedition duration -10%', 0, 2, 5, ['scout_b0_t1'], { specialAbility: 'fast_expedition' }),
    skill('scout_b0_t3', 'Wayfinder', 'Agility +3', 0, 3, 10, ['scout_b0_t2'], { statBonuses: { agility: 3 } }),
    skill('scout_b0_t4', 'Master Pathfinder', 'Unlock hidden expedition routes', 0, 4, 15, ['scout_b0_t3'], { specialAbility: 'hidden_routes', expeditionBonus: 0.2 }),
    skill('scout_b1_t0', 'Foraging', 'Find herbs on expeditions', 1, 0, 1, [], { expeditionBonus: 0.05 }),
    skill('scout_b1_t1', 'Camp Craft', 'Injury chance -10%', 1, 1, 3, ['scout_b1_t0'], { specialAbility: 'reduce_injury' }),
    skill('scout_b1_t2', 'Weather Reading', 'Weather penalty halved', 1, 2, 5, ['scout_b1_t1'], { specialAbility: 'weather_resist' }),
    skill('scout_b1_t3', 'Endurance Training', 'Endurance +3', 1, 3, 10, ['scout_b1_t2'], { statBonuses: { endurance: 3 } }),
    skill('scout_b1_t4', 'Lone Wolf', 'Solo expedition bonus +30%', 1, 4, 15, ['scout_b1_t3'], { expeditionBonus: 0.3, specialAbility: 'solo_bonus' }),
    skill('scout_b2_t0', 'Map Sketching', 'Reveal area details', 2, 0, 1, [], { passiveLabel: 'Area reveal' }),
    skill('scout_b2_t1', 'Land Survey', 'Building placement insight', 2, 1, 3, ['scout_b2_t0'], { buildingBonus: 0.05 }),
    skill('scout_b2_t2', 'Terrain Expert', 'Biome affinity bonus', 2, 2, 5, ['scout_b2_t1'], { expeditionBonus: 0.1 }),
    skill('scout_b2_t3', 'Explorer\'s Log', 'XP gain +10%', 2, 3, 10, ['scout_b2_t2'], { xpBonus: 0.1 }),
    skill('scout_b2_t4', 'Grand Cartographer', 'All expedition rewards +15%', 2, 4, 15, ['scout_b2_t3'], { expeditionBonus: 0.15 }),
  ],
};

// ── MERCHANT ──
const merchantTree: SkillTree = {
  role: HeroRole.Merchant,
  branches: ['Haggler', 'Trader', 'Magnate'],
  skills: [
    skill('merchant_b0_t0', 'Silver Tongue', 'Market prices -3%', 0, 0, 1, [], { passiveLabel: '-3% buy prices' }),
    skill('merchant_b0_t1', 'Negotiation', 'Market prices -5%', 0, 1, 3, ['merchant_b0_t0'], { passiveLabel: '-5% buy prices' }),
    skill('merchant_b0_t2', 'Bulk Deals', 'Quantity discounts', 0, 2, 5, ['merchant_b0_t1'], { specialAbility: 'bulk_discount' }),
    skill('merchant_b0_t3', 'Charm', 'Intellect +3', 0, 3, 10, ['merchant_b0_t2'], { statBonuses: { intellect: 3 } }),
    skill('merchant_b0_t4', 'Master Haggler', 'All trades +20% profit', 0, 4, 15, ['merchant_b0_t3'], { passiveLabel: '+20% trade profit' }),
    skill('merchant_b1_t0', 'Trade Routes', 'Caravan income +5%', 1, 0, 1, [], { buildingBonus: 0.05 }),
    skill('merchant_b1_t1', 'Supply Chain', 'Resource conversion +8%', 1, 1, 3, ['merchant_b1_t0'], { buildingBonus: 0.08 }),
    skill('merchant_b1_t2', 'Exotic Goods', 'Rare item find chance', 1, 2, 5, ['merchant_b1_t1'], { specialAbility: 'rare_find' }),
    skill('merchant_b1_t3', 'Trade Empire', 'Market building output +15%', 1, 3, 10, ['merchant_b1_t2'], { buildingBonus: 0.15 }),
    skill('merchant_b1_t4', 'Golden Network', 'Passive gold generation', 1, 4, 15, ['merchant_b1_t3'], { passiveLabel: 'Passive gold +5/hr', specialAbility: 'passive_gold' }),
    skill('merchant_b2_t0', 'Appraisal', 'Sell prices +5%', 2, 0, 1, [], { passiveLabel: '+5% sell prices' }),
    skill('merchant_b2_t1', 'Investment', 'Gold interest over time', 2, 1, 3, ['merchant_b2_t0'], { specialAbility: 'gold_interest' }),
    skill('merchant_b2_t2', 'Market Insight', 'See price trends early', 2, 2, 5, ['merchant_b2_t1'], { specialAbility: 'price_prediction' }),
    skill('merchant_b2_t3', 'Monopoly', 'Luck +3', 2, 3, 10, ['merchant_b2_t2'], { statBonuses: { luck: 3 } }),
    skill('merchant_b2_t4', 'Tycoon', 'All gold income +25%', 2, 4, 15, ['merchant_b2_t3'], { passiveLabel: '+25% gold income' }),
  ],
};

// ── BLACKSMITH ──
const blacksmithTree: SkillTree = {
  role: HeroRole.Blacksmith,
  branches: ['Forgemaster', 'Armorsmith', 'Enchanter'],
  skills: [
    skill('smith_b0_t0', 'Hot Iron', 'Crafting speed +5%', 0, 0, 1, [], { buildingBonus: 0.05 }),
    skill('smith_b0_t1', 'Tempered Steel', 'Weapon quality +8%', 0, 1, 3, ['smith_b0_t0'], { buildingBonus: 0.08 }),
    skill('smith_b0_t2', 'Masterwork', 'Chance of superior craft', 0, 2, 5, ['smith_b0_t1'], { specialAbility: 'masterwork_chance' }),
    skill('smith_b0_t3', 'Strength +3', 'Raw forging power', 0, 3, 10, ['smith_b0_t2'], { statBonuses: { strength: 3 } }),
    skill('smith_b0_t4', 'Legendary Forge', 'Craft legendary items', 0, 4, 15, ['smith_b0_t3'], { specialAbility: 'legendary_craft', buildingBonus: 0.25 }),
    skill('smith_b1_t0', 'Plating', 'Armor output +5%', 1, 0, 1, [], { buildingBonus: 0.05 }),
    skill('smith_b1_t1', 'Reinforcement', 'Equipment durability +10%', 1, 1, 3, ['smith_b1_t0'], { passiveLabel: '+10% durability' }),
    skill('smith_b1_t2', 'Alloy Mix', 'Ore efficiency +10%', 1, 2, 5, ['smith_b1_t1'], { buildingBonus: 0.1 }),
    skill('smith_b1_t3', 'Fortress Plate', 'Endurance +3', 1, 3, 10, ['smith_b1_t2'], { statBonuses: { endurance: 3 } }),
    skill('smith_b1_t4', 'Impervious Armor', 'Expedition injury immunity', 1, 4, 15, ['smith_b1_t3'], { specialAbility: 'injury_immune' }),
    skill('smith_b2_t0', 'Rune Etching', 'Minor enchant chance', 2, 0, 1, [], { specialAbility: 'minor_enchant' }),
    skill('smith_b2_t1', 'Gem Setting', 'Equipment bonus slots', 2, 1, 3, ['smith_b2_t0'], { passiveLabel: 'Bonus equipment slot' }),
    skill('smith_b2_t2', 'Arcane Infusion', 'Intellect +2', 2, 2, 5, ['smith_b2_t1'], { statBonuses: { intellect: 2 } }),
    skill('smith_b2_t3', 'Soul Forge', 'Essence-powered crafts', 2, 3, 10, ['smith_b2_t2'], { specialAbility: 'essence_craft' }),
    skill('smith_b2_t4', 'Grand Enchanter', 'All gear gains bonus stats', 2, 4, 15, ['smith_b2_t3'], { passiveLabel: '+15% gear stats', buildingBonus: 0.15 }),
  ],
};

// ── ALCHEMIST ──
const alchemistTree: SkillTree = {
  role: HeroRole.Alchemist,
  branches: ['Herbalist', 'Transmuter', 'Elixirist'],
  skills: [
    skill('alch_b0_t0', 'Herb Lore', 'Herb yield +5%', 0, 0, 1, [], { buildingBonus: 0.05 }),
    skill('alch_b0_t1', 'Distillation', 'Potion quality +8%', 0, 1, 3, ['alch_b0_t0'], { buildingBonus: 0.08 }),
    skill('alch_b0_t2', 'Rare Extracts', 'Find rare ingredients', 0, 2, 5, ['alch_b0_t1'], { specialAbility: 'rare_ingredient' }),
    skill('alch_b0_t3', 'Intellect +3', 'Deep botanical knowledge', 0, 3, 10, ['alch_b0_t2'], { statBonuses: { intellect: 3 } }),
    skill('alch_b0_t4', 'Philosopher Stone', 'Transmute any resource', 0, 4, 15, ['alch_b0_t3'], { specialAbility: 'universal_transmute' }),
    skill('alch_b1_t0', 'Basic Transmute', 'Convert resources at lab', 1, 0, 1, [], { buildingBonus: 0.05 }),
    skill('alch_b1_t1', 'Efficient Conversion', 'Less resource waste', 1, 1, 3, ['alch_b1_t0'], { buildingBonus: 0.08 }),
    skill('alch_b1_t2', 'Gold Synthesis', 'Convert ore to gold', 1, 2, 5, ['alch_b1_t1'], { specialAbility: 'ore_to_gold' }),
    skill('alch_b1_t3', 'Essence Refining', 'Essence output +15%', 1, 3, 10, ['alch_b1_t2'], { buildingBonus: 0.15 }),
    skill('alch_b1_t4', 'Master Transmuter', 'Dual resource output', 1, 4, 15, ['alch_b1_t3'], { specialAbility: 'dual_output', buildingBonus: 0.2 }),
    skill('alch_b2_t0', 'Healing Salve', 'Recovery speed +10%', 2, 0, 1, [], { passiveLabel: 'Fast recovery' }),
    skill('alch_b2_t1', 'Stamina Brew', 'Endurance +2', 2, 1, 3, ['alch_b2_t0'], { statBonuses: { endurance: 2 } }),
    skill('alch_b2_t2', 'Morale Tonic', 'Morale recovery +10%', 2, 2, 5, ['alch_b2_t1'], { moraleBonus: 5 }),
    skill('alch_b2_t3', 'Elixir of Power', 'Temporary stat boost', 2, 3, 10, ['alch_b2_t2'], { specialAbility: 'stat_elixir' }),
    skill('alch_b2_t4', 'Grand Elixirist', 'Permanent team buff aura', 2, 4, 15, ['alch_b2_t3'], { statBonuses: { strength: 1, agility: 1, intellect: 1, endurance: 1, luck: 1 } }),
  ],
};

// ── HUNTER ──
const hunterTree: SkillTree = {
  role: HeroRole.Hunter,
  branches: ['Marksman', 'Trapper', 'Beast Tamer'],
  skills: [
    skill('hunter_b0_t0', 'Steady Aim', 'Expedition combat +5%', 0, 0, 1, [], { expeditionBonus: 0.05 }),
    skill('hunter_b0_t1', 'Precision Shot', 'Agility +2', 0, 1, 3, ['hunter_b0_t0'], { statBonuses: { agility: 2 } }),
    skill('hunter_b0_t2', 'Critical Eye', 'Crit chance on expeditions', 0, 2, 5, ['hunter_b0_t1'], { specialAbility: 'crit_chance' }),
    skill('hunter_b0_t3', 'Eagle Eye', 'Discovery range +15%', 0, 3, 10, ['hunter_b0_t2'], { expeditionBonus: 0.15 }),
    skill('hunter_b0_t4', 'Deadeye', 'Guaranteed expedition success', 0, 4, 15, ['hunter_b0_t3'], { specialAbility: 'perfect_aim', expeditionBonus: 0.25 }),
    skill('hunter_b1_t0', 'Snare', 'Trap small game', 1, 0, 1, [], { expeditionBonus: 0.05 }),
    skill('hunter_b1_t1', 'Pitfall', 'Catch larger prey', 1, 1, 3, ['hunter_b1_t0'], { expeditionBonus: 0.08 }),
    skill('hunter_b1_t2', 'Net Mastery', 'Capture rare creatures', 1, 2, 5, ['hunter_b1_t1'], { specialAbility: 'rare_capture' }),
    skill('hunter_b1_t3', 'Ambush', 'Strength +3', 1, 3, 10, ['hunter_b1_t2'], { statBonuses: { strength: 3 } }),
    skill('hunter_b1_t4', 'Master Trapper', 'Passive food generation', 1, 4, 15, ['hunter_b1_t3'], { specialAbility: 'passive_food', buildingBonus: 0.2 }),
    skill('hunter_b2_t0', 'Animal Bond', 'Companion on expeditions', 2, 0, 1, [], { expeditionBonus: 0.05 }),
    skill('hunter_b2_t1', 'Pack Leader', 'Companion strength +10%', 2, 1, 3, ['hunter_b2_t0'], { expeditionBonus: 0.1 }),
    skill('hunter_b2_t2', 'War Mount', 'Travel speed +10%', 2, 2, 5, ['hunter_b2_t1'], { passiveLabel: '+10% travel speed' }),
    skill('hunter_b2_t3', 'Feral Instinct', 'Luck +3', 2, 3, 10, ['hunter_b2_t2'], { statBonuses: { luck: 3 } }),
    skill('hunter_b2_t4', 'Alpha', 'All companions buffed', 2, 4, 15, ['hunter_b2_t3'], { expeditionBonus: 0.2, specialAbility: 'alpha_pack' }),
  ],
};

// ── DEFENDER ──
const defenderTree: SkillTree = {
  role: HeroRole.Defender,
  branches: ['Guardian', 'Fortifier', 'Warden'],
  skills: [
    skill('def_b0_t0', 'Shield Wall', 'Reduce party damage -5%', 0, 0, 1, [], { expeditionBonus: 0.05 }),
    skill('def_b0_t1', 'Iron Stance', 'Endurance +2', 0, 1, 3, ['def_b0_t0'], { statBonuses: { endurance: 2 } }),
    skill('def_b0_t2', 'Taunt', 'Draw enemy attacks', 0, 2, 5, ['def_b0_t1'], { specialAbility: 'taunt' }),
    skill('def_b0_t3', 'Unbreakable', 'Injury resist +20%', 0, 3, 10, ['def_b0_t2'], { specialAbility: 'injury_resist' }),
    skill('def_b0_t4', 'Immortal Guard', 'Cannot be injured', 0, 4, 15, ['def_b0_t3'], { specialAbility: 'immune_injury', statBonuses: { endurance: 5 } }),
    skill('def_b1_t0', 'Barricade', 'Building defense +5%', 1, 0, 1, [], { buildingBonus: 0.05 }),
    skill('def_b1_t1', 'Watchtower', 'Early warning system', 1, 1, 3, ['def_b1_t0'], { specialAbility: 'early_warning' }),
    skill('def_b1_t2', 'Reinforced Walls', 'Building durability +10%', 1, 2, 5, ['def_b1_t1'], { buildingBonus: 0.1 }),
    skill('def_b1_t3', 'Strength +3', 'Fortification mastery', 1, 3, 10, ['def_b1_t2'], { statBonuses: { strength: 3 } }),
    skill('def_b1_t4', 'Citadel', 'All buildings gain defense', 1, 4, 15, ['def_b1_t3'], { buildingBonus: 0.2, specialAbility: 'citadel_defense' }),
    skill('def_b2_t0', 'Patrol', 'Guild security +5%', 2, 0, 1, [], { passiveLabel: '+5% guild security' }),
    skill('def_b2_t1', 'Vigilance', 'Event detection bonus', 2, 1, 3, ['def_b2_t0'], { specialAbility: 'event_detect' }),
    skill('def_b2_t2', 'Rally', 'Morale boost to nearby heroes', 2, 2, 5, ['def_b2_t1'], { moraleBonus: 5 }),
    skill('def_b2_t3', 'Commander', 'Party stat boost +5%', 2, 3, 10, ['def_b2_t2'], { expeditionBonus: 0.1 }),
    skill('def_b2_t4', 'Grand Warden', 'Permanent guild defense aura', 2, 4, 15, ['def_b2_t3'], { buildingBonus: 0.15, moraleBonus: 10 }),
  ],
};

// ── MYSTIC ──
const mysticTree: SkillTree = {
  role: HeroRole.Mystic,
  branches: ['Seer', 'Channeler', 'Enchantress'],
  skills: [
    skill('mystic_b0_t0', 'Foresight', 'Event prediction', 0, 0, 1, [], { specialAbility: 'foresight' }),
    skill('mystic_b0_t1', 'Divination', 'Expedition loot preview', 0, 1, 3, ['mystic_b0_t0'], { specialAbility: 'loot_preview' }),
    skill('mystic_b0_t2', 'Oracle', 'Intellect +3', 0, 2, 5, ['mystic_b0_t1'], { statBonuses: { intellect: 3 } }),
    skill('mystic_b0_t3', 'Time Glimpse', 'See future market prices', 0, 3, 10, ['mystic_b0_t2'], { specialAbility: 'market_foresight' }),
    skill('mystic_b0_t4', 'Grand Seer', 'Perfect event outcomes', 0, 4, 15, ['mystic_b0_t3'], { specialAbility: 'perfect_foresight', xpBonus: 0.2 }),
    skill('mystic_b1_t0', 'Essence Tap', 'Essence gain +5%', 1, 0, 1, [], { buildingBonus: 0.05 }),
    skill('mystic_b1_t1', 'Mana Flow', 'Lab output +8%', 1, 1, 3, ['mystic_b1_t0'], { buildingBonus: 0.08 }),
    skill('mystic_b1_t2', 'Power Surge', 'Temporary buff on activation', 1, 2, 5, ['mystic_b1_t1'], { specialAbility: 'power_surge' }),
    skill('mystic_b1_t3', 'Ley Lines', 'All magical buildings +10%', 1, 3, 10, ['mystic_b1_t2'], { buildingBonus: 0.1 }),
    skill('mystic_b1_t4', 'Grand Channeler', 'Essence production doubled', 1, 4, 15, ['mystic_b1_t3'], { buildingBonus: 0.25, specialAbility: 'essence_double' }),
    skill('mystic_b2_t0', 'Minor Blessing', 'Team morale +3', 2, 0, 1, [], { moraleBonus: 3 }),
    skill('mystic_b2_t1', 'Ward', 'Expedition protection +5%', 2, 1, 3, ['mystic_b2_t0'], { expeditionBonus: 0.05 }),
    skill('mystic_b2_t2', 'Hex', 'Weaken expedition enemies', 2, 2, 5, ['mystic_b2_t1'], { expeditionBonus: 0.1 }),
    skill('mystic_b2_t3', 'Luck +3', 'Fortune magic', 2, 3, 10, ['mystic_b2_t2'], { statBonuses: { luck: 3 } }),
    skill('mystic_b2_t4', 'Grand Enchantress', 'All heroes gain +2 stats', 2, 4, 15, ['mystic_b2_t3'], { statBonuses: { strength: 2, agility: 2, intellect: 2, endurance: 2, luck: 2 } }),
  ],
};

// ── CARAVAN MASTER ──
const caravanTree: SkillTree = {
  role: HeroRole.CaravanMaster,
  branches: ['Logistics', 'Diplomacy', 'Expeditionary'],
  skills: [
    skill('caravan_b0_t0', 'Pack Mule', 'Carry capacity +5%', 0, 0, 1, [], { expeditionBonus: 0.05 }),
    skill('caravan_b0_t1', 'Efficient Routes', 'Travel cost -10%', 0, 1, 3, ['caravan_b0_t0'], { passiveLabel: '-10% travel cost' }),
    skill('caravan_b0_t2', 'Supply Depot', 'Resource transfer +10%', 0, 2, 5, ['caravan_b0_t1'], { buildingBonus: 0.1 }),
    skill('caravan_b0_t3', 'Endurance +3', 'Long-haul stamina', 0, 3, 10, ['caravan_b0_t2'], { statBonuses: { endurance: 3 } }),
    skill('caravan_b0_t4', 'Grand Logistics', 'All transport free', 0, 4, 15, ['caravan_b0_t3'], { specialAbility: 'free_transport', buildingBonus: 0.2 }),
    skill('caravan_b1_t0', 'Parley', 'NPC faction rep +5%', 1, 0, 1, [], { passiveLabel: '+5% faction rep' }),
    skill('caravan_b1_t1', 'Cultural Exchange', 'Trade bonus with factions', 1, 1, 3, ['caravan_b1_t0'], { buildingBonus: 0.05 }),
    skill('caravan_b1_t2', 'Alliance', 'Faction missions available', 1, 2, 5, ['caravan_b1_t1'], { specialAbility: 'faction_missions' }),
    skill('caravan_b1_t3', 'Intellect +3', 'Diplomatic acumen', 1, 3, 10, ['caravan_b1_t2'], { statBonuses: { intellect: 3 } }),
    skill('caravan_b1_t4', 'Grand Diplomat', 'All factions friendly', 1, 4, 15, ['caravan_b1_t3'], { specialAbility: 'universal_friend', moraleBonus: 10 }),
    skill('caravan_b2_t0', 'Scout Ahead', 'Expedition info +5%', 2, 0, 1, [], { expeditionBonus: 0.05 }),
    skill('caravan_b2_t1', 'Guard Detail', 'Expedition safety +8%', 2, 1, 3, ['caravan_b2_t0'], { expeditionBonus: 0.08 }),
    skill('caravan_b2_t2', 'Provision Master', 'No food cost on expeditions', 2, 2, 5, ['caravan_b2_t1'], { specialAbility: 'no_food_cost' }),
    skill('caravan_b2_t3', 'Agility +3', 'Quick caravan tactics', 2, 3, 10, ['caravan_b2_t2'], { statBonuses: { agility: 3 } }),
    skill('caravan_b2_t4', 'Grand Expeditionary', 'All expedition rewards +20%', 2, 4, 15, ['caravan_b2_t3'], { expeditionBonus: 0.2, xpBonus: 0.15 }),
  ],
};

// ── ARCHIVIST ──
const archivistTree: SkillTree = {
  role: HeroRole.Archivist,
  branches: ['Researcher', 'Lorekeeper', 'Sage'],
  skills: [
    skill('arch_b0_t0', 'Speed Reading', 'Research speed +5%', 0, 0, 1, [], { buildingBonus: 0.05 }),
    skill('arch_b0_t1', 'Cross-Reference', 'Research efficiency +8%', 0, 1, 3, ['arch_b0_t0'], { buildingBonus: 0.08 }),
    skill('arch_b0_t2', 'Breakthrough', 'Chance to skip research step', 0, 2, 5, ['arch_b0_t1'], { specialAbility: 'research_skip' }),
    skill('arch_b0_t3', 'Intellect +4', 'Deep study mastery', 0, 3, 10, ['arch_b0_t2'], { statBonuses: { intellect: 4 } }),
    skill('arch_b0_t4', 'Grand Researcher', 'Research time halved', 0, 4, 15, ['arch_b0_t3'], { buildingBonus: 0.25, specialAbility: 'fast_research' }),
    skill('arch_b1_t0', 'Ancient Texts', 'Unlock lore entries', 1, 0, 1, [], { passiveLabel: 'Lore unlocks' }),
    skill('arch_b1_t1', 'Cipher', 'Decode hidden information', 1, 1, 3, ['arch_b1_t0'], { specialAbility: 'decode' }),
    skill('arch_b1_t2', 'History Lesson', 'XP gain +10%', 1, 2, 5, ['arch_b1_t1'], { xpBonus: 0.1 }),
    skill('arch_b1_t3', 'Forgotten Knowledge', 'Unlock ancient crafts', 1, 3, 10, ['arch_b1_t2'], { specialAbility: 'ancient_craft' }),
    skill('arch_b1_t4', 'Grand Lorekeeper', 'All XP gains +20%', 1, 4, 15, ['arch_b1_t3'], { xpBonus: 0.2, passiveLabel: '+20% XP to all' }),
    skill('arch_b2_t0', 'Meditation', 'Morale recovery +5%', 2, 0, 1, [], { moraleBonus: 3 }),
    skill('arch_b2_t1', 'Wisdom', 'Luck +2', 2, 1, 3, ['arch_b2_t0'], { statBonuses: { luck: 2 } }),
    skill('arch_b2_t2', 'Prophecy', 'Event outcome bonus', 2, 2, 5, ['arch_b2_t1'], { specialAbility: 'event_bonus' }),
    skill('arch_b2_t3', 'Enlightenment', 'All stats +1', 2, 3, 10, ['arch_b2_t2'], { statBonuses: { strength: 1, agility: 1, intellect: 1, endurance: 1, luck: 1 } }),
    skill('arch_b2_t4', 'Grand Sage', 'Guild-wide knowledge aura', 2, 4, 15, ['arch_b2_t3'], { buildingBonus: 0.15, xpBonus: 0.15, moraleBonus: 5 }),
  ],
};

// ── Master map ──
export const SKILL_TREES: Record<string, SkillTree> = {
  [HeroRole.Farmer]: farmerTree,
  [HeroRole.Scout]: scoutTree,
  [HeroRole.Merchant]: merchantTree,
  [HeroRole.Blacksmith]: blacksmithTree,
  [HeroRole.Alchemist]: alchemistTree,
  [HeroRole.Hunter]: hunterTree,
  [HeroRole.Defender]: defenderTree,
  [HeroRole.Mystic]: mysticTree,
  [HeroRole.CaravanMaster]: caravanTree,
  [HeroRole.Archivist]: archivistTree,
};

export function getSkillTree(role: HeroRole): SkillTree | undefined {
  return SKILL_TREES[role];
}

export function getSkillById(role: HeroRole, skillId: string): SkillNode | undefined {
  const tree = SKILL_TREES[role];
  if (!tree) return undefined;
  return tree.skills.find(s => s.id === skillId);
}
