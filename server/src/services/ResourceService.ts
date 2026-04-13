import { prisma } from '../db';
import { ResourceType, BuildingType } from '../../../shared/src/enums';
import {
  DEFAULT_STORAGE_CAPS,
  STORAGE_CAP_PER_BUILDING_LEVEL,
  RESOURCE_DECAY_RATES,
  COLD_STORAGE_DECAY_REDUCTION_PER_LEVEL,
  CONVERSION_RECIPES,
  RESOURCE_MILESTONES,
  SEASONAL_RESOURCE_BONUSES,
  MAX_PRODUCTION_PER_SECOND,
  BUILDING_DEFINITIONS,
  BUILDING_LEVEL_BONUS,
} from '../../../shared/src/constants';
import type {
  ResourceState,
  ResourceMultipliers,
  ResourceBreakdown,
  ResourceSnapshot,
  ResourceForecast,
  ResourceAuditEntry,
  ConversionRecipe,
} from '../../../shared/src/types';
import { IdleProgressService } from './IdleProgressService';
import { WeatherService } from './WeatherService';
import { CalendarService } from './CalendarService';
import { GuildService } from './GuildService';

export class ResourceService {
  /**
   * Add resources to a guild, enforcing storage caps.
   * Returns the actual amount added (may be less if capped).
   */
  static async add(
    guildId: string,
    resource: ResourceType,
    amount: number,
    action: string = 'add',
    details: string = '',
  ): Promise<{ added: number; capped: boolean; overflow: number }> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { buildings: true },
    });
    if (!guild) throw new Error('Guild not found');

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    const caps = ResourceService.calculateCaps(guild.buildings);
    const cap = caps[resource];
    const current = resources[resource] || 0;
    const available = Math.max(0, cap - current);
    const added = Math.min(amount, available);
    const overflow = amount - added;

    resources[resource] = current + added;

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    // Audit log
    await ResourceService.logAudit(guildId, resource, added, resources[resource], action, details);

    // Check milestones
    await ResourceService.checkMilestones(guildId, resource, resources[resource]);

    return { added, capped: overflow > 0, overflow };
  }

  /**
   * Subtract resources from a guild, validating sufficiency.
   * Returns false if insufficient resources.
   */
  static async subtract(
    guildId: string,
    resource: ResourceType,
    amount: number,
    action: string = 'subtract',
    details: string = '',
  ): Promise<{ success: boolean; remaining: number }> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    const current = resources[resource] || 0;

    if (current < amount) {
      return { success: false, remaining: current };
    }

    resources[resource] = current - amount;

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    await ResourceService.logAudit(guildId, resource, -amount, resources[resource], action, details);

    return { success: true, remaining: resources[resource] };
  }

  /**
   * Get full resource balance with caps.
   */
  static async getBalance(guildId: string): Promise<{
    current: Record<ResourceType, number>;
    caps: Record<ResourceType, number>;
  }> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { buildings: true },
    });
    if (!guild) throw new Error('Guild not found');

    const current = JSON.parse(guild.resources) as Record<ResourceType, number>;
    const caps = ResourceService.calculateCaps(guild.buildings);

    return { current, caps };
  }

  /**
   * Calculate storage caps based on buildings.
   */
  static calculateCaps(
    buildings: Array<{ type: string; level: number }>,
  ): Record<ResourceType, number> {
    const caps = { ...DEFAULT_STORAGE_CAPS };

    // Each building that produces a resource increases that resource's cap
    for (const building of buildings) {
      if (building.level < 1) continue;
      const def = BUILDING_DEFINITIONS[building.type as BuildingType];
      if (!def) continue;

      for (const resource of Object.keys(def.baseOutput)) {
        const resType = resource as ResourceType;
        caps[resType] = Math.floor(
          caps[resType] * (1 + building.level * STORAGE_CAP_PER_BUILDING_LEVEL),
        );
      }
    }

    return caps;
  }

  /**
   * Apply resource decay for perishable resources.
   * Call this periodically or on collect.
   */
  static async applyDecay(
    guildId: string,
    elapsedHours: number,
  ): Promise<Partial<Record<ResourceType, number>>> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { buildings: true },
    });
    if (!guild) return {};

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    const decayed: Partial<Record<ResourceType, number>> = {};

    // Get cold storage reduction from Workshop
    const workshop = guild.buildings.find(b => b.type === BuildingType.Workshop);
    const coldStorageReduction = workshop
      ? workshop.level * COLD_STORAGE_DECAY_REDUCTION_PER_LEVEL
      : 0;

    for (const [resType, decayRate] of Object.entries(RESOURCE_DECAY_RATES)) {
      const resource = resType as ResourceType;
      const current = resources[resource] || 0;
      if (current <= 0 || !decayRate) continue;

      const effectiveRate = Math.max(0, decayRate - coldStorageReduction);
      if (effectiveRate <= 0) continue;

      const decayAmount = current * effectiveRate * elapsedHours;
      const actualDecay = Math.min(decayAmount, current);
      resources[resource] = current - actualDecay;
      decayed[resource] = actualDecay;
    }

    if (Object.keys(decayed).length > 0) {
      await prisma.guild.update({
        where: { id: guildId },
        data: { resources: JSON.stringify(resources) },
      });

      for (const [res, amt] of Object.entries(decayed)) {
        if (amt && amt > 0) {
          await ResourceService.logAudit(
            guildId, res as ResourceType, -amt,
            resources[res as ResourceType],
            'decay', `Perishable resource decay over ${elapsedHours.toFixed(1)}h`,
          );
        }
      }
    }

    return decayed;
  }

  /**
   * Get the effective decay rates for a guild (accounting for cold storage).
   */
  static getEffectiveDecayRates(
    buildings: Array<{ type: string; level: number }>,
  ): Partial<Record<ResourceType, number>> {
    const workshop = buildings.find(b => b.type === BuildingType.Workshop);
    const reduction = workshop
      ? workshop.level * COLD_STORAGE_DECAY_REDUCTION_PER_LEVEL
      : 0;

    const rates: Partial<Record<ResourceType, number>> = {};
    for (const [resType, decayRate] of Object.entries(RESOURCE_DECAY_RATES)) {
      if (!decayRate) continue;
      const effective = Math.max(0, decayRate - reduction);
      if (effective > 0) {
        rates[resType as ResourceType] = effective;
      }
    }
    return rates;
  }

  /**
   * Execute a conversion recipe.
   */
  static async executeConversion(
    guildId: string,
    recipeId: string,
    quantity: number = 1,
  ): Promise<{
    success: boolean;
    error?: string;
    consumed: Partial<Record<ResourceType, number>>;
    produced: Partial<Record<ResourceType, number>>;
  }> {
    const recipe = CONVERSION_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return { success: false, error: 'Recipe not found', consumed: {}, produced: {} };

    if (quantity < 1 || quantity > 100) {
      return { success: false, error: 'Quantity must be 1-100', consumed: {}, produced: {} };
    }

    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { buildings: true },
    });
    if (!guild) return { success: false, error: 'Guild not found', consumed: {}, produced: {} };

    // Check Workshop level
    const workshop = guild.buildings.find(b => b.type === BuildingType.Workshop);
    const workshopLevel = workshop?.level ?? 0;
    if (workshopLevel < recipe.requiredBuildingLevel) {
      return {
        success: false,
        error: `Requires Workshop level ${recipe.requiredBuildingLevel} (current: ${workshopLevel})`,
        consumed: {},
        produced: {},
      };
    }

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;

    // Check inputs
    for (const [res, cost] of Object.entries(recipe.inputs)) {
      const needed = (cost ?? 0) * quantity;
      if ((resources[res as ResourceType] || 0) < needed) {
        return {
          success: false,
          error: `Insufficient ${res}: need ${needed}, have ${Math.floor(resources[res as ResourceType] || 0)}`,
          consumed: {},
          produced: {},
        };
      }
    }

    // Subtract inputs
    const consumed: Partial<Record<ResourceType, number>> = {};
    for (const [res, cost] of Object.entries(recipe.inputs)) {
      const amount = (cost ?? 0) * quantity;
      resources[res as ResourceType] -= amount;
      consumed[res as ResourceType] = amount;
    }

    // Add outputs (with cap enforcement)
    const caps = ResourceService.calculateCaps(guild.buildings);
    const produced: Partial<Record<ResourceType, number>> = {};
    for (const [res, output] of Object.entries(recipe.outputs)) {
      const resType = res as ResourceType;
      const amount = (output ?? 0) * quantity;
      const current = resources[resType] || 0;
      const cap = caps[resType];
      const actual = Math.min(amount, cap - current);
      resources[resType] = current + Math.max(0, actual);
      produced[resType] = Math.max(0, actual);
    }

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    // Audit log
    await ResourceService.logAudit(
      guildId, ResourceType.Gold, 0, resources[ResourceType.Gold],
      'conversion', `Converted ${quantity}x ${recipe.name}`,
    );

    await GuildService.logActivity(
      guildId, 'resource_conversion',
      `Converted ${quantity}x ${recipe.name}`,
      { recipeId, quantity, consumed, produced },
    );

    return { success: true, consumed, produced };
  }

  /**
   * Get full resource state for API response.
   */
  static async getFullState(playerId: string): Promise<ResourceState | null> {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    const guild = await prisma.guild.findUnique({
      where: { playerId },
      include: { buildings: true, heroes: true },
    });
    if (!guild || !player) return null;

    const current = JSON.parse(guild.resources) as Record<ResourceType, number>;
    const caps = ResourceService.calculateCaps(guild.buildings);
    const rates = await IdleProgressService.getRates(playerId);
    const decayRates = ResourceService.getEffectiveDecayRates(guild.buildings);
    const multipliers = await ResourceService.getMultipliers(playerId, guild.buildings);

    // Calculate net rates (production - decay)
    const netRates = { ...rates };
    for (const [res, decay] of Object.entries(decayRates)) {
      const resType = res as ResourceType;
      const decayPerSecond = (current[resType] || 0) * (decay ?? 0) / 3600;
      netRates[resType] = (netRates[resType] || 0) - decayPerSecond;
    }

    return { current, caps, rates, netRates, decayRates, multipliers };
  }

  /**
   * Get active resource multipliers from all sources.
   */
  static async getMultipliers(
    playerId: string,
    buildings: Array<{ type: string; level: number }>,
  ): Promise<ResourceMultipliers> {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    const regionId = player?.regionId || 'new-york';

    // Weather multipliers
    const weather: Partial<Record<ResourceType, number>> = {};
    const worldState = await WeatherService.getWorldState(regionId);
    if (worldState) {
      const mods = worldState.modifiers;
      weather[ResourceType.Food] = mods.cropGrowth - 1;
      weather[ResourceType.Herbs] = (mods.cropGrowth - 1) + (mods.alchemyOutput - 1);
      weather[ResourceType.Essence] = (mods.essenceDrops - 1) + (mods.alchemyOutput - 1);
      weather[ResourceType.Gold] = mods.marketConfidence - 1;
    }

    // Season multipliers
    const season = CalendarService.getCurrentSeason(regionId);
    const seasonBonuses = SEASONAL_RESOURCE_BONUSES[season] ?? {};

    return {
      weather,
      season: seasonBonuses,
      research: {}, // populated by research service if available
      items: {},    // populated by equipped item bonuses
    };
  }

  /**
   * Get production/consumption breakdown for a specific resource.
   */
  static async getBreakdown(
    playerId: string,
    resource?: ResourceType,
  ): Promise<ResourceBreakdown[]> {
    const guild = await prisma.guild.findUnique({
      where: { playerId },
      include: { buildings: true, heroes: true },
    });
    if (!guild) return [];

    const breakdowns: ResourceBreakdown[] = [];
    const targetResources = resource
      ? [resource]
      : Object.values(ResourceType);

    for (const resType of targetResources) {
      const production: Array<{ source: string; amount: number }> = [];
      const consumption: Array<{ source: string; amount: number }> = [];

      // Production from buildings
      for (const building of guild.buildings) {
        if (building.level < 1) continue;
        const def = BUILDING_DEFINITIONS[building.type as BuildingType];
        if (!def) continue;

        const baseOutput = def.baseOutput[resType];
        if (baseOutput && baseOutput > 0) {
          const output = baseOutput * (1 + building.level * BUILDING_LEVEL_BONUS);
          production.push({
            source: `${def.name} (Lv.${building.level})`,
            amount: output * 3600, // per hour
          });
        }
      }

      // Decay consumption
      const decayRate = RESOURCE_DECAY_RATES[resType];
      if (decayRate) {
        const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
        const current = resources[resType] || 0;
        if (current > 0) {
          consumption.push({
            source: 'Perishable Decay',
            amount: current * decayRate,
          });
        }
      }

      const totalProd = production.reduce((s, p) => s + p.amount, 0);
      const totalCons = consumption.reduce((s, c) => s + c.amount, 0);

      breakdowns.push({
        resource: resType,
        production,
        consumption,
        netRate: totalProd - totalCons,
      });
    }

    return breakdowns;
  }

  /**
   * Take a resource snapshot for history tracking.
   */
  static async takeSnapshot(guildId: string): Promise<void> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return;

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;

    await prisma.eventLog.create({
      data: {
        guildId,
        type: 'resource_snapshot',
        message: 'Hourly resource snapshot',
        data: JSON.stringify({
          timestamp: new Date().toISOString(),
          resources,
        }),
      },
    });
  }

  /**
   * Get resource history snapshots for charting.
   */
  static async getHistory(
    guildId: string,
    hours: number = 24,
  ): Promise<ResourceSnapshot[]> {
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const logs = await prisma.eventLog.findMany({
      where: {
        guildId,
        type: 'resource_snapshot',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
    });

    return logs.map(log => {
      const data = JSON.parse(log.data || '{}');
      return {
        timestamp: data.timestamp || log.createdAt.toISOString(),
        resources: data.resources || {},
      };
    });
  }

  /**
   * Get resource forecasts.
   */
  static async getForecasts(playerId: string): Promise<ResourceForecast[]> {
    const state = await ResourceService.getFullState(playerId);
    if (!state) return [];

    return Object.values(ResourceType).map(resType => {
      const current = state.current[resType] || 0;
      const cap = state.caps[resType];
      const netPerHour = (state.netRates[resType] || 0) * 3600;

      let hoursUntilFull: number | null = null;
      let hoursUntilEmpty: number | null = null;

      if (netPerHour > 0 && current < cap) {
        hoursUntilFull = (cap - current) / netPerHour;
      }
      if (netPerHour < 0 && current > 0) {
        hoursUntilEmpty = current / Math.abs(netPerHour);
      }

      return {
        resource: resType,
        currentAmount: current,
        cap,
        netRatePerHour: netPerHour,
        hoursUntilFull,
        hoursUntilEmpty,
      };
    });
  }

  /**
   * Log a resource audit entry.
   */
  static async logAudit(
    guildId: string,
    resource: ResourceType,
    amount: number,
    balanceAfter: number,
    action: string,
    details: string,
  ): Promise<void> {
    await prisma.eventLog.create({
      data: {
        guildId,
        type: 'resource_audit',
        message: `${action}: ${amount >= 0 ? '+' : ''}${amount.toFixed(1)} ${resource}`,
        data: JSON.stringify({
          resource,
          amount,
          balanceAfter,
          action,
          details,
        }),
      },
    });
  }

  /**
   * Get audit log for a guild.
   */
  static async getAuditLog(
    guildId: string,
    limit: number = 50,
  ): Promise<ResourceAuditEntry[]> {
    const logs = await prisma.eventLog.findMany({
      where: { guildId, type: 'resource_audit' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map(log => {
      const data = JSON.parse(log.data || '{}');
      return {
        id: log.id,
        guildId: log.guildId,
        resource: data.resource,
        amount: data.amount,
        balanceAfter: data.balanceAfter,
        action: data.action,
        details: data.details,
        timestamp: log.createdAt.toISOString(),
      };
    });
  }

  /**
   * Check and award resource milestones.
   */
  static async checkMilestones(
    guildId: string,
    resource: ResourceType,
    currentAmount: number,
  ): Promise<void> {
    // Get already-awarded milestones from event log
    const awardedLogs = await prisma.eventLog.findMany({
      where: { guildId, type: 'resource_milestone' },
    });
    const awardedIds = new Set(
      awardedLogs.map(l => {
        const data = JSON.parse(l.data || '{}');
        return data.milestoneId as string;
      }),
    );

    for (const milestone of RESOURCE_MILESTONES) {
      if (milestone.resource !== resource) continue;
      if (awardedIds.has(milestone.id)) continue;
      if (currentAmount < milestone.threshold) continue;

      // Award milestone
      const guild = await prisma.guild.findUnique({ where: { id: guildId } });
      if (!guild) return;

      const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
      for (const [res, amt] of Object.entries(milestone.reward)) {
        resources[res as ResourceType] = (resources[res as ResourceType] || 0) + (amt ?? 0);
      }

      await prisma.guild.update({
        where: { id: guildId },
        data: { resources: JSON.stringify(resources) },
      });

      if (milestone.xp > 0) {
        await GuildService.addXP(guildId, milestone.xp);
      }

      await prisma.eventLog.create({
        data: {
          guildId,
          type: 'resource_milestone',
          message: `Milestone unlocked: ${milestone.label}!`,
          data: JSON.stringify({ milestoneId: milestone.id, reward: milestone.reward, xp: milestone.xp }),
        },
      });

      await GuildService.logActivity(
        guildId, 'milestone',
        `Milestone unlocked: ${milestone.label}!`,
        { milestoneId: milestone.id },
      );
    }
  }

  /**
   * Check resource alerts for a guild.
   */
  static async checkAlerts(
    guildId: string,
    alerts: ResourceAlert[],
  ): Promise<Array<{ resource: ResourceType; threshold: number; current: number; direction: string }>> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return [];

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    const triggered: Array<{ resource: ResourceType; threshold: number; current: number; direction: string }> = [];

    for (const alert of alerts) {
      if (!alert.enabled) continue;
      const current = resources[alert.resource] || 0;
      if (alert.direction === 'below' && current < alert.threshold) {
        triggered.push({ resource: alert.resource, threshold: alert.threshold, current, direction: 'below' });
      } else if (alert.direction === 'above' && current > alert.threshold) {
        triggered.push({ resource: alert.resource, threshold: alert.threshold, current, direction: 'above' });
      }
    }

    return triggered;
  }

  /**
   * Enforce production caps to prevent exploit.
   */
  static clampRates(rates: Record<ResourceType, number>): Record<ResourceType, number> {
    const clamped = { ...rates };
    for (const resType of Object.values(ResourceType)) {
      const max = MAX_PRODUCTION_PER_SECOND[resType];
      if (clamped[resType] > max) {
        clamped[resType] = max;
      }
    }
    return clamped;
  }

  /**
   * Get scarcity indicators: percentage of cap used per resource.
   */
  static getScarcityIndicators(
    resources: Record<ResourceType, number>,
    caps: Record<ResourceType, number>,
  ): Record<ResourceType, { percent: number; status: 'critical' | 'low' | 'normal' | 'high' | 'full' }> {
    const result: Record<ResourceType, { percent: number; status: 'critical' | 'low' | 'normal' | 'high' | 'full' }> = {} as any;
    for (const resType of Object.values(ResourceType)) {
      const current = resources[resType] || 0;
      const cap = caps[resType] || 1;
      const percent = (current / cap) * 100;
      let status: 'critical' | 'low' | 'normal' | 'high' | 'full';
      if (percent >= 100) status = 'full';
      else if (percent >= 80) status = 'high';
      else if (percent >= 20) status = 'normal';
      else if (percent >= 5) status = 'low';
      else status = 'critical';
      result[resType] = { percent, status };
    }
    return result;
  }
}
