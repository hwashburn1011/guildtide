import { prisma } from '../db';
import {
  BUILDING_DEFINITIONS,
  BUILDING_LEVEL_BONUS,
  MAX_OFFLINE_SECONDS,
  MAX_PRODUCTION_PER_SECOND,
} from '../../../shared/src/constants';
import { BuildingType, ResourceType } from '../../../shared/src/enums';
import { WeatherService } from './WeatherService';
import type { GameModifiers } from '../utils/weatherMapping';
import { RESEARCH_MAP } from '../data/researchData';
import { getItemTemplate } from '../data/itemTemplates';
import { ResourceService } from './ResourceService';

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

    // Load completed research IDs
    const researchIds: string[] = JSON.parse(guild.researchIds || '[]');

    // Calculate production rates from buildings (with world modifiers + research + items)
    const rates = IdleProgressService.calculateRates(guild.buildings, guild.heroes, worldMods, researchIds);

    // Calculate gains
    const gains: Partial<Record<ResourceType, number>> = {};
    for (const [resource, ratePerSec] of Object.entries(rates)) {
      if (ratePerSec > 0) {
        gains[resource as ResourceType] = ratePerSec * cappedElapsed;
      }
    }

    // Clamp rates to prevent exploit
    const clampedRates = ResourceService.clampRates(rates);
    // Recalculate gains with clamped rates
    for (const [resource, ratePerSec] of Object.entries(clampedRates)) {
      if (ratePerSec > 0) {
        gains[resource as ResourceType] = ratePerSec * cappedElapsed;
      }
    }

    // Apply gains to guild resources, enforcing storage caps
    const currentResources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    const caps = ResourceService.calculateCaps(guild.buildings);
    for (const [resource, amount] of Object.entries(gains)) {
      const resType = resource as ResourceType;
      const current = currentResources[resType] || 0;
      const cap = caps[resType];
      currentResources[resType] = Math.min(current + (amount || 0), cap);
    }

    // Apply resource decay for perishable resources
    const elapsedHours = cappedElapsed / 3600;
    if (elapsedHours > 0) {
      const decayRates = ResourceService.getEffectiveDecayRates(guild.buildings);
      for (const [resType, decayRate] of Object.entries(decayRates)) {
        const resource = resType as ResourceType;
        const current = currentResources[resource] || 0;
        if (current > 0 && decayRate) {
          const decayAmount = current * decayRate * elapsedHours;
          currentResources[resource] = Math.max(0, current - decayAmount);
        }
      }
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
   * Calculate per-second production rates based on buildings, heroes, world modifiers,
   * completed research, and equipped items.
   */
  static calculateRates(
    buildings: Array<{ type: string; level: number }>,
    heroes: Array<{ role: string; assignment: string | null; status: string; level: number; equipment?: string }>,
    worldMods?: GameModifiers | null,
    researchIds?: string[],
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

    // Aggregate research bonuses
    const completedResearch = researchIds ?? [];
    let cropBonus = 0;
    let herbBonus = 0;
    let allCropBonus = 0;
    let huntBonus = 0;
    let farmOutputMultiplier = 0;

    for (const resId of completedResearch) {
      const node = RESEARCH_MAP.get(resId);
      if (!node) continue;
      cropBonus += node.effects['crop_bonus'] ?? 0;
      herbBonus += node.effects['herb_bonus'] ?? 0;
      allCropBonus += node.effects['all_crop_bonus'] ?? 0;
      huntBonus += node.effects['hunt_bonus'] ?? 0;
      farmOutputMultiplier += node.effects['farm_output_multiplier'] ?? 0;
    }

    for (const building of buildings) {
      if (building.level < 1) continue;

      const def = BUILDING_DEFINITIONS[building.type as BuildingType];
      if (!def) continue;

      for (const [resource, baseOutput] of Object.entries(def.baseOutput)) {
        let output = (baseOutput as number) * (1 + building.level * BUILDING_LEVEL_BONUS);
        const resType = resource as ResourceType;

        // Hero bonus + item effects
        let heroMultiplier = 1.0;
        let itemBuildingBonus = 0;
        let itemResourceBonus = 0;
        const assignedHero = heroes.find(
          h => h.assignment === building.type && h.status === 'assigned'
        );
        if (assignedHero) {
          heroMultiplier = 1.3 + assignedHero.level * 0.05;

          // Check equipped items for building and resource bonuses
          const equipment = IdleProgressService.parseEquipment(assignedHero.equipment);
          for (const templateId of Object.values(equipment)) {
            if (!templateId) continue;
            const template = getItemTemplate(templateId);
            if (!template) continue;
            if (template.effects.buildingBonus) {
              itemBuildingBonus += template.effects.buildingBonus;
            }
            if (template.effects.resourceBonuses?.[resType]) {
              itemResourceBonus += template.effects.resourceBonuses[resType]!;
            }
          }
        }

        output *= heroMultiplier;

        // Apply item building bonus (e.g. 0.1 = +10%)
        if (itemBuildingBonus > 0) {
          output *= 1 + itemBuildingBonus;
        }

        // Apply item resource bonus for this specific resource
        if (itemResourceBonus > 0) {
          output *= 1 + itemResourceBonus;
        }

        // Apply research bonuses based on resource type
        if (resType === ResourceType.Food) {
          output *= 1 + cropBonus + allCropBonus + farmOutputMultiplier;
        } else if (resType === ResourceType.Herbs) {
          output *= 1 + cropBonus + herbBonus + allCropBonus;
        }

        // Hunt bonus applies to Food from hunting-type buildings (all Food gets a share)
        if (resType === ResourceType.Food && huntBonus > 0) {
          output *= 1 + huntBonus;
        }

        // Apply world modifiers based on resource type
        if (worldMods) {
          if (resType === ResourceType.Food || resType === ResourceType.Herbs) {
            output *= worldMods.cropGrowth;
          }
          if (resType === ResourceType.Essence) {
            output *= worldMods.essenceDrops;
          }
          if (resType === ResourceType.Gold) {
            output *= worldMods.marketConfidence;
          }
          // Apply alchemy output to Herbs/Essence production
          if (resType === ResourceType.Herbs || resType === ResourceType.Essence) {
            output *= worldMods.alchemyOutput;
          }
          // Apply morale as a small global multiplier: morale * 0.1 + 0.9
          // This dampens the effect: morale=1.0 -> 1.0, morale=0.85 -> 0.985, morale=1.1 -> 1.01
          output *= worldMods.morale * 0.1 + 0.9;
        }

        rates[resType] += output;
      }
    }

    return rates;
  }

  /** Parse hero equipment JSON safely. */
  private static parseEquipment(equipment?: string): Record<string, string | null> {
    if (!equipment) return {};
    try {
      return JSON.parse(equipment) as Record<string, string | null>;
    } catch {
      return {};
    }
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

    const researchIds: string[] = JSON.parse(guild.researchIds || '[]');

    return IdleProgressService.calculateRates(guild.buildings, guild.heroes, worldMods, researchIds);
  }
}
