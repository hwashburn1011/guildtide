/**
 * Centralized building logic: production chains, specializations,
 * maintenance, events, achievements, and worker efficiency.
 *
 * Covers T-0291 through T-0370 server-side logic.
 */
import { prisma } from '../db';
import { BuildingType, ResourceType } from '../../../shared/src/enums';
import {
  BUILDING_DEFINITIONS,
  BUILDING_LEVEL_BONUS,
  BUILDING_COST_MULTIPLIER,
  BUILDING_SYNERGIES,
} from '../../../shared/src/constants';
import {
  BUILDING_BEHAVIORS,
  BUILDING_SPECIALIZATIONS,
  BUILDING_LORE,
  BUILDING_MILESTONES,
  BUILDING_ACHIEVEMENTS,
  PRODUCTION_CHAINS,
  BUILDING_VISUAL_STATES,
} from '../data/buildingSpecializations';
import type {
  BuildingBehavior,
  BuildingSpecialization,
  BuildingLoreEntry,
  BuildingMilestone,
  BuildingAchievement,
  BuildingEventTemplate,
  ProductionChain,
  BuildingVisualState,
} from '../data/buildingSpecializations';
import { GuildService } from './GuildService';
import { ResourceService } from './ResourceService';

export interface BuildingDetail {
  type: BuildingType;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  currentOutput: Partial<Record<ResourceType, number>>;
  nextOutput: Partial<Record<ResourceType, number>>;
  upgradeCost: Partial<Record<ResourceType, number>> | null;
  assignedHero: { id: string; name: string; role: string; level: number } | null;
  behavior: BuildingBehavior;
  specialization: BuildingSpecialization | null;
  availableSpecializations: BuildingSpecialization[] | null;
  loreEntries: BuildingLoreEntry[];
  milestones: BuildingMilestone[];
  visualState: BuildingVisualState;
  maintenanceDue: boolean;
  adjacencyBonuses: Array<{ partner: string; bonusPercent: number; description: string }>;
  productionChains: ProductionChain[];
}

export interface WorkerEfficiency {
  heroId: string;
  heroName: string;
  heroRole: string;
  baseEfficiency: number;
  roleMatchBonus: number;
  skillBonus: number;
  happinessModifier: number;
  totalEfficiency: number;
}

export interface MaintenanceStatus {
  buildingType: BuildingType;
  costs: Partial<Record<ResourceType, number>>;
  overdue: boolean;
  efficiencyPenalty: number;
  lastPaidAt: string | null;
}

