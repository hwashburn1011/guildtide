/**
 * Full auto-battler combat engine.
 *
 * T-1241: Combat data schema (attacker, defender, rounds, log, outcome)
 * T-1242: Combat engine with turn-based auto-resolution
 * T-1243: Initiative system determining turn order by speed stat
 * T-1244: Combat round processing (attack, defend, skill use, item use)
 * T-1245: Damage calculation formula (attack - defense * modifier)
 * T-1246: Critical hit system with Luck stat influence
 * T-1247: Dodge/evasion system with Agility stat influence
 * T-1248: Healing ability for Healer role heroes
 * T-1249: Buff/debuff system for combat status effects
 * T-1250: Status effects implementation
 * T-1256: Squad composition with front/back row
 * T-1257: Row-based targeting (front = melee, back = ranged)
 * T-1282: Boss encounter system with multi-phase mechanics
 * T-1283–T-1287: Boss implementations
 * T-1288: Boss HP bar with phase indicators
 * T-1289: Boss special attack warning (telegraph)
 * T-1290: Combat loot drop system with roll per enemy
 * T-1291: Loot rarity roll using weighted random
 * T-1293: Combat XP distribution
 * T-1296: Combat difficulty scaling
 * T-1297: Combat terrain effects
 * T-1298: Weather effects on combat
 * T-1301: Flee mechanic
 * T-1302: Combat statistics tracker
 * T-1305: Morale effect on combat
 * T-1306: Equipment durability drain
 * T-1308: Combat power prediction
 * T-1309: Real-world data combat modifier
 * T-1311: Hero revival
 * T-1312: Combo system
 * T-1313: Ultimate ability system
 * T-1314: Element system
 * T-1317: AI behavior per enemy type
 */

import type { HeroStats } from '../../../shared/src/types';
import { HeroRole } from '../../../shared/src/enums';
import {
  ENEMY_DEFINITIONS,
  type EnemyDefinition,
  type EnemyAbility,
  type DamageType,
  selectRandomEnemies,
  getEnemiesForRegion,
} from '../data/enemyDefinitions';
import {
  STATUS_EFFECTS,
  ELEMENT_CHART,
  getElementMultiplier,
  getAbilitiesForRole,
  getActiveSynergies,
  HERO_COMBAT_ABILITIES,
  type HeroCombatAbility,
  type StatusEffectDef,
  type SquadSynergy,
} from '../data/combatAbilities';
import { getBossById, type BossDefinition } from '../data/expeditionBosses';

// ── Data Schema (T-1241) ──

export type CombatRow = 'front' | 'back';

export interface CombatHero {
  id: string;
  name: string;
  role: HeroRole;
  level: number;
  row: CombatRow;
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  speed: number;
  magicPower: number;
  magicResist: number;
  accuracy: number;
  critChance: number;
  evasion: number;
  damageType: DamageType;
  weaknesses: DamageType[];
  resistances: DamageType[];
  abilities: HeroCombatAbility[];
  statusEffects: ActiveStatusEffect[];
  cooldowns: Record<string, number>;
  ultimateCharge: number;
  ultimateMax: number;
  alive: boolean;
  morale: number;
  comboCount: number;
  equipmentIds: string[];
}

export interface CombatEnemy {
  id: string;
  instanceId: string; // unique per encounter instance
  name: string;
  defId: string;
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  speed: number;
  magicPower: number;
  magicResist: number;
  accuracy: number;
  damageType: DamageType;
  weaknesses: DamageType[];
  resistances: DamageType[];
  abilities: EnemyAbility[];
  behavior: string;
  statusEffects: ActiveStatusEffect[];
  cooldowns: Record<string, number>;
  alive: boolean;
  passive?: string;
  hasResurrected?: boolean;
  xpReward: number;
  loot: { resource: string; min: number; max: number; chance: number }[];
}

export interface ActiveStatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  remainingTurns: number;
  stacks: number;
  tickEffect?: 'damage' | 'heal';
  tickPower?: number;
  statModifiers?: Partial<Record<string, number>>;
}

export interface CombatLogEntry {
  round: number;
  actorName: string;
  actorSide: 'hero' | 'enemy';
  action: string;
  abilityName: string;
  targetName: string;
  damage: number;
  healing: number;
  isCritical: boolean;
  isDodged: boolean;
  statusApplied?: string;
  narrative: string;
}

export interface CombatRound {
  roundNumber: number;
  entries: CombatLogEntry[];
  heroHpSnapshot: Record<string, number>;
  enemyHpSnapshot: Record<string, number>;
}

export interface CombatReward {
  xp: number;
  gold: number;
  loot: { resource: string; amount: number }[];
  items: string[];
  rareDrop?: string;
  mvpHeroId?: string;
  mvpReason?: string;
}

export interface CombatResult {
  id: string;
  outcome: 'victory' | 'defeat' | 'fled';
  rounds: CombatRound[];
  totalRounds: number;
  heroes: CombatHero[];
  enemies: CombatEnemy[];
  rewards: CombatReward;
  statistics: CombatStatistics;
  synergiesActive: string[];
  terrainEffect?: string;
  weatherEffect?: string;
  bossPhaseReached?: number;
  difficulty: number;
  timestamp: string;
}

export interface CombatStatistics {
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalHealing: number;
  criticalHits: number;
  dodges: number;
  abilitiesUsed: number;
  turnsPlayed: number;
  enemiesDefeated: number;
  heroesKnockedOut: number;
  statusEffectsApplied: number;
  comboChains: number;
  ultimatesUsed: number;
  perHero: Record<string, {
    damageDealt: number;
    damageTaken: number;
    healingDone: number;
    kills: number;
    crits: number;
  }>;
}

// ── Terrain Effects (T-1297) ──

interface TerrainEffect {
  id: string;
  name: string;
  statModifiers: { target: 'heroes' | 'enemies' | 'all'; stat: string; bonus: number }[];
}

const TERRAIN_EFFECTS: Record<string, TerrainEffect> = {
  forest: {
    id: 'forest',
    name: 'Forest Cover',
    statModifiers: [{ target: 'all', stat: 'evasion', bonus: 10 }],
  },
  mountain: {
    id: 'mountain',
    name: 'Mountain Ground',
    statModifiers: [{ target: 'all', stat: 'defense', bonus: 3 }],
  },
  swamp: {
    id: 'swamp',
    name: 'Swamp Terrain',
    statModifiers: [{ target: 'all', stat: 'speed', bonus: -3 }],
  },
  cave: {
    id: 'cave',
    name: 'Cave Darkness',
    statModifiers: [{ target: 'heroes', stat: 'accuracy', bonus: -10 }],
  },
  ruins: {
    id: 'ruins',
    name: 'Ancient Ruins',
    statModifiers: [{ target: 'all', stat: 'magicPower', bonus: 3 }],
  },
};

// ── Weather Effects (T-1298) ──

interface WeatherCombatEffect {
  id: string;
  name: string;
  damageTypeModifiers: Partial<Record<DamageType, number>>; // multiplier
  statModifiers: { target: 'all'; stat: string; bonus: number }[];
}

const WEATHER_COMBAT_EFFECTS: Record<string, WeatherCombatEffect> = {
  rainy: {
    id: 'rainy',
    name: 'Rain',
    damageTypeModifiers: { fire: 0.8, lightning: 1.2 },
    statModifiers: [{ target: 'all', stat: 'speed', bonus: -1 }],
  },
  stormy: {
    id: 'stormy',
    name: 'Storm',
    damageTypeModifiers: { fire: 0.6, lightning: 1.5 },
    statModifiers: [{ target: 'all', stat: 'accuracy', bonus: -5 }],
  },
  snowy: {
    id: 'snowy',
    name: 'Snow',
    damageTypeModifiers: { ice: 1.3, fire: 0.9 },
    statModifiers: [{ target: 'all', stat: 'speed', bonus: -2 }],
  },
  hot: {
    id: 'hot',
    name: 'Scorching Heat',
    damageTypeModifiers: { fire: 1.3, ice: 0.8 },
    statModifiers: [{ target: 'all', stat: 'endurance', bonus: -2 }],
  },
  clear: {
    id: 'clear',
    name: 'Clear Weather',
    damageTypeModifiers: {},
    statModifiers: [],
  },
  foggy: {
    id: 'foggy',
    name: 'Fog',
    damageTypeModifiers: {},
    statModifiers: [{ target: 'all', stat: 'accuracy', bonus: -8 }],
  },
  windy: {
    id: 'windy',
    name: 'Strong Wind',
    damageTypeModifiers: {},
    statModifiers: [{ target: 'all', stat: 'accuracy', bonus: -3 }],
  },
};

// ── Boss Combat Definitions (T-1282–T-1287) ──

