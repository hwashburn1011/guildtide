import { prisma } from '../db';
import { HeroRole, HeroStatus } from '../../../shared/src/enums';
import { SKILL_TREES, getSkillById } from '../data/heroSkillTrees';
import type { SkillNode, SkillEffect } from '../data/heroSkillTrees';
import { getQuestsForHero, getNextChainStep, ALL_QUEST_TEMPLATES } from '../data/heroQuests';
import type { QuestTemplate } from '../data/heroQuests';

// ── XP curve: XP required for each level ──
const BASE_XP = 100;
const XP_GROWTH = 1.25;

export function xpForLevel(level: number): number {
  return Math.floor(BASE_XP * Math.pow(XP_GROWTH, level - 1));
}

export function totalXpToLevel(targetLevel: number): number {
  let total = 0;
  for (let l = 1; l < targetLevel; l++) {
    total += xpForLevel(l);
  }
  return total;
}

// ── Stat growth per role per level ──
const ROLE_STAT_GROWTH: Record<string, Record<string, number>> = {
  [HeroRole.Farmer]:       { strength: 0.6, agility: 0.3, intellect: 0.2, endurance: 0.8, luck: 0.4 },
  [HeroRole.Scout]:        { strength: 0.3, agility: 0.9, intellect: 0.4, endurance: 0.3, luck: 0.5 },
  [HeroRole.Merchant]:     { strength: 0.2, agility: 0.3, intellect: 0.8, endurance: 0.2, luck: 0.7 },
  [HeroRole.Blacksmith]:   { strength: 0.9, agility: 0.2, intellect: 0.3, endurance: 0.8, luck: 0.2 },
  [HeroRole.Alchemist]:    { strength: 0.2, agility: 0.3, intellect: 1.0, endurance: 0.3, luck: 0.4 },
  [HeroRole.Hunter]:       { strength: 0.5, agility: 0.8, intellect: 0.3, endurance: 0.4, luck: 0.4 },
  [HeroRole.Defender]:     { strength: 0.7, agility: 0.2, intellect: 0.2, endurance: 1.0, luck: 0.2 },
  [HeroRole.Mystic]:       { strength: 0.1, agility: 0.3, intellect: 1.0, endurance: 0.2, luck: 0.7 },
  [HeroRole.CaravanMaster]:{ strength: 0.4, agility: 0.4, intellect: 0.5, endurance: 0.5, luck: 0.4 },
  [HeroRole.Archivist]:    { strength: 0.1, agility: 0.2, intellect: 1.1, endurance: 0.2, luck: 0.6 },
};

// ── Stat soft cap with diminishing returns ──
const STAT_SOFT_CAP = 30;

function applyDiminishingReturns(currentStat: number, gain: number): number {
  if (currentStat < STAT_SOFT_CAP) return gain;
  const overCap = currentStat - STAT_SOFT_CAP;
  const diminish = Math.max(0.1, 1 - overCap * 0.05);
  return Math.max(0.1, gain * diminish);
}

// ── Specialization definitions (unlock at level 10) ──
export interface Specialization {
  id: string;
  name: string;
  description: string;
  role: HeroRole;
  statModifiers: Record<string, number>; // multipliers on stat growth
  bonusEffect: string;
}

