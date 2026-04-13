import { prisma } from '../db.js';
import { HeroStatus, ExpeditionStatus } from '../../../shared/src/enums.js';
import { EXPEDITION_DESTINATIONS } from '../data/expeditionData.js';

interface ExpeditionResult {
  success: boolean;
  loot: Record<string, number>;
  items: string[];
  xpGained: number;
  injuries: string[];
  narrative: string;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Trait bonuses for expedition success
const TRAIT_EXPEDITION_BONUS: Record<string, number> = {
  stormborn: 0.05,
  sunblessed: 0.03,
  frostward: 0.04,
  shrewd_trader: 0.06,
  lucky_forager: 0.05,
  salvager: 0.06,
  hardy: 0.04,
  nimble: 0.03,
};

// Role bonuses per expedition type
const ROLE_TYPE_BONUS: Record<string, Record<string, number>> = {
  scavenge: { scout: 0.08, salvager: 0.05, blacksmith: 0.04 },
  hunt: { hunter: 0.1, scout: 0.05, defender: 0.04 },
  explore: { scout: 0.08, mystic: 0.06, archivist: 0.05 },
  trade_caravan: { merchant: 0.1, caravan_master: 0.08 },
};

const SUCCESS_NARRATIVES = [
  'The party returned triumphant, laden with spoils.',
  'Against the odds, your heroes pushed through and secured valuable loot.',
  'A textbook expedition. Every hero performed admirably.',
  'The journey was tough, but the rewards made it worthwhile.',
];

const FAILURE_NARRATIVES = [
  'The party was forced to retreat empty-handed.',
  'Harsh conditions and bad luck left the expedition with nothing to show.',
  'Despite their best efforts, the heroes returned battered and without loot.',
  'The destination proved too dangerous. The party barely escaped.',
];

export class ExpeditionService {
  static getDestinations() {
    return EXPEDITION_DESTINATIONS;
  }

  static async launch(
    guildId: string,
    type: string,
    heroIds: string[],
    destinationId: string,
  ) {
    const destination = EXPEDITION_DESTINATIONS.find(d => d.id === destinationId);
    if (!destination) {
      throw new Error('Unknown destination');
    }

    if (destination.type !== type) {
      throw new Error('Expedition type does not match destination');
    }

    if (heroIds.length < destination.requiredPartySize) {
      throw new Error(
        `Need at least ${destination.requiredPartySize} hero(es) for this destination`,
      );
    }

    if (heroIds.length > 5) {
      throw new Error('Cannot send more than 5 heroes on an expedition');
    }

    // Validate heroes belong to guild and are available
    const heroes = await prisma.hero.findMany({
      where: { id: { in: heroIds }, guildId },
    });

    if (heroes.length !== heroIds.length) {
      throw new Error('One or more heroes not found or do not belong to your guild');
    }

    const unavailable = heroes.filter(
      h => h.status !== HeroStatus.Idle && h.status !== HeroStatus.Assigned,
    );
    if (unavailable.length > 0) {
      throw new Error(
        `Heroes not available: ${unavailable.map(h => h.name).join(', ')}`,
      );
    }

    // Set heroes to expedition status and clear assignments
    await prisma.hero.updateMany({
      where: { id: { in: heroIds } },
      data: { status: HeroStatus.Expedition, assignment: null },
    });

    // Create expedition record
    const expedition = await prisma.expedition.create({
      data: {
        guildId,
        type,
        heroIds: JSON.stringify(heroIds),
        destination: destinationId,
        duration: destination.durationMinutes,
        status: ExpeditionStatus.Active,
      },
    });

    return {
      ...expedition,
      heroIds: JSON.parse(expedition.heroIds),
      result: null,
    };
  }