export interface CombatBossPhase {
  name: string;
  hpThresholdPercent: number; // transition at this % HP
  attackBonus: number;
  defenseBonus: number;
  specialAbility: EnemyAbility;
  telegraphMessage: string; // T-1289
}

export interface CombatBoss {
  id: string;
  name: string;
  title: string;
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  speed: number;
  magicPower: number;
  magicResist: number;
  damageType: DamageType;
  weaknesses: DamageType[];
  resistances: DamageType[];
  phases: CombatBossPhase[];
  currentPhase: number;
  abilities: EnemyAbility[];
  statusEffects: ActiveStatusEffect[];
  cooldowns: Record<string, number>;
  alive: boolean;
  xpReward: number;
  loot: { resource: string; min: number; max: number; chance: number }[];
  exclusiveRewards: string[];
}

// ── Pre-built boss encounters (T-1283–T-1287) ──

const COMBAT_BOSSES: Record<string, () => CombatBoss> = {
  // T-1283: Dragon Lord with 3 phases
  dragon_lord: () => ({
    id: 'dragon_lord',
    name: 'The Dragon Lord',
    title: 'Sovereign of Flame',
    maxHp: 300,
    currentHp: 300,
    attack: 28,
    defense: 20,
    speed: 10,
    magicPower: 30,
    magicResist: 25,
    damageType: 'fire',
    weaknesses: ['ice'],
    resistances: ['fire', 'physical'],
    phases: [
      {
        name: 'Fire Phase',
        hpThresholdPercent: 100,
        attackBonus: 0,
        defenseBonus: 0,
        specialAbility: {
          id: 'inferno_breath', name: 'Inferno Breath', description: 'A devastating cone of fire.',
          damageType: 'fire', power: 25, accuracy: 85, cooldown: 2, targetType: 'aoe',
          statusEffect: 'burn', statusChance: 0.6, statusDuration: 3,
        },
        telegraphMessage: 'The Dragon Lord inhales deeply, scales glowing red-hot!',
      },
      {
        name: 'Ice Phase',
        hpThresholdPercent: 66,
        attackBonus: 5,
        defenseBonus: 5,
        specialAbility: {
          id: 'frost_nova', name: 'Frost Nova', description: 'An explosion of ice.',
          damageType: 'ice', power: 22, accuracy: 80, cooldown: 2, targetType: 'aoe',
          statusEffect: 'freeze', statusChance: 0.4, statusDuration: 1,
        },
        telegraphMessage: 'The air temperature plummets as ice crystals form on the Dragon Lord\'s scales!',
      },
      {
        name: 'Thunder Phase',
        hpThresholdPercent: 33,
        attackBonus: 10,
        defenseBonus: -5,
        specialAbility: {
          id: 'thunder_strike', name: 'Thunder Strike', description: 'A devastating bolt from above.',
          damageType: 'lightning', power: 35, accuracy: 90, cooldown: 2, targetType: 'single',
          statusEffect: 'stun', statusChance: 0.5, statusDuration: 1,
        },
        telegraphMessage: 'Storm clouds gather above as the Dragon Lord crackles with electrical energy!',
      },
    ],
    currentPhase: 0,
    abilities: [
      { id: 'claw_slash', name: 'Claw Slash', description: 'A devastating claw attack.', damageType: 'physical', power: 22, accuracy: 80, cooldown: 0, targetType: 'single' },
      { id: 'tail_sweep', name: 'Tail Sweep', description: 'Sweeps all heroes with its tail.', damageType: 'physical', power: 15, accuracy: 75, cooldown: 2, targetType: 'aoe' },
    ],
    statusEffects: [],
    cooldowns: {},
    alive: true,
    xpReward: 300,
    loot: [
      { resource: 'gold', min: 80, max: 200, chance: 1.0 },
      { resource: 'essence', min: 20, max: 50, chance: 0.9 },
    ],
    exclusiveRewards: ['dragon_lord_crown', 'inferno_blade', 'frost_scale_armor'],
  }),

  // T-1284: Lich King with summoning
  lich_king: () => ({
    id: 'lich_king',
    name: 'The Lich King',
    title: 'Ruler of the Undead',
    maxHp: 250,
    currentHp: 250,
    attack: 15,
    defense: 15,
    speed: 12,
    magicPower: 35,
    magicResist: 30,
    damageType: 'dark',
    weaknesses: ['light', 'fire'],
    resistances: ['dark', 'poison', 'ice'],
    phases: [
      {
        name: 'Summoning Phase',
        hpThresholdPercent: 100,
        attackBonus: 0,
        defenseBonus: 5,
        specialAbility: {
          id: 'raise_army', name: 'Raise Army', description: 'Summons undead minions.',
          damageType: 'dark', power: 0, accuracy: 100, cooldown: 3, targetType: 'self',
        },
        telegraphMessage: 'The ground trembles as skeletal hands claw upward!',
      },
      {
        name: 'Death Magic Phase',
        hpThresholdPercent: 50,
        attackBonus: 10,
        defenseBonus: 0,
        specialAbility: {
          id: 'death_wave', name: 'Wave of Death', description: 'A wave of necrotic energy.',
          damageType: 'dark', power: 28, accuracy: 90, cooldown: 2, targetType: 'aoe',
          statusEffect: 'poison', statusChance: 0.5, statusDuration: 3,
        },
        telegraphMessage: 'Dark energy coalesces around the Lich King\'s outstretched hands!',
      },
    ],
    currentPhase: 0,
    abilities: [
      { id: 'shadow_bolt', name: 'Shadow Bolt', description: 'A bolt of dark energy.', damageType: 'dark', power: 18, accuracy: 88, cooldown: 0, targetType: 'single' },
      { id: 'soul_drain', name: 'Soul Drain', description: 'Drains life from a hero.', damageType: 'dark', power: 15, accuracy: 85, cooldown: 2, targetType: 'single' },
    ],
    statusEffects: [],
    cooldowns: {},
    alive: true,
    xpReward: 250,
    loot: [
      { resource: 'essence', min: 25, max: 60, chance: 1.0 },
      { resource: 'gold', min: 60, max: 150, chance: 0.9 },
    ],
    exclusiveRewards: ['lich_king_phylactery', 'crown_of_undeath'],
  }),

  // T-1285: Kraken
  kraken: () => ({
    id: 'kraken',
    name: 'The Kraken',
    title: 'Terror of the Deep',
    maxHp: 350,
    currentHp: 350,
    attack: 25,
    defense: 22,
    speed: 7,
    magicPower: 20,
    magicResist: 18,
    damageType: 'ice',
    weaknesses: ['lightning'],
    resistances: ['ice', 'physical'],
    phases: [
      {
        name: 'Tentacle Phase',
        hpThresholdPercent: 100,
        attackBonus: 0,
        defenseBonus: 0,
        specialAbility: {
          id: 'tentacle_slam', name: 'Tentacle Slam', description: 'Multiple tentacles crash down.',
          damageType: 'physical', power: 18, accuracy: 80, cooldown: 2, targetType: 'aoe',
          statusEffect: 'stun', statusChance: 0.3, statusDuration: 1,
        },
        telegraphMessage: 'Massive tentacles rise from the churning waters!',
      },
      {
        name: 'Ink Phase',
        hpThresholdPercent: 60,
        attackBonus: 5,
        defenseBonus: 5,
        specialAbility: {
          id: 'ink_cloud', name: 'Ink Cloud', description: 'A blinding cloud of ink.',
          damageType: 'dark', power: 10, accuracy: 95, cooldown: 3, targetType: 'aoe',
          statusEffect: 'blind', statusChance: 0.7, statusDuration: 2,
        },
        telegraphMessage: 'The Kraken sprays a cloud of dark ink into the air!',
      },
      {
        name: 'Maelstrom Phase',
        hpThresholdPercent: 30,
        attackBonus: 12,
        defenseBonus: -3,
        specialAbility: {
          id: 'maelstrom', name: 'Maelstrom', description: 'Creates a devastating whirlpool.',
          damageType: 'ice', power: 30, accuracy: 85, cooldown: 3, targetType: 'aoe',
          statusEffect: 'slow', statusChance: 0.6, statusDuration: 2,
        },
        telegraphMessage: 'The waters begin spinning violently as the Kraken roars!',
      },
    ],
    currentPhase: 0,
    abilities: [
      { id: 'tentacle_grab', name: 'Tentacle Grab', description: 'Grabs and squeezes a hero.', damageType: 'physical', power: 20, accuracy: 78, cooldown: 0, targetType: 'single' },
    ],
    statusEffects: [],
    cooldowns: {},
    alive: true,
    xpReward: 320,
    loot: [
      { resource: 'gold', min: 100, max: 250, chance: 1.0 },
      { resource: 'essence', min: 20, max: 45, chance: 0.85 },
    ],
    exclusiveRewards: ['kraken_eye', 'tentacle_mail', 'trident_of_depths'],
  }),

  // T-1286: Ancient Golem with armor break
  ancient_golem: () => ({
    id: 'ancient_golem',
    name: 'The Ancient Golem',
    title: 'Mountain Sentinel',
    maxHp: 400,
    currentHp: 400,
    attack: 30,
    defense: 30,
    speed: 3,
    magicPower: 10,
    magicResist: 20,
    damageType: 'physical',
    weaknesses: ['lightning'],
    resistances: ['physical', 'fire', 'poison', 'ice'],
    phases: [
      {
        name: 'Iron Shell',
        hpThresholdPercent: 100,
        attackBonus: 0,
        defenseBonus: 15,
        specialAbility: {
          id: 'quake', name: 'Quake', description: 'The ground shakes violently.',
          damageType: 'physical', power: 20, accuracy: 90, cooldown: 2, targetType: 'aoe',
          statusEffect: 'stun', statusChance: 0.2, statusDuration: 1,
        },
        telegraphMessage: 'The Ancient Golem raises its massive foot!',
      },
      {
        name: 'Cracked Armor',
        hpThresholdPercent: 50,
        attackBonus: 10,
        defenseBonus: -10,
        specialAbility: {
          id: 'boulder_hurl', name: 'Boulder Hurl', description: 'Tears a chunk of itself to hurl.',
          damageType: 'physical', power: 35, accuracy: 60, cooldown: 3, targetType: 'single',
        },
        telegraphMessage: 'Cracks spread across the golem as it tears a boulder from its own body!',
      },
    ],
    currentPhase: 0,
    abilities: [
      { id: 'stone_fist', name: 'Stone Fist', description: 'A crushing punch.', damageType: 'physical', power: 25, accuracy: 65, cooldown: 0, targetType: 'single' },
    ],
    statusEffects: [],
    cooldowns: {},
    alive: true,
    xpReward: 280,
    loot: [
      { resource: 'ore', min: 40, max: 100, chance: 1.0 },
      { resource: 'stone', min: 30, max: 70, chance: 0.9 },
      { resource: 'essence', min: 15, max: 35, chance: 0.7 },
    ],
    exclusiveRewards: ['golem_core', 'mountain_sentinel_shield'],
  }),

  // T-1287: Shadow Lord with darkness
  shadow_lord: () => ({
    id: 'shadow_lord',
    name: 'The Shadow Lord',
    title: 'Master of Darkness',
    maxHp: 280,
    currentHp: 280,
    attack: 20,
    defense: 16,
    speed: 14,
    magicPower: 32,
    magicResist: 28,
    damageType: 'dark',
    weaknesses: ['light'],
    resistances: ['dark', 'physical', 'poison'],
    phases: [
      {
        name: 'Shadow Veil',
        hpThresholdPercent: 100,
        attackBonus: 0,
        defenseBonus: 0,
        specialAbility: {
          id: 'shadow_veil', name: 'Shadow Veil', description: 'Cloaks the battlefield in darkness.',
          damageType: 'dark', power: 0, accuracy: 100, cooldown: 3, targetType: 'aoe',
          statusEffect: 'blind', statusChance: 0.8, statusDuration: 2,
        },
        telegraphMessage: 'Darkness seeps from the Shadow Lord, extinguishing all light!',
      },
      {
        name: 'Soul Reaver',
        hpThresholdPercent: 40,
        attackBonus: 15,
        defenseBonus: 5,
        specialAbility: {
          id: 'soul_reave', name: 'Soul Reave', description: 'Tears at the very soul.',
          damageType: 'dark', power: 35, accuracy: 88, cooldown: 2, targetType: 'single',
          statusEffect: 'poison', statusChance: 0.6, statusDuration: 4,
        },
        telegraphMessage: 'The Shadow Lord\'s form distorts, tendrils of darkness reaching for your heroes!',
      },
    ],
    currentPhase: 0,
    abilities: [
      { id: 'shadow_strike', name: 'Shadow Strike', description: 'A blade of pure darkness.', damageType: 'dark', power: 20, accuracy: 88, cooldown: 0, targetType: 'single' },
      { id: 'fear', name: 'Fear', description: 'Paralyzes with terror.', damageType: 'dark', power: 8, accuracy: 82, cooldown: 3, targetType: 'single', statusEffect: 'stun', statusChance: 0.5, statusDuration: 1 },
    ],
    statusEffects: [],
    cooldowns: {},
    alive: true,
    xpReward: 260,
    loot: [
      { resource: 'essence', min: 25, max: 55, chance: 1.0 },
      { resource: 'gold', min: 50, max: 120, chance: 0.85 },
    ],
    exclusiveRewards: ['shadow_lord_cloak', 'void_blade'],
  }),
};