export const SPECIALIZATIONS: Record<string, Specialization[]> = {
  [HeroRole.Farmer]: [
    { id: 'crop_master', name: 'Crop Master', description: 'Doubled plant yields', role: HeroRole.Farmer, statModifiers: { endurance: 1.3, intellect: 1.1 }, bonusEffect: 'double_crop_yield' },
    { id: 'rancher', name: 'Rancher', description: 'Animal products doubled', role: HeroRole.Farmer, statModifiers: { strength: 1.2, endurance: 1.2 }, bonusEffect: 'double_animal_yield' },
  ],
  [HeroRole.Scout]: [
    { id: 'shadow_scout', name: 'Shadow Scout', description: 'Stealth expeditions', role: HeroRole.Scout, statModifiers: { agility: 1.4, luck: 1.1 }, bonusEffect: 'stealth_expedition' },
    { id: 'ranger', name: 'Ranger', description: 'Combat-ready scout', role: HeroRole.Scout, statModifiers: { strength: 1.2, agility: 1.2 }, bonusEffect: 'combat_scout' },
  ],
  [HeroRole.Merchant]: [
    { id: 'auctioneer', name: 'Auctioneer', description: 'Market manipulation master', role: HeroRole.Merchant, statModifiers: { intellect: 1.3, luck: 1.2 }, bonusEffect: 'market_manipulation' },
    { id: 'smuggler', name: 'Smuggler', description: 'Access to black market', role: HeroRole.Merchant, statModifiers: { agility: 1.2, luck: 1.3 }, bonusEffect: 'black_market' },
  ],
  [HeroRole.Blacksmith]: [
    { id: 'weaponsmith', name: 'Weaponsmith', description: 'Superior weapon crafting', role: HeroRole.Blacksmith, statModifiers: { strength: 1.4, agility: 1.1 }, bonusEffect: 'superior_weapons' },
    { id: 'armorsmith', name: 'Armorsmith', description: 'Superior armor crafting', role: HeroRole.Blacksmith, statModifiers: { strength: 1.2, endurance: 1.3 }, bonusEffect: 'superior_armor' },
  ],
  [HeroRole.Alchemist]: [
    { id: 'herbologist', name: 'Herbologist', description: 'Potion potency doubled', role: HeroRole.Alchemist, statModifiers: { intellect: 1.4, luck: 1.1 }, bonusEffect: 'potent_potions' },
    { id: 'transmuter', name: 'Transmuter', description: 'Resource conversion mastery', role: HeroRole.Alchemist, statModifiers: { intellect: 1.3, endurance: 1.2 }, bonusEffect: 'transmute_mastery' },
  ],
  [HeroRole.Hunter]: [
    { id: 'sniper', name: 'Sniper', description: 'Critical strike specialist', role: HeroRole.Hunter, statModifiers: { agility: 1.4, luck: 1.1 }, bonusEffect: 'crit_specialist' },
    { id: 'beastmaster', name: 'Beastmaster', description: 'Tamed beasts fight alongside', role: HeroRole.Hunter, statModifiers: { strength: 1.1, endurance: 1.3 }, bonusEffect: 'tame_beasts' },
  ],
  [HeroRole.Defender]: [
    { id: 'paladin', name: 'Paladin', description: 'Holy defense and healing', role: HeroRole.Defender, statModifiers: { endurance: 1.3, intellect: 1.2 }, bonusEffect: 'holy_defense' },
    { id: 'berserker', name: 'Berserker', description: 'Offensive tank', role: HeroRole.Defender, statModifiers: { strength: 1.4, endurance: 1.1 }, bonusEffect: 'offensive_tank' },
  ],
  [HeroRole.Mystic]: [
    { id: 'oracle', name: 'Oracle', description: 'Perfect foresight abilities', role: HeroRole.Mystic, statModifiers: { intellect: 1.4, luck: 1.2 }, bonusEffect: 'perfect_foresight' },
    { id: 'warlock', name: 'Warlock', description: 'Offensive magic', role: HeroRole.Mystic, statModifiers: { intellect: 1.3, strength: 1.2 }, bonusEffect: 'offensive_magic' },
  ],
  [HeroRole.CaravanMaster]: [
    { id: 'expedition_leader', name: 'Expedition Leader', description: 'Superior expedition command', role: HeroRole.CaravanMaster, statModifiers: { endurance: 1.3, intellect: 1.2 }, bonusEffect: 'expedition_command' },
    { id: 'trade_prince', name: 'Trade Prince', description: 'Maximum trade profits', role: HeroRole.CaravanMaster, statModifiers: { intellect: 1.3, luck: 1.2 }, bonusEffect: 'max_trade_profit' },
  ],
  [HeroRole.Archivist]: [
    { id: 'archmage', name: 'Archmage', description: 'Ultimate magical research', role: HeroRole.Archivist, statModifiers: { intellect: 1.5, luck: 1.1 }, bonusEffect: 'arcane_research' },
    { id: 'chronicler', name: 'Chronicler', description: 'XP and lore specialist', role: HeroRole.Archivist, statModifiers: { intellect: 1.3, endurance: 1.1 }, bonusEffect: 'xp_lore_specialist' },
  ],
};

// ── Class evolution definitions (unlock at level 20) ──
export interface ClassEvolution {
  id: string;
  name: string;
  description: string;
  role: HeroRole;
  statBoost: Record<string, number>;
  specialAbility: string;
}

export const CLASS_EVOLUTIONS: Record<string, ClassEvolution[]> = {
  [HeroRole.Farmer]: [{ id: 'harvest_king', name: 'Harvest King', description: 'Master of all growing things', role: HeroRole.Farmer, statBoost: { strength: 5, endurance: 5 }, specialAbility: 'harvest_king' }],
  [HeroRole.Scout]: [{ id: 'wind_runner', name: 'Wind Runner', description: 'Fastest scout alive', role: HeroRole.Scout, statBoost: { agility: 8, luck: 3 }, specialAbility: 'wind_runner' }],
  [HeroRole.Merchant]: [{ id: 'gold_emperor', name: 'Gold Emperor', description: 'Wealth beyond measure', role: HeroRole.Merchant, statBoost: { intellect: 5, luck: 5 }, specialAbility: 'gold_emperor' }],
  [HeroRole.Blacksmith]: [{ id: 'titan_forger', name: 'Titan Forger', description: 'Forge items of legend', role: HeroRole.Blacksmith, statBoost: { strength: 8, endurance: 3 }, specialAbility: 'titan_forge' }],
  [HeroRole.Alchemist]: [{ id: 'grand_alchemist', name: 'Grand Alchemist', description: 'Transmute reality itself', role: HeroRole.Alchemist, statBoost: { intellect: 8, luck: 3 }, specialAbility: 'reality_transmute' }],
  [HeroRole.Hunter]: [{ id: 'apex_predator', name: 'Apex Predator', description: 'No prey escapes', role: HeroRole.Hunter, statBoost: { agility: 5, strength: 5 }, specialAbility: 'apex_predator' }],
  [HeroRole.Defender]: [{ id: 'iron_bastion', name: 'Iron Bastion', description: 'An immovable fortress', role: HeroRole.Defender, statBoost: { endurance: 8, strength: 3 }, specialAbility: 'iron_bastion' }],
  [HeroRole.Mystic]: [{ id: 'arcane_sovereign', name: 'Arcane Sovereign', description: 'Master of all magic', role: HeroRole.Mystic, statBoost: { intellect: 8, luck: 3 }, specialAbility: 'arcane_sovereign' }],
  [HeroRole.CaravanMaster]: [{ id: 'world_trader', name: 'World Trader', description: 'Connected everywhere', role: HeroRole.CaravanMaster, statBoost: { intellect: 5, endurance: 5 }, specialAbility: 'world_trade' }],
  [HeroRole.Archivist]: [{ id: 'omniscient', name: 'The Omniscient', description: 'Knows all, sees all', role: HeroRole.Archivist, statBoost: { intellect: 10, luck: 2 }, specialAbility: 'omniscience' }],
};

