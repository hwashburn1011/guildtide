/**
 * PvP Arena system — async guild war battle resolution.
 *
 * T-1303: Enemy bestiary unlocked by defeating each enemy type
 * T-1304: Bestiary UI with enemy stats, lore, and drop tables (data support)
 * T-1307: Auto-battle toggle for repeated encounters
 *
 * Arena-specific tasks:
 * - PvP combat: async guild war battle resolution
 * - Arena system: challenge other players' defense teams
 * - Combat achievements and statistics
 */

import { prisma } from '../db';
import { CombatService, type CombatHero, type CombatResult, type CombatRow } from './CombatService';
import { HeroRole } from '../../../shared/src/enums';
import type { HeroStats } from '../../../shared/src/types';

// ── Arena Match Types ──

export interface ArenaDefenseTeam {
  guildId: string;
  guildName: string;
  heroes: ArenaHeroSnapshot[];
  rating: number;
  wins: number;
  losses: number;
}

export interface ArenaHeroSnapshot {
  id: string;
  name: string;
  role: HeroRole;
  level: number;
  stats: HeroStats;
  equipment: { weapon: string | null; armor: string | null; charm: string | null; tool: string | null };
  row: CombatRow;
}

export interface ArenaMatchResult {
  id: string;
  attackerGuildId: string;
  attackerGuildName: string;
  defenderGuildId: string;
  defenderGuildName: string;
  combatResult: CombatResult;
  ratingChange: number;
  timestamp: string;
}

export interface ArenaLeaderboardEntry {
  guildId: string;
  guildName: string;
  rating: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface BestiaryEntry {
  enemyId: string;
  enemyName: string;
  description: string;
  timesDefeated: number;
  firstDefeatedAt: string;
  weaknesses: string[];
  resistances: string[];
  lootTable: { resource: string; min: number; max: number; chance: number }[];
  region: string;
  tier: number;
}

// ── In-Memory Store ──

const defenseTeams: Map<string, ArenaDefenseTeam> = new Map();
const matchHistory: Map<string, ArenaMatchResult[]> = new Map(); // guildId -> history
const bestiaryData: Map<string, Map<string, BestiaryEntry>> = new Map(); // guildId -> enemyId -> entry
const combatStats: Map<string, Record<string, number>> = new Map(); // guildId -> stats
const autoBattleFlags: Map<string, boolean> = new Map(); // guildId -> enabled

let arenaMatchCounter = 1;

export class ArenaService {

  // ── Defense Team Management ──

  static setDefenseTeam(
    guildId: string,
    guildName: string,
    heroes: ArenaHeroSnapshot[],
  ): ArenaDefenseTeam {
    const existing = defenseTeams.get(guildId);
    const team: ArenaDefenseTeam = {
      guildId,
      guildName,
      heroes,
      rating: existing?.rating ?? 1000,
      wins: existing?.wins ?? 0,
      losses: existing?.losses ?? 0,
    };
    defenseTeams.set(guildId, team);
    return team;
  }

  static getDefenseTeam(guildId: string): ArenaDefenseTeam | undefined {
    return defenseTeams.get(guildId);
  }

  // ── Matchmaking ──

  static findOpponents(guildId: string, count: number = 5): ArenaDefenseTeam[] {
    const myTeam = defenseTeams.get(guildId);
    const myRating = myTeam?.rating ?? 1000;
    const candidates: ArenaDefenseTeam[] = [];

    for (const [id, team] of defenseTeams) {
      if (id === guildId) continue;
      if (Math.abs(team.rating - myRating) <= 300) {
        candidates.push(team);
      }
    }

    // Sort by closest rating
    candidates.sort((a, b) => Math.abs(a.rating - myRating) - Math.abs(b.rating - myRating));
    return candidates.slice(0, count);
  }

  // ── Arena Battle ──

