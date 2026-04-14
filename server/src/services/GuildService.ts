import { prisma } from '../db';
import { ResourceType, BuildingType } from '../../../shared/src/enums';
import {
  GUILD_BASE_XP,
  GUILD_XP_MULTIPLIER,
  GUILD_MAX_LEVEL,
  GUILD_LEVEL_REWARDS,
  GUILD_XP_REWARDS,
  BASE_BUILDING_SLOTS,
  STARTER_BUILDINGS,
  BUILDING_SYNERGIES,
  DAILY_LOGIN_REWARDS,
} from '../../../shared/src/constants';
import type { GuildEmblem, GuildStats, GuildActivityEntry } from '../../../shared/src/types';
import { CalendarService } from './CalendarService';

export interface LevelUpResult {
  newLevel: number;
  rewards: typeof GUILD_LEVEL_REWARDS[number] | null;
  resourcesGranted: Partial<Record<ResourceType, number>>;
}

export class GuildService {
  /**
   * Calculate XP required for a given level.
   */
  static xpForLevel(level: number): number {
    return Math.floor(GUILD_BASE_XP * Math.pow(GUILD_XP_MULTIPLIER, level - 1));
  }

  /**
   * Calculate total XP needed from current level to next level.
   */
  static xpToNextLevel(level: number): number {
    return GuildService.xpForLevel(level + 1);
  }

  /**
   * Add XP to a guild and handle level-ups. Returns level-up results if any.
   */
  static async addXP(guildId: string, amount: number): Promise<LevelUpResult[]> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return [];

    let currentXP = guild.xp + amount;
    let currentLevel = guild.level;
    const levelUps: LevelUpResult[] = [];

    // Process level-ups
    while (currentLevel < GUILD_MAX_LEVEL) {
      const needed = GuildService.xpToNextLevel(currentLevel);
      if (currentXP < needed) break;

      currentXP -= needed;
      currentLevel++;

      const rewards = GUILD_LEVEL_REWARDS[currentLevel] ?? null;
      const resourcesGranted: Partial<Record<ResourceType, number>> = {};

      // Apply resource rewards
      if (rewards?.resourceBonus) {
        const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
        for (const [res, amt] of Object.entries(rewards.resourceBonus)) {
          const resType = res as ResourceType;
          resources[resType] = (resources[resType] || 0) + (amt ?? 0);
          resourcesGranted[resType] = amt ?? 0;
        }
        await prisma.guild.update({
          where: { id: guildId },
          data: { resources: JSON.stringify(resources) },
        });
      }

      // Apply building slot rewards
      let newSlots = guild.buildingSlots;
      if (rewards?.buildingSlots) {
        newSlots += rewards.buildingSlots;
      }

      levelUps.push({ newLevel: currentLevel, rewards, resourcesGranted });

      await prisma.guild.update({
        where: { id: guildId },
        data: {
          level: currentLevel,
          xp: currentXP,
          buildingSlots: newSlots,
        },
      });

      // Log the activity
      await GuildService.logActivity(guildId, 'level_up', `Guild reached level ${currentLevel}!`);
    }

    // If no level-up, just save XP
    if (levelUps.length === 0) {
      await prisma.guild.update({
        where: { id: guildId },
        data: { xp: currentXP },
      });
    }

