/**
 * Hero and enemy combat abilities for the auto-battler system.
 *
 * T-1244: Combat round processing (attack, defend, skill use, item use)
 * T-1248: Healing ability for Healer role heroes
 * T-1249: Buff/debuff system for combat status effects
 * T-1250: 10 combat status effects
 * T-1311: Hero revival mechanic from Healer skill
 * T-1312: Combat combo system for sequential hero attacks
 * T-1313: Ultimate ability system charged over multiple rounds
 * T-1314: Element system (fire, water, earth, air, light, dark)
 * T-1315: Elemental weakness/resistance chart
 */

import type { DamageType } from './enemyDefinitions';
import { HeroRole } from '../../../shared/src/enums';

// ── Status Effect Definitions (T-1250) ──

export interface StatusEffectDef {
  id: string;
  name: string;
  description: string;
  type: 'debuff' | 'buff';
  stackable: boolean;
  maxStacks: number;
  tickEffect?: 'damage' | 'heal';
  tickPower?: number;
  statModifiers?: Partial<Record<string, number>>; // multiplier: 0.8 = -20%
}

export const STATUS_EFFECTS: Record<string, StatusEffectDef> = {
  poison: {
    id: 'poison',
    name: 'Poison',
    description: 'Takes damage each turn.',
    type: 'debuff',
    stackable: true,
    maxStacks: 3,
    tickEffect: 'damage',
    tickPower: 5,
  },
  burn: {
    id: 'burn',
    name: 'Burn',
    description: 'Takes fire damage each turn and reduced defense.',
    type: 'debuff',
    stackable: false,
    maxStacks: 1,
    tickEffect: 'damage',
    tickPower: 8,
    statModifiers: { defense: 0.8 },
  },
  freeze: {
    id: 'freeze',
    name: 'Freeze',
    description: 'Cannot act. Takes increased damage.',
    type: 'debuff',
    stackable: false,
    maxStacks: 1,
    statModifiers: { speed: 0, defense: 0.7 },
  },
  stun: {
    id: 'stun',
    name: 'Stun',
    description: 'Cannot act this turn.',
    type: 'debuff',
    stackable: false,
    maxStacks: 1,
    statModifiers: { speed: 0 },
  },
  shield: {
    id: 'shield',
    name: 'Shield',
    description: 'Absorbs incoming damage.',
    type: 'buff',
    stackable: false,
    maxStacks: 1,
    statModifiers: { defense: 1.5 },
  },
  regen: {
    id: 'regen',
    name: 'Regeneration',
    description: 'Recovers HP each turn.',
    type: 'buff',
    stackable: false,
    maxStacks: 1,
    tickEffect: 'heal',
    tickPower: 8,
  },
  haste: {
    id: 'haste',
    name: 'Haste',
    description: 'Increased speed and attack rate.',
    type: 'buff',
    stackable: false,
    maxStacks: 1,
    statModifiers: { speed: 1.5, attack: 1.1 },
  },
  slow: {
    id: 'slow',
    name: 'Slow',
    description: 'Reduced speed.',
    type: 'debuff',
    stackable: false,
    maxStacks: 1,
    statModifiers: { speed: 0.5 },
  },
  blind: {
    id: 'blind',
    name: 'Blind',
    description: 'Greatly reduced accuracy.',
    type: 'debuff',
    stackable: false,
    maxStacks: 1,
    statModifiers: { accuracy: 0.5 },
  },
  berserk: {
    id: 'berserk',
    name: 'Berserk',
    description: 'Increased attack but reduced defense.',
    type: 'buff',
    stackable: false,
    maxStacks: 1,
    statModifiers: { attack: 1.5, defense: 0.6 },
  },
};

// ── Elemental Weakness Chart (T-1314, T-1315) ──

export const ELEMENT_CHART: Record<DamageType, { weakTo: DamageType[]; strongAgainst: DamageType[] }> = {
  physical: { weakTo: [], strongAgainst: [] },
  fire: { weakTo: ['ice'], strongAgainst: ['ice', 'poison'] },
  ice: { weakTo: ['fire', 'lightning'], strongAgainst: ['fire'] },
  lightning: { weakTo: ['physical'], strongAgainst: ['ice'] },
  poison: { weakTo: ['fire', 'light'], strongAgainst: ['physical'] },
  dark: { weakTo: ['light'], strongAgainst: ['poison'] },
  light: { weakTo: ['dark'], strongAgainst: ['dark'] },
};

/**
 * Get elemental damage multiplier.
 * Returns 1.5 for strong matchup, 0.5 for weak, 1.0 for neutral.
 */
export function getElementMultiplier(attackType: DamageType, defenderWeaknesses: DamageType[], defenderResistances: DamageType[]): number {
  if (defenderWeaknesses.includes(attackType)) return 1.5;
  if (defenderResistances.includes(attackType)) return 0.5;
  return 1.0;
}