// ── Combat Engine ──

let combatIdCounter = 1;

export class CombatService {

  // ── T-1308: Power Prediction ──

  static predictCombatPower(
    heroes: Array<{ stats: HeroStats; level: number; role: string }>,
  ): number {
    let total = 0;
    for (const h of heroes) {
      total +=
        h.stats.strength * 1.2 +
        h.stats.agility * 0.8 +
        h.stats.intellect * 1.0 +
        h.stats.endurance * 1.0 +
        h.stats.luck * 0.5 +
        h.level * 5;
    }
    return Math.round(total);
  }

  static predictEnemyPower(enemies: EnemyDefinition[]): number {
    let total = 0;
    for (const e of enemies) {
      total += e.hp + e.attack * 3 + e.defense * 2 + e.speed + e.magicPower * 2 + e.tier * 10;
    }
    return Math.round(total);
  }

  // ── T-1296: Difficulty Scaling ──

  static scaleEnemies(
    enemies: CombatEnemy[],
    avgPartyLevel: number,
  ): void {
    const scale = 1 + (avgPartyLevel - 1) * 0.08;
    for (const e of enemies) {
      e.maxHp = Math.round(e.maxHp * scale);
      e.currentHp = e.maxHp;
      e.attack = Math.round(e.attack * scale);
      e.defense = Math.round(e.defense * scale);
      e.magicPower = Math.round(e.magicPower * scale);
      e.xpReward = Math.round(e.xpReward * scale);
    }
  }

  // ── Build Combatants ──

  static buildCombatHero(
    hero: {
      id: string;
      name: string;
      role: HeroRole;
      level: number;
      stats: HeroStats;
      equipment: { weapon: string | null; armor: string | null; charm: string | null; tool: string | null };
      morale?: number;
    },
    row: CombatRow = 'front',
  ): CombatHero {
    const abilities = getAbilitiesForRole(hero.role);
    const baseHp = 50 + hero.stats.endurance * 5 + hero.level * 8;
    const morale = hero.morale ?? 75;
    const moraleBonus = morale >= 80 ? 1.05 : morale <= 30 ? 0.92 : 1.0; // T-1305

    return {
      id: hero.id,
      name: hero.name,
      role: hero.role,
      level: hero.level,
      row,
      maxHp: Math.round(baseHp * moraleBonus),
      currentHp: Math.round(baseHp * moraleBonus),
      attack: Math.round((hero.stats.strength * 2 + hero.level) * moraleBonus),
      defense: Math.round((hero.stats.endurance * 1.5 + hero.level * 0.5) * moraleBonus),
      speed: hero.stats.agility + hero.level * 0.3,
      magicPower: Math.round((hero.stats.intellect * 2 + hero.level) * moraleBonus),
      magicResist: Math.round(hero.stats.intellect + hero.stats.endurance * 0.5),
      accuracy: 80 + hero.stats.agility * 0.5,
      critChance: 5 + hero.stats.luck * 1.5, // T-1246
      evasion: 3 + hero.stats.agility * 1.2,  // T-1247
      damageType: (hero.role === HeroRole.Mystic || hero.role === HeroRole.Archivist) ? 'light' : 'physical',
      weaknesses: [],
      resistances: [],
      abilities,
      statusEffects: [],
      cooldowns: {},
      ultimateCharge: 0,
      ultimateMax: (abilities.find(a => a.isUltimate)?.ultimateCharge ?? 5),
      alive: true,
      morale,
      comboCount: 0,
      equipmentIds: [hero.equipment.weapon, hero.equipment.armor, hero.equipment.charm, hero.equipment.tool].filter(Boolean) as string[],
    };
  }

  static buildCombatEnemy(def: EnemyDefinition, index: number): CombatEnemy {
    return {
      id: def.id,
      instanceId: `${def.id}_${index}`,
      name: def.name,
      defId: def.id,
      maxHp: def.hp,
      currentHp: def.hp,
      attack: def.attack,
      defense: def.defense,
      speed: def.speed,
      magicPower: def.magicPower,
      magicResist: def.magicResist,
      accuracy: 80,
      damageType: def.damageType,
      weaknesses: [...def.weaknesses],
      resistances: [...def.resistances],
      abilities: [...def.abilities],
      behavior: def.behavior,
      statusEffects: [],
      cooldowns: {},
      alive: true,
      passive: def.passive,
      hasResurrected: false,
      xpReward: def.xpReward,
      loot: [...def.loot],
    };
  }

