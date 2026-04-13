import { prisma } from '../db.js';
import { HeroRole, HeroTrait, HeroStatus } from '../../../shared/src/enums.js';

const FIRST_NAMES = [
  'Aldric', 'Brenna', 'Cedric', 'Dara', 'Elrik', 'Fiona', 'Gareth', 'Hilde',
  'Ingrid', 'Jasper', 'Kira', 'Leif', 'Mira', 'Nolan', 'Olga', 'Penn',
  'Quinn', 'Rowan', 'Sable', 'Theron', 'Una', 'Voss', 'Wren', 'Xara',
  'Yara', 'Zeke', 'Astrid', 'Bjorn', 'Calla', 'Dorian',
];

const LAST_NAMES = [
  'Ashford', 'Briarstone', 'Copperfield', 'Duskwalker', 'Embervale',
  'Frostholm', 'Greenmantle', 'Hawkridge', 'Ironbark', 'Jadecliff',
  'Kettleburn', 'Lightfoot', 'Moorwind', 'Nightshade', 'Oakenheart',
  'Pebblebrook', 'Quicksilver', 'Ravenscroft', 'Stormweaver', 'Thornfield',
];

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

const RECRUIT_COST = 50; // gold

export class HeroService {
  static getRecruitCost(): number {
    return RECRUIT_COST;
  }

  static async recruit(guildId: string, preferredRole?: HeroRole) {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const resources = JSON.parse(guild.resources) as Record<string, number>;
    if ((resources.gold || 0) < RECRUIT_COST) {
      throw new Error(`Not enough gold. Need ${RECRUIT_COST}, have ${Math.floor(resources.gold || 0)}`);
    }

    // Deduct cost
    resources.gold -= RECRUIT_COST;
    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    const role = preferredRole || randomElement(Object.values(HeroRole));
    const stats = generateStats(role);
    const traits = generateTraits();

    const hero = await prisma.hero.create({
      data: {
        guildId,
        name: generateName(),
        role,
        traits: JSON.stringify(traits),
        stats: JSON.stringify(stats),
        equipment: JSON.stringify({ weapon: null, armor: null, charm: null, tool: null }),
      },
    });

    return {
      hero: {
        ...hero,
        traits,
        stats,
        equipment: { weapon: null, armor: null, charm: null, tool: null },
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

    const updated = await prisma.hero.update({
      where: { id: heroId },
      data: {
        assignment,
        status: newStatus,
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