// ── Hero Combat Abilities (role-based) ──

export interface HeroCombatAbility {
  id: string;
  name: string;
  description: string;
  role: HeroRole | null; // null = available to all
  damageType: DamageType;
  power: number;
  accuracy: number;
  cooldown: number;
  targetType: 'single_enemy' | 'all_enemies' | 'single_ally' | 'all_allies' | 'self';
  statusEffect?: string;
  statusChance?: number;
  statusDuration?: number;
  healPower?: number;
  isUltimate?: boolean;     // T-1313: ultimate ability
  ultimateCharge?: number;  // rounds to charge
  comboTag?: string;        // T-1312: combo chain tag
  revive?: boolean;         // T-1311: can revive dead allies
}

export const HERO_COMBAT_ABILITIES: HeroCombatAbility[] = [
  // Basic attack — all roles
  {
    id: 'basic_attack',
    name: 'Basic Attack',
    description: 'A standard attack.',
    role: null,
    damageType: 'physical',
    power: 10,
    accuracy: 85,
    cooldown: 0,
    targetType: 'single_enemy',
  },

  // Defender abilities
  {
    id: 'shield_bash',
    name: 'Shield Bash',
    description: 'Strikes with a shield, potentially stunning.',
    role: HeroRole.Defender,
    damageType: 'physical',
    power: 12,
    accuracy: 80,
    cooldown: 2,
    targetType: 'single_enemy',
    statusEffect: 'stun',
    statusChance: 0.3,
    statusDuration: 1,
  },
  {
    id: 'fortify',
    name: 'Fortify',
    description: 'Raises shield, boosting defense for the team.',
    role: HeroRole.Defender,
    damageType: 'physical',
    power: 0,
    accuracy: 100,
    cooldown: 3,
    targetType: 'all_allies',
    statusEffect: 'shield',
    statusChance: 1.0,
    statusDuration: 2,
  },
  {
    id: 'last_stand',
    name: 'Last Stand',
    description: 'Ultimate: massive defense boost and taunt.',
    role: HeroRole.Defender,
    damageType: 'physical',
    power: 0,
    accuracy: 100,
    cooldown: 0,
    targetType: 'self',
    statusEffect: 'shield',
    statusChance: 1.0,
    statusDuration: 3,
    isUltimate: true,
    ultimateCharge: 5,
  },

  // Hunter abilities
  {
    id: 'aimed_shot',
    name: 'Aimed Shot',
    description: 'A precise ranged attack with high crit chance.',
    role: HeroRole.Hunter,
    damageType: 'physical',
    power: 18,
    accuracy: 92,
    cooldown: 2,
    targetType: 'single_enemy',
  },
  {
    id: 'volley',
    name: 'Arrow Volley',
    description: 'Rains arrows on all enemies.',
    role: HeroRole.Hunter,
    damageType: 'physical',
    power: 10,
    accuracy: 75,
    cooldown: 3,
    targetType: 'all_enemies',
  },
  {
    id: 'kill_shot',
    name: 'Kill Shot',
    description: 'Ultimate: devastating single-target attack.',
    role: HeroRole.Hunter,
    damageType: 'physical',
    power: 40,
    accuracy: 95,
    cooldown: 0,
    targetType: 'single_enemy',
    isUltimate: true,
    ultimateCharge: 4,
    comboTag: 'finisher',
  },

  // Mystic abilities
  {
    id: 'arcane_bolt',
    name: 'Arcane Bolt',
    description: 'A bolt of magical energy.',
    role: HeroRole.Mystic,
    damageType: 'light',
    power: 16,
    accuracy: 88,
    cooldown: 0,
    targetType: 'single_enemy',
  },
  {
    id: 'heal',
    name: 'Healing Light',
    description: 'Restores HP to an ally.',
    role: HeroRole.Mystic,
    damageType: 'light',
    power: 0,
    accuracy: 100,
    cooldown: 2,
    targetType: 'single_ally',
    healPower: 25,
  },
  {
    id: 'mass_heal',
    name: 'Radiance',
    description: 'Ultimate: heals entire party and removes debuffs.',
    role: HeroRole.Mystic,
    damageType: 'light',
    power: 0,
    accuracy: 100,
    cooldown: 0,
    targetType: 'all_allies',
    healPower: 20,
    isUltimate: true,
    ultimateCharge: 5,
  },
  // T-1311: Revival ability
  {
    id: 'revive',
    name: 'Resurrect',
    description: 'Brings a fallen ally back to life.',
    role: HeroRole.Mystic,
    damageType: 'light',
    power: 0,
    accuracy: 100,
    cooldown: 6,
    targetType: 'single_ally',
    healPower: 30,
    revive: true,
  },

  // Alchemist abilities
  {
    id: 'acid_flask',
    name: 'Acid Flask',
    description: 'Throws a flask of corrosive acid.',
    role: HeroRole.Alchemist,
    damageType: 'poison',
    power: 14,
    accuracy: 82,
    cooldown: 0,
    targetType: 'single_enemy',
    statusEffect: 'poison',
    statusChance: 0.4,
    statusDuration: 3,
  },
  {
    id: 'healing_potion',
    name: 'Healing Potion',
    description: 'Administers a healing potion to an ally.',
    role: HeroRole.Alchemist,
    damageType: 'poison',
    power: 0,
    accuracy: 100,
    cooldown: 3,
    targetType: 'single_ally',
    healPower: 20,
  },
  {
    id: 'elixir_of_fury',
    name: 'Elixir of Fury',
    description: 'Ultimate: grants berserk to all allies.',
    role: HeroRole.Alchemist,
    damageType: 'poison',
    power: 0,
    accuracy: 100,
    cooldown: 0,
    targetType: 'all_allies',
    statusEffect: 'berserk',
    statusChance: 1.0,
    statusDuration: 3,
    isUltimate: true,
    ultimateCharge: 5,
  },

  // Scout abilities
  {
    id: 'quick_strike',
    name: 'Quick Strike',
    description: 'A fast attack that always goes first.',
    role: HeroRole.Scout,
    damageType: 'physical',
    power: 12,
    accuracy: 90,
    cooldown: 0,
    targetType: 'single_enemy',
    comboTag: 'opener',
  },
  {
    id: 'smoke_bomb',
    name: 'Smoke Bomb',
    description: 'Blinds all enemies.',
    role: HeroRole.Scout,
    damageType: 'physical',
    power: 0,
    accuracy: 85,
    cooldown: 4,
    targetType: 'all_enemies',
    statusEffect: 'blind',
    statusChance: 0.6,
    statusDuration: 2,
  },
  {
    id: 'assassinate',
    name: 'Assassinate',
    description: 'Ultimate: massive damage to lowest HP enemy.',
    role: HeroRole.Scout,
    damageType: 'physical',
    power: 45,
    accuracy: 95,
    cooldown: 0,
    targetType: 'single_enemy',
    isUltimate: true,
    ultimateCharge: 4,
    comboTag: 'finisher',
  },

  // Blacksmith abilities
  {
    id: 'heavy_swing',
    name: 'Heavy Swing',
    description: 'A powerful but slow hammer strike.',
    role: HeroRole.Blacksmith,
    damageType: 'physical',
    power: 20,
    accuracy: 72,
    cooldown: 0,
    targetType: 'single_enemy',
  },
  {
    id: 'armor_break',
    name: 'Armor Break',
    description: 'Shatters enemy defenses.',
    role: HeroRole.Blacksmith,
    damageType: 'physical',
    power: 10,
    accuracy: 80,
    cooldown: 3,
    targetType: 'single_enemy',
    statusEffect: 'burn', // repurposed: reduces defense
    statusChance: 0.8,
    statusDuration: 3,
  },

  // Farmer abilities
  {
    id: 'pitchfork_thrust',
    name: 'Pitchfork Thrust',
    description: 'A sturdy thrust with a trusty pitchfork.',
    role: HeroRole.Farmer,
    damageType: 'physical',
    power: 11,
    accuracy: 82,
    cooldown: 0,
    targetType: 'single_enemy',
  },
  {
    id: 'nourish',
    name: 'Hearty Meal',
    description: 'Shares provisions, regenerating ally HP.',
    role: HeroRole.Farmer,
    damageType: 'physical',
    power: 0,
    accuracy: 100,
    cooldown: 3,
    targetType: 'single_ally',
    statusEffect: 'regen',
    statusChance: 1.0,
    statusDuration: 3,
  },

  // Merchant abilities
  {
    id: 'bribe',
    name: 'Bribe',
    description: 'Throws gold to distract an enemy.',
    role: HeroRole.Merchant,
    damageType: 'physical',
    power: 8,
    accuracy: 90,
    cooldown: 3,
    targetType: 'single_enemy',
    statusEffect: 'stun',
    statusChance: 0.5,
    statusDuration: 1,
  },
  {
    id: 'merchant_strike',
    name: 'Weighted Purse',
    description: 'Strikes with a heavy coin purse.',
    role: HeroRole.Merchant,
    damageType: 'physical',
    power: 13,
    accuracy: 80,
    cooldown: 0,
    targetType: 'single_enemy',
  },

  // Archivist abilities
  {
    id: 'knowledge_blast',
    name: 'Knowledge Blast',
    description: 'Channels arcane knowledge into a damaging blast.',
    role: HeroRole.Archivist,
    damageType: 'light',
    power: 15,
    accuracy: 86,
    cooldown: 0,
    targetType: 'single_enemy',
  },
  {
    id: 'study_weakness',
    name: 'Study Weakness',
    description: 'Analyzes an enemy, reducing its defenses.',
    role: HeroRole.Archivist,
    damageType: 'light',
    power: 0,
    accuracy: 100,
    cooldown: 3,
    targetType: 'single_enemy',
    statusEffect: 'blind',
    statusChance: 0.8,
    statusDuration: 2,
  },

  // CaravanMaster abilities
  {
    id: 'whip_crack',
    name: 'Whip Crack',
    description: 'A stinging lash that boosts ally speed.',
    role: HeroRole.CaravanMaster,
    damageType: 'physical',
    power: 10,
    accuracy: 84,
    cooldown: 0,
    targetType: 'single_enemy',
  },
  {
    id: 'rally_caravan',
    name: 'Rally',
    description: 'Inspires the party, granting haste.',
    role: HeroRole.CaravanMaster,
    damageType: 'physical',
    power: 0,
    accuracy: 100,
    cooldown: 4,
    targetType: 'all_allies',
    statusEffect: 'haste',
    statusChance: 1.0,
    statusDuration: 2,
  },
];

