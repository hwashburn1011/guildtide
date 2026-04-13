/**
 * Advanced crafting service with recipe discovery, queue, quality, and success rates.
 * T-0696 through T-0705: Full crafting system.
 */
import { prisma } from '../db';
import { getItemTemplate, getCraftableTemplates } from '../data/itemTemplates';
import type { ItemTemplate } from '../data/itemTemplates';
import { ItemService } from './ItemService';
import { CraftingQuality, ResourceType } from '../../../shared/src/enums';

/** Crafting recipe stored server-side */
export interface CraftingRecipe {
  id: string;
  name: string;
  resultTemplateId: string;
  ingredients: Partial<Record<ResourceType, number>>;
  craftTimeSeconds: number;
  category: string;
  discoveryLevel: number;
}

/** Queue entry */
export interface CraftingQueueEntry {
  recipeId: string;
  startedAt: string;
  completesAt: string;
  quality: CraftingQuality;
}

/** History entry */
export interface CraftingHistoryEntry {
  recipeId: string;
  quality: CraftingQuality;
  craftedAt: string;
  resultTemplateId: string;
}

/** Craft state stored in guild metadata */
export interface CraftingState {
  discoveredRecipes: string[];
  queue: CraftingQueueEntry[];
  history: CraftingHistoryEntry[];
  totalCrafted: number;
}

function defaultCraftingState(): CraftingState {
  return { discoveredRecipes: [], queue: [], history: [], totalCrafted: 0 };
}

/** Build recipes from craftable item templates */
function buildRecipes(): CraftingRecipe[] {
  return getCraftableTemplates().map(t => ({
    id: `recipe_${t.id}`,
    name: t.name,
    resultTemplateId: t.id,
    ingredients: t.craftCost || {},
    craftTimeSeconds: getCraftTime(t),
    category: t.category,
    discoveryLevel: getDiscoveryLevel(t),
  }));
}

function getCraftTime(t: ItemTemplate): number {
  const rarityTimes: Record<string, number> = {
    common: 30,
    uncommon: 60,
    rare: 120,
    epic: 240,
    legendary: 480,
  };
  return rarityTimes[t.rarity] || 60;
}

function getDiscoveryLevel(t: ItemTemplate): number {
  const rarityLevels: Record<string, number> = {
    common: 0,
    uncommon: 0,
    rare: 3,
    epic: 5,
    legendary: 8,
  };
  return rarityLevels[t.rarity] || 0;
}

/** Determine crafting quality based on guild level and luck */
function rollQuality(guildLevel: number): CraftingQuality {
  const roll = Math.random() * 100;
  const fineChance = Math.min(25 + guildLevel * 2, 50);
  const masterworkChance = Math.min(5 + guildLevel, 20);

  if (roll < masterworkChance) return CraftingQuality.Masterwork;
  if (roll < masterworkChance + fineChance) return CraftingQuality.Fine;
  return CraftingQuality.Normal;
}

/** Check for critical success — bonus stats */
function isCriticalSuccess(guildLevel: number): boolean {
  const critChance = Math.min(5 + guildLevel * 0.5, 15);
  return Math.random() * 100 < critChance;
}

const ALL_RECIPES = buildRecipes();

export class CraftingService {
  /** Get all known recipes */
  static getAllRecipes(): CraftingRecipe[] {
    return ALL_RECIPES;
  }

  /** Get recipe by ID */
  static getRecipe(recipeId: string): CraftingRecipe | undefined {
    return ALL_RECIPES.find(r => r.id === recipeId);
  }

  /** Get crafting state from guild metadata */
  static getCraftingState(metadata: string | null): CraftingState {
    if (!metadata) return defaultCraftingState();
    try {
      const parsed = JSON.parse(metadata);
      return parsed.crafting || defaultCraftingState();
    } catch {
      return defaultCraftingState();
    }
  }

  /** Save crafting state into guild metadata */
  private static async saveCraftingState(guildId: string, state: CraftingState): Promise<void> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return;

    let meta: Record<string, unknown> = {};
    try {
      if (guild.metadata) meta = JSON.parse(guild.metadata);
    } catch { /* empty */ }