  // ── Main Combat Resolution (T-1242) ──

  static resolveCombat(
    heroes: CombatHero[],
    enemies: CombatEnemy[],
    options: {
      terrain?: string;
      weather?: string;
      morale?: number;
      difficulty?: number;
      maxRounds?: number;
      isBoss?: boolean;
      bossId?: string;
      realWorldModifier?: string; // T-1309
    } = {},
  ): CombatResult {
    const maxRounds = options.maxRounds ?? 30;
    const rounds: CombatRound[] = [];
    const stats = this.initStatistics(heroes);
    let boss: CombatBoss | null = null;

    // Apply terrain effects (T-1297)
    if (options.terrain && TERRAIN_EFFECTS[options.terrain]) {
      this.applyTerrainEffects(heroes, enemies, TERRAIN_EFFECTS[options.terrain]);
    }

    // Apply weather effects (T-1298)
    if (options.weather && WEATHER_COMBAT_EFFECTS[options.weather]) {
      this.applyWeatherStatEffects(heroes, enemies, WEATHER_COMBAT_EFFECTS[options.weather]);
    }

    // Apply real-world modifier (T-1309)
    if (options.realWorldModifier === 'storm') {
      for (const h of heroes) h.attack = Math.round(h.attack * 1.05); // lightning bonus
    }

    // Scale enemies (T-1296)
    const avgLevel = heroes.reduce((s, h) => s + h.level, 0) / heroes.length;
    this.scaleEnemies(enemies, avgLevel);

    // Squad synergies (T-1259)
    const roleCounts: Record<string, number> = {};
    for (const h of heroes) {
      const r = h.role.toLowerCase();
      roleCounts[r] = (roleCounts[r] ?? 0) + 1;
    }
    const activeSynergies = getActiveSynergies(roleCounts);
    this.applySynergies(heroes, activeSynergies);

    // Boss setup (T-1282)
    if (options.isBoss && options.bossId && COMBAT_BOSSES[options.bossId]) {
      boss = COMBAT_BOSSES[options.bossId]();
    }

    // ── Round Loop ──
    for (let round = 1; round <= maxRounds; round++) {
      const roundEntries: CombatLogEntry[] = [];

      // Status effect ticks
      this.tickStatusEffects(heroes, enemies, round, roundEntries);

      // Check for boss phase transitions (T-1282, T-1288)
      if (boss && boss.alive) {
        this.checkBossPhaseTransition(boss, roundEntries, round);
      }

      // Build turn order (T-1243)
      const turnOrder = this.buildTurnOrder(heroes, enemies, boss);

      for (const actor of turnOrder) {
        // Check if combat is over
        if (!heroes.some(h => h.alive) || (!enemies.some(e => e.alive) && (!boss || !boss.alive))) {
          break;
        }

        if (actor.type === 'hero') {
          const hero = actor.entity as CombatHero;
          if (!hero.alive || this.isStunned(hero)) continue;
          this.processHeroTurn(hero, heroes, enemies, boss, round, roundEntries, stats, options.weather);
        } else if (actor.type === 'enemy') {
          const enemy = actor.entity as CombatEnemy;
          if (!enemy.alive || this.isStunned(enemy)) continue;
          this.processEnemyTurn(enemy, heroes, enemies, round, roundEntries, stats);
        } else if (actor.type === 'boss' && boss) {
          if (!boss.alive || this.isStunnedBoss(boss)) continue;
          this.processBossTurn(boss, heroes, round, roundEntries, stats);
        }
      }

      // Snapshot HP
      const heroSnap: Record<string, number> = {};
      const enemySnap: Record<string, number> = {};
      for (const h of heroes) heroSnap[h.id] = h.currentHp;
      for (const e of enemies) enemySnap[e.instanceId] = e.currentHp;
      if (boss) enemySnap[boss.id] = boss.currentHp;

      rounds.push({ roundNumber: round, entries: roundEntries, heroHpSnapshot: heroSnap, enemyHpSnapshot: enemySnap });
      stats.turnsPlayed++;

      // Check passives (T-1268 troll regen, T-1271 slime split, T-1263 skeleton resurrect, etc.)
      this.processPassives(enemies, heroes, round, roundEntries);

      // Victory/defeat check
      if (!heroes.some(h => h.alive)) break;
      if (!enemies.some(e => e.alive) && (!boss || !boss.alive)) break;
    }

    // ── Outcome ──
    const heroesAlive = heroes.some(h => h.alive);
    const enemiesAlive = enemies.some(e => e.alive) || (boss != null && boss.alive);
    const outcome: 'victory' | 'defeat' = heroesAlive && !enemiesAlive ? 'victory' : 'defeat';

    // ── Rewards (T-1290, T-1291, T-1293) ──
    const rewards = outcome === 'victory'
      ? this.calculateRewards(heroes, enemies, boss, stats)
      : { xp: 0, gold: 0, loot: [], items: [] };

    // ── MVP (T-1294) ──
    if (outcome === 'victory') {
      const topDamage = Object.entries(stats.perHero)
        .sort(([, a], [, b]) => b.damageDealt - a.damageDealt)[0];
      if (topDamage) {
        rewards.mvpHeroId = topDamage[0];
        rewards.mvpReason = 'Highest Damage';
      }
    }

    stats.enemiesDefeated = enemies.filter(e => !e.alive).length + (boss && !boss.alive ? 1 : 0);
    stats.heroesKnockedOut = heroes.filter(h => !h.alive).length;

    return {
      id: `combat_${Date.now()}_${combatIdCounter++}`,
      outcome,
      rounds,
      totalRounds: rounds.length,
      heroes,
      enemies,
      rewards,
      statistics: stats,
      synergiesActive: activeSynergies.map(s => s.id),
      terrainEffect: options.terrain,
      weatherEffect: options.weather,
      bossPhaseReached: boss?.currentPhase,
      difficulty: options.difficulty ?? 1,
      timestamp: new Date().toISOString(),
    };
  }

  // ── T-1301: Flee Mechanic ──

  static attemptFlee(
    heroes: CombatHero[],
    enemies: CombatEnemy[],
  ): boolean {
    const avgHeroSpeed = heroes.filter(h => h.alive).reduce((s, h) => s + h.speed, 0) /
      Math.max(1, heroes.filter(h => h.alive).length);
    const avgEnemySpeed = enemies.filter(e => e.alive).reduce((s, e) => s + e.speed, 0) /
      Math.max(1, enemies.filter(e => e.alive).length);
    const fleeChance = 0.3 + (avgHeroSpeed - avgEnemySpeed) * 0.03;
    return Math.random() < Math.max(0.1, Math.min(0.9, fleeChance));
  }

  // ── Quick Encounter (convenience) ──

  static resolveQuickCombat(
    heroData: Array<{
      id: string;
      name: string;
      role: HeroRole;
      level: number;
      stats: HeroStats;
      equipment: { weapon: string | null; armor: string | null; charm: string | null; tool: string | null };
      morale?: number;
    }>,
    region: string,
    enemyCount: number,
    options: { terrain?: string; weather?: string; difficulty?: number } = {},
  ): CombatResult {
    const pool = getEnemiesForRegion(region);
    const selected = pool.length > 0 ? selectRandomEnemies(pool, enemyCount) : selectRandomEnemies(ENEMY_DEFINITIONS, enemyCount);
    const heroes = heroData.map((h, i) => this.buildCombatHero(h, i < Math.ceil(heroData.length / 2) ? 'front' : 'back'));
    const enemies = selected.map((def, i) => this.buildCombatEnemy(def, i));
    return this.resolveCombat(heroes, enemies, options);
  }

  // ── Boss Encounter (convenience) ──

  static resolveBossCombat(
    heroData: Array<{
      id: string;
      name: string;
      role: HeroRole;
      level: number;
      stats: HeroStats;
      equipment: { weapon: string | null; armor: string | null; charm: string | null; tool: string | null };
      morale?: number;
    }>,
    bossId: string,
    options: { terrain?: string; weather?: string } = {},
  ): CombatResult {
    const heroes = heroData.map((h, i) => this.buildCombatHero(h, i < Math.ceil(heroData.length / 2) ? 'front' : 'back'));
    return this.resolveCombat(heroes, [], { ...options, isBoss: true, bossId });
  }

  // ── Internal Helpers ──

