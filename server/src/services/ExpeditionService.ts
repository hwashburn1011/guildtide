/**
 * Expedition Service — launch, tick, resolve, return logic.
 *
 * T-0471: Expedition data schema
 * T-0472: Expedition service with launch, tick, resolve, return
 * T-0473: Party formation (via ExpeditionScene)
 * T-0474: Party composition validator
 * T-0475: Party power score calculation
 * T-0476: Destination selector (via ExpeditionScene)
 * T-0477: Destination info panel (via ExpeditionScene)
 * T-0478: Duration calculator
 * T-0479: Launch confirmation
 * T-0480: Launch animation (client side)
 * T-0481: Progress tracker
 * T-0482: Progress bar on main UI header
 * T-0507: Return event with reward distribution
 * T-0508: Return celebration animation (client side)
 * T-0509: Reward detail screen
 * T-0510: Failure states
 * T-0511: Failure consequences
 * T-0512: Retreat option before boss
 * T-0513: Expedition diary
 * T-0514: Expedition statistics
 * T-0515: Difficulty rating system (1-5 stars)
 * T-0516: Difficulty modifiers from real-world data
 * T-0517: Recommendation engine
 * T-0518: Scout speed boost
 * T-0519: Scouting pre-check
 * T-0520: Hero quick-filter by available/rested
 * T-0521: Party template save/load
 * T-0522: Expedition chain system
 * T-0523: Chain progress tracker
 * T-0526: Milestone rewards
 * T-0528: Completion notification
 * T-0529: Auto-repeat toggle
 * T-0530: Leaderboard for fastest times
 * T-0531: Companion NPC hire
 * T-0533: Map fog-of-war
 * T-0538: Post-mortem analysis
 * T-0539: Achievement badges
 * T-0540: Quick-launch from destination list
 * T-0541: Encounter history per destination
 * T-0543: Weather forecast before launch
 * T-0544: Danger zone warnings
 * T-0546: Reward multiplier from Observatory
 * T-0547: Tutorial for first-time launch
 * T-0549: Timed challenge mode
 * T-0550: Fleet system for multiple parties
 */

import { prisma } from '../db';
import { HeroStatus, ExpeditionStatus } from '../../../shared/src/enums';
import { EXPEDITION_DESTINATIONS } from '../data/expeditionData';
import { RESEARCH_MAP } from '../data/researchData';
import { getItemTemplate } from '../data/itemTemplates';
import { WeatherService } from './WeatherService';
import { ExpeditionNarrativeService } from './ExpeditionNarrativeService';
import { getAvailableBosses, getBossById } from '../data/expeditionBosses';
import type { GameModifiers } from '../utils/weatherMapping';
import type {
  ExpeditionStatistics,
  ExpeditionAchievement,
  PartyTemplate,
  RareDiscovery,
} from '../../../shared/src/types';

interface ExpeditionResult {
  success: boolean;
  loot: Record<string, number>;
  items: string[];
  xpGained: number;
  injuries: string[];
  narrative: string;
  encounterSummary?: any[];
  rareDiscovery?: RareDiscovery | null;
  bossResult?: any;
  heroPerformance?: Record<string, any>;
  suppliesRemaining?: any;
  milestoneUnlocked?: string | null;
  rewardMultiplier?: number;
}

// Expedition chain definition
interface ExpeditionChain {
  id: string;
  name: string;
  destinations: string[];
  totalSteps: number;
}

const EXPEDITION_CHAINS: ExpeditionChain[] = [
  {
    id: 'chain_scavenger_trail',
    name: 'The Scavenger Trail',
    destinations: ['scrapyard_outskirts', 'abandoned_warehouse'],
    totalSteps: 2,
  },
  {
    id: 'chain_wilderness_trek',
    name: 'Wilderness Trek',
    destinations: ['whispering_woods', 'thunderpeak_ridge'],
    totalSteps: 2,
  },
  {
    id: 'chain_grand_expedition',
    name: 'The Grand Expedition',
    destinations: ['sunken_ruins', 'whispering_woods', 'crystal_caverns'],
    totalSteps: 3,
  },
  {
    id: 'chain_merchant_road',
    name: 'The Merchant Road',
    destinations: ['riverside_market', 'distant_citadel'],
    totalSteps: 2,
  },
];