  static async fight(
    attackerGuildId: string,
    defenderGuildId: string,
    attackerHeroes: Array<{
      id: string;
      name: string;
      role: HeroRole;
      level: number;
      stats: HeroStats;
      equipment: { weapon: string | null; armor: string | null; charm: string | null; tool: string | null };
      morale?: number;
    }>,
  ): Promise<ArenaMatchResult> {
    const defender = defenseTeams.get(defenderGuildId);
    if (!defender) throw new Error('Defender has no defense team set');

    const attacker = defenseTeams.get(attackerGuildId);

    // Build combat heroes
    const attackHeroes = attackerHeroes.map((h, i) =>
      CombatService.buildCombatHero(h, i < Math.ceil(attackerHeroes.length / 2) ? 'front' : 'back'),
    );

    // Build defender heroes as enemies (simulated)
    const defenderCombatHeroes = defender.heroes.map((h, i) =>
      CombatService.buildCombatHero(
        { ...h, morale: 75 },
        h.row,
      ),
    );

    // Resolve as hero vs hero — treat defenders as "enemies" in the combat engine
    // We simulate by converting defender heroes to CombatEnemy-like structure
    const combatResult = CombatService.resolveCombat(attackHeroes, [], {
      maxRounds: 20,
    });

    // Since the engine expects CombatEnemy, we run a simplified PvP resolution
    const pvpResult = this.resolvePvP(attackHeroes, defenderCombatHeroes);

    // Rating changes (Elo-like)
    const expectedScore = 1 / (1 + Math.pow(10, ((defender.rating) - (attacker?.rating ?? 1000)) / 400));
    const actualScore = pvpResult.outcome === 'victory' ? 1 : 0;
    const ratingChange = Math.round(32 * (actualScore - expectedScore));

    // Update ratings
    if (attacker) {
      attacker.rating += ratingChange;
      if (pvpResult.outcome === 'victory') attacker.wins++;
      else attacker.losses++;
    }
    defender.rating -= ratingChange;
    if (pvpResult.outcome === 'victory') defender.losses++;
    else defender.wins++;

    const attackerGuild = await prisma.guild.findUnique({ where: { id: attackerGuildId } });
    const matchResult: ArenaMatchResult = {
      id: `arena_${Date.now()}_${arenaMatchCounter++}`,
      attackerGuildId,
      attackerGuildName: attackerGuild?.name ?? 'Unknown',
      defenderGuildId,
      defenderGuildName: defender.guildName,
      combatResult: pvpResult,
      ratingChange,
      timestamp: new Date().toISOString(),
    };

    // Store history
    const attackerHistory = matchHistory.get(attackerGuildId) ?? [];
    attackerHistory.push(matchResult);
    matchHistory.set(attackerGuildId, attackerHistory.slice(-50));

    const defenderHistory = matchHistory.get(defenderGuildId) ?? [];
    defenderHistory.push(matchResult);
    matchHistory.set(defenderGuildId, defenderHistory.slice(-50));

    return matchResult;
  }

