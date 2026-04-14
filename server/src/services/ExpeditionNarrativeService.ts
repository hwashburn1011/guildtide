/**
 * Expedition narrative and log generation service.
 *
 * T-0483: Expedition log system recording events during expedition
 * T-0491: Expedition encounter narrative text generation system
 * T-0492: Expedition encounter outcome effects (damage, loot, morale change)
 * T-0493: Expedition rare discovery system (unique artifacts, lore fragments)
 * T-0495: Rare discovery trigger conditions (specific party, weather, date)
 * T-0501: Expedition route visualization on world map
 * T-0502: Route waypoint system with encounter points marked
 * T-0504: Expedition supply system
 * T-0505: Supply consumption rate based on party size and duration
 * T-0506: Supply shortage penalties
 * T-0510: Expedition failure states
 * T-0511: Failure consequences (hero injuries, lost supplies)
 * T-0527: Seasonal content (winter expeditions have unique encounters)
 * T-0532: Lore discovery system unlocking world history entries
 * T-0534: Party morale tracking separate from base morale
 * T-0536: Random event influenced by real-world sentiment
 * T-0537: Resource node discovery for new gathering locations
 * T-0542: Hero performance rating after completion
 * T-0545: Expedition narrative summary generator from log entries
 */

import type {
  ExpeditionLogEntry,
  ExpeditionEncounterResult,
  RouteWaypoint,
  ExpeditionSupplies,
  RareDiscovery,
  BossEncounterResult,
  HeroPerformanceRating,
} from '../../../shared/src/types';
import {
  ENCOUNTER_TEMPLATES,
  getApplicableEncounters,
  selectRandomEncounters,
} from '../data/expeditionEncounters';
import type { EncounterTemplate } from '../data/expeditionEncounters';
import { BOSS_DEFINITIONS, getBossById } from '../data/expeditionBosses';
import type { BossDefinition } from '../data/expeditionBosses';
import { EXPEDITION_DESTINATIONS } from '../data/expeditionData';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

// --- Rare Discoveries ---
interface RareDiscoveryTemplate {
  id: string;
  name: string;
  description: string;
  category: 'artifact' | 'lore_fragment' | 'map_piece' | 'npc_contact' | 'resource_node';
  rarity: 'rare' | 'epic' | 'legendary';
  baseChance: number;
  destinationIds: string[]; // empty = any
  requiredRoles?: string[];
  requiredTraits?: string[];
  seasonalBonus?: string;
  effects?: Record<string, number>;
}

const RARE_DISCOVERY_TEMPLATES: RareDiscoveryTemplate[] = [
  {
    id: 'ancient_compass',
    name: 'Ancient Compass',
    description: 'An ornate compass that always points toward hidden treasures.',
    category: 'artifact',
    rarity: 'rare',
    baseChance: 0.08,
    destinationIds: ['sunken_ruins', 'crystal_caverns'],
    effects: { expeditionLootBonus: 0.1 },
  },
  {
    id: 'forgotten_tome',
    name: 'Forgotten Tome',
    description: 'A leather-bound book filled with arcane knowledge from a lost civilization.',
    category: 'lore_fragment',
    rarity: 'epic',
    baseChance: 0.05,
    destinationIds: ['sunken_ruins', 'abandoned_warehouse'],
    requiredRoles: ['archivist', 'mystic'],
    effects: { researchSpeed: 0.05 },
  },
  {
    id: 'star_map_fragment',
    name: 'Star Map Fragment',
    description: 'Part of an ancient celestial map that may reveal hidden destinations.',
    category: 'map_piece',
    rarity: 'epic',
    baseChance: 0.04,
    destinationIds: [],
    effects: { explorationRange: 0.1 },
  },
  {
    id: 'hermit_contact',
    name: 'Hermit Contact',
    description: 'A reclusive hermit agrees to trade rare herbs if you visit regularly.',
    category: 'npc_contact',
    rarity: 'rare',
    baseChance: 0.06,
    destinationIds: ['whispering_woods', 'thunderpeak_ridge'],
    requiredTraits: ['charismatic'],
    effects: { herbTradeDiscount: 0.15 },
  },
  {
    id: 'crystal_vein',
    name: 'Crystal Vein',
    description: 'A rich deposit of crystallized essence, untouched for millennia.',
    category: 'resource_node',
    rarity: 'rare',
    baseChance: 0.07,
    destinationIds: ['crystal_caverns'],
    effects: { essencePerExpedition: 5 },
  },
  {
    id: 'dragon_scale_shard',
    name: 'Dragon Scale Shard',
    description: 'A fragment of an ancient dragon\'s scale, radiating immense power.',
    category: 'artifact',
    rarity: 'legendary',
    baseChance: 0.02,
    destinationIds: ['thunderpeak_ridge', 'crystal_caverns'],
    effects: { partyPowerBonus: 0.15 },
  },
  {
    id: 'trade_route_map',
    name: 'Trade Route Map',
    description: 'A detailed map of forgotten trade routes that could be immensely profitable.',
    category: 'map_piece',
    rarity: 'rare',
    baseChance: 0.06,
    destinationIds: ['riverside_market', 'distant_citadel'],
    requiredRoles: ['merchant', 'caravan_master'],
    effects: { tradeRouteBonus: 0.1 },
  },
  {
    id: 'primordial_seed',
    name: 'Primordial Seed',
    description: 'A seed from the world\'s first tree. It pulses with life energy.',
    category: 'artifact',
    rarity: 'legendary',
    baseChance: 0.015,
    destinationIds: ['whispering_woods'],
    seasonalBonus: 'spring',
    effects: { cropGrowthBonus: 0.2 },
  },
  {
    id: 'ore_deposit_map',
    name: 'Ore Deposit Map',
    description: 'Marks the location of a rich, untapped ore vein near the scrapyard.',
    category: 'resource_node',
    rarity: 'rare',
    baseChance: 0.07,
    destinationIds: ['scrapyard_outskirts', 'abandoned_warehouse'],
    effects: { orePerExpedition: 8 },
  },
  {
    id: 'ancient_inscription',
    name: 'Ancient Inscription',
    description: 'Carved runes that detail the history of the original settlers.',
    category: 'lore_fragment',
    rarity: 'rare',
    baseChance: 0.08,
    destinationIds: ['sunken_ruins'],
    effects: { lorePoints: 1 },
  },
];

