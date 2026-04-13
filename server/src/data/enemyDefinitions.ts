/**
 * Enemy type definitions for the combat system.
 *
 * T-1261: Create 20 enemy types across different regions
 * T-1262–T-1281: Individual enemy type implementations
 * T-1317: Combat AI behavior patterns per enemy type
 */

export type DamageType = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'dark' | 'light';
export type EnemyBehavior = 'aggressive' | 'defensive' | 'support' | 'swarm' | 'assassin' | 'caster';

export interface EnemyAbility {
  id: string;
  name: string;
  description: string;
  damageType: DamageType;
  power: number;         // base damage/heal amount
  accuracy: number;      // 0-100 hit chance modifier
  cooldown: number;      // turns between uses
  targetType: 'single' | 'aoe' | 'self' | 'ally';
  statusEffect?: string; // status effect key to apply
  statusChance?: number; // 0-1 chance to apply
  statusDuration?: number;
}

export interface EnemyLootEntry {
  resource: string;
  min: number;
  max: number;
  chance: number;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  description: string;
  region: string;
  tier: number;          // 1-5, scales difficulty
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  magicPower: number;
  magicResist: number;
  damageType: DamageType;
  weaknesses: DamageType[];
  resistances: DamageType[];
  abilities: EnemyAbility[];
  behavior: EnemyBehavior;
  loot: EnemyLootEntry[];
  xpReward: number;
  passive?: string;      // special passive ability key
  spawnWeight: number;   // relative spawn frequency
}

