import { prisma } from '../db';
import { LeaderboardCategory } from '../../../shared/src/enums';
import { LEADERBOARD_WEEKLY_REWARDS } from '../../../shared/src/constants';
import type {
  Leaderboard,
  LeaderboardEntry,
  LeaderboardReward,
} from '../../../shared/src/types';
import { ResourceType } from '../../../shared/src/enums';

// In-memory leaderboard cache
const leaderboardCache: Map<string, Leaderboard> = new Map();
const previousRanks: Map<string, Map<string, number>> = new Map(); // category -> playerId -> rank

export class LeaderboardService {
  /**
   * Refresh a leaderboard category by querying all guilds.
   */
  static async refreshLeaderboard(
    category: LeaderboardCategory,
    period: 'weekly' | 'alltime' = 'alltime',
  ): Promise<Leaderboard> {
    const guilds = await prisma.guild.findMany({
      include: { heroes: true, player: true },
    });

    const entries: LeaderboardEntry[] = guilds.map((guild) => {
      let score = 0;

      switch (category) {
        case LeaderboardCategory.GuildLevel:
          score = guild.level * 1000 + guild.xp;
          break;
        case LeaderboardCategory.Wealth: {
          const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
          score = Object.values(resources).reduce((sum, v) => sum + v, 0);
          break;
        }
        case LeaderboardCategory.ExpeditionCount:
          // Would come from expedition stats in production
          score = Math.floor(Math.random() * 100);
          break;
        case LeaderboardCategory.TradeVolume:
          score = Math.floor(Math.random() * 50);
          break;
        case LeaderboardCategory.HeroPower:
          score = guild.heroes.reduce((sum: number, h: any) => sum + h.level * 10, 0);
          break;
        case LeaderboardCategory.AllianceRank:
          score = guild.level;
          break;
      }

      const prevRanks = previousRanks.get(category);
      const previousRank = prevRanks?.get(guild.playerId) ?? null;

      return {
        rank: 0,
        playerId: guild.playerId,
        username: (guild as any).player?.username ?? 'Unknown',
        guildName: guild.name,
        score,
        previousRank,
      };
    });

    // Sort by score descending
    entries.sort((a, b) => b.score - a.score);

    // Assign ranks
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    // Store current ranks for next refresh comparison
    const rankMap = new Map<string, number>();
    for (const entry of entries) {
      rankMap.set(entry.playerId, entry.rank);
    }
    previousRanks.set(category, rankMap);

    const leaderboard: Leaderboard = {
      category,
      period,
      entries: entries.slice(0, 100),
      updatedAt: new Date().toISOString(),
      playerRank: null,
    };

    const key = `${category}_${period}`;
    leaderboardCache.set(key, leaderboard);
    return leaderboard;
  }

  /**
   * Get a leaderboard, refreshing if stale.
   */
  static async getLeaderboard(
    category: LeaderboardCategory,
    period: 'weekly' | 'alltime' = 'alltime',
    playerId?: string,
  ): Promise<Leaderboard> {
    const key = `${category}_${period}`;
    let leaderboard = leaderboardCache.get(key);

    if (!leaderboard || LeaderboardService.isStale(leaderboard)) {
      leaderboard = await LeaderboardService.refreshLeaderboard(category, period);
    }

    // Add player's rank
    if (playerId) {
      const playerEntry = leaderboard.entries.find((e) => e.playerId === playerId);
      leaderboard = { ...leaderboard, playerRank: playerEntry ?? null };
    }

    return leaderboard;
  }

  /**
   * Get all leaderboard categories for a player.
   */
  static async getAllLeaderboards(playerId: string): Promise<Leaderboard[]> {
    const categories = Object.values(LeaderboardCategory);
    const boards: Leaderboard[] = [];
    for (const cat of categories) {
      const board = await LeaderboardService.getLeaderboard(cat, 'alltime', playerId);
      boards.push(board);
    }
    return boards;
  }

  /**
   * Get player's rank in a specific category.
   */
  static async getPlayerRank(
    category: LeaderboardCategory,
    playerId: string,
  ): Promise<LeaderboardEntry | null> {
    const board = await LeaderboardService.getLeaderboard(category, 'alltime', playerId);
    return board.playerRank;
  }

  /**
   * Search leaderboard by player name.
   */
  static async searchLeaderboard(
    category: LeaderboardCategory,
    query: string,
  ): Promise<LeaderboardEntry[]> {
    const board = await LeaderboardService.getLeaderboard(category);
    return board.entries.filter((e) =>
      e.username.toLowerCase().includes(query.toLowerCase()) ||
      e.guildName.toLowerCase().includes(query.toLowerCase()),
    );
  }

  /**
   * Process weekly leaderboard reset and distribute rewards.
   */
  static async processWeeklyReset(
    category: LeaderboardCategory,
  ): Promise<Array<{ playerId: string; rank: number; rewards: Partial<Record<ResourceType, number>> }>> {
    const board = await LeaderboardService.getLeaderboard(category, 'weekly');
    const rewardResults: Array<{
      playerId: string;
      rank: number;
      rewards: Partial<Record<ResourceType, number>>;
    }> = [];

    for (const entry of board.entries) {
      const rewardTier = LEADERBOARD_WEEKLY_REWARDS.find(
        (r) => entry.rank >= r.minRank && entry.rank <= r.maxRank,
      );
      if (rewardTier) {
        rewardResults.push({
          playerId: entry.playerId,
          rank: entry.rank,
          rewards: rewardTier.resources,
        });
      }
    }

    return rewardResults;
  }

  /**
   * Get rank change notifications for a player.
   */
  static getRankChanges(playerId: string): Array<{
    category: LeaderboardCategory;
    oldRank: number;
    newRank: number;
  }> {
    const changes: Array<{
      category: LeaderboardCategory;
      oldRank: number;
      newRank: number;
    }> = [];

    for (const category of Object.values(LeaderboardCategory)) {
      const key = `${category}_alltime`;
      const board = leaderboardCache.get(key);
      if (!board) continue;

      const entry = board.entries.find((e) => e.playerId === playerId);
      if (entry && entry.previousRank !== null && entry.previousRank !== entry.rank) {
        changes.push({
          category,
          oldRank: entry.previousRank,
          newRank: entry.rank,
        });
      }
    }

    return changes;
  }

  private static isStale(board: Leaderboard): boolean {
    const age = Date.now() - new Date(board.updatedAt).getTime();
    return age > 5 * 60 * 1000; // 5 minutes
  }
}