  // Simplified PvP resolution (hero vs hero)
  private static resolvePvP(
    attackers: CombatHero[],
    defenders: CombatHero[],
  ): CombatResult {
    // Convert defenders to enemy-like combatants and use a simple round system
    const maxRounds = 20;
    const rounds: any[] = [];
    let round = 0;

    while (round < maxRounds) {
      round++;
      const entries: any[] = [];

      // All combatants sorted by speed
      const all = [
        ...attackers.filter(h => h.alive).map(h => ({ side: 'attacker' as const, hero: h })),
        ...defenders.filter(h => h.alive).map(h => ({ side: 'defender' as const, hero: h })),
      ].sort((a, b) => b.hero.speed - a.hero.speed);

      for (const { side, hero } of all) {
        if (!hero.alive) continue;
        const targets = side === 'attacker'
          ? defenders.filter(h => h.alive)
          : attackers.filter(h => h.alive);
        if (targets.length === 0) break;

        const target = targets[Math.floor(Math.random() * targets.length)];
        const damage = Math.max(1, Math.round((hero.attack * 1.5) - target.defense * 0.5 + Math.random() * 5));
        const isCrit = Math.random() * 100 < hero.critChance;
        const finalDamage = isCrit ? Math.round(damage * 1.8) : damage;

        target.currentHp = Math.max(0, target.currentHp - finalDamage);
        if (target.currentHp <= 0) target.alive = false;

        entries.push({
          round, actorName: hero.name, actorSide: side === 'attacker' ? 'hero' : 'enemy',
          action: 'attack', abilityName: 'Attack', targetName: target.name,
          damage: finalDamage, healing: 0, isCritical: isCrit, isDodged: false,
          narrative: `${hero.name} attacks ${target.name} for ${finalDamage} damage${isCrit ? ' (CRITICAL!)' : ''}`,
        });
      }

      rounds.push({ roundNumber: round, entries, heroHpSnapshot: {}, enemyHpSnapshot: {} });

      if (!attackers.some(h => h.alive) || !defenders.some(h => h.alive)) break;
    }

    const outcome = attackers.some(h => h.alive) ? 'victory' as const : 'defeat' as const;

    return {
      id: `pvp_${Date.now()}`,
      outcome,
      rounds,
      totalRounds: round,
      heroes: attackers,
      enemies: [],
      rewards: { xp: outcome === 'victory' ? 50 : 10, gold: outcome === 'victory' ? 100 : 20, loot: [], items: [] },
      statistics: {
        totalDamageDealt: 0, totalDamageTaken: 0, totalHealing: 0,
        criticalHits: 0, dodges: 0, abilitiesUsed: 0, turnsPlayed: round,
        enemiesDefeated: 0, heroesKnockedOut: 0, statusEffectsApplied: 0,
        comboChains: 0, ultimatesUsed: 0, perHero: {},
      },
      synergiesActive: [],
      difficulty: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Match History ──

  static getMatchHistory(guildId: string, limit: number = 20): ArenaMatchResult[] {
    return (matchHistory.get(guildId) ?? []).slice(-limit);
  }

  // ── Leaderboard ──

  static getLeaderboard(limit: number = 20): ArenaLeaderboardEntry[] {
    const entries: ArenaLeaderboardEntry[] = [];
    for (const [guildId, team] of defenseTeams) {
      const totalGames = team.wins + team.losses;
      entries.push({
        guildId,
        guildName: team.guildName,
        rating: team.rating,
        wins: team.wins,
        losses: team.losses,
        winRate: totalGames > 0 ? Math.round((team.wins / totalGames) * 100) : 0,
      });
    }
    entries.sort((a, b) => b.rating - a.rating);
    return entries.slice(0, limit);
  }

  // ── T-1303: Bestiary ──

  static recordEnemyDefeated(guildId: string, enemyId: string, enemyDef: {
    name: string; description: string; weaknesses: string[];
    resistances: string[]; loot: { resource: string; min: number; max: number; chance: number }[];
    region: string; tier: number;
  }): void {
    if (!bestiaryData.has(guildId)) {
      bestiaryData.set(guildId, new Map());
    }
    const guild = bestiaryData.get(guildId)!;
    const existing = guild.get(enemyId);
    if (existing) {
      existing.timesDefeated++;
    } else {
      guild.set(enemyId, {
        enemyId,
        enemyName: enemyDef.name,
        description: enemyDef.description,
        timesDefeated: 1,
        firstDefeatedAt: new Date().toISOString(),
        weaknesses: enemyDef.weaknesses,
        resistances: enemyDef.resistances,
        lootTable: enemyDef.loot,
        region: enemyDef.region,
        tier: enemyDef.tier,
      });
    }
  }

  // T-1304: Get bestiary
  static getBestiary(guildId: string): BestiaryEntry[] {
    const guild = bestiaryData.get(guildId);
    if (!guild) return [];
    return Array.from(guild.values()).sort((a, b) => a.tier - b.tier);
  }

  // ── T-1302: Combat Stats ──

  static getCombatStats(guildId: string): Record<string, number> {
    return combatStats.get(guildId) ?? {
      totalBattles: 0, totalWins: 0, totalLosses: 0,
      totalDamageDealt: 0, totalDamageTaken: 0, totalHealing: 0,
      totalKills: 0, totalCrits: 0, totalDodges: 0, bossKills: 0,
    };
  }

  static updateCombatStats(guildId: string, result: CombatResult): void {
    const existing = this.getCombatStats(guildId);
    combatStats.set(guildId, CombatService.aggregateStatistics(existing, result));
  }

  // ── T-1307: Auto-battle Toggle ──

  static setAutoBattle(guildId: string, enabled: boolean): void {
    autoBattleFlags.set(guildId, enabled);
  }

  static isAutoBattleEnabled(guildId: string): boolean {
    return autoBattleFlags.get(guildId) ?? false;
  }
}