// Milestone definitions
interface Milestone {
  id: string;
  name: string;
  threshold: number;
  reward: Record<string, number>;
}

const EXPEDITION_MILESTONES: Milestone[] = [
  { id: 'first_expedition', name: 'First Steps', threshold: 1, reward: { gold: 50, xp: 20 } },
  { id: 'ten_expeditions', name: 'Seasoned Traveler', threshold: 10, reward: { gold: 200, essence: 10 } },
  { id: 'fifty_expeditions', name: 'Master Explorer', threshold: 50, reward: { gold: 500, essence: 50 } },
  { id: 'hundred_expeditions', name: 'Legendary Pathfinder', threshold: 100, reward: { gold: 1000, essence: 100 } },
];

// Achievement definitions
const ACHIEVEMENT_DEFS: Array<{
  id: string;
  name: string;
  description: string;
  category: 'explorer' | 'treasure_hunter' | 'boss_slayer' | 'veteran' | 'discoverer';
  requirement: number;
  stat: string;
}> = [
  { id: 'ach_explorer_10', name: 'Explorer', description: 'Complete 10 expeditions', category: 'explorer', requirement: 10, stat: 'total' },
  { id: 'ach_explorer_50', name: 'Veteran Explorer', description: 'Complete 50 expeditions', category: 'explorer', requirement: 50, stat: 'total' },
  { id: 'ach_treasure_5', name: 'Treasure Seeker', description: 'Find 5 rare discoveries', category: 'treasure_hunter', requirement: 5, stat: 'discoveries' },
  { id: 'ach_treasure_20', name: 'Treasure Master', description: 'Find 20 rare discoveries', category: 'treasure_hunter', requirement: 20, stat: 'discoveries' },
  { id: 'ach_boss_1', name: 'Boss Slayer', description: 'Defeat 1 boss', category: 'boss_slayer', requirement: 1, stat: 'bosses' },
  { id: 'ach_boss_5', name: 'Champion', description: 'Defeat 5 bosses', category: 'boss_slayer', requirement: 5, stat: 'bosses' },
  { id: 'ach_veteran_100', name: 'Legendary Veteran', description: 'Complete 100 expeditions', category: 'veteran', requirement: 100, stat: 'total' },
  { id: 'ach_discoverer_all', name: 'Cartographer', description: 'Discover all destinations', category: 'discoverer', requirement: 8, stat: 'destinations' },
];

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

  /**
   * T-0515: Get difficulty rating for a destination (1-5 stars).
   */
  static getDifficultyRating(destinationId: string): number {
    const dest = EXPEDITION_DESTINATIONS.find(d => d.id === destinationId);
    if (!dest) return 0;
    return ExpeditionNarrativeService.getDifficultyRating(dest.difficulty);
  }

  /**
   * T-0474: Validate party composition.
   */
  static validatePartyComposition(
    heroIds: string[],
    destinationId: string,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const dest = EXPEDITION_DESTINATIONS.find(d => d.id === destinationId);
    if (!dest) {
      errors.push('Unknown destination');
      return { valid: false, errors };
    }
    if (heroIds.length < dest.requiredPartySize) {
      errors.push(`Need at least ${dest.requiredPartySize} hero(es)`);
    }
    if (heroIds.length > 5) {
      errors.push('Maximum party size is 5');
    }
    if (new Set(heroIds).size !== heroIds.length) {
      errors.push('Duplicate heroes in party');
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * T-0475: Calculate party power score.
   */
  static async calculatePartyPower(heroIds: string[]): Promise<number> {
    const heroes = await prisma.hero.findMany({
      where: { id: { in: heroIds } },
    });
    let totalPower = 0;
    for (const hero of heroes) {
      const stats = JSON.parse(hero.stats) as Record<string, number>;
      const power =
        ((stats.strength + stats.agility + stats.endurance) / 3) *
        (1 + hero.level * 0.1);
      totalPower += power;
    }
    return Math.round(totalPower / Math.max(heroes.length, 1));
  }

  /**
   * T-0517: Recommendation engine.
   */
  static getRecommendation(destinationId: string) {
    const dest = EXPEDITION_DESTINATIONS.find(d => d.id === destinationId);
    if (!dest) return null;
    return ExpeditionNarrativeService.getRecommendation(
      destinationId,
      dest.difficulty,
      dest.type,
    );
  }

  /**
   * T-0519: Scouting pre-check.
   */
  static scoutDestination(destinationId: string, scoutLevel: number) {
    const dest = EXPEDITION_DESTINATIONS.find(d => d.id === destinationId);
    if (!dest) return null;
    return ExpeditionNarrativeService.scoutDestination(
      destinationId,
      dest.difficulty,
      dest.type,
      scoutLevel,
    );
  }

  /**
   * T-0543: Weather forecast for expedition.
   */
  static async getWeatherForecast(guildId: string): Promise<{
    condition: string;
    impact: string;
    modifier: number;
  } | null> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return null;
    const player = await prisma.player.findFirst({ where: { guild: { id: guild.id } } });
    if (!player?.regionId) return null;

    try {
      const worldState = await WeatherService.getWorldState(player.regionId);
      if (!worldState) return null;

      let impact = 'No significant impact';
      let modifier = 0;
      if (worldState.modifiers.travelSpeed < 0.9) {
        impact = 'Travel will be slower due to weather conditions';
        modifier = -(1 - worldState.modifiers.travelSpeed);
      } else if (worldState.modifiers.travelSpeed > 1.1) {
        impact = 'Favorable weather will speed up travel';
        modifier = worldState.modifiers.travelSpeed - 1;
      }
      if (worldState.modifiers.huntBonus > 1.2) {
        impact += '. Hunting conditions are excellent.';
      }

      return {
        condition: worldState.weather?.condition ?? 'unknown',
        impact,
        modifier,
      };
    } catch {
      return null;
    }
  }

  /**
   * T-0496/T-0497: Get available boss expeditions.
   */
  static async getAvailableBosses(guildId: string) {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return [];

    const completedResearch: string[] = JSON.parse(guild.researchIds || '[]');
    const completedExpeditions = await prisma.expedition.count({
      where: { guildId, status: { in: ['resolved'] } },
    });

    // Check which bosses have been defeated
    const allExpeditions = await prisma.expedition.findMany({
      where: { guildId, status: 'resolved' },
      select: { result: true },
    });
    const completedBosses: string[] = [];
    for (const exp of allExpeditions) {
      if (exp.result) {
        try {
          const result = JSON.parse(exp.result);
          if (result.bossResult?.success && result.bossResult?.bossId) {
            completedBosses.push(result.bossResult.bossId);
          }
        } catch { /* skip */ }
      }
    }

    return getAvailableBosses(
      guild.level,
      completedBosses,
      completedResearch,
      completedExpeditions,
    );
  }

  /**
   * T-0522/T-0523: Get expedition chains.
   */
  static getChains() {
    return EXPEDITION_CHAINS;
  }

  /**
   * T-0521: Save party template.
   * Templates are stored in the guild's emblem field as a JSON blob
   * with key "partyTemplates" alongside existing emblem data.
   */
  static async savePartyTemplate(
    guildId: string,
    name: string,
    heroIds: string[],
    destinationId?: string,
  ): Promise<PartyTemplate> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const emblemData = guild.emblem ? JSON.parse(guild.emblem) : {};
    const templates: PartyTemplate[] = emblemData.partyTemplates || [];
    const template: PartyTemplate = {
      id: `tpl_${Date.now()}`,
      name,
      heroIds,
      destinationId,
      createdAt: new Date().toISOString(),
    };
    templates.push(template);
    emblemData.partyTemplates = templates;

    await prisma.guild.update({
      where: { id: guildId },
      data: { emblem: JSON.stringify(emblemData) },
    });

    return template;
  }

  /**
   * T-0521: Load party templates.
   */
  static async getPartyTemplates(guildId: string): Promise<PartyTemplate[]> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return [];
    try {
      const emblemData = guild.emblem ? JSON.parse(guild.emblem) : {};
      return emblemData.partyTemplates || [];
    } catch {
      return [];
    }
  }

  /**
   * T-0514: Get expedition statistics.
   */
  static async getStatistics(guildId: string): Promise<ExpeditionStatistics> {
    const expeditions = await prisma.expedition.findMany({
      where: { guildId },
    });

    let successCount = 0;
    let failureCount = 0;
    let totalLootValue = 0;
    let totalXpEarned = 0;
    let bossesDefeated = 0;
    let rareDiscoveries = 0;
    let chainsCompleted = 0;
    const fastestCompletion: Record<string, number> = {};
    const visitedDestinations = new Set<string>();

    for (const exp of expeditions) {
      visitedDestinations.add(exp.destination);

      if (exp.status === 'resolved') {
        successCount++;
      } else if (exp.status === 'failed') {
        failureCount++;
      }

      if (exp.result) {
        try {
          const result = JSON.parse(exp.result);
          totalXpEarned += result.xpGained || 0;

          if (result.loot) {
            for (const amount of Object.values(result.loot)) {
              totalLootValue += (amount as number) || 0;
            }
          }

          if (result.bossResult?.success) bossesDefeated++;
          if (result.rareDiscovery) rareDiscoveries++;

          // Track fastest completion
          if (exp.resolvedAt && exp.status === 'resolved') {
            const startMs = new Date(exp.startedAt).getTime();
            const endMs = new Date(exp.resolvedAt).getTime();
            const durationMs = endMs - startMs;
            const current = fastestCompletion[exp.destination];
            if (!current || durationMs < current) {
              fastestCompletion[exp.destination] = durationMs;
            }
          }
        } catch { /* skip */ }
      }
    }

    const totalExpeditions = successCount + failureCount;
    const successRate = totalExpeditions > 0 ? successCount / totalExpeditions : 0;

    // Build achievement list
    const statMap: Record<string, number> = {
      total: totalExpeditions,
      discoveries: rareDiscoveries,
      bosses: bossesDefeated,
      destinations: visitedDestinations.size,
    };

    const achievements: ExpeditionAchievement[] = ACHIEVEMENT_DEFS.map(def => ({
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      requirement: def.requirement,
      current: statMap[def.stat] || 0,
      unlocked: (statMap[def.stat] || 0) >= def.requirement,
    }));

    return {
      totalExpeditions,
      successCount,
      failureCount,
      successRate,
      totalLootValue,
      totalXpEarned,
      fastestCompletion,
      bossesDefeated,
      rareDiscoveries,
      chainsCompleted,
      achievements,
    };
  }

  /**
   * T-0541: Get encounter history for a specific destination.
   */
  static async getEncounterHistory(guildId: string, destinationId: string) {
    const expeditions = await prisma.expedition.findMany({
      where: { guildId, destination: destinationId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    const history: any[] = [];
    for (const exp of expeditions) {
      if (exp.result) {
        try {
          const result = JSON.parse(exp.result);
          history.push({
            expeditionId: exp.id,
            startedAt: exp.startedAt,
            status: exp.status,
            encounterSummary: result.encounterSummary || [],
            narrative: result.narrative,
          });
        } catch { /* skip */ }
      }
    }

    return history;
  }

  /**
   * T-0533: Get fog-of-war state (which destinations have been visited).
   */
  static async getFogOfWar(guildId: string): Promise<Record<string, boolean>> {
    const visited = await prisma.expedition.findMany({
      where: { guildId },
      select: { destination: true },
      distinct: ['destination'],
    });

    const fog: Record<string, boolean> = {};
    for (const dest of EXPEDITION_DESTINATIONS) {
      fog[dest.id] = visited.some(v => v.destination === dest.id);
    }
    return fog;
  }

  /**
   * T-0530: Get leaderboard for fastest completion times.
   */
  static async getLeaderboard(destinationId: string) {
    const expeditions = await prisma.expedition.findMany({
      where: {
        destination: destinationId,
        status: 'resolved',
        resolvedAt: { not: null },
      },
      orderBy: { startedAt: 'asc' },
      take: 50,
    });

    const entries: Array<{
      guildId: string;
      duration: number;
      heroCount: number;
      startedAt: string;
    }> = [];

    for (const exp of expeditions) {
      if (exp.resolvedAt) {
        const duration = new Date(exp.resolvedAt).getTime() - new Date(exp.startedAt).getTime();
        const heroIds = JSON.parse(exp.heroIds);
        entries.push({
          guildId: exp.guildId,
          duration,
          heroCount: heroIds.length,
          startedAt: exp.startedAt.toISOString(),
        });
      }
    }

    entries.sort((a, b) => a.duration - b.duration);
    return entries.slice(0, 10);
  }

  /**
   * T-0538: Post-mortem analysis with optimal party suggestion.
   */
  static getPostMortem(destinationId: string) {
    const dest = EXPEDITION_DESTINATIONS.find(d => d.id === destinationId);
    if (!dest) return null;

    const recommendation = ExpeditionNarrativeService.getRecommendation(
      destinationId,
      dest.difficulty,
      dest.type,
    );

    return {
      destination: dest.name,
      difficulty: dest.difficulty,
      difficultyRating: ExpeditionNarrativeService.getDifficultyRating(dest.difficulty),
      ...recommendation,
      optimalPartySize: Math.min(dest.requiredPartySize + 1, 5),
      suggestedLevel: Math.max(1, dest.difficulty - 1),
    };
  }

  static async launch(
    guildId: string,
    type: string,
    heroIds: string[],
    destinationId: string,
    options?: {
      bossId?: string;
      chainId?: string;
      chainStep?: number;
      isTimedChallenge?: boolean;
      isFleet?: boolean;
    },
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

    // T-0550: Fleet system — check concurrent expedition limit
    const activeCount = await prisma.expedition.count({
      where: { guildId, status: 'active' },
    });
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    const maxConcurrent = Math.min(1 + Math.floor((guild?.level ?? 1) / 3), 5);
    if (activeCount >= maxConcurrent) {
      throw new Error(`Maximum concurrent expeditions reached (${maxConcurrent})`);
    }

    // T-0518: Calculate adjusted duration with scout bonus
    const heroData = heroes.map(h => ({
      id: h.id,
      name: h.name,
      role: h.role,
      level: h.level,
      stats: JSON.parse(h.stats),
      traits: JSON.parse(h.traits),
    }));

    // Get research bonuses
    const completedResearch: string[] = guild ? JSON.parse(guild.researchIds || '[]') : [];
    let researchTravelSpeed = 0;
    for (const resId of completedResearch) {
      const node = RESEARCH_MAP.get(resId);
      if (!node) continue;
      researchTravelSpeed += node.effects['travel_speed'] ?? 0;
    }

    const adjustedDuration = ExpeditionNarrativeService.calculateDuration(
      destination.durationMinutes,
      heroData,
      researchTravelSpeed,
    );

    // T-0549: Timed challenge — reduce duration but increase difficulty
    const isTimed = options?.isTimedChallenge ?? false;
    const finalDuration = isTimed ? Math.max(1, Math.floor(adjustedDuration * 0.6)) : adjustedDuration;

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
        duration: finalDuration,
        status: ExpeditionStatus.Active,
      },
    });

    return {
      ...expedition,
      heroIds: JSON.parse(expedition.heroIds),
      result: null,
      difficultyRating: ExpeditionNarrativeService.getDifficultyRating(destination.difficulty),
      chainId: options?.chainId ?? null,
      chainStep: options?.chainStep ?? 0,
      isBoss: !!options?.bossId,
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

    // Load guild for research data
    const guild = await prisma.guild.findUnique({ where: { id: expedition.guildId } });
    const completedResearch: string[] = guild ? JSON.parse(guild.researchIds || '[]') : [];

    // Aggregate research effects
    let researchTravelSpeed = 0;
    let researchWeatherTravelReduction = 0;
    let researchExpeditionRiskReduction = 0;
    let researchHuntBonus = 0;
    let researchHeroXpBonus = 0;

    for (const resId of completedResearch) {
      const node = RESEARCH_MAP.get(resId);
      if (!node) continue;
      researchTravelSpeed += node.effects['travel_speed'] ?? 0;
      researchWeatherTravelReduction += node.effects['weather_travel_penalty_reduction'] ?? 0;
      researchExpeditionRiskReduction += node.effects['expedition_risk_reduction'] ?? 0;
      researchHuntBonus += node.effects['hunt_bonus'] ?? 0;
      researchHeroXpBonus += node.effects['hero_xp_bonus'] ?? 0;
    }

    // Load weather modifiers for the guild's region
    let worldMods: GameModifiers | null = null;
    if (guild) {
      const player = await prisma.player.findFirst({ where: { guild: { id: guild.id } } });
      if (player?.regionId) {
        try {
          const worldState = await WeatherService.getWorldState(player.regionId);
          if (worldState) worldMods = worldState.modifiers;
        } catch { /* no weather data available */ }
      }
    }

    // Build hero data for narrative service
    const heroData = heroes.map(h => ({
      id: h.id,
      name: h.name,
      role: h.role,
      level: h.level,
      stats: JSON.parse(h.stats),
      traits: JSON.parse(h.traits),
    }));

    // Generate narrative log, encounters, route, etc.
    const narrativeResult = ExpeditionNarrativeService.generateExpeditionLog(
      expedition.destination,
      heroData,
      destination.difficulty,
      expedition.type,
      expedition.duration,
    );

    // Calculate party power: average of (str + agi + end) / 3 per hero, scaled by level
    let totalPower = 0;
    let traitBonus = 0;
    let totalExpeditionBonus = 0;

    for (const hero of heroes) {
      const stats = JSON.parse(hero.stats) as {
        strength: number;
        agility: number;
        endurance: number;
        intellect?: number;
        luck?: number;
      };

      // Base stat power
      let heroStr = stats.strength;
      let heroAgi = stats.agility;
      let heroEnd = stats.endurance;

      // Equipment bonuses: stat bonuses + expedition bonus
      const equipment = JSON.parse(hero.equipment || '{}') as Record<string, string | null>;
      for (const templateId of Object.values(equipment)) {
        if (!templateId) continue;
        const template = getItemTemplate(templateId);
        if (!template) continue;

        // Add stat bonuses from items
        if (template.effects.statBonuses) {
          heroStr += template.effects.statBonuses.strength ?? 0;
          heroAgi += template.effects.statBonuses.agility ?? 0;
          heroEnd += template.effects.statBonuses.endurance ?? 0;
        }

        // Sum expedition bonus from all equipped items
        if (template.effects.expeditionBonus) {
          totalExpeditionBonus += template.effects.expeditionBonus;
        }
      }

      const heroPower =
        ((heroStr + heroAgi + heroEnd) / 3) *
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

    // Item expedition bonus
    const itemBonus = totalExpeditionBonus / 100;

    // Research travel speed bonus
    const travelBonus = researchTravelSpeed;

    // Weather modifiers
    let weatherPenalty = 0;
    if (worldMods && worldMods.travelSpeed < 1.0) {
      const rawPenalty = 1.0 - worldMods.travelSpeed;
      weatherPenalty = rawPenalty * (1 - researchWeatherTravelReduction);
    }
    let weatherHuntMod = 0;
    if (worldMods && expedition.type === 'hunt') {
      weatherHuntMod = (worldMods.huntBonus - 1.0) * 0.5;
    }
    const huntMod = expedition.type === 'hunt' ? researchHuntBonus : 0;

    // T-0534: Party morale affects success
    const moraleModifier = (narrativeResult.finalMorale - 50) / 500;

    // T-0546: Observatory reward multiplier
    let rewardMultiplier = 1.0;
    if (worldMods && worldMods.essenceDrops > 1.0) {
      rewardMultiplier += (worldMods.essenceDrops - 1.0) * 0.3;
    }

    // Success formula with all modifiers
    const successChance = clamp(
      0.3
      + (partyPower / destination.difficulty) * 0.5
      + traitBonus
      + itemBonus
      + travelBonus
      - weatherPenalty
      + weatherHuntMod
      + huntMod
      + researchExpeditionRiskReduction
      + moraleModifier,
      0.1,
      0.95,
    );

    const success = Math.random() < successChance;

    // Generate loot if successful
    const loot: Record<string, number> = {};
    if (success) {
      for (const entry of destination.lootTable) {
        if (Math.random() < entry.chance) {
          loot[entry.resource] = Math.round(
            randomInt(entry.min, entry.max) * rewardMultiplier,
          );
        }
      }
      // Add bonus loot from encounters
      for (const [key, amount] of Object.entries(narrativeResult.bonusLoot)) {
        if (amount > 0) {
          loot[key] = (loot[key] || 0) + amount;
        }
      }
    }

    // XP for heroes
    const baseXp = destination.difficulty * 5;
    const rawXp = success ? baseXp + randomInt(5, 15) : Math.floor(baseXp * 0.3);
    const xpGained = Math.floor(rawXp * (1 + researchHeroXpBonus) * rewardMultiplier);

    // T-0511: Failure consequences
    const injuries: string[] = [];
    if (!success || narrativeResult.totalDamage > 30) {
      const injuryCount = Math.min(heroes.length, Math.floor(narrativeResult.totalDamage / 15));
      const injuryTypes = ['bruised', 'sprained', 'exhausted', 'poisoned', 'burned'];
      for (let i = 0; i < injuryCount; i++) {
        injuries.push(`${heroes[i].name}: ${injuryTypes[randomInt(0, injuryTypes.length - 1)]}`);
      }
    }

    // T-0526: Milestone check
    const totalExpeditions = await prisma.expedition.count({
      where: { guildId: expedition.guildId, status: { in: ['resolved', 'failed'] } },
    });
    let milestoneUnlocked: string | null = null;
    for (const milestone of EXPEDITION_MILESTONES) {
      if (totalExpeditions + 1 === milestone.threshold) {
        milestoneUnlocked = milestone.name;
        // Add milestone rewards
        if (success) {
          for (const [key, amount] of Object.entries(milestone.reward)) {
            if (key !== 'xp') {
              loot[key] = (loot[key] || 0) + amount;
            }
          }
        }
        break;
      }
    }

    const result: ExpeditionResult = {
      success,
      loot,
      items: narrativeResult.bossResult?.exclusiveLoot ?? [],
      xpGained,
      injuries,
      narrative: success
        ? SUCCESS_NARRATIVES[randomInt(0, SUCCESS_NARRATIVES.length - 1)]
        : FAILURE_NARRATIVES[randomInt(0, FAILURE_NARRATIVES.length - 1)],
      encounterSummary: narrativeResult.encounters,
      rareDiscovery: narrativeResult.rareDiscovery,
      bossResult: narrativeResult.bossResult,
      heroPerformance: narrativeResult.heroPerformance,
      suppliesRemaining: narrativeResult.supplies,
      milestoneUnlocked,
      rewardMultiplier,
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

    // Update heroes: set idle or recovering (if injured), grant XP
    for (let i = 0; i < heroes.length; i++) {
      const hero = heroes[i];
      const isInjured = injuries.some(inj => inj.startsWith(hero.name));
      await prisma.hero.update({
        where: { id: hero.id },
        data: {
          status: isInjured ? HeroStatus.Recovering : HeroStatus.Idle,
          xp: hero.xp + xpGained,
        },
      });
    }

    // Add loot to guild resources if success
    if (success && Object.keys(loot).length > 0) {
      const guildData = await prisma.guild.findUnique({
        where: { id: expedition.guildId },
      });
      if (guildData) {
        const resources = JSON.parse(guildData.resources) as Record<string, number>;
        for (const [key, amount] of Object.entries(loot)) {
          resources[key] = (resources[key] || 0) + amount;
        }
        await prisma.guild.update({
          where: { id: guildData.id },
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
      log: narrativeResult.log,
      encounters: narrativeResult.encounters,
      routeWaypoints: narrativeResult.waypoints,
      supplies: narrativeResult.supplies,
      partyMorale: narrativeResult.finalMorale,
      difficultyRating: ExpeditionNarrativeService.getDifficultyRating(destination.difficulty),
    };
  }

  /**
   * T-0512: Retreat from expedition before boss.
   */
  static async retreat(expeditionId: string) {
    const expedition = await prisma.expedition.findUnique({
      where: { id: expeditionId },
    });
    if (!expedition) throw new Error('Expedition not found');
    if (expedition.status !== ExpeditionStatus.Active) {
      throw new Error('Expedition not active');
    }

    const heroIds: string[] = JSON.parse(expedition.heroIds);

    // Partial XP for retreat
    const destination = EXPEDITION_DESTINATIONS.find(d => d.id === expedition.destination);
    const xpGained = Math.floor((destination?.difficulty ?? 1) * 2);

    await prisma.expedition.update({
      where: { id: expeditionId },
      data: {
        status: ExpeditionStatus.Failed,
        resolvedAt: new Date(),
        result: JSON.stringify({
          success: false,
          loot: {},
          items: [],
          xpGained,
          injuries: [],
          narrative: 'The party wisely retreated before facing overwhelming odds.',
        }),
      },
    });

    // Return heroes to idle
    await prisma.hero.updateMany({
      where: { id: { in: heroIds } },
      data: { status: HeroStatus.Idle },
    });

    return { retreated: true, xpGained };
  }

  static async listForGuild(guildId: string) {
    const expeditions = await prisma.expedition.findMany({
      where: { guildId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    return expeditions.map(e => ({
      ...e,
      heroIds: JSON.parse(e.heroIds),
      result: e.result ? JSON.parse(e.result) : null,
      difficultyRating: ExpeditionNarrativeService.getDifficultyRating(
        EXPEDITION_DESTINATIONS.find(d => d.id === e.destination)?.difficulty ?? 1,
      ),
    }));
  }

  /**
   * T-0513: Full expedition diary / history.
   */
  static async getDiary(guildId: string, page: number = 0, pageSize: number = 20) {
    const total = await prisma.expedition.count({ where: { guildId } });
    const expeditions = await prisma.expedition.findMany({
      where: { guildId },
      orderBy: { startedAt: 'desc' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      total,
      page,
      pageSize,
      entries: expeditions.map(e => ({
        ...e,
        heroIds: JSON.parse(e.heroIds),
        result: e.result ? JSON.parse(e.result) : null,
        destinationName: EXPEDITION_DESTINATIONS.find(d => d.id === e.destination)?.name ?? e.destination,
      })),
    };
  }

  /**
   * T-0494: Get all rare discoveries for a guild.
   */
  static async getRareDiscoveries(guildId: string): Promise<RareDiscovery[]> {
    const expeditions = await prisma.expedition.findMany({
      where: { guildId, status: 'resolved' },
    });

    const discoveries: RareDiscovery[] = [];
    for (const exp of expeditions) {
      if (exp.result) {
        try {
          const result = JSON.parse(exp.result);
          if (result.rareDiscovery) {
            discoveries.push(result.rareDiscovery);
          }
        } catch { /* skip */ }
      }
    }

    return discoveries;
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