  private static initStatistics(heroes: CombatHero[]): CombatStatistics {
    const perHero: Record<string, { damageDealt: number; damageTaken: number; healingDone: number; kills: number; crits: number }> = {};
    for (const h of heroes) {
      perHero[h.id] = { damageDealt: 0, damageTaken: 0, healingDone: 0, kills: 0, crits: 0 };
    }
    return {
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalHealing: 0,
      criticalHits: 0,
      dodges: 0,
      abilitiesUsed: 0,
      turnsPlayed: 0,
      enemiesDefeated: 0,
      heroesKnockedOut: 0,
      statusEffectsApplied: 0,
      comboChains: 0,
      ultimatesUsed: 0,
      perHero,
    };
  }

  // T-1243: Initiative / turn order
  private static buildTurnOrder(
    heroes: CombatHero[],
    enemies: CombatEnemy[],
    boss: CombatBoss | null,
  ): Array<{ type: 'hero' | 'enemy' | 'boss'; entity: CombatHero | CombatEnemy | CombatBoss; speed: number }> {
    const order: Array<{ type: 'hero' | 'enemy' | 'boss'; entity: any; speed: number }> = [];
    for (const h of heroes) {
      if (h.alive) order.push({ type: 'hero', entity: h, speed: this.getEffectiveSpeed(h) });
    }
    for (const e of enemies) {
      if (e.alive) order.push({ type: 'enemy', entity: e, speed: this.getEffectiveSpeed(e) });
    }
    if (boss && boss.alive) {
      order.push({ type: 'boss', entity: boss, speed: boss.speed });
    }
    // Sort descending by speed with small random jitter
    order.sort((a, b) => (b.speed + Math.random() * 2) - (a.speed + Math.random() * 2));
    return order;
  }

  private static getEffectiveSpeed(entity: CombatHero | CombatEnemy): number {
    let speed = entity.speed;
    for (const se of entity.statusEffects) {
      if (se.statModifiers?.speed !== undefined) {
        speed *= se.statModifiers.speed;
      }
    }
    return speed;
  }

  private static getEffectiveAttack(entity: CombatHero | CombatEnemy | CombatBoss): number {
    let atk = entity.attack;
    if ('statusEffects' in entity) {
      for (const se of entity.statusEffects) {
        if (se.statModifiers?.attack !== undefined) {
          atk = Math.round(atk * se.statModifiers.attack);
        }
      }
    }
    return atk;
  }

  private static getEffectiveDefense(entity: CombatHero | CombatEnemy | CombatBoss): number {
    let def = entity.defense;
    if ('statusEffects' in entity) {
      for (const se of entity.statusEffects) {
        if (se.statModifiers?.defense !== undefined) {
          def = Math.round(def * se.statModifiers.defense);
        }
      }
    }
    return def;
  }

  private static isStunned(entity: CombatHero | CombatEnemy): boolean {
    return entity.statusEffects.some(se => se.id === 'stun' || se.id === 'freeze');
  }

  private static isStunnedBoss(boss: CombatBoss): boolean {
    return boss.statusEffects.some(se => se.id === 'stun' || se.id === 'freeze');
  }

  // T-1245: Damage formula
  private static calculateDamage(
    power: number,
    attackStat: number,
    defenseStat: number,
    damageType: DamageType,
    targetWeaknesses: DamageType[],
    targetResistances: DamageType[],
    weatherModifiers?: Partial<Record<DamageType, number>>,
  ): number {
    const elemMult = getElementMultiplier(damageType, targetWeaknesses, targetResistances);
    const weatherMult = weatherModifiers?.[damageType] ?? 1.0;
    const rawDamage = (power + attackStat) - defenseStat * 0.5;
    const damage = Math.max(1, Math.round(rawDamage * elemMult * weatherMult));
    // Add 10% variance
    const variance = 0.9 + Math.random() * 0.2;
    return Math.max(1, Math.round(damage * variance));
  }

  // T-1246: Critical hit
  private static rollCritical(critChance: number): boolean {
    return Math.random() * 100 < critChance;
  }

  // T-1247: Dodge
  private static rollDodge(evasion: number, accuracy: number): boolean {
    const dodgeChance = Math.max(0, evasion - accuracy * 0.3);
    return Math.random() * 100 < dodgeChance;
  }

  // ── Hero Turn Processing (T-1244) ──

  private static processHeroTurn(
    hero: CombatHero,
    allHeroes: CombatHero[],
    enemies: CombatEnemy[],
    boss: CombatBoss | null,
    round: number,
    entries: CombatLogEntry[],
    stats: CombatStatistics,
    weather?: string,
  ): void {
    // Charge ultimate (T-1313)
    hero.ultimateCharge = Math.min(hero.ultimateCharge + 1, hero.ultimateMax);

    // Choose ability
    const ability = this.selectHeroAbility(hero, allHeroes, enemies, boss);
    stats.abilitiesUsed++;

    // Reduce cooldowns
    for (const key of Object.keys(hero.cooldowns)) {
      if (hero.cooldowns[key] > 0) hero.cooldowns[key]--;
    }

    const weatherMods = weather && WEATHER_COMBAT_EFFECTS[weather]
      ? WEATHER_COMBAT_EFFECTS[weather].damageTypeModifiers
      : undefined;

    if (ability.healPower && ability.healPower > 0) {
      // Healing (T-1248)
      if (ability.revive) {
        // T-1311: Revival
        const dead = allHeroes.filter(h => !h.alive);
        if (dead.length > 0) {
          const target = dead[0];
          target.alive = true;
          target.currentHp = Math.round(target.maxHp * 0.3);
          entries.push(this.makeLogEntry(round, hero.name, 'hero', 'revive', ability.name, target.name, 0, target.currentHp, false, false, undefined, `${hero.name} resurrects ${target.name}!`));
          hero.cooldowns[ability.id] = ability.cooldown;
          if (stats.perHero[hero.id]) stats.perHero[hero.id].healingDone += target.currentHp;
          stats.totalHealing += target.currentHp;
          return;
        }
      }
      // Regular heal
      const targets = ability.targetType === 'all_allies'
        ? allHeroes.filter(h => h.alive && h.currentHp < h.maxHp)
        : [this.findLowestHpHero(allHeroes)].filter(Boolean) as CombatHero[];

      for (const target of targets) {
        const healAmount = Math.min(ability.healPower, target.maxHp - target.currentHp);
        target.currentHp += healAmount;
        entries.push(this.makeLogEntry(round, hero.name, 'hero', 'heal', ability.name, target.name, 0, healAmount, false, false, undefined, `${hero.name} heals ${target.name} for ${healAmount} HP.`));
        if (stats.perHero[hero.id]) stats.perHero[hero.id].healingDone += healAmount;
        stats.totalHealing += healAmount;
      }
      hero.cooldowns[ability.id] = ability.cooldown;
      return;
    }

    if (ability.targetType === 'self' || ability.targetType === 'all_allies' || ability.targetType === 'single_ally') {
      // Buff ability
      if (ability.statusEffect) {
        const targets = ability.targetType === 'all_allies'
          ? allHeroes.filter(h => h.alive)
          : ability.targetType === 'self' ? [hero] : [this.findLowestHpHero(allHeroes)].filter(Boolean) as CombatHero[];
        for (const target of targets) {
          if (Math.random() < (ability.statusChance ?? 1)) {
            this.applyStatus(target, ability.statusEffect, ability.statusDuration ?? 2);
            stats.statusEffectsApplied++;
          }
        }
        entries.push(this.makeLogEntry(round, hero.name, 'hero', 'buff', ability.name, 'party', 0, 0, false, false, ability.statusEffect, `${hero.name} uses ${ability.name}!`));
      }
      hero.cooldowns[ability.id] = ability.cooldown;
      if (ability.isUltimate) {
        hero.ultimateCharge = 0;
        stats.ultimatesUsed++;
      }
      return;
    }

    // Attack ability
    const targetList = this.selectTargets(ability, enemies, boss);

    for (const target of targetList) {
      const effectiveAccuracy = hero.accuracy + ability.accuracy - 80;
      const targetEvasion = 'evasion' in target ? (target as CombatHero).evasion : 5;

      // T-1247: Dodge check
      if (this.rollDodge(targetEvasion, effectiveAccuracy)) {
        entries.push(this.makeLogEntry(round, hero.name, 'hero', 'miss', ability.name, target.name ?? (target as any).instanceId, 0, 0, false, true, undefined, `${hero.name} attacks but ${target.name} dodges!`));
        stats.dodges++;
        continue;
      }

      const atkStat = ability.damageType === 'physical' ? this.getEffectiveAttack(hero) : hero.magicPower;
      const defStat = ability.damageType === 'physical' ? this.getEffectiveDefense(target as any) : ((target as any).magicResist ?? 5);

      let damage = this.calculateDamage(
        ability.power,
        atkStat,
        defStat,
        ability.damageType,
        (target as any).weaknesses ?? [],
        (target as any).resistances ?? [],
        weatherMods,
      );

      // T-1257: Row-based targeting — back row takes less melee damage
      if (ability.damageType === 'physical' && 'row' in target && (target as CombatHero).row === 'back') {
        damage = Math.round(damage * 0.7);
      }

      // T-1246: Critical hit
      let isCrit = false;
      if (this.rollCritical(hero.critChance)) {
        damage = Math.round(damage * 1.8);
        isCrit = true;
        stats.criticalHits++;
        if (stats.perHero[hero.id]) stats.perHero[hero.id].crits++;
      }

      // T-1312: Combo bonus
      hero.comboCount++;
      if (hero.comboCount >= 3) {
        damage = Math.round(damage * 1.15);
        stats.comboChains++;
        hero.comboCount = 0;
      }

      // Apply damage
      (target as any).currentHp = Math.max(0, (target as any).currentHp - damage);
      if ((target as any).currentHp <= 0) (target as any).alive = false;

      const targetName = (target as any).name ?? (target as any).instanceId;
      const critText = isCrit ? ' CRITICAL HIT!' : '';
      entries.push(this.makeLogEntry(round, hero.name, 'hero', 'attack', ability.name, targetName, damage, 0, isCrit, false, undefined, `${hero.name} uses ${ability.name} on ${targetName} for ${damage} damage!${critText}`));

      stats.totalDamageDealt += damage;
      if (stats.perHero[hero.id]) stats.perHero[hero.id].damageDealt += damage;
      if (!(target as any).alive && stats.perHero[hero.id]) stats.perHero[hero.id].kills++;

      // Apply status effect
      if (ability.statusEffect && Math.random() < (ability.statusChance ?? 0)) {
        this.applyStatus(target as any, ability.statusEffect, ability.statusDuration ?? 2);
        stats.statusEffectsApplied++;
        entries.push(this.makeLogEntry(round, hero.name, 'hero', 'status', ability.name, targetName, 0, 0, false, false, ability.statusEffect, `${targetName} is afflicted with ${ability.statusEffect}!`));
      }
    }

    hero.cooldowns[ability.id] = ability.cooldown;
    if (ability.isUltimate) {
      hero.ultimateCharge = 0;
      stats.ultimatesUsed++;
    }
  }