// ── Hero story/journal milestone texts ──
export const HERO_STORY_MILESTONES: Record<number, string> = {
  1: 'A new adventurer joins the guild, eyes bright with possibility.',
  5: 'The hero has proven their worth. The guild recognizes their growing skill.',
  10: 'A seasoned veteran now, this hero has earned the respect of their peers.',
  15: 'Legends are whispered about this hero\'s deeds in the tavern.',
  20: 'A true master of their craft, few can rival this hero\'s abilities.',
  25: 'The hero\'s name is known far and wide, inspiring others to greatness.',
};

// ── Retirement legacy bonuses ──
export interface RetirementBonus {
  statType: string;
  amount: number;
  description: string;
}

function calculateRetirementBonus(hero: any): RetirementBonus[] {
  const bonuses: RetirementBonus[] = [];
  const stats = typeof hero.stats === 'string' ? JSON.parse(hero.stats) : hero.stats;
  const level = hero.level;

  // Primary stat bonus based on role
  const primaryStat = getPrimaryStatForRole(hero.role as HeroRole);
  bonuses.push({
    statType: primaryStat,
    amount: Math.floor(level / 5),
    description: `+${Math.floor(level / 5)} ${primaryStat} to all future heroes`,
  });

  // Guild-wide XP bonus
  if (level >= 15) {
    bonuses.push({
      statType: 'guild_xp_bonus',
      amount: Math.floor(level / 10) * 2,
      description: `+${Math.floor(level / 10) * 2}% guild XP permanently`,
    });
  }

  return bonuses;
}

function getPrimaryStatForRole(role: HeroRole): string {
  const map: Record<string, string> = {
    [HeroRole.Farmer]: 'endurance',
    [HeroRole.Scout]: 'agility',
    [HeroRole.Merchant]: 'intellect',
    [HeroRole.Blacksmith]: 'strength',
    [HeroRole.Alchemist]: 'intellect',
    [HeroRole.Hunter]: 'agility',
    [HeroRole.Defender]: 'endurance',
    [HeroRole.Mystic]: 'intellect',
    [HeroRole.CaravanMaster]: 'endurance',
    [HeroRole.Archivist]: 'intellect',
  };
  return map[role] || 'strength';
}

// ── Morale system ──
const MORALE_MIN = 0;
const MORALE_MAX = 100;
const MORALE_DEFAULT = 70;

export function getMoraleModifier(morale: number): number {
  if (morale >= 80) return 1.10;   // high morale: +10% stats
  if (morale >= 60) return 1.0;    // neutral
  if (morale >= 40) return 0.95;   // unhappy: -5%
  if (morale >= 20) return 0.85;   // angry: -15%
  return 0.70;                     // miserable: -30%
}

export function getMoraleLabel(morale: number): string {
  if (morale >= 80) return 'happy';
  if (morale >= 60) return 'neutral';
  if (morale >= 40) return 'unhappy';
  return 'angry';
}

// ── Relationship system ──
export type RelationshipType = 'friendship' | 'rivalry' | 'neutral';

export interface HeroRelationship {
  heroAId: string;
  heroBId: string;
  type: RelationshipType;
  strength: number; // 0-100
}

export function getRelationshipModifier(type: RelationshipType, strength: number): number {
  if (type === 'friendship') return 1 + (strength / 1000); // max +10%
  if (type === 'rivalry') return 1 - (strength / 2000);    // max -5%
  return 1.0;
}

// ── Power score calculation ──
export function calculatePowerScore(
  stats: Record<string, number>,
  level: number,
  skillIds: string[],
  role: string,
): number {
  const statSum = Object.values(stats).reduce((a, b) => a + b, 0);
  const skillBonus = skillIds.length * 5;
  const levelBonus = level * 3;
  return Math.floor(statSum + skillBonus + levelBonus);
}

// ── Hero affinity biomes ──
export const HERO_BIOME_AFFINITY: Record<string, string[]> = {
  [HeroRole.Farmer]: ['plains', 'grassland', 'riverside'],
  [HeroRole.Scout]: ['forest', 'mountain', 'desert'],
  [HeroRole.Merchant]: ['city', 'port', 'crossroads'],
  [HeroRole.Blacksmith]: ['mountain', 'volcanic', 'cavern'],
  [HeroRole.Alchemist]: ['swamp', 'forest', 'mystical'],
  [HeroRole.Hunter]: ['forest', 'tundra', 'savanna'],
  [HeroRole.Defender]: ['fortress', 'mountain', 'plains'],
  [HeroRole.Mystic]: ['mystical', 'ruins', 'ethereal'],
  [HeroRole.CaravanMaster]: ['desert', 'crossroads', 'port'],
  [HeroRole.Archivist]: ['ruins', 'library', 'mystical'],
};