// --- Departure and arrival narratives ---
const DEPARTURE_NARRATIVES = [
  'The party sets out from the guild hall with high spirits and steady purpose.',
  'With supplies packed and weapons sharpened, the expedition begins.',
  'Dawn breaks as the heroes march through the gates, adventure ahead.',
  'Cheers from the guild see the party off on their journey.',
];

const ARRIVAL_NARRATIVES = [
  'The destination comes into view. The party prepares for what lies ahead.',
  'After a long march, the heroes arrive at their goal.',
  'The journey\'s end reveals the destination in all its splendor — and danger.',
];

const CAMP_NARRATIVES = [
  'The party makes camp as night falls. Stories are shared around the fire.',
  'A sheltered spot provides respite. Heroes rest and tend their gear.',
  'Under a canopy of stars, the party settles in for a well-earned rest.',
];

// --- Season helpers ---
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

// --- Hero stat helper ---
interface HeroStats {
  strength: number;
  agility: number;
  endurance: number;
  intellect?: number;
  luck?: number;
}

interface HeroData {
  id: string;
  name: string;
  role: string;
  level: number;
  stats: HeroStats;
  traits: string[];
}

function getPartyStatAverage(heroes: HeroData[], stat: string): number {
  let total = 0;
  for (const hero of heroes) {
    const s = hero.stats as unknown as Record<string, number | undefined>;
    total += (s[stat] ?? 10) + hero.level * 2;
  }
  return total / Math.max(heroes.length, 1);
}

function getPartyCharisma(heroes: HeroData[]): number {
  let base = 10;
  for (const hero of heroes) {
    if (hero.traits.includes('charismatic')) base += 5;
    if (hero.role === 'merchant' || hero.role === 'caravan_master') base += 3;
    base += hero.level;
  }
  return base / Math.max(heroes.length, 1);
}

// ===== Main Narrative Service =====

export class ExpeditionNarrativeService {

