import { prisma } from '../db.js';
import {
  BUILDING_DEFINITIONS,
  BUILDING_LEVEL_BONUS,
  MAX_OFFLINE_SECONDS,
} from '../../../shared/src/constants.js';
import { BuildingType, ResourceType } from '../../../shared/src/enums.js';
import { WeatherService } from './WeatherService.js';
import type { GameModifiers } from '../utils/weatherMapping.js';

export interface IdleGains {
  resources: Partial<Record<ResourceType, number>>;
  elapsedSeconds: number;
}

export class IdleProgressService {
  /**
   * Calculate and apply offline gains for a guild since lastTickAt.
   * Returns the gains that were applied.
   */
  static async calculateAndApply(playerId: string): Promise<IdleGains> {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return { resources: {}, elapsedSeconds: 0 };

    const guild = await prisma.guild.findUnique({
      where: { playerId },
      include: { buildings: true, heroes: true },
    });
    if (!guild) return { resources: {}, elapsedSeconds: 0 };

    const now = new Date();
    const elapsed = Math.floor((now.getTime() - player.lastTickAt.getTime()) / 1000);
    const cappedElapsed = Math.min(elapsed, MAX_OFFLINE_SECONDS);

    if (cappedElapsed < 1) return { resources: {}, elapsedSeconds: 0 };

    // Get world modifiers for the player's region
    let worldMods: GameModifiers | null = null;
    if (player.regionId) {
      const worldState = await WeatherService.getWorldState(player.regionId);
      if (worldState) {
        worldMods = worldState.modifiers;
      }
    }

    // Calculate production rates from buildings (with world modifiers)
    const rates = IdleProgressService.calculateRates(guild.buildings, guild.heroes, worldMods);

    // Calculate gains
    const gains: Partial<Record<ResourceType, number>> = {};
    for (const [resource, ratePerSec] of Object.entries(rates)) {
      if (ratePerSec > 0) {
        gains[resource as ResourceType] = ratePerSec * cappedElapsed;
      }
    }

    // Apply gains to guild resources
    const currentResources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    for (const [resource, amount] of Object.entries(gains)) {
      const resType = resource as ResourceType;
      currentResources[resType] = (currentResources[resType] || 0) + (amount || 0);
    }

    // Update guild resources and player tick time
    await prisma.guild.update({
      where: { id: guild.id },
      data: { resources: JSON.stringify(currentResources) },
    });
    await prisma.player.update({
      where: { id: playerId },
      data: { lastTickAt: now },
    });

    return { resources: gains, elapsedSeconds: cappedElapsed };
  }

  /**
   * Calculate per-second production rates based on buildings, heroes, and world modifiers.
   */
  static calculateRates(
    buildings: Array<{ type: string; level: number }>,
    heroes: Array<{ role: string; assignment: string | null; status: string; level: number }>,
    worldMods?: GameModifiers | null,
  ): Record<ResourceType, number> {
    const rates: Record<ResourceType, number> = {
      [ResourceType.Gold]: 0,
      [ResourceType.Wood]: 0,
      [ResourceType.Stone]: 0,
      [ResourceType.Herbs]: 0,
      [ResourceType.Ore]: 0,
      [ResourceType.Water]: 0,
      [ResourceType.Food]: 0,
      [ResourceType.Essence]: 0,
    };

    for (const building of buildings) {
      if (building.level < 1) continue;

      const def = BUILDING_DEFINITIONS[building.type as BuildingType];
      if (!def) continue;

      for (const [resource, baseOutput] of Object.entries(def.baseOutput)) {
        let output = (baseOutput as number) * (1 + building.level * BUILDING_LEVEL_BONUS);

        // Hero bonus
        let heroMultiplier = 1.0;
        const assignedHero = heroes.find(
          h => h.assignment === building.type && h.status === 'assigned'
        );
        if (assignedHero) {
          heroMultiplier = 1.3 + assignedHero.level * 0.05;
        }

        output *= heroMultiplier;

        // Apply world modifiers based on resource type
        if (worldMods) {
          const resType = resource as ResourceType;
          if (resType === ResourceType.Food || resType === ResourceType.Herbs) {
            output *= worldMods.cropGrowth;
          }
          if (resType === ResourceType.Essence) {
            output *= worldMods.essenceDrops;
          }
          if (resType === ResourceType.Gold) {
            output *= worldMods.marketConfidence;
          }
        }

        rates[resource as ResourceType] += output;
      }
    }

    return rates;
  }

  /**
   * Get current rates for a guild (for display purposes).
   */
  static async getRates(playerId: string): Promise<Record<ResourceType, number>> {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    const guild = await prisma.guild.findUnique({
      where: { playerId },
      include: { buildings: true, heroes: true },
    });
    if (!guild) {
      return Object.fromEntries(
        Object.values(ResourceType).map(r => [r, 0])
      ) as Record<ResourceType, number>;
    }

    let worldMods: GameModifiers | null = null;
    if (player?.regionId) {
      const worldState = await WeatherService.getWorldState(player.regionId);
      if (worldState) worldMods = worldState.modifiers;
    }

    return IdleProgressService.calculateRates(guild.buildings, guild.heroes, worldMods);
  }
}