// ── Aging system ──
const PEAK_AGE_DAYS = 60;    // peak performance days
const DECLINE_START = 120;   // starts declining

export function getAgingModifier(daysSinceHired: number): number {
  if (daysSinceHired <= PEAK_AGE_DAYS) return 1.0 + (daysSinceHired / PEAK_AGE_DAYS) * 0.05;
  if (daysSinceHired <= DECLINE_START) return 1.05;
  const declineDays = daysSinceHired - DECLINE_START;
  return Math.max(0.8, 1.05 - declineDays * 0.001);
}

// ── Training system (Barracks) ──
export interface TrainingSession {
  heroId: string;
  stat: string;
  startedAt: string;
  duration: number; // hours
  xpGain: number;
  statGain: number;
}

function calculateTrainingGain(heroLevel: number, stat: string, currentStatValue: number): { xp: number; statGain: number } {
  const baseXP = 20 + heroLevel * 5;
  const rawStatGain = 0.5 + Math.random() * 0.5;
  const statGain = applyDiminishingReturns(currentStatValue, rawStatGain);
  return { xp: baseXP, statGain: Math.round(statGain * 10) / 10 };
}

// ── Recruitment cost scaling ──
export function getRecruitCost(heroQuality: number, guildHeroCount: number): number {
  const baseCost = 50;
  const qualityMultiplier = 1 + (heroQuality - 1) * 0.5; // quality 1-5
  const countMultiplier = 1 + Math.floor(guildHeroCount / 5) * 0.2;
  return Math.floor(baseCost * qualityMultiplier * countMultiplier);
}

// ── Mentor system ──
export function calculateMentorXpBonus(mentorLevel: number, studentLevel: number): number {
  const gap = mentorLevel - studentLevel;
  if (gap <= 0) return 0;
  return Math.min(50, gap * 5); // max 50% XP bonus
}

// ── Mastery system ──
export interface MasteryProgress {
  role: string;
  expeditionsCompleted: number;
  masteryLevel: number;
  bonus: number;
}

export function calculateMasteryLevel(expeditionsCompleted: number): number {
  if (expeditionsCompleted >= 50) return 5;
  if (expeditionsCompleted >= 30) return 4;
  if (expeditionsCompleted >= 15) return 3;
  if (expeditionsCompleted >= 7) return 2;
  if (expeditionsCompleted >= 3) return 1;
  return 0;
}

export function getMasteryBonus(masteryLevel: number): number {
  return masteryLevel * 0.03; // 3% per mastery level
}

// ── Loyalty/desertion system ──
export function getDesertionRisk(morale: number): number {
  if (morale >= 20) return 0;
  if (morale >= 10) return 0.05;
  return 0.15; // 15% risk at very low morale
}

// ── Equipment loadout optimization suggestion ──
export function suggestEquipmentLoadout(
  heroRole: string,
  heroStats: Record<string, number>,
  availableItems: any[],
): Record<string, string | null> {
  const suggestion: Record<string, string | null> = { weapon: null, armor: null, charm: null, tool: null };
  const primaryStat = getPrimaryStatForRole(heroRole as HeroRole);

  for (const slot of Object.keys(suggestion)) {
    const slotItems = availableItems.filter(i => i.slot === slot);
    if (slotItems.length === 0) continue;

    // Pick item that boosts primary stat the most
    let bestItem = slotItems[0];
    let bestValue = 0;

    for (const item of slotItems) {
      const effects = item.effects || {};
      const statBonuses = effects.statBonuses || {};
      const value = (statBonuses[primaryStat] || 0) + (effects.expeditionBonus || 0) * 10 + (effects.buildingBonus || 0) * 10;
      if (value > bestValue) {
        bestValue = value;
        bestItem = item;
      }
    }

    suggestion[slot] = bestItem?.id || null;
  }

  return suggestion;
}

// ── Compatibility matrix for expedition squads ──
export function calculateSquadSynergy(heroRoles: string[]): number {
  let synergy = 1.0;
  const roleSet = new Set(heroRoles);

  // Tank + DPS combo
  if (roleSet.has(HeroRole.Defender) && (roleSet.has(HeroRole.Hunter) || roleSet.has(HeroRole.Scout))) {
    synergy += 0.1;
  }
  // Healer/support combo
  if (roleSet.has(HeroRole.Alchemist) || roleSet.has(HeroRole.Mystic)) {
    synergy += 0.05;
  }
  // Full diversity bonus
  if (roleSet.size >= 4) {
    synergy += 0.15;
  }
  // Caravan + Merchant trade bonus
  if (roleSet.has(HeroRole.CaravanMaster) && roleSet.has(HeroRole.Merchant)) {
    synergy += 0.1;
  }

  return synergy;
}

// ── Portrait system ──
export interface PortraitConfig {
  hairStyle: number;
  faceShape: number;
  eyes: number;
  mouth: number;
  accessory: number;
  skinTone: string;
  hairColor: string;
  eyeColor: string;
}

export const PORTRAIT_OPTIONS = {
  hairStyles: 12,
  faceShapes: 8,
  eyes: 10,
  mouths: 8,
  accessories: 15,
  skinTones: ['#f5deb3', '#d2b48c', '#c68642', '#8d5524', '#4a2c0a', '#ffe0bd', '#f0c8a0'],
  hairColors: ['#1a1a1a', '#4a2c0a', '#c68642', '#d4a017', '#cc3333', '#f5f5f5', '#6a0dad', '#1e90ff'],
  eyeColors: ['#4a2c0a', '#1e90ff', '#228b22', '#808080', '#d4a017', '#cc3333'],
};