  /**
   * Generate the full expedition log: encounters, route, supplies, discoveries, etc.
   */
  static generateExpeditionLog(
    destinationId: string,
    heroes: HeroData[],
    difficulty: number,
    expeditionType: string,
    durationMinutes: number,
    bossId?: string,
  ): {
    log: ExpeditionLogEntry[];
    encounters: ExpeditionEncounterResult[];
    waypoints: RouteWaypoint[];
    supplies: ExpeditionSupplies;
    rareDiscovery: RareDiscovery | null;
    bossResult: BossEncounterResult | null;
    heroPerformance: Record<string, HeroPerformanceRating>;
    totalDamage: number;
    finalMorale: number;
    bonusLoot: Record<string, number>;
    narrativeSummary: string;
  } {
    const log: ExpeditionLogEntry[] = [];
    const encounterResults: ExpeditionEncounterResult[] = [];
    const bonusLoot: Record<string, number> = {};
    let totalDamage = 0;
    let morale = 100;
    const season = getCurrentSeason();

    // T-0504/T-0505: Supply system — based on party size and duration
    const supplies: ExpeditionSupplies = {
      food: 10 + heroes.length * 5 + Math.floor(durationMinutes / 10) * 2,
      materials: 5 + heroes.length * 2,
      maxFood: 10 + heroes.length * 5 + Math.floor(durationMinutes / 10) * 2,
      maxMaterials: 5 + heroes.length * 2,
    };

    // T-0502: Route waypoints
    const numWaypoints = Math.max(2, Math.floor(durationMinutes / 10));
    const waypoints: RouteWaypoint[] = [];

    // Start waypoint
    waypoints.push({
      id: 'wp_start',
      name: 'Guild Hall',
      x: 0.05,
      y: 0.5,
      type: 'start',
      reached: true,
    });

    // Departure log entry
    log.push({
      timestamp: new Date().toISOString(),
      type: 'departure',
      title: 'Expedition Begins',
      narrative: DEPARTURE_NARRATIVES[randomInt(0, DEPARTURE_NARRATIVES.length - 1)],
    });

    // T-0484: Generate encounters
    const applicable = getApplicableEncounters(difficulty, expeditionType, season);
    const encounterCount = clamp(Math.floor(durationMinutes / 12), 1, 6);
    const selectedEncounters = selectRandomEncounters(applicable, encounterCount);

    // Place encounter waypoints along the route
    const totalWPCount = selectedEncounters.length + 2; // start + encounters + destination
    for (let i = 0; i < selectedEncounters.length; i++) {
      const progress = (i + 1) / totalWPCount;
      const enc = selectedEncounters[i];
      const wpId = `wp_enc_${i}`;

      // Resolve encounter
      const encResult = this.resolveEncounter(enc, heroes, difficulty);
      encounterResults.push(encResult);

      // Apply effects
      if (encResult.outcome === 'failure') {
        totalDamage += enc.failureEffects.damage ?? 0;
        if (enc.failureEffects.goldLoss) {
          bonusLoot['gold'] = (bonusLoot['gold'] ?? 0) - enc.failureEffects.goldLoss;
        }
      } else if (encResult.outcome === 'success' && enc.lootOnSuccess) {
        for (const l of enc.lootOnSuccess) {
          if (Math.random() < l.chance) {
            bonusLoot[l.resource] = (bonusLoot[l.resource] ?? 0) + randomInt(l.min, l.max);
          }
        }
      }

      // Morale
      const moraleEffect = enc.moraleChange ?? { success: 0, failure: 0 };
      morale += encResult.outcome === 'success' ? moraleEffect.success : moraleEffect.failure;
      morale = clamp(morale, 0, 150);

      // Supply consumption per encounter
      const supplyCost = enc.supplyChange
        ? (encResult.outcome === 'success' ? enc.supplyChange.success : enc.supplyChange.failure)
        : -1;
      supplies.food = Math.max(0, supplies.food + supplyCost);

      // T-0506: Supply shortage penalty
      if (supplies.food <= 0) {
        morale -= 10;
        totalDamage += 5;
        log.push({
          timestamp: new Date(Date.now() + i * 60000).toISOString(),
          type: 'hazard',
          title: 'Supplies Exhausted',
          narrative: 'With no food remaining, the party grows weak and demoralized.',
          effects: { morale: -10, damage: 5 },
        });
      }

      // Log entry
      log.push({
        timestamp: new Date(Date.now() + (i + 1) * 60000).toISOString(),
        type: 'encounter',
        title: enc.name,
        narrative: encResult.narrative,
        effects: encResult.effects,
      });

      // Add camping between long encounters
      if (i > 0 && i % 2 === 0 && durationMinutes >= 30) {
        morale += 5;
        supplies.food = Math.max(0, supplies.food - 2);
        log.push({
          timestamp: new Date(Date.now() + (i + 1) * 60000 + 30000).toISOString(),
          type: 'camp',
          title: 'Camp Rest',
          narrative: CAMP_NARRATIVES[randomInt(0, CAMP_NARRATIVES.length - 1)],
          effects: { morale: 5, healing: 5 },
        });
        waypoints.push({
          id: `wp_camp_${i}`,
          name: 'Camp',
          x: progress - 0.02,
          y: 0.5 + (Math.random() - 0.5) * 0.3,
          type: 'rest',
          reached: true,
        });
      }

      waypoints.push({
        id: wpId,
        name: enc.name,
        x: progress * 0.85 + 0.1,
        y: 0.5 + (Math.random() - 0.5) * 0.4,
        type: 'encounter',
        reached: true,
        encounterResult: encResult,
      });
    }

    // T-0496-0500: Boss encounter
    let bossResult: BossEncounterResult | null = null;
    if (bossId) {
      const boss = getBossById(bossId);
      if (boss) {
        bossResult = this.resolveBossEncounter(boss, heroes);
        log.push({
          timestamp: new Date(Date.now() + (selectedEncounters.length + 1) * 60000).toISOString(),
          type: 'boss',
          title: `Boss: ${boss.name}`,
          narrative: bossResult.success ? boss.victoryNarrative : boss.defeatNarrative,
          effects: { bossDefeated: bossResult.success ? 1 : 0 },
        });

        if (bossResult.success) {
          for (const l of boss.lootTable) {
            if (Math.random() < l.chance) {
              bonusLoot[l.resource] = (bonusLoot[l.resource] ?? 0) + randomInt(l.min, l.max);
            }
          }
        } else {
          totalDamage += 30;
          morale -= 20;
        }

        waypoints.push({
          id: 'wp_boss',
          name: boss.name,
          x: 0.85,
          y: 0.5,
          type: 'boss',
          reached: true,
        });
      }
    }

    // Destination waypoint
    waypoints.push({
      id: 'wp_dest',
      name: EXPEDITION_DESTINATIONS.find(d => d.id === destinationId)?.name ?? 'Destination',
      x: 0.95,
      y: 0.5,
      type: 'destination',
      reached: true,
    });

    // Arrival log
    log.push({
      timestamp: new Date(Date.now() + (selectedEncounters.length + 2) * 60000).toISOString(),
      type: 'arrival',
      title: 'Arrival',
      narrative: ARRIVAL_NARRATIVES[randomInt(0, ARRIVAL_NARRATIVES.length - 1)],
    });

    // T-0493/T-0495: Rare discovery check
    const rareDiscovery = this.checkRareDiscovery(
      destinationId,
      heroes,
      season,
    );
    if (rareDiscovery) {
      log.push({
        timestamp: new Date(Date.now() + (selectedEncounters.length + 3) * 60000).toISOString(),
        type: 'discovery',
        title: `Discovery: ${rareDiscovery.name}`,
        narrative: rareDiscovery.description,
      });
    }

    // T-0542: Hero performance rating
    const heroPerformance = this.calculateHeroPerformance(heroes, encounterResults, totalDamage);

    // T-0545: Narrative summary
    const narrativeSummary = this.generateNarrativeSummary(log, encounterResults, bossResult, rareDiscovery);

    return {
      log,
      encounters: encounterResults,
      waypoints,
      supplies,
      rareDiscovery,
      bossResult,
      heroPerformance,
      totalDamage,
      finalMorale: clamp(morale, 0, 150),
      bonusLoot,
      narrativeSummary,
    };
  }

