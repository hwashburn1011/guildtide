import { prisma } from '../db';
import { HeroRole, HeroTrait, HeroStatus } from '../../../shared/src/enums';
import { generatePortrait, getHeroRarityTier, getRecruitCost } from './HeroProgressionService';

const FIRST_NAMES = [
  'Aldric', 'Brenna', 'Cedric', 'Dara', 'Elrik', 'Fiona', 'Gareth', 'Hilde',
  'Ingrid', 'Jasper', 'Kira', 'Leif', 'Mira', 'Nolan', 'Olga', 'Penn',
  'Quinn', 'Rowan', 'Sable', 'Theron', 'Una', 'Voss', 'Wren', 'Xara',
  'Yara', 'Zeke', 'Astrid', 'Bjorn', 'Calla', 'Dorian',
  'Eira', 'Fenris', 'Gwendolyn', 'Halvar', 'Isolde', 'Jareth',
  'Kael', 'Lena', 'Magnus', 'Nyx', 'Orion', 'Petra',
];

const LAST_NAMES = [
  'Ashford', 'Briarstone', 'Copperfield', 'Duskwalker', 'Embervale',
  'Frostholm', 'Greenmantle', 'Hawkridge', 'Ironbark', 'Jadecliff',
  'Kettleburn', 'Lightfoot', 'Moorwind', 'Nightshade', 'Oakenheart',
  'Pebblebrook', 'Quicksilver', 'Ravenscroft', 'Stormweaver', 'Thornfield',
  'Wintermere', 'Dawnforge', 'Silvervein', 'Starfall', 'Grimholt',
];

const BACKSTORIES = [
  'Once a wandering traveler who heard tales of your guild\'s renown.',
  'A former apprentice seeking new purpose and adventure.',
  'Fled a distant village after a mysterious event and seeks sanctuary.',
  'A seasoned veteran looking for one last great chapter.',
  'Found injured near the guild gates with no memory of the past.',
  'Arrived with a letter of recommendation from a retired guild member.',
  'Won a bet at the tavern and claimed guild membership as the prize.',
  'A scholar who abandoned the library for the thrill of the unknown.',
  'Grew up hearing legends of the guild and always dreamed of joining.',
  'A quiet soul with hidden depths, seeking a place to belong.',
];

const VOICE_LINES: Record<string, string[]> = {
  greeting: [
    'Reporting for duty!', 'Ready to serve the guild!', 'What adventure awaits?',
    'Point me to the action.', 'I won\'t let you down.',
  ],
  idle: [
    'Just resting my feet...', 'Any tasks for me?', 'I could use some excitement.',
    'The guild looks great today.', 'Wonder what\'s for dinner.',
  ],
  happy: [
    'Life is good at the guild!', 'Best decision I ever made!', 'I feel unstoppable!',
  ],
  unhappy: [
    'I\'ve seen better days...', 'Could use a break...', 'Is anyone listening?',
  ],
};

const ROLE_BASE_STATS: Record<HeroRole, { str: number; agi: number; int: number; end: number; lck: number }> = {
  [HeroRole.Farmer]: { str: 6, agi: 4, int: 3, end: 7, lck: 5 },
  [HeroRole.Scout]: { str: 4, agi: 8, int: 5, end: 4, lck: 6 },
  [HeroRole.Merchant]: { str: 3, agi: 4, int: 8, end: 3, lck: 7 },
  [HeroRole.Blacksmith]: { str: 8, agi: 3, int: 4, end: 7, lck: 3 },
  [HeroRole.Alchemist]: { str: 3, agi: 4, int: 9, end: 4, lck: 5 },
  [HeroRole.Hunter]: { str: 6, agi: 7, int: 4, end: 5, lck: 5 },
  [HeroRole.Defender]: { str: 7, agi: 3, int: 3, end: 9, lck: 3 },
  [HeroRole.Mystic]: { str: 2, agi: 4, int: 9, end: 3, lck: 7 },
  [HeroRole.CaravanMaster]: { str: 5, agi: 5, int: 6, end: 6, lck: 5 },
  [HeroRole.Archivist]: { str: 2, agi: 3, int: 10, end: 3, lck: 7 },
};