  // ── T-1317: Enemy AI ──

  private static processEnemyTurn(
    enemy: CombatEnemy,
    heroes: CombatHero[],
    allEnemies: CombatEnemy[],
    round: number,
    entries: CombatLogEntry[],
    stats: CombatStatistics,
  ): void {
    // Reduce cooldowns
    for (const key of Object.keys(enemy.cooldowns)) {
      if (enemy.cooldowns[key] > 0) enemy.cooldowns[key]--;
    }

    // T-1273: Orc berserk on low HP
    if (enemy.passive === 'berserk_low_hp' && enemy.currentHp < enemy.maxHp * 0.3) {
      if (!enemy.statusEffects.some(se => se.id === 'berserk')) {
        this.applyStatus(enemy, 'berserk', 99);
        entries.push(this.makeLogEntry(round, enemy.name, 'enemy', 'passive', 'Blood Rage', enemy.name, 0, 0, false, false, 'berserk', `${enemy.name} enters a berserk rage!`));
      }
    }

    // Select ability based on behavior (T-1317)
    const ability = this.selectEnemyAbility(enemy, heroes, allEnemies);

    // Select target based on behavior
    const aliveHeroes = heroes.filter(h => h.alive);
    if (aliveHeroes.length === 0) return;

    let targets: CombatHero[];
    if (ability.targetType === 'aoe') {
      targets = aliveHeroes;
    } else if (ability.targetType === 'self' || ability.targetType === 'ally') {
      // Support ability — skip damage
      if (ability.statusEffect) {
        const buffTargets = ability.targetType === 'self' ? [enemy] : allEnemies.filter(e => e.alive);
        for (const t of buffTargets as any[]) {
          this.applyStatus(t, ability.statusEffect, ability.statusDuration ?? 2);
        }
        entries.push(this.makeLogEntry(round, enemy.name, 'enemy', 'buff', ability.name, 'allies', 0, 0, false, false, ability.statusEffect, `${enemy.name} uses ${ability.name}!`));
      }
      enemy.cooldowns[ability.id] = ability.cooldown;
      return;
    } else {
      // T-1257: Melee enemies prefer front row
      const frontRow = aliveHeroes.filter(h => h.row === 'front');
      if (ability.damageType === 'physical' && frontRow.length > 0) {
        targets = [frontRow[Math.floor(Math.random() * frontRow.length)]];
      } else {
        // Behavior-based targeting
        switch (enemy.behavior) {
          case 'assassin':
            targets = [aliveHeroes.reduce((low, h) => h.currentHp < low.currentHp ? h : low, aliveHeroes[0])];
            break;
          case 'caster':
            targets = [aliveHeroes.reduce((low, h) => h.magicResist < low.magicResist ? h : low, aliveHeroes[0])];
            break;
          default:
            targets = [aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)]];
        }
      }
    }

    for (const target of targets) {
      const atkStat = ability.damageType === 'physical' ? this.getEffectiveAttack(enemy) : enemy.magicPower;
      const defStat = ability.damageType === 'physical' ? this.getEffectiveDefense(target) : target.magicResist;

      // Dodge check
      if (this.rollDodge(target.evasion, enemy.accuracy + ability.accuracy - 80)) {
        entries.push(this.makeLogEntry(round, enemy.name, 'enemy', 'miss', ability.name, target.name, 0, 0, false, true, undefined, `${enemy.name} attacks but ${target.name} evades!`));
        stats.dodges++;
        continue;
      }

      let damage = this.calculateDamage(ability.power, atkStat, defStat, ability.damageType, target.weaknesses, target.resistances);

      // T-1269: Ghost incorporeal — physical resist already in resistances, but enforce passive
      if (enemy.passive === 'incorporeal' && ability.damageType === 'physical') {
        damage = Math.round(damage * 0.5);
      }

      // Swarm bonus (T-1262)
      if (enemy.passive === 'swarm_bonus') {
        const sameType = allEnemies.filter(e => e.alive && e.defId === enemy.defId).length;
        damage = Math.round(damage * (1 + (sameType - 1) * 0.05));
      }

      // Pack bonus (T-1264)
      if (enemy.passive === 'pack_bonus') {
        const sameType = allEnemies.filter(e => e.alive && e.defId === enemy.defId).length;
        damage = Math.round(damage * (1 + (sameType - 1) * 0.08));
      }

      // Life drain (T-1278)
      if (enemy.passive === 'life_drain') {
        const healed = Math.round(damage * 0.5);
        enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + healed);
      }

      target.currentHp = Math.max(0, target.currentHp - damage);
      if (target.currentHp <= 0) target.alive = false;

      entries.push(this.makeLogEntry(round, enemy.name, 'enemy', 'attack', ability.name, target.name, damage, 0, false, false, undefined, `${enemy.name} uses ${ability.name} on ${target.name} for ${damage} damage!`));
      stats.totalDamageTaken += damage;
      if (stats.perHero[target.id]) stats.perHero[target.id].damageTaken += damage;

      // Apply status
      if (ability.statusEffect && Math.random() < (ability.statusChance ?? 0)) {
        this.applyStatus(target, ability.statusEffect, ability.statusDuration ?? 2);
        stats.statusEffectsApplied++;
        entries.push(this.makeLogEntry(round, enemy.name, 'enemy', 'status', ability.name, target.name, 0, 0, false, false, ability.statusEffect, `${target.name} is afflicted with ${ability.statusEffect}!`));
      }
    }

    enemy.cooldowns[ability.id] = ability.cooldown;
  }

  // Boss turn processing
  private static processBossTurn(
    boss: CombatBoss,
    heroes: CombatHero[],
    round: number,
    entries: CombatLogEntry[],
    stats: CombatStatistics,
  ): void {
    // Reduce cooldowns
    for (const key of Object.keys(boss.cooldowns)) {
      if (boss.cooldowns[key] > 0) boss.cooldowns[key]--;
    }

    const phase = boss.phases[boss.currentPhase];
    const phaseBonus = phase ? { atk: phase.attackBonus, def: phase.defenseBonus } : { atk: 0, def: 0 };

    // T-1289: Telegraph before special
    if (phase && !boss.cooldowns[phase.specialAbility.id] && phase.specialAbility.cooldown > 0) {
      entries.push(this.makeLogEntry(round, boss.name, 'enemy', 'telegraph', 'Warning', '', 0, 0, false, false, undefined, phase.telegraphMessage));
    }

    // Choose ability: special if off cooldown, otherwise regular
    let ability: EnemyAbility;
    if (phase && (!boss.cooldowns[phase.specialAbility.id] || boss.cooldowns[phase.specialAbility.id] <= 0)) {
      ability = phase.specialAbility;
    } else {
      const available = boss.abilities.filter(a => !boss.cooldowns[a.id] || boss.cooldowns[a.id] <= 0);
      ability = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : boss.abilities[0];
    }

    const aliveHeroes = heroes.filter(h => h.alive);
    if (aliveHeroes.length === 0) return;

    const targets = ability.targetType === 'aoe' ? aliveHeroes : [aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)]];

    for (const target of targets) {
      const atkStat = (ability.damageType === 'physical' ? boss.attack : boss.magicPower) + phaseBonus.atk;
      const defStat = ability.damageType === 'physical' ? this.getEffectiveDefense(target) : target.magicResist;

      if (ability.power === 0 && !ability.statusEffect) continue; // summon/buff only

      let damage = this.calculateDamage(ability.power, atkStat, defStat, ability.damageType, target.weaknesses, target.resistances);

      target.currentHp = Math.max(0, target.currentHp - damage);
      if (target.currentHp <= 0) target.alive = false;

      entries.push(this.makeLogEntry(round, boss.name, 'enemy', 'attack', ability.name, target.name, damage, 0, false, false, undefined, `${boss.name} uses ${ability.name} on ${target.name} for ${damage} damage!`));
      stats.totalDamageTaken += damage;
      if (stats.perHero[target.id]) stats.perHero[target.id].damageTaken += damage;

      if (ability.statusEffect && Math.random() < (ability.statusChance ?? 0)) {
        this.applyStatus(target, ability.statusEffect, ability.statusDuration ?? 2);
        stats.statusEffectsApplied++;
      }
    }

    boss.cooldowns[ability.id] = ability.cooldown;
  }

  // ── Boss Phase Transition (T-1282, T-1288) ──

  private static checkBossPhaseTransition(boss: CombatBoss, entries: CombatLogEntry[], round: number): void {
    const hpPercent = (boss.currentHp / boss.maxHp) * 100;
    for (let i = boss.currentPhase + 1; i < boss.phases.length; i++) {
      if (hpPercent <= boss.phases[i].hpThresholdPercent) {
        boss.currentPhase = i;
        const phase = boss.phases[i];
        entries.push(this.makeLogEntry(round, boss.name, 'enemy', 'phase_transition', phase.name, '', 0, 0, false, false, undefined, `${boss.name} enters ${phase.name}! ${phase.telegraphMessage}`));
        break;
      }
    }
  }

  // ── Status Effects (T-1249, T-1250) ──

  private static applyStatus(entity: any, statusId: string, duration: number): void {
    const def = STATUS_EFFECTS[statusId];
    if (!def) return;

    const existing = entity.statusEffects.find((se: ActiveStatusEffect) => se.id === statusId);
    if (existing) {
      if (def.stackable && existing.stacks < def.maxStacks) {
        existing.stacks++;
        existing.remainingTurns = Math.max(existing.remainingTurns, duration);
      } else {
        existing.remainingTurns = Math.max(existing.remainingTurns, duration);
      }
      return;
    }

    entity.statusEffects.push({
      id: def.id,
      name: def.name,
      type: def.type,
      remainingTurns: duration,
      stacks: 1,
      tickEffect: def.tickEffect,
      tickPower: def.tickPower,
      statModifiers: def.statModifiers ? { ...def.statModifiers } : undefined,
    });
  }

  private static tickStatusEffects(
    heroes: CombatHero[],
    enemies: CombatEnemy[],
    round: number,
    entries: CombatLogEntry[],
  ): void {
    const allEntities = [...heroes.filter(h => h.alive), ...enemies.filter(e => e.alive)];
    for (const entity of allEntities) {
      for (let i = entity.statusEffects.length - 1; i >= 0; i--) {
        const se = entity.statusEffects[i];
        if (se.tickEffect === 'damage' && se.tickPower) {
          const tickDmg = se.tickPower * se.stacks;
          entity.currentHp = Math.max(0, entity.currentHp - tickDmg);
          if (entity.currentHp <= 0) (entity as any).alive = false;
          entries.push(this.makeLogEntry(round, se.name, 'enemy', 'dot', se.name, entity.name ?? (entity as any).instanceId, tickDmg, 0, false, false, se.id, `${entity.name} takes ${tickDmg} ${se.name} damage.`));
        } else if (se.tickEffect === 'heal' && se.tickPower) {
          const heal = se.tickPower;
          entity.currentHp = Math.min((entity as any).maxHp, entity.currentHp + heal);
          entries.push(this.makeLogEntry(round, se.name, 'hero', 'hot', se.name, entity.name ?? (entity as any).instanceId, 0, heal, false, false, se.id, `${entity.name} regenerates ${heal} HP.`));
        }

        se.remainingTurns--;
        if (se.remainingTurns <= 0) {
          entity.statusEffects.splice(i, 1);
        }
      }
    }
  }

  // ── Passives (T-1263, T-1268, T-1271) ──

  private static processPassives(
    enemies: CombatEnemy[],
    heroes: CombatHero[],
    round: number,
    entries: CombatLogEntry[],
  ): void {
    for (const enemy of enemies) {
      // T-1268: Troll regeneration
      if (enemy.alive && enemy.passive === 'regeneration') {
        const heal = Math.round(enemy.maxHp * 0.1);
        enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + heal);
        entries.push(this.makeLogEntry(round, enemy.name, 'enemy', 'passive', 'Regeneration', enemy.name, 0, heal, false, false, undefined, `${enemy.name} regenerates ${heal} HP.`));
      }

      // T-1263: Skeleton resurrect
      if (!enemy.alive && enemy.passive === 'resurrect' && !enemy.hasResurrected) {
        if (Math.random() < 0.4) {
          enemy.alive = true;
          enemy.currentHp = Math.round(enemy.maxHp * 0.5);
          enemy.hasResurrected = true;
          entries.push(this.makeLogEntry(round, enemy.name, 'enemy', 'passive', 'Resurrect', enemy.name, 0, 0, false, false, undefined, `${enemy.name} rises from the dead!`));
        }
      }

      // T-1271: Slime split on death
      if (!enemy.alive && enemy.passive === 'split_on_death') {
        // Mark as handled
        enemy.passive = undefined;
        for (let i = 0; i < 2; i++) {
          const mini: CombatEnemy = {
            ...enemy,
            instanceId: `${enemy.id}_split_${i}_${round}`,
            name: `Mini ${enemy.name}`,
            maxHp: Math.round(enemy.maxHp * 0.5),
            currentHp: Math.round(enemy.maxHp * 0.5),
            attack: Math.round(enemy.attack * 0.5),
            defense: Math.round(enemy.defense * 0.5),
            speed: enemy.speed,
            magicPower: Math.round(enemy.magicPower * 0.5),
            alive: true,
            statusEffects: [],
            cooldowns: {},
            passive: undefined,
            xpReward: Math.round(enemy.xpReward * 0.3),
            loot: [],
          };
          enemies.push(mini);
        }
        entries.push(this.makeLogEntry(round, enemy.name, 'enemy', 'passive', 'Split', enemy.name, 0, 0, false, false, undefined, `${enemy.name} splits into two!`));
      }
    }
  }

  // ── Ability Selection ──

  private static selectHeroAbility(
    hero: CombatHero,
    allHeroes: CombatHero[],
    enemies: CombatEnemy[],
    boss: CombatBoss | null,
  ): HeroCombatAbility {
    // Check ultimate (T-1313)
    if (hero.ultimateCharge >= hero.ultimateMax) {
      const ult = hero.abilities.find(a => a.isUltimate);
      if (ult) return ult;
    }

    // Check if healing is needed (T-1248)
    const injuredAllies = allHeroes.filter(h => h.alive && h.currentHp < h.maxHp * 0.5);
    if (injuredAllies.length > 0) {
      const healAbility = hero.abilities.find(a => a.healPower && a.healPower > 0 && !a.isUltimate && (!hero.cooldowns[a.id] || hero.cooldowns[a.id] <= 0));
      if (healAbility) return healAbility;
    }

    // Check for revive (T-1311)
    const deadAllies = allHeroes.filter(h => !h.alive);
    if (deadAllies.length > 0) {
      const reviveAbility = hero.abilities.find(a => a.revive && (!hero.cooldowns[a.id] || hero.cooldowns[a.id] <= 0));
      if (reviveAbility) return reviveAbility;
    }

    // Use special ability if off cooldown
    const specials = hero.abilities.filter(a =>
      !a.isUltimate && !a.healPower && !a.revive && a.cooldown > 0 &&
      (!hero.cooldowns[a.id] || hero.cooldowns[a.id] <= 0),
    );
    if (specials.length > 0 && Math.random() < 0.6) {
      return specials[Math.floor(Math.random() * specials.length)];
    }

    // Basic attack
    return hero.abilities.find(a => a.id === 'basic_attack') ?? hero.abilities[0];
  }

  private static selectEnemyAbility(
    enemy: CombatEnemy,
    heroes: CombatHero[],
    allEnemies: CombatEnemy[],
  ): EnemyAbility {
    const available = enemy.abilities.filter(a => !enemy.cooldowns[a.id] || enemy.cooldowns[a.id] <= 0);
    if (available.length <= 1) return available[0] ?? enemy.abilities[0];

    // T-1317: Behavior-based selection
    switch (enemy.behavior) {
      case 'aggressive':
        return available.reduce((best, a) => a.power > best.power ? a : best, available[0]);
      case 'caster':
        return available.find(a => a.statusEffect) ?? available.reduce((best, a) => a.power > best.power ? a : best, available[0]);
      case 'support':
        return available.find(a => a.targetType === 'ally' || a.targetType === 'self') ?? available[0];
      case 'swarm':
        return available.find(a => a.targetType === 'aoe') ?? available[0];
      case 'assassin':
        return available.reduce((best, a) => a.power > best.power ? a : best, available[0]);
      default:
        return available[Math.floor(Math.random() * available.length)];
    }
  }

  // ── Target Selection ──

  private static selectTargets(
    ability: HeroCombatAbility,
    enemies: CombatEnemy[],
    boss: CombatBoss | null,
  ): Array<CombatEnemy | CombatBoss> {
    const alive = enemies.filter(e => e.alive);
    if (ability.targetType === 'all_enemies') {
      const targets: Array<CombatEnemy | CombatBoss> = [...alive];
      if (boss && boss.alive) targets.push(boss);
      return targets;
    }
    // Single target — prioritize boss if present
    if (boss && boss.alive) return [boss];
    if (alive.length === 0) return [];
    return [alive[Math.floor(Math.random() * alive.length)]];
  }

  private static findLowestHpHero(heroes: CombatHero[]): CombatHero | undefined {
    return heroes.filter(h => h.alive).reduce((low: CombatHero | undefined, h) => {
      if (!low) return h;
      return (h.currentHp / h.maxHp) < (low.currentHp / low.maxHp) ? h : low;
    }, undefined);
  }

  // ── Terrain & Weather Application ──

  private static applyTerrainEffects(heroes: CombatHero[], enemies: CombatEnemy[], terrain: TerrainEffect): void {
    for (const mod of terrain.statModifiers) {
      const applyTo = mod.target === 'heroes' ? heroes : mod.target === 'enemies' ? enemies : [...heroes, ...enemies as any[]];
      for (const entity of applyTo) {
        (entity as any)[mod.stat] = ((entity as any)[mod.stat] ?? 0) + mod.bonus;
      }
    }
  }

  private static applyWeatherStatEffects(heroes: CombatHero[], enemies: CombatEnemy[], weather: WeatherCombatEffect): void {
    const all = [...heroes, ...enemies as any[]];
    for (const mod of weather.statModifiers) {
      for (const entity of all) {
        (entity as any)[mod.stat] = ((entity as any)[mod.stat] ?? 0) + mod.bonus;
      }
    }
  }

  // ── Synergy Application ──

  private static applySynergies(heroes: CombatHero[], synergies: SquadSynergy[]): void {
    for (const syn of synergies) {
      for (const bonus of syn.bonuses) {
        for (const hero of heroes) {
          const base = (hero as any)[bonus.stat] ?? 0;
          (hero as any)[bonus.stat] = Math.round(base * (1 + bonus.percentBonus / 100));
        }
      }
    }
  }

  // ── Rewards (T-1290, T-1291, T-1293) ──

  private static calculateRewards(
    heroes: CombatHero[],
    enemies: CombatEnemy[],
    boss: CombatBoss | null,
    stats: CombatStatistics,
  ): CombatReward {
    let xp = 0;
    let gold = 0;
    const lootMap: Record<string, number> = {};
    const items: string[] = [];

    // Per-enemy loot roll (T-1290)
    for (const enemy of enemies) {
      xp += enemy.xpReward;
      for (const drop of enemy.loot) {
        if (Math.random() < drop.chance) {
          const amount = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
          if (drop.resource === 'gold') {
            gold += amount;
          } else {
            lootMap[drop.resource] = (lootMap[drop.resource] ?? 0) + amount;
          }
        }
      }
    }

    // Boss loot
    if (boss && !boss.alive) {
      xp += boss.xpReward;
      for (const drop of boss.loot) {
        if (Math.random() < drop.chance) {
          const amount = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
          if (drop.resource === 'gold') {
            gold += amount;
          } else {
            lootMap[drop.resource] = (lootMap[drop.resource] ?? 0) + amount;
          }
        }
      }
      // Exclusive rewards
      for (const item of boss.exclusiveRewards) {
        if (Math.random() < 0.3) {
          items.push(item);
        }
      }
    }

    // T-1291: Rare drop roll
    let rareDrop: string | undefined;
    if (Math.random() < 0.05) {
      rareDrop = 'rare_combat_trophy';
    }

    const loot = Object.entries(lootMap).map(([resource, amount]) => ({ resource, amount }));

    return { xp, gold, loot, items, rareDrop };
  }

  // ── Log Entry Builder ──

  private static makeLogEntry(
    round: number,
    actorName: string,
    actorSide: 'hero' | 'enemy',
    action: string,
    abilityName: string,
    targetName: string,
    damage: number,
    healing: number,
    isCritical: boolean,
    isDodged: boolean,
    statusApplied: string | undefined,
    narrative: string,
  ): CombatLogEntry {
    return { round, actorName, actorSide, action, abilityName, targetName, damage, healing, isCritical, isDodged, statusApplied, narrative };
  }

  // ── T-1300: Challenge Mode ──

  static createChallengeEncounter(challengeId: string): { enemies: EnemyDefinition[]; bossId?: string } {
    const challenges: Record<string, { enemies: string[]; bossId?: string }> = {
      gauntlet_1: { enemies: ['goblin', 'goblin', 'goblin', 'goblin', 'goblin'] },
      gauntlet_2: { enemies: ['skeleton', 'skeleton', 'ghost', 'ghost'] },
      gauntlet_3: { enemies: ['orc', 'orc', 'troll'] },
      boss_rush_1: { enemies: [], bossId: 'dragon_lord' },
      boss_rush_2: { enemies: [], bossId: 'lich_king' },
      boss_rush_3: { enemies: [], bossId: 'kraken' },
      elite_squad: { enemies: ['assassin', 'necromancer', 'dragon'] },
    };
    const def = challenges[challengeId] ?? challenges.gauntlet_1;
    const enemies = def.enemies.map(id => ENEMY_DEFINITIONS.find(e => e.id === id)).filter(Boolean) as EnemyDefinition[];
    return { enemies, bossId: def.bossId };
  }

  // ── T-1318: Combat Achievements ──

  static checkAchievements(result: CombatResult): string[] {
    const achieved: string[] = [];
    if (result.outcome === 'victory' && result.statistics.heroesKnockedOut === 0) {
      achieved.push('flawless_victory');
    }
    if (result.outcome === 'victory' && result.bossPhaseReached !== undefined) {
      achieved.push('boss_slayer');
    }
    if (result.statistics.criticalHits >= 5) {
      achieved.push('critical_master');
    }
    if (result.statistics.comboChains >= 3) {
      achieved.push('combo_king');
    }
    if (result.statistics.ultimatesUsed >= 2) {
      achieved.push('ultimate_unleashed');
    }
    if (result.totalRounds <= 5 && result.outcome === 'victory') {
      achieved.push('speed_demon');
    }
    if (result.statistics.dodges >= 5) {
      achieved.push('untouchable');
    }
    if (result.statistics.totalHealing >= 100) {
      achieved.push('master_healer');
    }
    return achieved;
  }

  // ── T-1302: Statistics Aggregation ──

  static aggregateStatistics(
    existing: Record<string, number>,
    result: CombatResult,
  ): Record<string, number> {
    return {
      totalBattles: (existing.totalBattles ?? 0) + 1,
      totalWins: (existing.totalWins ?? 0) + (result.outcome === 'victory' ? 1 : 0),
      totalLosses: (existing.totalLosses ?? 0) + (result.outcome === 'defeat' ? 1 : 0),
      totalDamageDealt: (existing.totalDamageDealt ?? 0) + result.statistics.totalDamageDealt,
      totalDamageTaken: (existing.totalDamageTaken ?? 0) + result.statistics.totalDamageTaken,
      totalHealing: (existing.totalHealing ?? 0) + result.statistics.totalHealing,
      totalKills: (existing.totalKills ?? 0) + result.statistics.enemiesDefeated,
      totalCrits: (existing.totalCrits ?? 0) + result.statistics.criticalHits,
      totalDodges: (existing.totalDodges ?? 0) + result.statistics.dodges,
      bossKills: (existing.bossKills ?? 0) + (result.bossPhaseReached !== undefined && result.outcome === 'victory' ? 1 : 0),
    };
  }
}