    meta.crafting = state;
    await prisma.guild.update({
      where: { id: guildId },
      data: { metadata: JSON.stringify(meta) },
    });
  }

  /** Discover a recipe */
  static async discoverRecipe(guildId: string, recipeId: string): Promise<CraftingState> {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) throw new Error(`Unknown recipe: ${recipeId}`);

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const state = this.getCraftingState(guild.metadata);
    if (!state.discoveredRecipes.includes(recipeId)) {
      state.discoveredRecipes.push(recipeId);
      await this.saveCraftingState(guildId, state);
    }
    return state;
  }

  /** Add item to crafting queue */
  static async queueCraft(guildId: string, recipeId: string): Promise<{ state: CraftingState; resources: Record<string, number> }> {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) throw new Error(`Unknown recipe: ${recipeId}`);

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const state = this.getCraftingState(guild.metadata);

    // Max queue size: 5
    if (state.queue.length >= 5) throw new Error('Crafting queue is full (max 5)');

    // Validate resources
    const resources = JSON.parse(guild.resources) as Record<string, number>;
    for (const [res, cost] of Object.entries(recipe.ingredients)) {
      const have = resources[res] || 0;
      if (have < cost!) throw new Error(`Not enough ${res}. Need ${cost}, have ${Math.floor(have)}`);
    }

    // Deduct resources
    for (const [res, cost] of Object.entries(recipe.ingredients)) {
      resources[res] = (resources[res] || 0) - cost!;
    }

    // Calculate start time (after last queue item or now)
    const now = Date.now();
    let startTime = now;
    if (state.queue.length > 0) {
      const lastEntry = state.queue[state.queue.length - 1];
      const lastEnd = new Date(lastEntry.completesAt).getTime();
      startTime = Math.max(now, lastEnd);
    }

    const quality = rollQuality(guild.level);
    const entry: CraftingQueueEntry = {
      recipeId,
      startedAt: new Date(startTime).toISOString(),
      completesAt: new Date(startTime + recipe.craftTimeSeconds * 1000).toISOString(),
      quality,
    };

    state.queue.push(entry);

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });
    await this.saveCraftingState(guildId, state);

    return { state, resources };
  }

  /** Collect completed items from queue */
  static async collectCompleted(guildId: string): Promise<{
    collected: Array<{ templateId: string; quality: CraftingQuality; criticalSuccess: boolean }>;
    state: CraftingState;
  }> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const state = this.getCraftingState(guild.metadata);
    const now = Date.now();
    const completed: CraftingQueueEntry[] = [];
    const remaining: CraftingQueueEntry[] = [];

    for (const entry of state.queue) {
      if (new Date(entry.completesAt).getTime() <= now) {
        completed.push(entry);
      } else {
        remaining.push(entry);
      }
    }

    const results: Array<{ templateId: string; quality: CraftingQuality; criticalSuccess: boolean }> = [];

    for (const entry of completed) {
      const recipe = this.getRecipe(entry.recipeId);
      if (!recipe) continue;

      const crit = isCriticalSuccess(guild.level);
      await ItemService.addItem(guildId, recipe.resultTemplateId, 1);

      state.history.push({
        recipeId: entry.recipeId,
        quality: entry.quality,
        craftedAt: new Date().toISOString(),
        resultTemplateId: recipe.resultTemplateId,
      });
      state.totalCrafted++;

      results.push({
        templateId: recipe.resultTemplateId,
        quality: entry.quality,
        criticalSuccess: crit,
      });
    }

    state.queue = remaining;
    // Keep only last 50 history entries
    if (state.history.length > 50) {
      state.history = state.history.slice(-50);
    }

    await this.saveCraftingState(guildId, state);

    return { collected: results, state };
  }

  /** Cancel a queue entry and refund resources */
  static async cancelQueueEntry(guildId: string, recipeId: string): Promise<{ state: CraftingState; refunded: Record<string, number> }> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    const state = this.getCraftingState(guild.metadata);
    const idx = state.queue.findIndex(e => e.recipeId === recipeId);
    if (idx === -1) throw new Error('Recipe not found in queue');

    const entry = state.queue[idx];
    // Only cancel if not yet completed
    if (new Date(entry.completesAt).getTime() <= Date.now()) {
      throw new Error('Item already crafted, collect it instead');
    }

    const recipe = this.getRecipe(recipeId);
    if (!recipe) throw new Error('Recipe not found');

    // Refund 80% of resources
    const resources = JSON.parse(guild.resources) as Record<string, number>;
    const refunded: Record<string, number> = {};
    for (const [res, cost] of Object.entries(recipe.ingredients)) {
      const refundAmt = Math.floor(cost! * 0.8);
      resources[res] = (resources[res] || 0) + refundAmt;
      refunded[res] = refundAmt;
    }

    state.queue.splice(idx, 1);

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });
    await this.saveCraftingState(guildId, state);

    return { state, refunded };
  }

  /** Get crafting history */
  static async getCraftingHistory(guildId: string): Promise<CraftingHistoryEntry[]> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return [];

    const state = this.getCraftingState(guild.metadata);
    return state.history;
  }

  /** Get material source info for a recipe */
  static getMaterialSources(recipeId: string): Array<{ resource: string; sources: string[] }> {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) return [];

    const sourceMappings: Record<string, string[]> = {
      [ResourceType.Ore]: ['Mine', 'Expeditions (caves)', 'Market'],
      [ResourceType.Wood]: ['Lumber Mill', 'Expeditions (forests)', 'Market'],
      [ResourceType.Stone]: ['Quarry', 'Expeditions', 'Market'],
      [ResourceType.Food]: ['Farm', 'Expeditions (hunting)', 'Market'],
      [ResourceType.Herbs]: ['Herb Garden', 'Expeditions (meadows)', 'Market'],
      [ResourceType.Water]: ['Well', 'Market'],
      [ResourceType.Gold]: ['Market trades', 'Expeditions', 'Selling items'],
      [ResourceType.Essence]: ['Laboratory', 'Expeditions (arcane)', 'Salvaging items'],
    };

    return Object.entries(recipe.ingredients).map(([resource]) => ({
      resource,
      sources: sourceMappings[resource] || ['Unknown'],
    }));
  }
}