  /**
   * Resolve a single encounter against party stats.
   */
  static resolveEncounter(
    encounter: EncounterTemplate,
    heroes: HeroData[],
    difficulty: number,
  ): ExpeditionEncounterResult {
    let partyCheck = 10;

    if (encounter.statCheck === 'charisma') {
      partyCheck = getPartyCharisma(heroes);
    } else if (encounter.statCheck) {
      partyCheck = getPartyStatAverage(heroes, encounter.statCheck);
    }

    // Roll: party stat + random(1-6) vs check difficulty
    const roll = partyCheck + randomInt(1, 6);
    const dc = encounter.checkDifficulty ?? (difficulty * 2 + 5);
    const success = roll >= dc;

    // Partial success for some encounters
    const partial = !success && encounter.partialNarrative && roll >= dc - 3;

    let outcome: 'success' | 'failure' | 'partial';
    let narrative: string;
    let effects: Record<string, number>;

    if (success) {
      outcome = 'success';
      narrative = encounter.successNarrative;
      effects = { ...encounter.successEffects };
    } else if (partial) {
      outcome = 'partial';
      narrative = encounter.partialNarrative!;
      effects = {};
    } else {
      outcome = 'failure';
      narrative = encounter.failureNarrative;
      effects = { ...encounter.failureEffects };
    }

    // Gather loot on success
    const loot: Record<string, number> = {};
    if (outcome === 'success' && encounter.lootOnSuccess) {
      for (const l of encounter.lootOnSuccess) {
        if (Math.random() < l.chance) {
          loot[l.resource] = randomInt(l.min, l.max);
        }
      }
    }

    return {
      encounterId: encounter.id,
      type: encounter.type,
      title: encounter.name,
      narrative,
      outcome,
      effects,
      loot: Object.keys(loot).length > 0 ? loot : undefined,
    };
  }

