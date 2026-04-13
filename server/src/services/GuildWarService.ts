import { prisma } from '../db';
import { GuildWarStatus, GuildWarObjective, ResourceType } from '../../../shared/src/enums';
import { GUILD_WAR_DURATION_HOURS, GUILD_WAR_MIN_WAGER } from '../../../shared/src/constants';
import type { GuildWar, GuildWarHistory } from '../../../shared/src/types';

// In-memory store for guild wars
const activeWars: Map<string, GuildWar> = new Map();
const warHistories: Map<string, GuildWarHistory[]> = new Map(); // guildId -> history

let warIdCounter = 1;
function genWarId(): string {
  return `war_${Date.now()}_${warIdCounter++}`;
}

export class GuildWarService {
  /**
   * Declare a guild war between two guilds.
   */
  static async declareWar(
    challengerGuildId: string,
    defenderGuildId: string,
    objective: GuildWarObjective,
    wager: Partial<Record<ResourceType, number>>,
    durationHours: number = GUILD_WAR_DURATION_HOURS,
  ): Promise<GuildWar> {
    // Validate guilds exist
    const challenger = await prisma.guild.findUnique({ where: { id: challengerGuildId } });
    const defender = await prisma.guild.findUnique({ where: { id: defenderGuildId } });
    if (!challenger || !defender) throw new Error('Guild not found');

    // Validate wager minimum
    const wagerGold = wager[ResourceType.Gold] ?? 0;
    if (wagerGold < GUILD_WAR_MIN_WAGER) {
      throw new Error(`Minimum wager is ${GUILD_WAR_MIN_WAGER} gold`);
    }

    // Check for existing active war between these guilds
    for (const war of activeWars.values()) {
      if (
        war.status === GuildWarStatus.Active &&
        ((war.challengerGuildId === challengerGuildId && war.defenderGuildId === defenderGuildId) ||
         (war.challengerGuildId === defenderGuildId && war.defenderGuildId === challengerGuildId))
      ) {
        throw new Error('Already at war with this guild');
      }
    }

    const war: GuildWar = {
      id: genWarId(),
      challengerGuildId,
      challengerGuildName: challenger.name,
      defenderGuildId,
      defenderGuildName: defender.name,
      objective,
      wager,
      challengerScore: 0,
      defenderScore: 0,
      status: GuildWarStatus.Active,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
      winnerId: null,
    };

    activeWars.set(war.id, war);
    return war;
  }

  /**
   * Get a specific guild war by ID.
   */
  static getWar(warId: string): GuildWar | null {
    return activeWars.get(warId) ?? null;
  }

  /**
   * Get all active wars for a guild.
   */
  static getActiveWars(guildId: string): GuildWar[] {
    const wars: GuildWar[] = [];
    for (const war of activeWars.values()) {
      if (
        war.status === GuildWarStatus.Active &&
        (war.challengerGuildId === guildId || war.defenderGuildId === guildId)
      ) {
        wars.push(war);
      }
    }
    return wars;
  }

  /**
   * Update war score from an action (expedition, trade, etc).
   */
  static addScore(warId: string, guildId: string, points: number): GuildWar | null {
    const war = activeWars.get(warId);
    if (!war || war.status !== GuildWarStatus.Active) return null;

    if (war.challengerGuildId === guildId) {
      war.challengerScore += points;
    } else if (war.defenderGuildId === guildId) {
      war.defenderScore += points;
    } else {
      return null;
    }

    return war;
  }

  /**
   * Resolve a war (manually or when time expires).
   */
  static resolveWar(warId: string): GuildWar | null {
    const war = activeWars.get(warId);
    if (!war || war.status !== GuildWarStatus.Active) return null;

    war.status = GuildWarStatus.Resolved;
    war.winnerId =
      war.challengerScore > war.defenderScore
        ? war.challengerGuildId
        : war.challengerScore < war.defenderScore
        ? war.defenderGuildId
        : null; // tie = no winner

    // Record history for both guilds
    for (const guildId of [war.challengerGuildId, war.defenderGuildId]) {
      const isChallenger = guildId === war.challengerGuildId;
      const entry: GuildWarHistory = {
        id: war.id,
        opponentName: isChallenger ? war.defenderGuildName : war.challengerGuildName,
        objective: war.objective,
        myScore: isChallenger ? war.challengerScore : war.defenderScore,
        opponentScore: isChallenger ? war.defenderScore : war.challengerScore,
        won: war.winnerId === guildId,
        wager: war.wager,
        resolvedAt: new Date().toISOString(),
      };

      const history = warHistories.get(guildId) ?? [];
      history.unshift(entry);
      warHistories.set(guildId, history);
    }

    return war;
  }

  /**
   * Check and resolve all expired wars.
   */
  static resolveExpiredWars(): GuildWar[] {
    const resolved: GuildWar[] = [];
    const now = Date.now();

    for (const war of activeWars.values()) {
      if (war.status === GuildWarStatus.Active && new Date(war.endsAt).getTime() <= now) {
        const result = GuildWarService.resolveWar(war.id);
        if (result) resolved.push(result);
      }
    }

    return resolved;
  }

  /**
   * Cancel a pending war (only challenger can cancel before start).
   */
  static cancelWar(warId: string, guildId: string): boolean {
    const war = activeWars.get(warId);
    if (!war) return false;
    if (war.challengerGuildId !== guildId) return false;
    if (war.status !== GuildWarStatus.Pending && war.status !== GuildWarStatus.Active) return false;

    // Only cancel if scores are both 0 (just started)
    if (war.challengerScore > 0 || war.defenderScore > 0) return false;

    war.status = GuildWarStatus.Cancelled;
    return true;
  }

  /**
   * Get war history for a guild.
   */
  static getWarHistory(guildId: string): GuildWarHistory[] {
    return warHistories.get(guildId) ?? [];
  }

  /**
   * Get war statistics for a guild.
   */
  static getWarStats(guildId: string): {
    totalWars: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  } {
    const history = warHistories.get(guildId) ?? [];
    const wins = history.filter((h) => h.won).length;
    const total = history.length;
    const draws = history.filter((h) => h.myScore === h.opponentScore).length;

    return {
      totalWars: total,
      wins,
      losses: total - wins - draws,
      draws,
      winRate: total > 0 ? wins / total : 0,
    };
  }

  /**
   * Calculate score points for a war objective action.
   */
  static calculateObjectivePoints(
    objective: GuildWarObjective,
    action: string,
    value: number,
  ): number {
    switch (objective) {
      case GuildWarObjective.MostExpeditions:
        return action === 'expedition_complete' ? 1 : 0;
      case GuildWarObjective.HighestTradeVolume:
        return action === 'trade_complete' ? value : 0;
      case GuildWarObjective.MostResources:
        return action === 'resource_earned' ? value : 0;
      case GuildWarObjective.MostXP:
        return action === 'xp_earned' ? value : 0;
      default:
        return 0;
    }
  }

  /**
   * Distribute war rewards to the winning guild.
   */
  static async distributeRewards(warId: string): Promise<{
    winnerId: string | null;
    rewards: Partial<Record<ResourceType, number>>;
  }> {
    const war = activeWars.get(warId);
    if (!war || war.status !== GuildWarStatus.Resolved || !war.winnerId) {
      return { winnerId: null, rewards: {} };
    }

    // Winner gets the wager amount (doubled)
    const rewards: Partial<Record<ResourceType, number>> = {};
    for (const [res, amt] of Object.entries(war.wager)) {
      rewards[res as ResourceType] = (amt ?? 0) * 2;
    }

    return { winnerId: war.winnerId, rewards };
  }
}