export function generatePortrait(seed?: number): PortraitConfig {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;
  return {
    hairStyle: Math.floor(rng() * PORTRAIT_OPTIONS.hairStyles),
    faceShape: Math.floor(rng() * PORTRAIT_OPTIONS.faceShapes),
    eyes: Math.floor(rng() * PORTRAIT_OPTIONS.eyes),
    mouth: Math.floor(rng() * PORTRAIT_OPTIONS.mouths),
    accessory: Math.floor(rng() * PORTRAIT_OPTIONS.accessories),
    skinTone: PORTRAIT_OPTIONS.skinTones[Math.floor(rng() * PORTRAIT_OPTIONS.skinTones.length)],
    hairColor: PORTRAIT_OPTIONS.hairColors[Math.floor(rng() * PORTRAIT_OPTIONS.hairColors.length)],
    eyeColor: PORTRAIT_OPTIONS.eyeColors[Math.floor(rng() * PORTRAIT_OPTIONS.eyeColors.length)],
  };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ── Rarity tiers for portrait background ──
export function getHeroRarityTier(stats: Record<string, number>, traits: string[]): number {
  const totalStats = Object.values(stats).reduce((a, b) => a + b, 0);
  const traitBonus = traits.length * 5;
  const score = totalStats + traitBonus;
  if (score >= 50) return 5; // legendary
  if (score >= 40) return 4; // epic
  if (score >= 32) return 3; // rare
  if (score >= 25) return 2; // uncommon
  return 1;                  // common
}

export const RARITY_COLORS: Record<number, string> = {
  1: '#808080', // common - gray
  2: '#2ecc71', // uncommon - green
  3: '#3498db', // rare - blue
  4: '#9b59b6', // epic - purple
  5: '#f39c12', // legendary - gold
};

// ── Main service class ──
export class HeroProgressionService {

  /** Award XP to a hero, handling level-ups */
  static async awardXP(heroId: string, amount: number, source: string): Promise<{
    hero: any;
    levelsGained: number;
    newSkillPoints: number;
    storyUnlocked: string | null;
  }> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new Error('Hero not found');

    const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};
    let stats = JSON.parse(hero.stats);
    let xp = hero.xp + amount;
    let level = hero.level;
    let levelsGained = 0;
    let newSkillPoints = 0;
    let storyUnlocked: string | null = null;

    // Check for level-ups
    while (xp >= xpForLevel(level)) {
      xp -= xpForLevel(level);
      level++;
      levelsGained++;
      newSkillPoints++;

      // Apply stat growth
      const growth = ROLE_STAT_GROWTH[hero.role] || {};
      for (const [stat, rate] of Object.entries(growth)) {
        const gain = applyDiminishingReturns(stats[stat] || 0, rate);
        stats[stat] = Math.round(((stats[stat] || 0) + gain) * 10) / 10;
      }

      // Check for story milestone
      if (HERO_STORY_MILESTONES[level]) {
        storyUnlocked = HERO_STORY_MILESTONES[level];
      }
    }

    // Track XP source in metadata
    const xpLog = metadata.xpLog || [];
    xpLog.push({ source, amount, timestamp: new Date().toISOString() });
    if (xpLog.length > 50) xpLog.splice(0, xpLog.length - 50);
    metadata.xpLog = xpLog;
    metadata.skillPoints = (metadata.skillPoints || 0) + newSkillPoints;
    metadata.totalXPEarned = (metadata.totalXPEarned || 0) + amount;

    await prisma.hero.update({
      where: { id: heroId },
      data: {
        xp,
        level,
        stats: JSON.stringify(stats),
        metadata: JSON.stringify(metadata),
      },
    });

    return {
      hero: { ...hero, xp, level, stats, metadata },
      levelsGained,
      newSkillPoints,
      storyUnlocked,
    };
  }

  /** Unlock a skill for a hero */
  static async unlockSkill(heroId: string, skillId: string): Promise<{ success: boolean; message: string }> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new Error('Hero not found');

    const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};
    const unlockedSkills: string[] = metadata.unlockedSkills || [];
    const skillPoints: number = metadata.skillPoints || 0;

    if (unlockedSkills.includes(skillId)) {
      return { success: false, message: 'Skill already unlocked' };
    }

    const skill = getSkillById(hero.role as HeroRole, skillId);
    if (!skill) return { success: false, message: 'Invalid skill for this role' };
    if (hero.level < skill.levelRequired) {
      return { success: false, message: `Requires level ${skill.levelRequired}` };
    }
    if (skillPoints < 1) {
      return { success: false, message: 'No skill points available' };
    }

    // Check prerequisites
    for (const prereq of skill.prerequisiteIds) {
      if (!unlockedSkills.includes(prereq)) {
        return { success: false, message: 'Missing prerequisite skill' };
      }
    }

    unlockedSkills.push(skillId);
    metadata.unlockedSkills = unlockedSkills;
    metadata.skillPoints = skillPoints - 1;

    await prisma.hero.update({
      where: { id: heroId },
      data: { metadata: JSON.stringify(metadata) },
    });

    return { success: true, message: `Unlocked: ${skill.name}` };
  }

  /** Respec hero skills */
  static async respecSkills(heroId: string, guildId: string): Promise<{ success: boolean; cost: number }> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero || hero.guildId !== guildId) throw new Error('Hero not found');

    const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};
    const respecCount = metadata.respecCount || 0;
    const cost = 100 * Math.pow(2, respecCount); // doubles each time

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');
    const resources = JSON.parse(guild.resources);
    if ((resources.gold || 0) < cost) throw new Error(`Not enough gold. Need ${cost}`);

    resources.gold -= cost;
    const unlockedCount = (metadata.unlockedSkills || []).length;
    metadata.unlockedSkills = [];
    metadata.skillPoints = (metadata.skillPoints || 0) + unlockedCount;
    metadata.respecCount = respecCount + 1;

    await prisma.guild.update({ where: { id: guildId }, data: { resources: JSON.stringify(resources) } });
    await prisma.hero.update({ where: { id: heroId }, data: { metadata: JSON.stringify(metadata) } });

    return { success: true, cost };
  }

  /** Retire a hero for legacy bonuses */
  static async retireHero(heroId: string, guildId: string): Promise<{
    bonuses: RetirementBonus[];
    hallOfFameEntry: any;
  }> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero || hero.guildId !== guildId) throw new Error('Hero not found');
    if (hero.level < 15) throw new Error('Hero must be at least level 15 to retire');

    const bonuses = calculateRetirementBonus(hero);

    // Store in guild metadata
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const guildMeta = guild.emblem ? JSON.parse(guild.emblem) : {};
    const retiredHeroes = guildMeta.retiredHeroes || [];
    const legacyBonuses = guildMeta.legacyBonuses || {};

    const hallOfFameEntry = {
      id: hero.id,
      name: hero.name,
      role: hero.role,
      level: hero.level,
      retiredAt: new Date().toISOString(),
      bonuses,
    };
    retiredHeroes.push(hallOfFameEntry);

    // Apply legacy bonuses
    for (const bonus of bonuses) {
      legacyBonuses[bonus.statType] = (legacyBonuses[bonus.statType] || 0) + bonus.amount;
    }

    guildMeta.retiredHeroes = retiredHeroes;
    guildMeta.legacyBonuses = legacyBonuses;

    await prisma.guild.update({ where: { id: guildId }, data: { emblem: JSON.stringify(guildMeta) } });
    await prisma.hero.delete({ where: { id: heroId } });

    return { bonuses, hallOfFameEntry };
  }

  /** Start training at Barracks */
  static async startTraining(heroId: string, stat: string, guildId: string): Promise<TrainingSession> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero || hero.guildId !== guildId) throw new Error('Hero not found');
    if (hero.status !== HeroStatus.Idle && hero.status !== HeroStatus.Assigned) {
      throw new Error('Hero is not available for training');
    }

    const stats = JSON.parse(hero.stats);
    const { xp, statGain } = calculateTrainingGain(hero.level, stat, stats[stat] || 0);
    const duration = 1; // 1 hour

    const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};
    metadata.training = {
      stat,
      startedAt: new Date().toISOString(),
      duration,
      xpGain: xp,
      statGain,
    };

    await prisma.hero.update({
      where: { id: heroId },
      data: {
        status: 'training' as any,
        metadata: JSON.stringify(metadata),
      },
    });

    return { heroId, stat, startedAt: metadata.training.startedAt, duration, xpGain: xp, statGain };
  }

  /** Set hero morale */
  static async adjustMorale(heroId: string, delta: number): Promise<{ morale: number; label: string }> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new Error('Hero not found');

    const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};
    let morale = metadata.morale ?? MORALE_DEFAULT;
    morale = Math.max(MORALE_MIN, Math.min(MORALE_MAX, morale + delta));
    metadata.morale = morale;

    await prisma.hero.update({
      where: { id: heroId },
      data: { metadata: JSON.stringify(metadata) },
    });

    return { morale, label: getMoraleLabel(morale) };
  }

  /** Set hero specialization */
  static async specialize(heroId: string, specializationId: string, guildId: string): Promise<{ success: boolean; specialization: Specialization }> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero || hero.guildId !== guildId) throw new Error('Hero not found');
    if (hero.level < 10) throw new Error('Hero must be level 10+ to specialize');

    const specs = SPECIALIZATIONS[hero.role];
    const spec = specs?.find(s => s.id === specializationId);
    if (!spec) throw new Error('Invalid specialization for this role');

    const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};
    if (metadata.specialization) throw new Error('Hero already specialized');
    metadata.specialization = specializationId;

    await prisma.hero.update({
      where: { id: heroId },
      data: { metadata: JSON.stringify(metadata) },
    });

    return { success: true, specialization: spec };
  }

  /** Evolve hero class at level 20 */
  static async evolveClass(heroId: string, evolutionId: string, guildId: string): Promise<{ success: boolean; evolution: ClassEvolution }> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero || hero.guildId !== guildId) throw new Error('Hero not found');
    if (hero.level < 20) throw new Error('Hero must be level 20+ to evolve');

    const evolutions = CLASS_EVOLUTIONS[hero.role];
    const evolution = evolutions?.find(e => e.id === evolutionId);
    if (!evolution) throw new Error('Invalid evolution for this role');

    const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};
    if (metadata.evolution) throw new Error('Hero already evolved');
    metadata.evolution = evolutionId;

    // Apply stat boosts
    const stats = JSON.parse(hero.stats);
    for (const [stat, boost] of Object.entries(evolution.statBoost)) {
      stats[stat] = (stats[stat] || 0) + boost;
    }

    await prisma.hero.update({
      where: { id: heroId },
      data: {
        stats: JSON.stringify(stats),
        metadata: JSON.stringify(metadata),
      },
    });

    return { success: true, evolution };
  }

  /** Set hero nickname */
  static async setNickname(heroId: string, nickname: string, guildId: string): Promise<{ success: boolean }> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero || hero.guildId !== guildId) throw new Error('Hero not found');
    if (nickname.length > 20) throw new Error('Nickname too long (max 20 chars)');

    const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};
    metadata.nickname = nickname;

    await prisma.hero.update({
      where: { id: heroId },
      data: { metadata: JSON.stringify(metadata) },
    });

    return { success: true };
  }

  /** Toggle hero favorite/pin */
  static async toggleFavorite(heroId: string, guildId: string): Promise<{ favorited: boolean }> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero || hero.guildId !== guildId) throw new Error('Hero not found');

    const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};
    metadata.favorited = !metadata.favorited;

    await prisma.hero.update({
      where: { id: heroId },
      data: { metadata: JSON.stringify(metadata) },
    });

    return { favorited: metadata.favorited };
  }

  /** Dismiss a hero */
  static async dismiss(heroId: string, guildId: string): Promise<{ success: boolean; farewellMessage: string }> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero || hero.guildId !== guildId) throw new Error('Hero not found');
    if (hero.status === HeroStatus.Expedition) throw new Error('Cannot dismiss a hero on expedition');

    const farewells = [
      `${hero.name} bids farewell to the guild, promising to remember the good times.`,
      `${hero.name} packs their bags quietly and heads toward the horizon.`,
      `With a final wave, ${hero.name} steps through the guild gates one last time.`,
      `${hero.name} thanks the guild for the adventures and walks into the sunset.`,
    ];

    await prisma.hero.delete({ where: { id: heroId } });

    return {
      success: true,
      farewellMessage: farewells[Math.floor(Math.random() * farewells.length)],
    };
  }

  /** Get hero detail with computed fields */
  static async getHeroDetail(heroId: string, guildId: string): Promise<any> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero || hero.guildId !== guildId) throw new Error('Hero not found');

    const stats = JSON.parse(hero.stats);
    const traits = JSON.parse(hero.traits);
    const equipment = JSON.parse(hero.equipment);
    const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};

    const morale = metadata.morale ?? MORALE_DEFAULT;
    const unlockedSkills: string[] = metadata.unlockedSkills || [];
    const skillPoints = metadata.skillPoints || 0;
    const portrait = metadata.portrait || generatePortrait(hero.name.charCodeAt(0) * 1000 + hero.name.charCodeAt(1));

    const xpToNext = xpForLevel(hero.level);
    const powerScore = calculatePowerScore(stats, hero.level, unlockedSkills, hero.role);
    const moraleLabel = getMoraleLabel(morale);
    const moraleModifier = getMoraleModifier(morale);
    const rarityTier = getHeroRarityTier(stats, traits);

    const daysSinceHired = Math.floor((Date.now() - new Date(hero.hiredAt).getTime()) / (1000 * 60 * 60 * 24));
    const agingModifier = getAgingModifier(daysSinceHired);

    const biomeAffinities = HERO_BIOME_AFFINITY[hero.role] || [];
    const specialization = metadata.specialization ? SPECIALIZATIONS[hero.role]?.find(s => s.id === metadata.specialization) : null;
    const evolution = metadata.evolution ? CLASS_EVOLUTIONS[hero.role]?.find(e => e.id === metadata.evolution) : null;

    // Story milestones unlocked
    const stories: Array<{ level: number; text: string }> = [];
    for (const [lvl, text] of Object.entries(HERO_STORY_MILESTONES)) {
      if (hero.level >= parseInt(lvl)) {
        stories.push({ level: parseInt(lvl), text });
      }
    }

    // XP log (recent)
    const xpLog = (metadata.xpLog || []).slice(-10);

    // Available quests
    const availableQuests = getQuestsForHero(hero.level, traits);

    // Skill tree
    const skillTree = SKILL_TREES[hero.role as HeroRole] || null;

    return {
      ...hero,
      stats,
      traits,
      equipment,
      morale,
      moraleLabel,
      moraleModifier,
      xpToNext,
      powerScore,
      rarityTier,
      rarityColor: RARITY_COLORS[rarityTier],
      portrait,
      unlockedSkills,
      skillPoints,
      skillTree,
      biomeAffinities,
      agingModifier,
      daysSinceHired,
      specialization,
      evolution,
      stories,
      xpLog,
      availableQuests: availableQuests.slice(0, 5),
      nickname: metadata.nickname || null,
      favorited: metadata.favorited || false,
      training: metadata.training || null,
      wishList: metadata.wishList || [],
      activityLog: metadata.activityLog || [],
      relationships: metadata.relationships || [],
      injury: metadata.injury || null,
    };
  }

  /** Injure a hero from failed expedition */
  static async injureHero(heroId: string, recoveryHours: number): Promise<void> {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new Error('Hero not found');

    const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};
    metadata.injury = {
      injuredAt: new Date().toISOString(),
      recoveryHours,
      healedAt: null,
    };

    await prisma.hero.update({
      where: { id: heroId },
      data: {
        status: HeroStatus.Recovering,
        metadata: JSON.stringify(metadata),
      },
    });
  }

  /** Auto-assign suggestions for optimal building placement */
  static async getAutoAssignSuggestions(guildId: string): Promise<Array<{ heroId: string; heroName: string; building: string; score: number }>> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { heroes: true, buildings: true },
    });
    if (!guild) throw new Error('Guild not found');

    const suggestions: Array<{ heroId: string; heroName: string; building: string; score: number }> = [];
    const idleHeroes = guild.heroes.filter(h => h.status === HeroStatus.Idle);
    const buildings = guild.buildings;

    for (const hero of idleHeroes) {
      let bestBuilding = '';
      let bestScore = 0;

      for (const building of buildings) {
        // Check role-building affinity
        const { ROLE_BUILDING_AFFINITY } = require('./HeroService');
        const affinities = ROLE_BUILDING_AFFINITY[hero.role] || {};
        const score = affinities[building.type] || 0.5;

        if (score > bestScore) {
          bestScore = score;
          bestBuilding = building.type;
        }
      }

      if (bestBuilding) {
        suggestions.push({
          heroId: hero.id,
          heroName: hero.name,
          building: bestBuilding,
          score: bestScore,
        });
      }
    }

    return suggestions.sort((a, b) => b.score - a.score);
  }

  /** Batch actions */
  static async batchAssignIdle(guildId: string): Promise<{ assigned: number }> {
    const suggestions = await this.getAutoAssignSuggestions(guildId);
    let assigned = 0;
    for (const s of suggestions) {
      try {
        const { HeroService } = require('./HeroService');
        await HeroService.assign(s.heroId, s.building, guildId);
        assigned++;
      } catch { /* skip conflicts */ }
    }
    return { assigned };
  }

  static async batchRestAll(guildId: string): Promise<{ rested: number }> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { heroes: true },
    });
    if (!guild) throw new Error('Guild not found');

    let rested = 0;
    for (const hero of guild.heroes) {
      const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};
      const morale = metadata.morale ?? MORALE_DEFAULT;
      if (morale < 80) {
        metadata.morale = Math.min(MORALE_MAX, morale + 15);
        await prisma.hero.update({
          where: { id: hero.id },
          data: {
            status: HeroStatus.Idle,
            assignment: null,
            metadata: JSON.stringify(metadata),
          },
        });
        rested++;
      }
    }
    return { rested };
  }

  /** Get roster overview/dashboard stats */
  static async getRosterDashboard(guildId: string): Promise<any> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { heroes: true },
    });
    if (!guild) throw new Error('Guild not found');

    const heroes = guild.heroes;
    const totalHeroes = heroes.length;
    const avgLevel = totalHeroes > 0 ? Math.round(heroes.reduce((s, h) => s + h.level, 0) / totalHeroes * 10) / 10 : 0;

    const roleCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    for (const hero of heroes) {
      roleCounts[hero.role] = (roleCounts[hero.role] || 0) + 1;
      statusCounts[hero.status] = (statusCounts[hero.status] || 0) + 1;
    }

    let totalPower = 0;
    let totalMorale = 0;
    for (const hero of heroes) {
      const stats = JSON.parse(hero.stats);
      const metadata = hero.metadata ? JSON.parse(hero.metadata as string) : {};
      const unlockedSkills = metadata.unlockedSkills || [];
      totalPower += calculatePowerScore(stats, hero.level, unlockedSkills, hero.role);
      totalMorale += metadata.morale ?? MORALE_DEFAULT;
    }

    return {
      totalHeroes,
      avgLevel,
      avgPowerScore: totalHeroes > 0 ? Math.round(totalPower / totalHeroes) : 0,
      avgMorale: totalHeroes > 0 ? Math.round(totalMorale / totalHeroes) : 0,
      roleCounts,
      statusCounts,
      highestLevel: totalHeroes > 0 ? Math.max(...heroes.map(h => h.level)) : 0,
    };
  }

  /** Compare two heroes side-by-side */
  static async compareHeroes(heroAId: string, heroBId: string, guildId: string): Promise<{ heroA: any; heroB: any }> {
    const heroA = await this.getHeroDetail(heroAId, guildId);
    const heroB = await this.getHeroDetail(heroBId, guildId);
    return { heroA, heroB };
  }

  /** Search heroes by name or trait */
  static async searchHeroes(guildId: string, query: string): Promise<any[]> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { heroes: true },
    });
    if (!guild) throw new Error('Guild not found');

    const q = query.toLowerCase();
    return guild.heroes.filter(h => {
      const traits = JSON.parse(h.traits) as string[];
      const metadata = h.metadata ? JSON.parse(h.metadata as string) : {};
      return h.name.toLowerCase().includes(q)
        || h.role.toLowerCase().includes(q)
        || traits.some(t => t.toLowerCase().includes(q))
        || (metadata.nickname || '').toLowerCase().includes(q);
    }).map(h => ({
      ...h,
      traits: JSON.parse(h.traits),
      stats: JSON.parse(h.stats),
      equipment: JSON.parse(h.equipment),
    }));
  }
}