    return levelUps;
  }

  /**
   * Grant XP for a specific action type.
   */
  static async grantActionXP(
    guildId: string,
    action: keyof typeof GUILD_XP_REWARDS,
    multiplier: number = 1,
  ): Promise<LevelUpResult[]> {
    const baseXP = GUILD_XP_REWARDS[action];
    return GuildService.addXP(guildId, Math.floor(baseXP * multiplier));
  }

  /**
   * Get which buildings are unlocked at a given level.
   */
  static getUnlockedBuildings(level: number): BuildingType[] {
    const unlocked = new Set<BuildingType>(STARTER_BUILDINGS);
    for (let lvl = 2; lvl <= level; lvl++) {
      const rewards = GUILD_LEVEL_REWARDS[lvl];
      if (rewards?.unlockBuilding) {
        for (const b of rewards.unlockBuilding) {
          unlocked.add(b);
        }
      }
    }
    return Array.from(unlocked);
  }

  /**
   * Get which features are unlocked at a given level.
   */
  static getUnlockedFeatures(level: number): string[] {
    const features: string[] = [];
    for (let lvl = 2; lvl <= level; lvl++) {
      const rewards = GUILD_LEVEL_REWARDS[lvl];
      if (rewards?.unlockFeature) {
        features.push(rewards.unlockFeature);
      }
    }
    return features;
  }

  /**
   * Calculate total building slots for a given level.
   */
  static getBuildingSlotsForLevel(level: number): number {
    let slots = BASE_BUILDING_SLOTS;
    for (let lvl = 2; lvl <= level; lvl++) {
      const rewards = GUILD_LEVEL_REWARDS[lvl];
      if (rewards?.buildingSlots) {
        slots += rewards.buildingSlots;
      }
    }
    return slots;
  }

  /**
   * Update guild emblem.
   */
  static async setEmblem(guildId: string, emblem: GuildEmblem): Promise<void> {
    await prisma.guild.update({
      where: { id: guildId },
      data: { emblem: JSON.stringify(emblem) },
    });
  }

  /**
   * Update guild motto.
   */
  static async setMotto(guildId: string, motto: string): Promise<void> {
    const cleaned = motto.slice(0, 100).trim();
    await prisma.guild.update({
      where: { id: guildId },
      data: { motto: cleaned },
    });
  }

  /**
   * Get guild statistics.
   */
  static async getStats(guildId: string): Promise<GuildStats> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { buildings: true, heroes: true, expeditions: true },
    });
    if (!guild) {
      return {
        totalBuildingsConstructed: 0,
        totalExpeditionsCompleted: 0,
        totalResourcesEarned: 0,
        totalHeroesRecruited: 0,
        totalResearchCompleted: 0,
        totalMarketTrades: 0,
        guildAgeDays: 0,
        loginStreak: 0,
      };
    }

    const ageDays = Math.floor(
      (Date.now() - new Date(guild.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    const completedExpeditions = guild.expeditions.filter(e => e.status === 'resolved').length;
    const researchIds: string[] = JSON.parse(guild.researchIds || '[]');

    // Count activity log for market trades
    const marketTradeCount = await prisma.eventLog.count({
      where: { guildId, type: 'market_trade' },
    });

    // Rough total resources: sum of current resources
    const resources = JSON.parse(guild.resources) as Record<string, number>;
    const totalResources = Object.values(resources).reduce((sum, v) => sum + Math.floor(v), 0);

    return {
      totalBuildingsConstructed: guild.buildings.length,
      totalExpeditionsCompleted: completedExpeditions,
      totalResourcesEarned: totalResources,
      totalHeroesRecruited: guild.heroes.length,
      totalResearchCompleted: researchIds.length,
      totalMarketTrades: marketTradeCount,
      guildAgeDays: ageDays,
      loginStreak: guild.loginStreak,
    };
  }

  /**
   * Get recent activity entries from the event log.
   */
  static async getActivityFeed(guildId: string, limit: number = 20): Promise<GuildActivityEntry[]> {
    const logs = await prisma.eventLog.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map(log => ({
      id: log.id,
      type: log.type,
      message: log.message,
      timestamp: log.createdAt.toISOString(),
      data: log.data ? JSON.parse(log.data) : undefined,
    }));
  }

  /**
   * Log a guild activity.
   */
  static async logActivity(
    guildId: string,
    type: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await prisma.eventLog.create({
      data: {
        guildId,
        type,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });
  }

  /**
   * Claim daily login reward. Returns null if already claimed today.
   */
  static async claimDailyReward(guildId: string): Promise<{
    day: number;
    resources: Partial<Record<ResourceType, number>>;
    xp: number;
    label: string;
    streak: number;
  } | null> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return null;

    const today = new Date().toISOString().slice(0, 10);
    if (guild.lastDailyReward === today) return null; // Already claimed

    // Check if streak continues (yesterday or fresh start)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let streak = guild.loginStreak;
    if (guild.lastDailyReward === yesterday) {
      streak++;
    } else {
      streak = 1;
    }

    // Get reward for current day in cycle
    const dayInCycle = ((streak - 1) % 7) + 1;
    const reward = DAILY_LOGIN_REWARDS.find(r => r.day === dayInCycle);
    if (!reward) return null;

    // Apply resources
    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    for (const [res, amt] of Object.entries(reward.resources)) {
      const resType = res as ResourceType;
      resources[resType] = (resources[resType] || 0) + (amt ?? 0);
    }

    await prisma.guild.update({
      where: { id: guildId },
      data: {
        resources: JSON.stringify(resources),
        lastDailyReward: today,
        loginStreak: streak,
      },
    });

    // Grant XP
    if (reward.xp > 0) {
      await GuildService.addXP(guildId, reward.xp);
    }

    await GuildService.logActivity(guildId, 'daily_reward', `Claimed daily reward: ${reward.label}`);

    return { ...reward, streak };
  }

  /**
   * Get building synergy bonuses for a guild's current buildings.
   */
  static getBuildingSynergies(
    buildings: Array<{ type: string; level: number }>,
  ): Array<{ buildingA: string; buildingB: string; bonusPercent: number; description: string }> {
    const activeSynergies: Array<{
      buildingA: string;
      buildingB: string;
      bonusPercent: number;
      description: string;
    }> = [];

    const buildingTypes = new Set(buildings.filter(b => b.level > 0).map(b => b.type));

    for (const synergy of BUILDING_SYNERGIES) {
      if (buildingTypes.has(synergy.buildingA) && buildingTypes.has(synergy.buildingB)) {
        activeSynergies.push({
          buildingA: synergy.buildingA,
          buildingB: synergy.buildingB,
          bonusPercent: synergy.bonusPercent,
          description: synergy.description,
        });
      }
    }

    return activeSynergies;
  }

  /**
   * Get seasonal decoration type based on current season.
   */
  static getSeasonalDecoration(regionId: string): {
    season: string;
    decoration: string;
    description: string;
  } {
    const season = CalendarService.getCurrentSeason(regionId);
    const decorations: Record<string, { decoration: string; description: string }> = {
      spring: { decoration: 'flowers', description: 'Cherry blossoms and wildflowers adorn the guild hall' },
      summer: { decoration: 'banners', description: 'Vibrant sun banners flutter in the warm breeze' },
      autumn: { decoration: 'harvest', description: 'Golden leaves and harvest decorations fill the hall' },
      winter: { decoration: 'snow', description: 'Frost and twinkling lights cover every surface' },
    };

    const deco = decorations[season] ?? decorations.spring;
    return { season, ...deco };
  }
}