// How well each role performs at each building (multiplier on building output)
export const ROLE_BUILDING_AFFINITY: Record<string, Record<string, number>> = {
  farmer: { farm: 1.5, herb_garden: 1.3, well: 1.1 },
  scout: { farm: 0.8, lumber_mill: 1.2 },
  merchant: { market: 1.5 },
  blacksmith: { mine: 1.3, quarry: 1.2, workshop: 1.5 },
  alchemist: { herb_garden: 1.4, laboratory: 1.5 },
  hunter: { lumber_mill: 1.1, farm: 0.9 },
  defender: { quarry: 1.3, barracks: 1.5 },
  mystic: { laboratory: 1.4, herb_garden: 1.1 },
  caravan_master: { market: 1.3 },
  archivist: { laboratory: 1.3 },
};

// Trait effects on expeditions and buildings
export const TRAIT_EFFECTS: Record<string, { expeditionBonus: number; buildingBonus: number; moraleModifier: number }> = {
  [HeroTrait.Stormborn]: { expeditionBonus: 0.05, buildingBonus: 0, moraleModifier: 0 },
  [HeroTrait.Sunblessed]: { expeditionBonus: 0, buildingBonus: 0.05, moraleModifier: 5 },
  [HeroTrait.Frostward]: { expeditionBonus: 0.03, buildingBonus: 0.02, moraleModifier: 0 },
  [HeroTrait.ShrewdTrader]: { expeditionBonus: 0, buildingBonus: 0.08, moraleModifier: 0 },
  [HeroTrait.LuckyForager]: { expeditionBonus: 0.08, buildingBonus: 0, moraleModifier: 0 },
  [HeroTrait.Salvager]: { expeditionBonus: 0.05, buildingBonus: 0.03, moraleModifier: 0 },
  [HeroTrait.Hardy]: { expeditionBonus: 0.03, buildingBonus: 0.03, moraleModifier: 3 },
  [HeroTrait.Nimble]: { expeditionBonus: 0.06, buildingBonus: 0, moraleModifier: 0 },
  [HeroTrait.Brave]: { expeditionBonus: 0.07, buildingBonus: 0, moraleModifier: 3 },
  [HeroTrait.Greedy]: { expeditionBonus: 0.03, buildingBonus: 0.05, moraleModifier: -3 },
  [HeroTrait.Cautious]: { expeditionBonus: -0.03, buildingBonus: 0.05, moraleModifier: 2 },
  [HeroTrait.Loyal]: { expeditionBonus: 0.02, buildingBonus: 0.02, moraleModifier: 5 },
  [HeroTrait.Scholarly]: { expeditionBonus: 0, buildingBonus: 0.06, moraleModifier: 0 },
  [HeroTrait.Charismatic]: { expeditionBonus: 0.03, buildingBonus: 0.03, moraleModifier: 5 },
  [HeroTrait.Stubborn]: { expeditionBonus: 0.04, buildingBonus: -0.02, moraleModifier: -2 },
  [HeroTrait.Inventive]: { expeditionBonus: 0.02, buildingBonus: 0.06, moraleModifier: 0 },
};

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateName(): string {
  return `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}`;
}

function generateTraits(): HeroTrait[] {
  const allTraits = Object.values(HeroTrait);
  const numTraits = Math.random() < 0.3 ? 2 : 1;
  const traits: HeroTrait[] = [];
  const available = [...allTraits];

  for (let i = 0; i < numTraits; i++) {
    const idx = Math.floor(Math.random() * available.length);
    traits.push(available[idx]);
    available.splice(idx, 1);
  }

  return traits;
}

function generateStats(role: HeroRole): { strength: number; agility: number; intellect: number; endurance: number; luck: number } {
  const base = ROLE_BASE_STATS[role];
  return {
    strength: base.str + randomInt(-1, 2),
    agility: base.agi + randomInt(-1, 2),
    intellect: base.int + randomInt(-1, 2),
    endurance: base.end + randomInt(-1, 2),
    luck: base.lck + randomInt(-1, 2),
  };
}

function generateBackstory(): string {
  return randomElement(BACKSTORIES);
}

function generateVoiceLine(category: string): string {
  const lines = VOICE_LINES[category] || VOICE_LINES.greeting;
  return randomElement(lines);
}