  static async resolve(expeditionId: string) {
    const expedition = await prisma.expedition.findUnique({
      where: { id: expeditionId },
    });

    if (!expedition) throw new Error('Expedition not found');
    if (expedition.status !== ExpeditionStatus.Active) {
      throw new Error('Expedition already resolved');
    }

    // Check if enough time has passed
    const startedAt = new Date(expedition.startedAt).getTime();
    const durationMs = expedition.duration * 60 * 1000;
    const now = Date.now();

    if (now < startedAt + durationMs) {
      throw new Error('Expedition still in progress');
    }

    const destination = EXPEDITION_DESTINATIONS.find(
      d => d.id === expedition.destination,
    );
    if (!destination) throw new Error('Unknown destination in expedition');

    const heroIds: string[] = JSON.parse(expedition.heroIds);
    const heroes = await prisma.hero.findMany({
      where: { id: { in: heroIds } },
    });

    // Calculate party power: average of (str + agi + end) / 3 per hero, scaled by level
    let totalPower = 0;
    let traitBonus = 0;

    for (const hero of heroes) {
      const stats = JSON.parse(hero.stats) as {
        strength: number;
        agility: number;
        endurance: number;
      };
      const heroPower =
        ((stats.strength + stats.agility + stats.endurance) / 3) *
        (1 + hero.level * 0.1);
      totalPower += heroPower;

      // Trait bonuses
      const traits: string[] = JSON.parse(hero.traits);
      for (const trait of traits) {
        traitBonus += TRAIT_EXPEDITION_BONUS[trait] || 0;
      }

      // Role bonuses for expedition type
      const typeRoleBonuses = ROLE_TYPE_BONUS[expedition.type] || {};
      traitBonus += typeRoleBonuses[hero.role] || 0;
    }

    const partyPower = totalPower / Math.max(heroes.length, 1);

    // Success formula: clamp(0.3 + (partyPower / difficulty) * 0.5 + traitBonus, 0.1, 0.95)
    const successChance = clamp(
      0.3 + (partyPower / destination.difficulty) * 0.5 + traitBonus,
      0.1,
      0.95,
    );

    const success = Math.random() < successChance;

    // Generate loot if successful
    const loot: Record<string, number> = {};
    if (success) {
      for (const entry of destination.lootTable) {
        if (Math.random() < entry.chance) {
          loot[entry.resource] = randomInt(entry.min, entry.max);
        }
      }
    }

    // XP for heroes (more on success, some on failure)
    const baseXp = destination.difficulty * 5;
    const xpGained = success ? baseXp + randomInt(5, 15) : Math.floor(baseXp * 0.3);

    const result: ExpeditionResult = {
      success,
      loot,
      items: [],
      xpGained,
      injuries: [],
      narrative: success
        ? SUCCESS_NARRATIVES[randomInt(0, SUCCESS_NARRATIVES.length - 1)]
        : FAILURE_NARRATIVES[randomInt(0, FAILURE_NARRATIVES.length - 1)],
    };

    // Update expedition
    await prisma.expedition.update({
      where: { id: expeditionId },
      data: {
        status: success ? ExpeditionStatus.Resolved : ExpeditionStatus.Failed,
        resolvedAt: new Date(),
        result: JSON.stringify(result),
      },
    });

    // Update heroes: set idle, grant XP
    for (const hero of heroes) {
      await prisma.hero.update({
        where: { id: hero.id },
        data: {
          status: HeroStatus.Idle,
          xp: hero.xp + xpGained,
        },
      });
    }

    // Add loot to guild resources if success
    if (success && Object.keys(loot).length > 0) {
      const guild = await prisma.guild.findUnique({
        where: { id: expedition.guildId },
      });
      if (guild) {
        const resources = JSON.parse(guild.resources) as Record<string, number>;
        for (const [key, amount] of Object.entries(loot)) {
          resources[key] = (resources[key] || 0) + amount;
        }
        await prisma.guild.update({
          where: { id: guild.id },
          data: { resources: JSON.stringify(resources) },
        });
      }
    }

    return {
      ...expedition,
      heroIds,
      status: success ? ExpeditionStatus.Resolved : ExpeditionStatus.Failed,
      resolvedAt: new Date().toISOString(),
      result,
    };
  }

  static async listForGuild(guildId: string) {
    const expeditions = await prisma.expedition.findMany({
      where: { guildId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return expeditions.map(e => ({
      ...e,
      heroIds: JSON.parse(e.heroIds),
      result: e.result ? JSON.parse(e.result) : null,
    }));
  }

  static async getById(expeditionId: string) {
    const expedition = await prisma.expedition.findUnique({
      where: { id: expeditionId },
    });
    if (!expedition) return null;
    return {
      ...expedition,
      heroIds: JSON.parse(expedition.heroIds),
      result: expedition.result ? JSON.parse(expedition.result) : null,
    };
  }
}