// ── Squad Synergy Bonuses (T-1259) ──

export interface SquadSynergy {
  id: string;
  name: string;
  description: string;
  requiredRoles: Partial<Record<string, number>>; // role -> min count
  bonuses: {
    stat: string;
    percentBonus: number;
  }[];
}

export const SQUAD_SYNERGIES: SquadSynergy[] = [
  {
    id: 'twin_shields',
    name: 'Twin Shields',
    description: 'Two Defenders bolster the party defense.',
    requiredRoles: { defender: 2 },
    bonuses: [{ stat: 'defense', percentBonus: 10 }],
  },
  {
    id: 'hunter_pack',
    name: 'Hunter Pack',
    description: 'Two Hunters improve accuracy.',
    requiredRoles: { hunter: 2 },
    bonuses: [{ stat: 'accuracy', percentBonus: 10 }],
  },
  {
    id: 'arcane_circle',
    name: 'Arcane Circle',
    description: 'Two Mystics boost magic power.',
    requiredRoles: { mystic: 2 },
    bonuses: [{ stat: 'magicPower', percentBonus: 15 }],
  },
  {
    id: 'balanced_party',
    name: 'Balanced Party',
    description: 'At least one Defender, one ranged, and one healer.',
    requiredRoles: { defender: 1, hunter: 1, mystic: 1 },
    bonuses: [
      { stat: 'attack', percentBonus: 5 },
      { stat: 'defense', percentBonus: 5 },
    ],
  },
  {
    id: 'scout_vanguard',
    name: 'Scout Vanguard',
    description: 'Two Scouts boost party speed.',
    requiredRoles: { scout: 2 },
    bonuses: [{ stat: 'speed', percentBonus: 12 }],
  },
  {
    id: 'supply_line',
    name: 'Supply Line',
    description: 'A Farmer and Merchant boost healing.',
    requiredRoles: { farmer: 1, merchant: 1 },
    bonuses: [{ stat: 'healPower', percentBonus: 15 }],
  },
  {
    id: 'knowledge_front',
    name: 'Knowledge Front',
    description: 'An Archivist and Alchemist improve ability power.',
    requiredRoles: { archivist: 1, alchemist: 1 },
    bonuses: [{ stat: 'magicPower', percentBonus: 10 }],
  },
  {
    id: 'full_roster',
    name: 'Full Roster',
    description: 'Five unique roles in one party.',
    requiredRoles: {},
    bonuses: [
      { stat: 'attack', percentBonus: 3 },
      { stat: 'defense', percentBonus: 3 },
      { stat: 'speed', percentBonus: 3 },
    ],
  },
];

/**
 * Calculate which synergies are active for a given role composition.
 */
export function getActiveSynergies(roleCounts: Record<string, number>): SquadSynergy[] {
  return SQUAD_SYNERGIES.filter(synergy => {
    // special case: full_roster = 5+ unique roles
    if (synergy.id === 'full_roster') {
      const uniqueRoles = Object.values(roleCounts).filter(c => c > 0).length;
      return uniqueRoles >= 5;
    }
    for (const [role, minCount] of Object.entries(synergy.requiredRoles)) {
      if ((roleCounts[role] ?? 0) < (minCount as number)) return false;
    }
    return true;
  });
}

/**
 * Get abilities available to a hero based on role.
 */
export function getAbilitiesForRole(role: HeroRole): HeroCombatAbility[] {
  return HERO_COMBAT_ABILITIES.filter(a => a.role === null || a.role === role);
}