export class BuildingService {
  /**
   * T-0291/T-0292: Get extended building detail with all new systems.
   */
  static async getExtendedDetail(
    guildId: string,
    buildingType: BuildingType,
  ): Promise<BuildingDetail | null> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { buildings: true, heroes: true },
    });
    if (!guild) return null;

    const def = BUILDING_DEFINITIONS[buildingType];
    if (!def) return null;

    const building = guild.buildings.find(b => b.type === buildingType);
    const level = building?.level ?? 0;
    const meta = building?.metadata ? JSON.parse(building.metadata) : {};

    // Current and next output
    const currentOutput: Partial<Record<ResourceType, number>> = {};
    const nextOutput: Partial<Record<ResourceType, number>> = {};
    for (const [res, base] of Object.entries(def.baseOutput)) {
      const resType = res as ResourceType;
      currentOutput[resType] = level > 0 ? (base as number) * (1 + level * BUILDING_LEVEL_BONUS) : 0;
      nextOutput[resType] = (base as number) * (1 + (level + 1) * BUILDING_LEVEL_BONUS);
    }

    // Apply specialization multiplier
    const spec = BuildingService.getActiveSpecialization(buildingType, meta);
    if (spec?.bonuses.productionMultiplier) {
      for (const [res, mult] of Object.entries(spec.bonuses.productionMultiplier)) {
        const resType = res as ResourceType;
        currentOutput[resType] = (currentOutput[resType] ?? 0) * (1 + (mult as number));
      }
    }

    // Upgrade cost
    const upgradeCost: Partial<Record<ResourceType, number>> = {};
    if (level < def.maxLevel) {
      for (const [res, baseCost] of Object.entries(def.baseCost)) {
        upgradeCost[res as ResourceType] = Math.ceil((baseCost as number) * Math.pow(BUILDING_COST_MULTIPLIER, level));
      }
    }

    // Assigned hero
    const assignedHero = guild.heroes.find(h => h.assignment === buildingType && h.status === 'assigned');

    // Behavior
    const behavior = BUILDING_BEHAVIORS[buildingType];

    // Available specializations
    const specTree = BUILDING_SPECIALIZATIONS[buildingType];
    const availableSpecs = !spec && level >= specTree.specializationLevel
      ? specTree.paths
      : null;

    // Lore entries
    const lore = (BUILDING_LORE[buildingType] ?? []).filter(l => l.level <= level);

    // Milestones
    const milestones = BUILDING_MILESTONES[buildingType] ?? [];

    // Visual state
    const visualState = BuildingService.getVisualState(building, meta);

    // Maintenance
    const maintenanceDue = BuildingService.isMaintenanceDue(meta);

    // Adjacency bonuses
    const adjacencyBonuses = BuildingService.getAdjacencyBonuses(buildingType, guild.buildings);

    // Production chains this building participates in
    const chains = PRODUCTION_CHAINS.filter(
      chain => chain.steps.some(step => step.building === buildingType),
    );

    return {
      type: buildingType,
      name: def.name,
      description: def.description,
      level,
      maxLevel: def.maxLevel,
      currentOutput,
      nextOutput,
      upgradeCost: level < def.maxLevel ? upgradeCost : null,
      assignedHero: assignedHero ? {
        id: assignedHero.id,
        name: assignedHero.name,
        role: assignedHero.role,
        level: assignedHero.level,
      } : null,
      behavior,
      specialization: spec,
      availableSpecializations: availableSpecs ? [...availableSpecs] : null,
      loreEntries: lore,
      milestones,
      visualState,
      maintenanceDue,
      adjacencyBonuses,
      productionChains: chains,
    };
  }

  /**
   * T-0293/T-0295/T-0297: Tavern recruitment pool refresh.
   * Returns available recruit pool based on building level.
   */
  static getTavernRecruitSlots(level: number): number {
    if (level <= 0) return 0;
    return Math.min(2 + Math.floor(level / 3), 8);
  }

  static getTavernRefreshIntervalMs(level: number): number {
    // Base: 4 hours, reduces 10% per level, minimum 1 hour
    const baseMs = 4 * 60 * 60 * 1000;
    return Math.max(baseMs * Math.pow(0.9, level - 1), 60 * 60 * 1000);
  }

  static getTavernQualityBonus(level: number): number {
    // Higher level = better quality heroes, 5% per level
    return 1 + level * 0.05;
  }

  /**
   * T-0298/T-0301/T-0302: Workshop crafting queue.
   */
  static getWorkshopCraftSpeedMultiplier(level: number): number {
    // 10% faster per level
    return 1 + level * 0.1;
  }

  static getWorkshopMaxQueueSize(level: number): number {
    return Math.min(1 + Math.floor(level / 2), 5);
  }

  /**
   * T-0303/T-0306/T-0307/T-0308: Farm seasonal and weather yield modifiers.
   */
  static getFarmSeasonModifier(season: string): number {
    const mods: Record<string, number> = {
      spring: 0.30,
      summer: 0.10,
      autumn: 0.15,
      winter: -0.20,
    };
    return mods[season] ?? 0;
  }

  static getFarmWeatherModifier(weather: string): number {
    const mods: Record<string, number> = {
      rainy: 0.15,
      clear: 0.05,
      hot: -0.10,
      stormy: -0.15,
      snowy: -0.25,
      foggy: 0,
      windy: -0.05,
    };
    return mods[weather] ?? 0;
  }

  static getFarmUpgradeEffects(level: number): { plots: number; growthSpeed: number; seedQuality: number } {
    return {
      plots: Math.min(2 + level, 22),
      growthSpeed: 1 + level * 0.08,
      seedQuality: 1 + level * 0.05,
    };
  }

  /**
   * T-0309/T-0312/T-0313: Mine gem discovery and upgrade effects.
   */
  static getMineGemChance(level: number): number {
    // Base 5%, +2% per level, max 35%
    return Math.min(0.05 + level * 0.02, 0.35);
  }

  static getMineUpgradeEffects(level: number): { veinDepth: number; toolQuality: number; gemChance: number } {
    return {
      veinDepth: 1 + level * 0.12,
      toolQuality: 1 + level * 0.08,
      gemChance: BuildingService.getMineGemChance(level),
    };
  }

  /**
   * T-0314/T-0317/T-0318: Marketplace commission and upgrade effects.
   */
  static getMarketCommission(level: number): number {
    // Base 15%, reduces 1% per level, minimum 3%
    return Math.max(0.15 - level * 0.01, 0.03);
  }

  static getMarketMerchantCount(level: number): number {
    return Math.min(2 + Math.floor(level / 2), 10);
  }

  /**
   * T-0319/T-0322/T-0323: Library/Laboratory research speed.
   */
  static getResearchSpeedMultiplier(labLevel: number): number {
    // 8% faster per level
    return 1 + labLevel * 0.08;
  }

  /**
   * T-0324/T-0327/T-0328: Barracks training.
   */
  static getTrainingSlots(level: number): number {
    return Math.min(1 + Math.floor(level / 3), 5);
  }

  static getTrainingSpeedMultiplier(level: number): number {
    return 1 + level * 0.1;
  }

  static getTrainingStatCap(level: number): number {
    // Max stat gain per session increases with level
    return 2 + Math.floor(level / 2);
  }

  /**
   * T-0329/T-0332/T-0333: Warehouse storage effects.
   * (Using Well/others as storage-adjacent building)
   */
  static getStorageBoostPercent(warehouseLevel: number, resource?: ResourceType): number {
    const base = warehouseLevel * 15; // 15% per level
    return base;
  }

  static getDecayReduction(warehouseLevel: number): number {
    // 5% decay reduction per level, max 50%
    return Math.min(warehouseLevel * 0.05, 0.5);
  }

  /**
   * T-0334/T-0337/T-0338: Temple/morale blessing system.
   * Implemented as Laboratory blessings.
   */
  static getBlessingSlots(level: number): number {
    return Math.min(1 + Math.floor(level / 4), 4);
  }

  static getBlessingStrength(level: number): number {
    return 1 + level * 0.08;
  }

  /**
   * T-0339/T-0342/T-0343: Observatory prediction accuracy.
   */
  static getPredictionAccuracy(level: number): number {
    // Base 50%, +3% per level, max 95%
    return Math.min(0.50 + level * 0.03, 0.95);
  }

  /**
   * T-0344/T-0347/T-0348: Expedition Hall (Barracks-adjacent).
   */
  static getSimultaneousExpeditions(level: number): number {
    return Math.min(1 + Math.floor(level / 3), 5);
  }

  static getExpeditionRangeBonus(level: number): number {
    return 1 + level * 0.1;
  }

  static getExpeditionReturnSpeedBonus(level: number): number {
    return 1 + level * 0.05;
  }

  /**
   * T-0349/T-0350/T-0351: Production chain system.
   */
  static getProductionChains(): ProductionChain[] {
    return PRODUCTION_CHAINS;
  }

  static getActiveChains(
    buildings: Array<{ type: string; level: number }>,
  ): ProductionChain[] {
    const builtTypes = new Set(buildings.filter(b => b.level > 0).map(b => b.type));
    return PRODUCTION_CHAINS.filter(chain =>
      chain.steps.every(step => builtTypes.has(step.building)),
    );
  }

  static getChainEfficiency(
    chain: ProductionChain,
    buildings: Array<{ type: string; level: number }>,
  ): number {
    // Average level of participating buildings / max level * 100
    let totalLevel = 0;
    let maxTotal = 0;
    for (const step of chain.steps) {
      const building = buildings.find(b => b.type === step.building);
      const level = building?.level ?? 0;
      const def = BUILDING_DEFINITIONS[step.building];
      totalLevel += level;
      maxTotal += def?.maxLevel ?? 20;
    }
    return maxTotal > 0 ? (totalLevel / maxTotal) * 100 : 0;
  }

  /**
   * T-0352/T-0353/T-0354/T-0355: Worker assignment and efficiency.
   */
  static calculateWorkerEfficiency(
    hero: { role: string; level: number; stats?: string; morale?: number },
    buildingType: BuildingType,
  ): WorkerEfficiency {
    const behavior = BUILDING_BEHAVIORS[buildingType];
    const baseEfficiency = 1.0;

    // Role match bonus
    const roleMatch = hero.role === behavior.preferredRole;
    const roleMatchBonus = roleMatch ? behavior.roleMatchBonus - 1.0 : 0;

    // Skill bonus from hero level (1% per level)
    const skillBonus = hero.level * 0.01;

    // Happiness modifier (default 1.0 if no morale data)
    const morale = hero.morale ?? 100;
    const happinessModifier = morale >= 80 ? 1.1 : morale >= 50 ? 1.0 : morale >= 20 ? 0.85 : 0.7;

    const totalEfficiency = (baseEfficiency + roleMatchBonus + skillBonus) * happinessModifier;

    return {
      heroId: '',
      heroName: '',
      heroRole: hero.role,
      baseEfficiency,
      roleMatchBonus,
      skillBonus,
      happinessModifier,
      totalEfficiency,
    };
  }

  /**
   * T-0356/T-0357: Adjacency bonus system.
   */
  static getAdjacencyBonuses(
    buildingType: BuildingType,
    buildings: Array<{ type: string; level: number }>,
  ): Array<{ partner: string; bonusPercent: number; description: string }> {
    const builtTypes = new Set(buildings.filter(b => b.level > 0).map(b => b.type));
    const bonuses: Array<{ partner: string; bonusPercent: number; description: string }> = [];

    for (const synergy of BUILDING_SYNERGIES) {
      if (synergy.buildingA === buildingType && builtTypes.has(synergy.buildingB)) {
        bonuses.push({
          partner: synergy.buildingB,
          bonusPercent: synergy.bonusPercent,
          description: synergy.description,
        });
      } else if (synergy.buildingB === buildingType && builtTypes.has(synergy.buildingA)) {
        bonuses.push({
          partner: synergy.buildingA,
          bonusPercent: synergy.bonusPercent,
          description: synergy.description,
        });
      }
    }

    return bonuses;
  }

  /**
   * T-0358: Building special event trigger.
   */
  static rollBuildingEvent(
    buildingType: BuildingType,
    timeOfDay: 'day' | 'night',
  ): BuildingEventTemplate | null {
    const behavior = BUILDING_BEHAVIORS[buildingType];
    if (!behavior) return null;

    for (const event of behavior.events) {
      if (event.timeOfDay !== 'any' && event.timeOfDay !== timeOfDay) continue;
      if (Math.random() < event.triggerChance) {
        return event;
      }
    }
    return null;
  }

  /**
   * T-0359/T-0360: Building maintenance cost system.
   */
  static getMaintenanceCosts(
    buildingType: BuildingType,
    level: number,
    specialization?: BuildingSpecialization | null,
  ): Partial<Record<ResourceType, number>> {
    const behavior = BUILDING_BEHAVIORS[buildingType];
    if (!behavior || level < 1) return {};

    const costs: Partial<Record<ResourceType, number>> = {};
    const levelMultiplier = 1 + (level - 1) * 0.1;
    const specReduction = specialization?.bonuses.maintenanceReduction ?? 0;
    const finalMultiplier = levelMultiplier * (1 - specReduction);

    for (const [res, cost] of Object.entries(behavior.maintenanceCost)) {
      costs[res as ResourceType] = Math.ceil((cost as number) * finalMultiplier);
    }

    return costs;
  }

  static isMaintenanceDue(meta: Record<string, unknown> | null): boolean {
    if (!meta?.lastMaintenanceAt) return true;
    const lastPaid = new Date(meta.lastMaintenanceAt as string).getTime();
    const hoursSince = (Date.now() - lastPaid) / (1000 * 60 * 60);
    return hoursSince >= 4; // Maintenance due every 4 hours
  }

  static getMaintenancePenalty(meta: Record<string, unknown> | null): number {
    if (!meta?.lastMaintenanceAt) return 0.3; // 30% penalty if never paid
    const lastPaid = new Date(meta.lastMaintenanceAt as string).getTime();
    const hoursSince = (Date.now() - lastPaid) / (1000 * 60 * 60);
    if (hoursSince < 4) return 0;
    // 5% penalty per hour overdue, max 50%
    return Math.min((hoursSince - 4) * 0.05, 0.5);
  }

  /**
   * T-0359: Pay maintenance for a building.
   */
  static async payMaintenance(
    guildId: string,
    buildingType: BuildingType,
  ): Promise<{ success: boolean; error?: string; costs?: Partial<Record<ResourceType, number>> }> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { buildings: true },
    });
    if (!guild) return { success: false, error: 'Guild not found' };

    const building = guild.buildings.find(b => b.type === buildingType);
    if (!building || building.level < 1) {
      return { success: false, error: 'Building not found or not built' };
    }

    const meta = building.metadata ? JSON.parse(building.metadata) : {};
    const spec = BuildingService.getActiveSpecialization(
      buildingType as BuildingType,
      meta,
    );
    const costs = BuildingService.getMaintenanceCosts(
      buildingType as BuildingType,
      building.level,
      spec,
    );

    // Check resources
    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    for (const [res, cost] of Object.entries(costs)) {
      if ((resources[res as ResourceType] || 0) < (cost as number)) {
        return { success: false, error: `Insufficient ${res}` };
      }
    }

    // Deduct costs
    for (const [res, cost] of Object.entries(costs)) {
      resources[res as ResourceType] -= cost as number;
    }

    // Update metadata
    meta.lastMaintenanceAt = new Date().toISOString();

    await prisma.building.update({
      where: { id: building.id },
      data: { metadata: JSON.stringify(meta) },
    });

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    await GuildService.logActivity(guildId, 'building_maintenance', `Paid maintenance for ${BUILDING_DEFINITIONS[buildingType]?.name}`);

    return { success: true, costs };
  }

  /**
   * T-0361: Toggle auto-collect for a building.
   */
  static async toggleAutoCollect(
    guildId: string,
    buildingType: BuildingType,
    enabled: boolean,
  ): Promise<{ success: boolean }> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { buildings: true },
    });
    if (!guild) return { success: false };

    const building = guild.buildings.find(b => b.type === buildingType);
    if (!building) return { success: false };

    const meta = building.metadata ? JSON.parse(building.metadata) : {};
    meta.autoCollect = enabled;

    await prisma.building.update({
      where: { id: building.id },
      data: { metadata: JSON.stringify(meta) },
    });

    return { success: true };
  }

  /**
   * T-0362: Check if storage is full for building's output resources.
   */
  static async checkStorageFull(
    guildId: string,
    buildingType: BuildingType,
  ): Promise<Array<{ resource: ResourceType; current: number; cap: number }>> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { buildings: true },
    });
    if (!guild) return [];

    const def = BUILDING_DEFINITIONS[buildingType];
    if (!def) return [];

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    const caps = ResourceService.calculateCaps(guild.buildings);
    const full: Array<{ resource: ResourceType; current: number; cap: number }> = [];

    for (const resType of Object.keys(def.baseOutput) as ResourceType[]) {
      const current = resources[resType] || 0;
      const cap = caps[resType];
      if (current >= cap * 0.95) {
        full.push({ resource: resType, current, cap });
      }
    }

    return full;
  }

  /**
   * T-0363: Building comparison tool.
   */
  static getBuildingComparison(
    buildingType: BuildingType,
    currentLevel: number,
  ): {
    current: { output: Partial<Record<ResourceType, number>>; maintenance: Partial<Record<ResourceType, number>> };
    next: { output: Partial<Record<ResourceType, number>>; maintenance: Partial<Record<ResourceType, number>>; cost: Partial<Record<ResourceType, number>> };
  } | null {
    const def = BUILDING_DEFINITIONS[buildingType];
    if (!def) return null;

    const currentOutput: Partial<Record<ResourceType, number>> = {};
    const nextOutput: Partial<Record<ResourceType, number>> = {};
    const upgradeCost: Partial<Record<ResourceType, number>> = {};

    for (const [res, base] of Object.entries(def.baseOutput)) {
      const resType = res as ResourceType;
      currentOutput[resType] = currentLevel > 0 ? (base as number) * (1 + currentLevel * BUILDING_LEVEL_BONUS) : 0;
      nextOutput[resType] = (base as number) * (1 + (currentLevel + 1) * BUILDING_LEVEL_BONUS);
    }

    for (const [res, baseCost] of Object.entries(def.baseCost)) {
      upgradeCost[res as ResourceType] = Math.ceil((baseCost as number) * Math.pow(BUILDING_COST_MULTIPLIER, currentLevel));
    }

    const currentMaintenance = BuildingService.getMaintenanceCosts(buildingType, currentLevel);
    const nextMaintenance = BuildingService.getMaintenanceCosts(buildingType, currentLevel + 1);

    return {
      current: { output: currentOutput, maintenance: currentMaintenance },
      next: { output: nextOutput, maintenance: nextMaintenance, cost: upgradeCost },
    };
  }

  /**
   * T-0364: Get building lore entries.
   */
  static getLoreEntries(buildingType: BuildingType, level: number): BuildingLoreEntry[] {
    return (BUILDING_LORE[buildingType] ?? []).filter(l => l.level <= level);
  }

  /**
   * T-0367: Check building achievements.
   */
  static async checkBuildingAchievements(
    guildId: string,
  ): Promise<BuildingAchievement[]> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { buildings: true },
    });
    if (!guild) return [];

    // Get already-awarded achievements
    const awardedLogs = await prisma.eventLog.findMany({
      where: { guildId, type: 'building_achievement' },
    });
    const awardedIds = new Set(
      awardedLogs.map(l => {
        const data = JSON.parse(l.data || '{}');
        return data.achievementId as string;
      }),
    );

    const newlyEarned: BuildingAchievement[] = [];
    const buildings = guild.buildings;
    const builtTypes = new Set(buildings.filter(b => b.level > 0).map(b => b.type));
    const totalLevels = buildings.reduce((sum, b) => sum + b.level, 0);

    for (const achievement of BUILDING_ACHIEVEMENTS) {
      if (awardedIds.has(achievement.id)) continue;

      let earned = false;
      const cond = achievement.condition;

      switch (cond.type) {
        case 'single_max_level': {
          if (cond.buildingType) {
            const b = buildings.find(bl => bl.type === cond.buildingType);
            const def = BUILDING_DEFINITIONS[cond.buildingType];
            if (b && def && b.level >= def.maxLevel) earned = true;
          }
          break;
        }
        case 'all_built': {
          earned = Object.values(BuildingType).every(bt => builtTypes.has(bt));
          break;
        }
        case 'all_max_level': {
          earned = Object.values(BuildingType).every(bt => {
            const b = buildings.find(bl => bl.type === bt);
            const def = BUILDING_DEFINITIONS[bt];
            return b && def && b.level >= def.maxLevel;
          });
          break;
        }
        case 'total_building_levels': {
          earned = totalLevels >= (cond.threshold ?? 0);
          break;
        }
        case 'specialization_count': {
          const specCount = buildings.filter(b => {
            const meta = b.metadata ? JSON.parse(b.metadata) : {};
            return !!meta.specialization;
          }).length;
          earned = specCount >= (cond.threshold ?? 0);
          break;
        }
      }

      if (earned) {
        newlyEarned.push(achievement);

        // Award resources
        if (achievement.reward.resources) {
          const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
          for (const [res, amt] of Object.entries(achievement.reward.resources)) {
            resources[res as ResourceType] = (resources[res as ResourceType] || 0) + (amt ?? 0);
          }
          await prisma.guild.update({
            where: { id: guildId },
            data: { resources: JSON.stringify(resources) },
          });
        }

        if (achievement.reward.xp) {
          await GuildService.addXP(guildId, achievement.reward.xp);
        }

        await prisma.eventLog.create({
          data: {
            guildId,
            type: 'building_achievement',
            message: `Achievement unlocked: ${achievement.name}!`,
            data: JSON.stringify({ achievementId: achievement.id }),
          },
        });

        await GuildService.logActivity(
          guildId, 'achievement',
          `Building achievement: ${achievement.name} — ${achievement.description}`,
        );
      }
    }

    return newlyEarned;
  }

  /**
   * T-0368: Building event modifier (festival boosts).
   */
  static applyEventModifier(
    buildingType: BuildingType,
    baseOutput: Partial<Record<ResourceType, number>>,
    festival: { name: string; buffs: Record<string, number> } | null,
  ): Partial<Record<ResourceType, number>> {
    if (!festival) return baseOutput;

    const modified = { ...baseOutput };
    const buildingName = BUILDING_DEFINITIONS[buildingType]?.name.toLowerCase() ?? '';

    // Check if festival buffs apply to this building's resources
    for (const [buffKey, buffValue] of Object.entries(festival.buffs)) {
      const resType = buffKey as ResourceType;
      if (modified[resType] !== undefined) {
        modified[resType] = (modified[resType] ?? 0) * (1 + buffValue);
      }
    }

    return modified;
  }

  /**
   * T-0369: Get building status icon.
   */
  static getVisualState(
    building: { level: number; metadata: string | null } | null | undefined,
    meta?: Record<string, unknown>,
  ): BuildingVisualState {
    if (!building || building.level === 0) {
      if (meta?.constructing) {
        return BUILDING_VISUAL_STATES.constructing;
      }
      return BUILDING_VISUAL_STATES.idle;
    }

    const def = Object.values(BUILDING_DEFINITIONS).find((_, i) => true); // fallback
    if (meta?.upgrading) return BUILDING_VISUAL_STATES.upgrading;
    if (meta?.damaged) return BUILDING_VISUAL_STATES.damaged;
    if (meta?.boosted) return BUILDING_VISUAL_STATES.boosted;

    // Check if at max level by checking metadata
    if (meta?.maxLevel) return BUILDING_VISUAL_STATES.max_level;

    return BUILDING_VISUAL_STATES.producing;
  }

  /**
   * T-0370: Building info card with stat comparison.
   */
  static getInfoCard(
    buildingType: BuildingType,
    currentLevel: number,
  ): {
    name: string;
    description: string;
    level: number;
    maxLevel: number;
    stats: Array<{ label: string; current: string; next: string; change: string }>;
  } | null {
    const def = BUILDING_DEFINITIONS[buildingType];
    if (!def) return null;
    const behavior = BUILDING_BEHAVIORS[buildingType];

    const stats: Array<{ label: string; current: string; next: string; change: string }> = [];

    // Output per hour for each resource
    for (const [res, base] of Object.entries(def.baseOutput)) {
      const currentRate = currentLevel > 0 ? (base as number) * (1 + currentLevel * BUILDING_LEVEL_BONUS) * 3600 : 0;
      const nextRate = (base as number) * (1 + (currentLevel + 1) * BUILDING_LEVEL_BONUS) * 3600;
      const change = nextRate - currentRate;
      stats.push({
        label: `${res}/hr`,
        current: currentRate.toFixed(1),
        next: nextRate.toFixed(1),
        change: `+${change.toFixed(1)}`,
      });
    }

    // Maintenance cost
    const currentMaint = BuildingService.getMaintenanceCosts(buildingType, currentLevel);
    const nextMaint = BuildingService.getMaintenanceCosts(buildingType, currentLevel + 1);
    for (const [res, cost] of Object.entries(nextMaint)) {
      const curCost = (currentMaint[res as ResourceType] ?? 0);
      stats.push({
        label: `Maint. ${res}`,
        current: `${curCost}`,
        next: `${cost}`,
        change: `+${(cost as number) - curCost}`,
      });
    }

    // Worker efficiency
    stats.push({
      label: 'Preferred Worker',
      current: behavior?.preferredRole ?? 'any',
      next: behavior?.preferredRole ?? 'any',
      change: '',
    });

    return {
      name: def.name,
      description: def.description,
      level: currentLevel,
      maxLevel: def.maxLevel,
      stats,
    };
  }

  /**
   * Apply a specialization to a building.
   */
  static async applySpecialization(
    guildId: string,
    buildingType: BuildingType,
    specializationId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { buildings: true },
    });
    if (!guild) return { success: false, error: 'Guild not found' };

    const building = guild.buildings.find(b => b.type === buildingType);
    if (!building) return { success: false, error: 'Building not found' };

    const specTree = BUILDING_SPECIALIZATIONS[buildingType];
    if (!specTree) return { success: false, error: 'No specialization tree' };

    if (building.level < specTree.specializationLevel) {
      return { success: false, error: `Building must be level ${specTree.specializationLevel}` };
    }

    const meta = building.metadata ? JSON.parse(building.metadata) : {};
    if (meta.specialization) {
      return { success: false, error: 'Building already specialized' };
    }

    const spec = specTree.paths.find(p => p.id === specializationId);
    if (!spec) return { success: false, error: 'Invalid specialization' };

    meta.specialization = specializationId;

    await prisma.building.update({
      where: { id: building.id },
      data: { metadata: JSON.stringify(meta) },
    });

    await GuildService.logActivity(
      guildId, 'building_specialize',
      `Specialized ${BUILDING_DEFINITIONS[buildingType]?.name} as ${spec.name}`,
    );

    // Check achievements
    await BuildingService.checkBuildingAchievements(guildId);

    return { success: true };
  }

  /**
   * Get the active specialization for a building.
   */
  static getActiveSpecialization(
    buildingType: BuildingType,
    meta: Record<string, unknown> | null,
  ): BuildingSpecialization | null {
    if (!meta?.specialization) return null;
    const specTree = BUILDING_SPECIALIZATIONS[buildingType];
    if (!specTree) return null;
    return specTree.paths.find(p => p.id === meta.specialization) ?? null;
  }

  /**
   * Check and award building-level milestones.
   */
  static async checkBuildingMilestones(
    guildId: string,
    buildingType: BuildingType,
    level: number,
  ): Promise<BuildingMilestone[]> {
    const milestones = BUILDING_MILESTONES[buildingType] ?? [];
    const awardedLogs = await prisma.eventLog.findMany({
      where: { guildId, type: 'building_milestone' },
    });
    const awardedIds = new Set(
      awardedLogs.map(l => {
        const data = JSON.parse(l.data || '{}');
        return `${data.buildingType}_${data.level}`;
      }),
    );

    const newlyEarned: BuildingMilestone[] = [];

    for (const milestone of milestones) {
      const key = `${buildingType}_${milestone.level}`;
      if (awardedIds.has(key)) continue;
      if (level < milestone.level) continue;

      newlyEarned.push(milestone);

      // Award resources
      if (milestone.reward.resources) {
        const guild = await prisma.guild.findUnique({ where: { id: guildId } });
        if (guild) {
          const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
          for (const [res, amt] of Object.entries(milestone.reward.resources)) {
            resources[res as ResourceType] = (resources[res as ResourceType] || 0) + (amt ?? 0);
          }
          await prisma.guild.update({
            where: { id: guildId },
            data: { resources: JSON.stringify(resources) },
          });
        }
      }

      if (milestone.reward.xp) {
        await GuildService.addXP(guildId, milestone.reward.xp);
      }

      await prisma.eventLog.create({
        data: {
          guildId,
          type: 'building_milestone',
          message: `Building milestone: ${milestone.reward.label}!`,
          data: JSON.stringify({ buildingType, level: milestone.level }),
        },
      });

      await GuildService.logActivity(
        guildId, 'milestone',
        `Building milestone: ${milestone.reward.label}!`,
      );
    }

    return newlyEarned;
  }

  /**
   * Process building events for all buildings in a guild (called periodically).
   */
  static async processBuildingEvents(guildId: string): Promise<void> {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { buildings: true },
    });
    if (!guild) return;

    const hour = new Date().getHours();
    const timeOfDay: 'day' | 'night' = hour >= 6 && hour < 18 ? 'day' : 'night';

    for (const building of guild.buildings) {
      if (building.level < 1) continue;

      const event = BuildingService.rollBuildingEvent(building.type as BuildingType, timeOfDay);
      if (!event) continue;

      const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;

      // Apply event effects
      if (event.effects.resourceGrant) {
        for (const [res, amt] of Object.entries(event.effects.resourceGrant)) {
          resources[res as ResourceType] = (resources[res as ResourceType] || 0) + (amt ?? 0);
        }
      }
      if (event.effects.resourceDrain) {
        for (const [res, amt] of Object.entries(event.effects.resourceDrain)) {
          resources[res as ResourceType] = Math.max(0, (resources[res as ResourceType] || 0) - (amt ?? 0));
        }
      }

      await prisma.guild.update({
        where: { id: guildId },
        data: { resources: JSON.stringify(resources) },
      });

      if (event.effects.xpGrant) {
        await GuildService.addXP(guildId, event.effects.xpGrant);
      }

      // Store active boost/penalty in building metadata
      if (event.effects.productionBoost || event.effects.productionPenalty) {
        const meta = building.metadata ? JSON.parse(building.metadata) : {};
        meta.activeEvent = {
          id: event.id,
          name: event.name,
          boost: event.effects.productionBoost ?? 0,
          penalty: event.effects.productionPenalty ?? 0,
          expiresAt: new Date(Date.now() + (event.effects.duration ?? 3600) * 1000).toISOString(),
        };
        if (event.effects.productionBoost) meta.boosted = true;
        if (event.effects.productionPenalty) meta.damaged = true;

        await prisma.building.update({
          where: { id: building.id },
          data: { metadata: JSON.stringify(meta) },
        });
      }

      await GuildService.logActivity(
        guildId, 'building_event',
        `${event.name} at ${BUILDING_DEFINITIONS[building.type as BuildingType]?.name}: ${event.description}`,
        { eventId: event.id, buildingType: building.type },
      );
    }
  }
}