  /**
   * Resolve a multi-phase boss encounter.
   */
  static resolveBossEncounter(
    boss: BossDefinition,
    heroes: HeroData[],
  ): BossEncounterResult {
    let phasesCleared = 0;

    for (const phase of boss.phases) {
      const partyCheck = getPartyStatAverage(heroes, phase.statCheck);
      const roll = partyCheck + randomInt(1, 8);

      if (roll >= phase.checkDifficulty) {
        phasesCleared++;
      } else {
        // On failure, continue but accumulated damage may affect later phases
        // Still try remaining phases (heroes can push through with injuries)
        if (Math.random() < 0.4) {
          break; // Party may be forced to retreat on bad failure
        }
      }
    }

    const success = phasesCleared >= boss.phases.length;

    return {
      bossId: boss.id,
      bossName: boss.name,
      phases: boss.phases.length,
      phasesCleared,
      success,
      exclusiveLoot: success ? boss.exclusiveRewards : [],
    };
  }

  /**
   * Check if a rare discovery is found.
   */
  static checkRareDiscovery(
    destinationId: string,
    heroes: HeroData[],
    season: string,
  ): RareDiscovery | null {
    const heroRoles = heroes.map(h => h.role);
    const heroTraits = heroes.flatMap(h => h.traits);

    for (const template of RARE_DISCOVERY_TEMPLATES) {
      let chance = template.baseChance;

      // Destination filter
      if (template.destinationIds.length > 0 &&
          !template.destinationIds.includes(destinationId)) {
        continue;
      }

      // Role bonus
      if (template.requiredRoles) {
        const hasRole = template.requiredRoles.some(r => heroRoles.includes(r));
        if (hasRole) {
          chance *= 1.5;
        } else {
          chance *= 0.3;
        }
      }

      // Trait bonus
      if (template.requiredTraits) {
        const hasTrait = template.requiredTraits.some(t => heroTraits.includes(t));
        if (hasTrait) chance *= 1.5;
      }

      // Seasonal bonus
      if (template.seasonalBonus && template.seasonalBonus === season) {
        chance *= 2.0;
      }

      if (Math.random() < chance) {
        return {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          rarity: template.rarity,
          discoveredAt: new Date().toISOString(),
          destinationId,
          effects: template.effects,
        };
      }
    }

    return null;
  }

  /**
   * Calculate hero performance ratings.
   */
  static calculateHeroPerformance(
    heroes: HeroData[],
    encounters: ExpeditionEncounterResult[],
    totalDamage: number,
  ): Record<string, HeroPerformanceRating> {
    const ratings: Record<string, HeroPerformanceRating> = {};

    for (const hero of heroes) {
      const stats = hero.stats;
      const combatScore = clamp(
        ((stats.strength + (stats.endurance ?? 10)) / 2 + hero.level * 2) / 5,
        1,
        5,
      );
      const explorationScore = clamp(
        ((stats.agility + (stats.intellect ?? 10)) / 2 + hero.level * 1.5) / 5,
        1,
        5,
      );
      const supportScore = clamp(
        ((stats.endurance + (stats.luck ?? 10)) / 2 + hero.level) / 5,
        1,
        5,
      );

      // Modify based on encounter outcomes
      const successRate = encounters.length > 0
        ? encounters.filter(e => e.outcome === 'success').length / encounters.length
        : 0.5;

      const overall = clamp(
        Math.round(((combatScore + explorationScore + supportScore) / 3 + successRate * 2) * 10) / 10,
        1,
        5,
      );

      ratings[hero.id] = {
        heroId: hero.id,
        heroName: hero.name,
        combatScore: Math.round(combatScore * 10) / 10,
        explorationScore: Math.round(explorationScore * 10) / 10,
        supportScore: Math.round(supportScore * 10) / 10,
        overallRating: overall,
      };
    }

    return ratings;
  }