// Hero quality (1-5) determines stat variance and trait count
function calculateHeroQuality(stats: Record<string, number>, traits: HeroTrait[]): number {
  const totalStats = Object.values(stats).reduce((a, b) => a + b, 0);
  const traitBonus = traits.length * 5;
  const score = totalStats + traitBonus;
  if (score >= 50) return 5;
  if (score >= 40) return 4;
  if (score >= 32) return 3;
  if (score >= 25) return 2;
  return 1;
}

// Festival double-quality recruitment
function isFestivalActive(): boolean {
  // Placeholder: could check world state for active festivals
  return false;
}

export class HeroService {
  static getRecruitCost(guildHeroCount: number = 0, heroQuality: number = 1): number {
    return getRecruitCost(heroQuality, guildHeroCount);
  }

  static async recruit(guildId: string, preferredRole?: HeroRole) {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { heroes: true },
    });
    if (!guild) throw new Error('Guild not found');

    const role = preferredRole || randomElement(Object.values(HeroRole));
    const stats = generateStats(role);
    let traits = generateTraits();

    // Festival: double quality — extra trait
    if (isFestivalActive() && traits.length < 2) {
      const allTraits = Object.values(HeroTrait);
      const available = allTraits.filter(t => !traits.includes(t));
      if (available.length > 0) traits.push(randomElement(available));
    }

    const quality = calculateHeroQuality(stats, traits);
    const cost = getRecruitCost(quality, guild.heroes.length);

    const resources = JSON.parse(guild.resources) as Record<string, number>;
    if ((resources.gold || 0) < cost) {
      throw new Error(`Not enough gold. Need ${cost}, have ${Math.floor(resources.gold || 0)}`);
    }

    // Deduct cost
    resources.gold -= cost;
    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    // Generate metadata (portrait, backstory, morale, voice lines, birthday)
    const name = generateName();
    const portrait = generatePortrait(name.charCodeAt(0) * 1000 + name.charCodeAt(1));
    const metadata = {
      morale: 70,
      skillPoints: 0,
      unlockedSkills: [] as string[],
      backstory: generateBackstory(),
      portrait,
      voiceLines: {
        greeting: generateVoiceLine('greeting'),
        idle: generateVoiceLine('idle'),
      },
      birthday: new Date(Date.now() + randomInt(30, 365) * 86400000).toISOString().split('T')[0],
      activityLog: [{ action: 'Recruited to guild', timestamp: new Date().toISOString() }],
      relationships: [] as Array<{ heroId: string; type: string; strength: number }>,
      wishList: [] as string[],
      recruitmentHistory: { cost, quality },
    };

    const hero = await prisma.hero.create({
      data: {
        guildId,
        name,
        role,
        traits: JSON.stringify(traits),
        stats: JSON.stringify(stats),
        equipment: JSON.stringify({ weapon: null, armor: null, charm: null, tool: null }),
        metadata: JSON.stringify(metadata),
      },
    });

    return {
      hero: {
        ...hero,
        traits,
        stats,
        equipment: { weapon: null, armor: null, charm: null, tool: null },
        morale: 70,
        powerScore: Object.values(stats).reduce((a, b) => a + b, 0) + 3,
        rarityTier: getHeroRarityTier(stats, traits.map(String)),
        portrait,
      },
      resources,
    };
  }

  static async assign(heroId: string, assignment: string | null, guildId: string) {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new Error('Hero not found');
    if (hero.guildId !== guildId) throw new Error('Hero does not belong to your guild');
    if (hero.status === HeroStatus.Expedition) throw new Error('Hero is on an expedition');
    if (hero.status === HeroStatus.Recovering) throw new Error('Hero is recovering');

    const newStatus = assignment ? HeroStatus.Assigned : HeroStatus.Idle;

    // Log assignment in activity log
    const metadata = hero.metadata ? JSON.parse(hero.metadata) : {};
    const activityLog = metadata.activityLog || [];
    activityLog.push({
      action: assignment ? `Assigned to ${assignment}` : 'Unassigned',
      timestamp: new Date().toISOString(),
    });
    if (activityLog.length > 50) activityLog.splice(0, activityLog.length - 50);
    metadata.activityLog = activityLog;

    const updated = await prisma.hero.update({
      where: { id: heroId },
      data: {
        assignment,
        status: newStatus,
        metadata: JSON.stringify(metadata),
      },
    });

    return {
      ...updated,
      traits: JSON.parse(updated.traits),
      stats: JSON.parse(updated.stats),
      equipment: JSON.parse(updated.equipment),
    };
  }
}