export const ENEMY_DEFINITIONS: EnemyDefinition[] = [
  // T-1262: Goblin — swarm attack pattern
  {
    id: 'goblin',
    name: 'Goblin',
    description: 'A small, cunning creature that attacks in large numbers.',
    region: 'scrapyard_outskirts',
    tier: 1,
    hp: 25,
    attack: 8,
    defense: 3,
    speed: 14,
    magicPower: 2,
    magicResist: 3,
    damageType: 'physical',
    weaknesses: ['fire'],
    resistances: [],
    abilities: [
      {
        id: 'goblin_stab',
        name: 'Rusty Stab',
        description: 'A quick stab with a rusty blade.',
        damageType: 'physical',
        power: 10,
        accuracy: 85,
        cooldown: 0,
        targetType: 'single',
        statusEffect: 'poison',
        statusChance: 0.15,
        statusDuration: 2,
      },
      {
        id: 'goblin_swarm',
        name: 'Swarm Attack',
        description: 'All goblins pile on a single target.',
        damageType: 'physical',
        power: 6,
        accuracy: 90,
        cooldown: 3,
        targetType: 'single',
      },
    ],
    behavior: 'swarm',
    loot: [
      { resource: 'gold', min: 2, max: 8, chance: 0.8 },
    ],
    xpReward: 8,
    passive: 'swarm_bonus', // +5% attack per additional goblin
    spawnWeight: 20,
  },

  // T-1263: Skeleton — resurrection ability
  {
    id: 'skeleton',
    name: 'Skeleton Warrior',
    description: 'An undead warrior that refuses to stay down.',
    region: 'abandoned_warehouse',
    tier: 2,
    hp: 35,
    attack: 12,
    defense: 8,
    speed: 8,
    magicPower: 3,
    magicResist: 5,
    damageType: 'physical',
    weaknesses: ['light', 'fire'],
    resistances: ['dark', 'poison'],
    abilities: [
      {
        id: 'skeleton_slash',
        name: 'Bone Slash',
        description: 'A sweeping cut with a rusted sword.',
        damageType: 'physical',
        power: 14,
        accuracy: 80,
        cooldown: 0,
        targetType: 'single',
      },
    ],
    behavior: 'aggressive',
    loot: [
      { resource: 'ore', min: 2, max: 6, chance: 0.6 },
      { resource: 'essence', min: 1, max: 3, chance: 0.3 },
    ],
    xpReward: 12,
    passive: 'resurrect', // 40% chance to revive with 50% HP once
    spawnWeight: 15,
  },

  // T-1264: Wolf — pack bonus
  {
    id: 'wolf',
    name: 'Dire Wolf',
    description: 'A large predator strengthened by its pack.',
    region: 'whispering_woods',
    tier: 1,
    hp: 30,
    attack: 11,
    defense: 5,
    speed: 16,
    magicPower: 1,
    magicResist: 3,
    damageType: 'physical',
    weaknesses: ['fire'],
    resistances: [],
    abilities: [
      {
        id: 'wolf_bite',
        name: 'Savage Bite',
        description: 'A ferocious bite aimed at exposed flesh.',
        damageType: 'physical',
        power: 13,
        accuracy: 88,
        cooldown: 0,
        targetType: 'single',
      },
      {
        id: 'wolf_howl',
        name: 'Pack Howl',
        description: 'A rallying howl that strengthens allies.',
        damageType: 'physical',
        power: 0,
        accuracy: 100,
        cooldown: 4,
        targetType: 'ally',
        statusEffect: 'haste',
        statusChance: 1.0,
        statusDuration: 2,
      },
    ],
    behavior: 'aggressive',
    loot: [
      { resource: 'food', min: 3, max: 10, chance: 0.9 },
    ],
    xpReward: 10,
    passive: 'pack_bonus', // +8% attack per wolf ally
    spawnWeight: 18,
  },

  // T-1265: Bandit — steal ability
  {
    id: 'bandit',
    name: 'Bandit',
    description: 'A ruthless outlaw who fights dirty.',
    region: 'trade_routes',
    tier: 2,
    hp: 40,
    attack: 13,
    defense: 7,
    speed: 12,
    magicPower: 2,
    magicResist: 4,
    damageType: 'physical',
    weaknesses: [],
    resistances: [],
    abilities: [
      {
        id: 'bandit_slash',
        name: 'Cutthroat Slash',
        description: 'A quick slash aimed at vulnerable spots.',
        damageType: 'physical',
        power: 15,
        accuracy: 82,
        cooldown: 0,
        targetType: 'single',
      },
      {
        id: 'bandit_steal',
        name: 'Steal',
        description: 'Pilfers gold from a hero.',
        damageType: 'physical',
        power: 5,
        accuracy: 75,
        cooldown: 3,
        targetType: 'single',
        statusEffect: 'gold_stolen',
        statusChance: 0.8,
        statusDuration: 0,
      },
    ],
    behavior: 'assassin',
    loot: [
      { resource: 'gold', min: 8, max: 25, chance: 0.9 },
    ],
    xpReward: 14,
    passive: 'steal_gold', // steals gold on hit
    spawnWeight: 14,
  },

  // T-1266: Elemental — elemental resistance
  {
    id: 'elemental',
    name: 'Storm Elemental',
    description: 'A crackling mass of pure elemental energy.',
    region: 'thunderpeak_ridge',
    tier: 3,
    hp: 50,
    attack: 10,
    defense: 6,
    speed: 13,
    magicPower: 18,
    magicResist: 15,
    damageType: 'lightning',
    weaknesses: ['ice'],
    resistances: ['lightning', 'fire'],
    abilities: [
      {
        id: 'elemental_bolt',
        name: 'Lightning Bolt',
        description: 'A focused bolt of electrical energy.',
        damageType: 'lightning',
        power: 20,
        accuracy: 85,
        cooldown: 0,
        targetType: 'single',
        statusEffect: 'stun',
        statusChance: 0.2,
        statusDuration: 1,
      },
      {
        id: 'elemental_storm',
        name: 'Chain Lightning',
        description: 'Lightning arcs between multiple targets.',
        damageType: 'lightning',
        power: 12,
        accuracy: 80,
        cooldown: 3,
        targetType: 'aoe',
      },
    ],
    behavior: 'caster',
    loot: [
      { resource: 'essence', min: 4, max: 12, chance: 0.85 },
    ],
    xpReward: 20,
    spawnWeight: 10,
  },

  // T-1267: Dragon — breath attack AoE
  {
    id: 'dragon',
    name: 'Young Dragon',
    description: 'A fearsome winged beast that rains fire from above.',
    region: 'thunderpeak_ridge',
    tier: 5,
    hp: 120,
    attack: 22,
    defense: 18,
    speed: 10,
    magicPower: 25,
    magicResist: 20,
    damageType: 'fire',
    weaknesses: ['ice'],
    resistances: ['fire', 'physical'],
    abilities: [
      {
        id: 'dragon_claw',
        name: 'Rending Claw',
        description: 'A devastating claw swipe.',
        damageType: 'physical',
        power: 25,
        accuracy: 80,
        cooldown: 0,
        targetType: 'single',
      },
      {
        id: 'dragon_breath',
        name: 'Fire Breath',
        description: 'A cone of scorching fire engulfs the party.',
        damageType: 'fire',
        power: 18,
        accuracy: 90,
        cooldown: 3,
        targetType: 'aoe',
        statusEffect: 'burn',
        statusChance: 0.5,
        statusDuration: 3,
      },
    ],
    behavior: 'aggressive',
    loot: [
      { resource: 'gold', min: 30, max: 80, chance: 1.0 },
      { resource: 'essence', min: 10, max: 25, chance: 0.7 },
    ],
    xpReward: 60,
    spawnWeight: 3,
  },

  // T-1268: Troll — regeneration
  {
    id: 'troll',
    name: 'Cave Troll',
    description: 'A hulking brute with remarkable regeneration.',
    region: 'crystal_caverns',
    tier: 3,
    hp: 70,
    attack: 18,
    defense: 10,
    speed: 6,
    magicPower: 3,
    magicResist: 5,
    damageType: 'physical',
    weaknesses: ['fire'],
    resistances: ['poison'],
    abilities: [
      {
        id: 'troll_smash',
        name: 'Club Smash',
        description: 'A massive overhead swing.',
        damageType: 'physical',
        power: 22,
        accuracy: 70,
        cooldown: 0,
        targetType: 'single',
      },
    ],
    behavior: 'aggressive',
    loot: [
      { resource: 'food', min: 5, max: 15, chance: 0.7 },
      { resource: 'ore', min: 3, max: 10, chance: 0.5 },
    ],
    xpReward: 22,
    passive: 'regeneration', // heals 10% HP per turn
    spawnWeight: 10,
  },

  // T-1269: Ghost — physical damage resistance
  {
    id: 'ghost',
    name: 'Restless Ghost',
    description: 'A translucent specter that shrugs off physical attacks.',
    region: 'abandoned_warehouse',
    tier: 3,
    hp: 40,
    attack: 8,
    defense: 2,
    speed: 15,
    magicPower: 16,
    magicResist: 12,
    damageType: 'dark',
    weaknesses: ['light'],
    resistances: ['physical', 'poison', 'dark'],
    abilities: [
      {
        id: 'ghost_touch',
        name: 'Chilling Touch',
        description: 'An icy spectral hand drains warmth.',
        damageType: 'dark',
        power: 14,
        accuracy: 90,
        cooldown: 0,
        targetType: 'single',
        statusEffect: 'slow',
        statusChance: 0.3,
        statusDuration: 2,
      },
      {
        id: 'ghost_wail',
        name: 'Horrifying Wail',
        description: 'A soul-rending scream.',
        damageType: 'dark',
        power: 10,
        accuracy: 95,
        cooldown: 4,
        targetType: 'aoe',
        statusEffect: 'blind',
        statusChance: 0.4,
        statusDuration: 2,
      },
    ],
    behavior: 'caster',
    loot: [
      { resource: 'essence', min: 3, max: 10, chance: 0.8 },
    ],
    xpReward: 18,
    passive: 'incorporeal', // 50% physical damage reduction
    spawnWeight: 8,
  },

  // T-1270: Golem — high defense low speed
  {
    id: 'golem',
    name: 'Stone Golem',
    description: 'A massive stone construct, nearly immovable.',
    region: 'crystal_caverns',
    tier: 4,
    hp: 100,
    attack: 20,
    defense: 25,
    speed: 3,
    magicPower: 5,
    magicResist: 15,
    damageType: 'physical',
    weaknesses: ['lightning'],
    resistances: ['physical', 'fire', 'poison'],
    abilities: [
      {
        id: 'golem_slam',
        name: 'Ground Slam',
        description: 'The golem smashes both fists into the ground.',
        damageType: 'physical',
        power: 28,
        accuracy: 65,
        cooldown: 0,
        targetType: 'single',
        statusEffect: 'stun',
        statusChance: 0.25,
        statusDuration: 1,
      },
    ],
    behavior: 'defensive',
    loot: [
      { resource: 'ore', min: 8, max: 20, chance: 0.9 },
      { resource: 'stone', min: 5, max: 15, chance: 0.7 },
    ],
    xpReward: 28,
    spawnWeight: 7,
  },

  // T-1271: Slime — split on death
  {
    id: 'slime',
    name: 'Caustic Slime',
    description: 'A blob of acidic ooze that splits when defeated.',
    region: 'scrapyard_outskirts',
    tier: 1,
    hp: 20,
    attack: 6,
    defense: 2,
    speed: 5,
    magicPower: 8,
    magicResist: 8,
    damageType: 'poison',
    weaknesses: ['fire', 'ice'],
    resistances: ['physical', 'poison'],
    abilities: [
      {
        id: 'slime_spit',
        name: 'Acid Spit',
        description: 'Launches a glob of corrosive acid.',
        damageType: 'poison',
        power: 10,
        accuracy: 85,
        cooldown: 0,
        targetType: 'single',
        statusEffect: 'poison',
        statusChance: 0.4,
        statusDuration: 3,
      },
    ],
    behavior: 'defensive',
    loot: [
      { resource: 'herbs', min: 2, max: 6, chance: 0.7 },
    ],
    xpReward: 6,
    passive: 'split_on_death', // spawns 2 mini slimes at 50% stats
    spawnWeight: 16,
  },

  // T-1272: Spider — web (slow) debuff
  {
    id: 'spider',
    name: 'Giant Spider',
    description: 'A hairy arachnid that traps prey in sticky webs.',
    region: 'whispering_woods',
    tier: 2,
    hp: 28,
    attack: 10,
    defense: 5,
    speed: 14,
    magicPower: 6,
    magicResist: 4,
    damageType: 'poison',
    weaknesses: ['fire'],
    resistances: ['poison'],
    abilities: [
      {
        id: 'spider_bite',
        name: 'Venomous Bite',
        description: 'A fanged bite injecting venom.',
        damageType: 'poison',
        power: 12,
        accuracy: 85,
        cooldown: 0,
        targetType: 'single',
        statusEffect: 'poison',
        statusChance: 0.35,
        statusDuration: 3,
      },
      {
        id: 'spider_web',
        name: 'Web Shot',
        description: 'Fires a glob of sticky web.',
        damageType: 'physical',
        power: 4,
        accuracy: 80,
        cooldown: 2,
        targetType: 'single',
        statusEffect: 'slow',
        statusChance: 0.7,
        statusDuration: 2,
      },
    ],
    behavior: 'assassin',
    loot: [
      { resource: 'herbs', min: 2, max: 8, chance: 0.6 },
    ],
    xpReward: 11,
    spawnWeight: 14,
  },

  // T-1273: Orc — berserk on low HP
  {
    id: 'orc',
    name: 'Orc Berserker',
    description: 'A brutal warrior that grows more dangerous when wounded.',
    region: 'trade_routes',
    tier: 3,
    hp: 55,
    attack: 16,
    defense: 9,
    speed: 10,
    magicPower: 3,
    magicResist: 6,
    damageType: 'physical',
    weaknesses: ['ice'],
    resistances: [],
    abilities: [
      {
        id: 'orc_cleave',
        name: 'War Cleave',
        description: 'A wide, devastating axe swing.',
        damageType: 'physical',
        power: 18,
        accuracy: 78,
        cooldown: 0,
        targetType: 'single',
      },
      {
        id: 'orc_rage',
        name: 'Blood Rage',
        description: 'Enters a berserk frenzy at low health.',
        damageType: 'physical',
        power: 0,
        accuracy: 100,
        cooldown: 99, // auto-triggers once
        targetType: 'self',
        statusEffect: 'berserk',
        statusChance: 1.0,
        statusDuration: 99,
      },
    ],
    behavior: 'aggressive',
    loot: [
      { resource: 'gold', min: 5, max: 15, chance: 0.8 },
      { resource: 'ore', min: 3, max: 8, chance: 0.5 },
    ],
    xpReward: 18,
    passive: 'berserk_low_hp', // gains berserk at 30% HP
    spawnWeight: 12,
  },

  // T-1274: Witch — curse debuff
  {
    id: 'witch',
    name: 'Swamp Witch',
    description: 'A cackling crone who hexes her enemies.',
    region: 'whispering_woods',
    tier: 3,
    hp: 35,
    attack: 7,
    defense: 4,
    speed: 11,
    magicPower: 20,
    magicResist: 16,
    damageType: 'dark',
    weaknesses: ['light', 'fire'],
    resistances: ['dark', 'poison'],
    abilities: [
      {
        id: 'witch_hex',
        name: 'Hex',
        description: 'Places a weakening curse on a hero.',
        damageType: 'dark',
        power: 8,
        accuracy: 90,
        cooldown: 2,
        targetType: 'single',
        statusEffect: 'blind',
        statusChance: 0.6,
        statusDuration: 3,
      },
      {
        id: 'witch_drain',
        name: 'Life Drain',
        description: 'Siphons life force from a target.',
        damageType: 'dark',
        power: 14,
        accuracy: 85,
        cooldown: 0,
        targetType: 'single',
      },
    ],
    behavior: 'caster',
    loot: [
      { resource: 'herbs', min: 5, max: 15, chance: 0.8 },
      { resource: 'essence', min: 3, max: 8, chance: 0.6 },
    ],
    xpReward: 20,
    spawnWeight: 8,
  },

  // T-1275: Giant — crushing blow
  {
    id: 'giant',
    name: 'Hill Giant',
    description: 'A towering brute that crushes everything in its path.',
    region: 'thunderpeak_ridge',
    tier: 4,
    hp: 90,
    attack: 24,
    defense: 14,
    speed: 4,
    magicPower: 5,
    magicResist: 8,
    damageType: 'physical',
    weaknesses: ['lightning'],
    resistances: ['physical'],
    abilities: [
      {
        id: 'giant_stomp',
        name: 'Crushing Stomp',
        description: 'The giant stomps the ground, shaking everyone.',
        damageType: 'physical',
        power: 30,
        accuracy: 60,
        cooldown: 0,
        targetType: 'single',
        statusEffect: 'stun',
        statusChance: 0.3,
        statusDuration: 1,
      },
      {
        id: 'giant_sweep',
        name: 'Boulder Throw',
        description: 'Hurls a massive rock at the party.',
        damageType: 'physical',
        power: 20,
        accuracy: 55,
        cooldown: 3,
        targetType: 'aoe',
      },
    ],
    behavior: 'aggressive',
    loot: [
      { resource: 'food', min: 10, max: 30, chance: 0.9 },
      { resource: 'stone', min: 5, max: 15, chance: 0.6 },
    ],
    xpReward: 30,
    spawnWeight: 5,
  },

  // T-1276: Imp — magic steal
  {
    id: 'imp',
    name: 'Fire Imp',
    description: 'A mischievous little demon that steals magical energy.',
    region: 'crystal_caverns',
    tier: 2,
    hp: 22,
    attack: 6,
    defense: 4,
    speed: 18,
    magicPower: 14,
    magicResist: 12,
    damageType: 'fire',
    weaknesses: ['ice', 'light'],
    resistances: ['fire'],
    abilities: [
      {
        id: 'imp_fireball',
        name: 'Firebolt',
        description: 'A small but accurate fireball.',
        damageType: 'fire',
        power: 12,
        accuracy: 90,
        cooldown: 0,
        targetType: 'single',
        statusEffect: 'burn',
        statusChance: 0.2,
        statusDuration: 2,
      },
      {
        id: 'imp_steal',
        name: 'Mana Siphon',
        description: 'Drains magical power from a hero.',
        damageType: 'dark',
        power: 6,
        accuracy: 85,
        cooldown: 3,
        targetType: 'single',
      },
    ],
    behavior: 'caster',
    loot: [
      { resource: 'essence', min: 2, max: 8, chance: 0.8 },
    ],
    xpReward: 10,
    passive: 'magic_steal', // reduces target intellect temporarily
    spawnWeight: 13,
  },

  // T-1277: Mimic — disguised as treasure
  {
    id: 'mimic',
    name: 'Mimic',
    description: 'A shapeshifting creature disguised as a treasure chest.',
    region: 'abandoned_warehouse',
    tier: 3,
    hp: 50,
    attack: 16,
    defense: 12,
    speed: 8,
    magicPower: 8,
    magicResist: 10,
    damageType: 'physical',
    weaknesses: ['fire'],
    resistances: ['dark'],
    abilities: [
      {
        id: 'mimic_chomp',
        name: 'Surprise Chomp',
        description: 'The chest springs open revealing rows of teeth.',
        damageType: 'physical',
        power: 22,
        accuracy: 90,
        cooldown: 0,
        targetType: 'single',
      },
      {
        id: 'mimic_swallow',
        name: 'Swallow Whole',
        description: 'Attempts to devour a hero completely.',
        damageType: 'physical',
        power: 30,
        accuracy: 50,
        cooldown: 4,
        targetType: 'single',
        statusEffect: 'stun',
        statusChance: 0.5,
        statusDuration: 2,
      },
    ],
    behavior: 'aggressive',
    loot: [
      { resource: 'gold', min: 15, max: 50, chance: 1.0 },
      { resource: 'essence', min: 5, max: 15, chance: 0.5 },
    ],
    xpReward: 25,
    passive: 'ambush', // guaranteed first strike
    spawnWeight: 5,
  },

  // T-1278: Wraith — life drain
  {
    id: 'wraith',
    name: 'Wraith',
    description: 'A malevolent spirit that feeds on the life force of the living.',
    region: 'crystal_caverns',
    tier: 4,
    hp: 55,
    attack: 10,
    defense: 3,
    speed: 14,
    magicPower: 22,
    magicResist: 18,
    damageType: 'dark',
    weaknesses: ['light'],
    resistances: ['physical', 'dark', 'poison', 'ice'],
    abilities: [
      {
        id: 'wraith_drain',
        name: 'Life Drain',
        description: 'Steals life force, healing the wraith.',
        damageType: 'dark',
        power: 18,
        accuracy: 88,
        cooldown: 0,
        targetType: 'single',
      },
      {
        id: 'wraith_shadow',
        name: 'Shadow Embrace',
        description: 'Wraps a target in darkness, weakening them.',
        damageType: 'dark',
        power: 12,
        accuracy: 85,
        cooldown: 3,
        targetType: 'single',
        statusEffect: 'blind',
        statusChance: 0.5,
        statusDuration: 2,
      },
    ],
    behavior: 'caster',
    loot: [
      { resource: 'essence', min: 6, max: 18, chance: 0.9 },
    ],
    xpReward: 28,
    passive: 'life_drain', // heals for 50% of damage dealt
    spawnWeight: 6,
  },

  // T-1279: Hydra — multi-head attacks
  {
    id: 'hydra',
    name: 'Swamp Hydra',
    description: 'A multi-headed serpent with devastating multi-attacks.',
    region: 'whispering_woods',
    tier: 5,
    hp: 110,
    attack: 20,
    defense: 14,
    speed: 8,
    magicPower: 12,
    magicResist: 10,
    damageType: 'poison',
    weaknesses: ['fire', 'ice'],
    resistances: ['poison'],
    abilities: [
      {
        id: 'hydra_multi_bite',
        name: 'Multi-Head Strike',
        description: 'Each head strikes a different target.',
        damageType: 'physical',
        power: 12,
        accuracy: 80,
        cooldown: 0,
        targetType: 'aoe',
      },
      {
        id: 'hydra_venom',
        name: 'Venomous Spray',
        description: 'Sprays toxic venom over the entire party.',
        damageType: 'poison',
        power: 10,
        accuracy: 85,
        cooldown: 3,
        targetType: 'aoe',
        statusEffect: 'poison',
        statusChance: 0.5,
        statusDuration: 3,
      },
    ],
    behavior: 'aggressive',
    loot: [
      { resource: 'herbs', min: 10, max: 25, chance: 0.9 },
      { resource: 'essence', min: 5, max: 15, chance: 0.6 },
    ],
    xpReward: 50,
    passive: 'multi_attack', // attacks 3 times per turn at reduced power
    spawnWeight: 3,
  },

  // T-1280: Assassin — guaranteed crit first strike
  {
    id: 'assassin',
    name: 'Shadow Assassin',
    description: 'A deadly killer who strikes from the shadows.',
    region: 'trade_routes',
    tier: 4,
    hp: 40,
    attack: 22,
    defense: 6,
    speed: 20,
    magicPower: 8,
    magicResist: 8,
    damageType: 'physical',
    weaknesses: ['light'],
    resistances: ['dark'],
    abilities: [
      {
        id: 'assassin_stab',
        name: 'Backstab',
        description: 'A precise strike targeting vital organs.',
        damageType: 'physical',
        power: 28,
        accuracy: 92,
        cooldown: 0,
        targetType: 'single',
      },
      {
        id: 'assassin_vanish',
        name: 'Vanish',
        description: 'Disappears into shadow, becoming untargetable briefly.',
        damageType: 'physical',
        power: 0,
        accuracy: 100,
        cooldown: 4,
        targetType: 'self',
        statusEffect: 'shield',
        statusChance: 1.0,
        statusDuration: 1,
      },
    ],
    behavior: 'assassin',
    loot: [
      { resource: 'gold', min: 10, max: 30, chance: 0.8 },
    ],
    xpReward: 26,
    passive: 'first_strike_crit', // first attack is always critical
    spawnWeight: 6,
  },

  // T-1281: Necromancer — summons minions
  {
    id: 'necromancer',
    name: 'Necromancer',
    description: 'A dark mage who raises the dead to fight for them.',
    region: 'crystal_caverns',
    tier: 5,
    hp: 45,
    attack: 6,
    defense: 5,
    speed: 9,
    magicPower: 24,
    magicResist: 20,
    damageType: 'dark',
    weaknesses: ['light', 'fire'],
    resistances: ['dark', 'poison'],
    abilities: [
      {
        id: 'necro_bolt',
        name: 'Shadow Bolt',
        description: 'A bolt of dark energy.',
        damageType: 'dark',
        power: 16,
        accuracy: 88,
        cooldown: 0,
        targetType: 'single',
      },
      {
        id: 'necro_summon',
        name: 'Raise Dead',
        description: 'Summons skeletal minions to the battle.',
        damageType: 'dark',
        power: 0,
        accuracy: 100,
        cooldown: 4,
        targetType: 'self',
      },
      {
        id: 'necro_curse',
        name: 'Death Curse',
        description: 'Places a withering curse on a hero.',
        damageType: 'dark',
        power: 10,
        accuracy: 85,
        cooldown: 3,
        targetType: 'single',
        statusEffect: 'poison',
        statusChance: 0.7,
        statusDuration: 4,
      },
    ],
    behavior: 'support',
    loot: [
      { resource: 'essence', min: 8, max: 22, chance: 0.9 },
      { resource: 'gold', min: 10, max: 25, chance: 0.6 },
    ],
    xpReward: 45,
    passive: 'summon_minions', // summons 1-2 skeletons every 4 turns
    spawnWeight: 4,
  },
];

/**
 * Get an enemy definition by ID.
 */
export function getEnemyById(enemyId: string): EnemyDefinition | undefined {
  return ENEMY_DEFINITIONS.find(e => e.id === enemyId);
}

/**
 * Get enemies available for a region and tier range.
 */
export function getEnemiesForRegion(
  region: string,
  minTier: number = 1,
  maxTier: number = 5,
): EnemyDefinition[] {
  return ENEMY_DEFINITIONS.filter(
    e => e.region === region && e.tier >= minTier && e.tier <= maxTier,
  );
}

/**
 * Select random enemies from pool using spawn weights.
 */
export function selectRandomEnemies(
  pool: EnemyDefinition[],
  count: number,
): EnemyDefinition[] {
  if (pool.length === 0) return [];
  const totalWeight = pool.reduce((s, e) => s + e.spawnWeight, 0);
  const result: EnemyDefinition[] = [];
  for (let i = 0; i < count; i++) {
    let roll = Math.random() * totalWeight;
    for (const enemy of pool) {
      roll -= enemy.spawnWeight;
      if (roll <= 0) {
        result.push(enemy);
        break;
      }
    }
  }
  return result;
}