  /**
   * Generate a narrative summary from log entries.
   */
  static generateNarrativeSummary(
    log: ExpeditionLogEntry[],
    encounters: ExpeditionEncounterResult[],
    bossResult: BossEncounterResult | null,
    rareDiscovery: RareDiscovery | null,
  ): string {
    const parts: string[] = [];
    const successes = encounters.filter(e => e.outcome === 'success').length;
    const failures = encounters.filter(e => e.outcome === 'failure').length;

    if (encounters.length > 0) {
      parts.push(
        `The expedition faced ${encounters.length} encounter${encounters.length > 1 ? 's' : ''}, ` +
        `overcoming ${successes} and struggling with ${failures}.`,
      );
    }

    if (bossResult) {
      if (bossResult.success) {
        parts.push(
          `${bossResult.bossName} was defeated after ${bossResult.phasesCleared} phases of intense battle!`,
        );
      } else {
        parts.push(
          `The party was unable to defeat ${bossResult.bossName}, clearing only ${bossResult.phasesCleared} of ${bossResult.phases} phases.`,
        );
      }
    }

    if (rareDiscovery) {
      parts.push(
        `A remarkable discovery was made: ${rareDiscovery.name} (${rareDiscovery.rarity}).`,
      );
    }

    if (parts.length === 0) {
      parts.push('The expedition concluded without notable incident.');
    }

    return parts.join(' ');
  }

  /**
   * Generate difficulty rating (1-5 stars) for a destination.
   */
  static getDifficultyRating(difficulty: number): number {
    if (difficulty <= 2) return 1;
    if (difficulty <= 4) return 2;
    if (difficulty <= 6) return 3;
    if (difficulty <= 8) return 4;
    return 5;
  }

  /**
   * Calculate expedition duration with scout speed bonus.
   */
  static calculateDuration(
    baseDuration: number,
    heroes: HeroData[],
    researchTravelSpeed: number,
  ): number {
    let speedMultiplier = 1.0;

    // T-0518: Scout heroes reduce duration
    const scoutCount = heroes.filter(h => h.role === 'scout').length;
    speedMultiplier -= scoutCount * 0.08;

    // Research travel speed bonus
    speedMultiplier -= researchTravelSpeed;

    speedMultiplier = Math.max(speedMultiplier, 0.5);

    return Math.max(1, Math.round(baseDuration * speedMultiplier));
  }

  /**
   * Generate scouting pre-check revealing partial encounter list.
   */
  static scoutDestination(
    destinationId: string,
    difficulty: number,
    expeditionType: string,
    scoutLevel: number,
  ): { revealedEncounters: string[]; estimatedDanger: string } {
    const applicable = getApplicableEncounters(difficulty, expeditionType);
    const revealCount = clamp(Math.floor(scoutLevel / 2), 1, 3);
    const shuffled = [...applicable].sort(() => Math.random() - 0.5);
    const revealed = shuffled.slice(0, revealCount).map(e => e.name);

    let danger = 'Low';
    if (difficulty >= 7) danger = 'Extreme';
    else if (difficulty >= 5) danger = 'High';
    else if (difficulty >= 3) danger = 'Moderate';

    return { revealedEncounters: revealed, estimatedDanger: danger };
  }

  /**
   * Get party composition recommendation for a destination.
   */
  static getRecommendation(
    destinationId: string,
    difficulty: number,
    expeditionType: string,
  ): { recommendedRoles: string[]; minimumPower: number; tips: string[] } {
    const tips: string[] = [];
    const roles: string[] = [];

    switch (expeditionType) {
      case 'hunt':
        roles.push('hunter', 'scout');
        tips.push('Hunters provide a significant bonus for hunting expeditions.');
        break;
      case 'explore':
        roles.push('scout', 'mystic', 'archivist');
        tips.push('Mystics and archivists excel in exploration.');
        break;
      case 'scavenge':
        roles.push('scout', 'blacksmith');
        tips.push('Scouts find more loot during scavenging runs.');
        break;
      case 'trade_caravan':
        roles.push('merchant', 'caravan_master');
        tips.push('Merchants and caravan masters ensure profitable trades.');
        break;
    }

    if (difficulty >= 6) {
      roles.push('defender');
      tips.push('High-difficulty destinations benefit from a defender in the party.');
    }

    const minimumPower = difficulty * 5;

    return { recommendedRoles: roles, minimumPower, tips };
  }
}
