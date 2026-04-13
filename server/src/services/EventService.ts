/**
 * EventService — Enhanced event engine with rarity, cooldowns, chains,
 * seasonal/holiday events, difficulty/reward scaling, and statistics.
 *
 * T-0862: Event engine service with trigger, evaluate, resolve, expire
 * T-0863: Event trigger system checking conditions each game tick
 * T-0864: Event condition evaluator (time, weather, resource level, guild state)
 * T-0865: Event queue system managing concurrent events with priority
 * T-0868: Event outcome resolution based on player choice and RNG
 * T-0869: Event effect application (resource change, hero stat change, etc.)
 * T-0927: Seasonal event scheduling
 * T-0928: Holiday-specific event content
 * T-0929: Player-driven event system
 * T-0930: Event cooldown system
 * T-0931: Event rarity tiers
 * T-0932: Event prediction (Observatory)
 * T-0933: Event modifier stacking
 * T-0934: Event achievement system
 * T-0936: Event notification preferences
 * T-0938: Event countdown timer
 * T-0939: Reward scaling
 * T-0940: Difficulty scaling
 */
import { prisma } from '../db';
import { EVENT_TEMPLATES, type EventTemplate, type EventRarity } from '../data/eventTemplates';
import { SEASONAL_EVENTS, HOLIDAY_EVENTS } from '../data/seasonalEvents';
import { EventChainService } from './EventChainService';
import { WeatherService } from './WeatherService';
import { CalendarService } from './CalendarService';
import { v4 as uuid } from 'uuid';

/** Priority ordering for rarity (higher = generated first) */
const RARITY_PRIORITY: Record<EventRarity, number> = {
  legendary: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

/** Max concurrent events based on rarity mix */
const MAX_EVENTS_PER_DAY = 3;

export class EventService {
  /**
   * T-0862/T-0863: Generate events for a region based on current world state.
   * Now supports rarity filtering, cooldowns, seasonal/holiday events, and priority queuing.
   */
  static async generateEvents(regionId: string): Promise<void> {
    const worldState = await WeatherService.getWorldState(regionId);
    if (!worldState) return;

    const today = new Date().toISOString().split('T')[0];
    const state = await prisma.regionState.findUnique({
      where: { regionId_date: { regionId, date: today } },
    });
    if (!state) return;

    const existingEvents = JSON.parse(state.activeEvents) as any[];
    if (existingEvents.length > 0) return;

    const weather = worldState.weather;
    const modifiers = worldState.modifiers;
    const season = CalendarService.getCurrentSeason(regionId);
    const now = new Date();

    // Combine all template sources
    const allTemplates = this.getAllTemplates(season, now);

    // Sort by rarity priority (legendary first)
    allTemplates.sort((a, b) =>
      (RARITY_PRIORITY[b.rarity] || 1) - (RARITY_PRIORITY[a.rarity] || 1)
    );

    const newEvents: any[] = [];

    for (const template of allTemplates) {
      if (newEvents.length >= MAX_EVENTS_PER_DAY) break;

      // T-0864: Evaluate conditions
      if (!this.evaluateConditions(template, weather, modifiers, season)) continue;

      // T-0931: Apply rarity weight to chance
      const rarityWeight = EventChainService.getRarityWeight(template.rarity);
      const effectiveChance = template.trigger.chance * rarityWeight;
      if (Math.random() > effectiveChance) continue;

      // T-0930: Check cooldown (skip cooldown check for chain events with chance 1.0)
      if (template.trigger.chance < 1.0 && template.trigger.cooldownHours) {
        const onCooldown = await EventChainService.isOnCooldown(regionId, template.id);
        if (onCooldown) continue;
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + template.durationHours);

      newEvents.push({
        id: uuid(),
        templateId: template.id,
        type: template.chainId ? 'chain' : 'world',
        category: template.category,
        rarity: template.rarity,
        illustration: template.illustration || null,
        title: template.title,
        description: template.description,
        expiresAt: expiresAt.toISOString(),
        chainId: template.chainId || null,
        chainStep: template.chainStep || null,
        choices: template.choices.map(c => ({
          label: c.label,
          description: c.description,
          requires: c.requires || null,
          risk: c.risk,
          nextChainStep: c.nextChainStep || null,
        })),
      });

      // T-0930: Set cooldown
      if (template.trigger.cooldownHours) {
        await EventChainService.setCooldown(regionId, template.id, template.trigger.cooldownHours);
      }
    }

    if (newEvents.length > 0) {
      await prisma.regionState.update({
        where: { regionId_date: { regionId, date: today } },
        data: { activeEvents: JSON.stringify(newEvents) },
      });
    }
  }

  /**
   * T-0927/T-0928: Combine base templates, seasonal events, and holiday events.
   */
  private static getAllTemplates(season: string, now: Date): EventTemplate[] {
    const templates: EventTemplate[] = [...EVENT_TEMPLATES];

    // Add seasonal events for current season
    const seasonalSet = SEASONAL_EVENTS.find(s => s.season === season);
    if (seasonalSet) {
      templates.push(...seasonalSet.events);
    }

    // Add holiday events within their window
    const month = now.getMonth() + 1;
    const day = now.getDate();
    for (const holiday of HOLIDAY_EVENTS) {
      const dayDiff = Math.abs((month * 31 + day) - (holiday.month * 31 + holiday.day));
      if (dayDiff <= holiday.windowDays) {
        templates.push(holiday.event);
      }
    }

    return templates;
  }

  /**
   * T-0864: Evaluate event conditions against current world state.
   */
  private static evaluateConditions(
    template: EventTemplate,
    weather: any,
    modifiers: any,
    season: string,
  ): boolean {
    const trigger = template.trigger;

    if (trigger.weather && !trigger.weather.includes(weather.condition)) {
      return false;
    }

    if (trigger.minFloodRisk && modifiers.floodRisk < trigger.minFloodRisk) {
      return false;
    }

    if (trigger.season && !trigger.season.includes(season)) {
      return false;
    }

    if (trigger.minEssence) {
      // Would need guild context; skip for world-level generation
    }

    return true;
  }

  /**
   * Get active (non-expired) events for a region.
   * T-0938: Includes countdown timer data.
   */
  static async getActiveEvents(regionId: string): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const state = await prisma.regionState.findUnique({
      where: { regionId_date: { regionId, date: today } },
    });
    if (!state) return [];

    const events = JSON.parse(state.activeEvents) as any[];
    const now = new Date();

    return events
      .filter(e => new Date(e.expiresAt) > now && !e.resolved)
      .map(e => ({
        ...e,
        // T-0938: Add countdown data
        remainingMs: new Date(e.expiresAt).getTime() - now.getTime(),
        remainingHours: Math.max(0, (new Date(e.expiresAt).getTime() - now.getTime()) / 3600000),
      }));
  }

  /**
   * T-0868/T-0869: Resolve an event choice for a guild.
   * Enhanced with reward/difficulty scaling and chain progression.
   */
  static async resolveEvent(
    guildId: string,
    regionId: string,
    eventId: string,
    choiceIndex: number,
  ): Promise<{ success: boolean; narrative: string; rewards?: Record<string, number>; chainAdvanced?: boolean }> {
    const today = new Date().toISOString().split('T')[0];
    const state = await prisma.regionState.findUnique({
      where: { regionId_date: { regionId, date: today } },
    });
    if (!state) throw new Error('No world state found');

    const events = JSON.parse(state.activeEvents) as any[];
    const event = events.find((e: any) => e.id === eventId);
    if (!event) throw new Error('Event not found');
    if (event.resolved) throw new Error('Event already resolved');

    const template = this.findTemplate(event.templateId);
    if (!template) throw new Error('Event template not found');

    const choice = template.choices[choiceIndex];
    if (!choice) throw new Error('Invalid choice');

    // Check requirements
    const guild = await prisma.guild.findUnique({ where: { id: guildId }, include: { heroes: true } });
    if (!guild) throw new Error('Guild not found');

    const resources = JSON.parse(guild.resources) as Record<string, number>;
    const guildLevel = (guild as any).level || 1;

    if (choice.requires) {
      if (choice.requires.heroRole) {
        const matchingHeroes = guild.heroes.filter(h => h.role === choice.requires!.heroRole && h.status !== 'expedition');
        if (matchingHeroes.length < (choice.requires.heroCount || 1)) {
          throw new Error(`Need ${choice.requires.heroCount || 1} available ${choice.requires.heroRole}(s)`);
        }
      }
      if (choice.requires.resource && choice.requires.amount) {
        if ((resources[choice.requires.resource] || 0) < choice.requires.amount) {
          throw new Error(`Not enough ${choice.requires.resource}`);
        }
        resources[choice.requires.resource] -= choice.requires.amount;
      }
    }

    // T-0940: Scale difficulty
    const scaledRisk = EventChainService.scaleDifficulty(choice.risk, guildLevel);

    // T-0933: Apply stacked modifiers
    const stackedMods = EventChainService.calculateStackedModifiers(events);

    // Roll for success with scaled difficulty
    const success = Math.random() > (scaledRisk + stackedMods.riskModifier);

    // T-0939: Scale rewards
    if (success && choice.rewards.resources) {
      const scaled = EventChainService.scaleRewards(
        { resources: choice.rewards.resources },
        guildLevel,
      );
      const scaledResources = scaled.resources || {};

      for (const [res, amount] of Object.entries(scaledResources)) {
        const adjusted = Math.round(amount * stackedMods.resourceMultiplier);
        resources[res] = (resources[res] || 0) + adjusted;
      }
    }

    // Save updated resources
    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    // Mark event as resolved
    event.resolved = true;
    event.chosenIndex = choiceIndex;
    event.success = success;
    await prisma.regionState.update({
      where: { regionId_date: { regionId, date: today } },
      data: { activeEvents: JSON.stringify(events) },
    });

    // T-0921: Advance chain if applicable
    let chainAdvanced = false;
    if (success && event.chainId && choice.nextChainStep) {
      const nextTemplate = await EventChainService.advanceChain(
        guildId,
        event.chainId,
        choiceIndex,
        success,
        choice.nextChainStep,
      );
      chainAdvanced = nextTemplate !== null;
    }

    // Log the event
    await prisma.eventLog.create({
      data: {
        guildId,
        type: 'event_resolved',
        message: success ? choice.rewards.narrative : choice.failNarrative,
        data: JSON.stringify({
          eventId,
          templateId: event.templateId,
          category: event.category || template.category,
          rarity: event.rarity || template.rarity,
          choiceIndex,
          success,
          rewards: success ? choice.rewards.resources : null,
          chainId: event.chainId || null,
          chainStep: event.chainStep || null,
        }),
      },
    });

    return {
      success,
      narrative: success ? choice.rewards.narrative : choice.failNarrative,
      rewards: success ? choice.rewards.resources : undefined,
      chainAdvanced,
    };
  }

  /**
   * T-0932: Predict upcoming events for the Observatory building.
   * Returns templates likely to fire based on current conditions.
   */
  static async predictUpcoming(regionId: string): Promise<Array<{
    id: string;
    title: string;
    category: string;
    rarity: string;
    likelihood: string;
  }>> {
    const worldState = await WeatherService.getWorldState(regionId);
    if (!worldState) return [];

    const season = CalendarService.getCurrentSeason(regionId);
    const now = new Date();
    const templates = this.getAllTemplates(season, now);
    const predictions: Array<{ id: string; title: string; category: string; rarity: string; likelihood: string }> = [];

    for (const t of templates) {
      if (!this.evaluateConditions(t, worldState.weather, worldState.modifiers, season)) continue;

      const weight = EventChainService.getRarityWeight(t.rarity);
      const chance = t.trigger.chance * weight;

      let likelihood: string;
      if (chance >= 0.2) likelihood = 'Likely';
      else if (chance >= 0.1) likelihood = 'Possible';
      else if (chance >= 0.03) likelihood = 'Unlikely';
      else likelihood = 'Very Rare';

      predictions.push({
        id: t.id,
        title: t.title,
        category: t.category,
        rarity: t.rarity,
        likelihood,
      });
    }

    return predictions.slice(0, 10);
  }

  /**
   * T-0934: Get event achievements for a guild.
   * Tracks which event categories and rarities the guild has experienced.
   */
  static async getEventAchievements(guildId: string): Promise<{
    categoriesExperienced: string[];
    raritiesExperienced: string[];
    totalEventsResolved: number;
    uniqueTemplatesResolved: number;
    chainsCompleted: number;
  }> {
    const logs = await prisma.eventLog.findMany({
      where: { guildId, type: 'event_resolved' },
    });

    const categories = new Set<string>();
    const rarities = new Set<string>();
    const templateIds = new Set<string>();
    let chainsCompleted = 0;

    for (const log of logs) {
      if (!log.data) continue;
      try {
        const data = JSON.parse(log.data);
        if (data.category) categories.add(data.category);
        if (data.rarity) rarities.add(data.rarity);
        if (data.templateId) templateIds.add(data.templateId);
      } catch {
        // skip
      }
    }

    return {
      categoriesExperienced: Array.from(categories),
      raritiesExperienced: Array.from(rarities),
      totalEventsResolved: logs.length,
      uniqueTemplatesResolved: templateIds.size,
      chainsCompleted,
    };
  }

  /**
   * T-0935: Get event statistics for a guild.
   */
  static async getEventStats(guildId: string): Promise<{
    totalEvents: number;
    successRate: number;
    mostCommonCategory: string;
    bestOutcome: string | null;
    totalRewardsEarned: Record<string, number>;
    eventsByCategory: Record<string, number>;
    eventsByRarity: Record<string, number>;
  }> {
    const logs = await prisma.eventLog.findMany({
      where: { guildId, type: 'event_resolved' },
    });

    let successes = 0;
    const byCategory: Record<string, number> = {};
    const byRarity: Record<string, number> = {};
    const totalRewards: Record<string, number> = {};
    let bestRewardValue = 0;
    let bestOutcome: string | null = null;

    for (const log of logs) {
      if (!log.data) continue;
      try {
        const data = JSON.parse(log.data);
        if (data.success) successes++;

        const cat = data.category || 'unknown';
        byCategory[cat] = (byCategory[cat] || 0) + 1;

        const rar = data.rarity || 'common';
        byRarity[rar] = (byRarity[rar] || 0) + 1;

        if (data.success && data.rewards) {
          let rewardValue = 0;
          for (const [res, amount] of Object.entries(data.rewards)) {
            const numAmount = Number(amount);
            totalRewards[res] = (totalRewards[res] || 0) + numAmount;
            rewardValue += numAmount;
          }
          if (rewardValue > bestRewardValue) {
            bestRewardValue = rewardValue;
            bestOutcome = log.message;
          }
        }
      } catch {
        // skip
      }
    }

    // Find most common category
    let mostCommonCategory = 'none';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(byCategory)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonCategory = cat;
      }
    }

    return {
      totalEvents: logs.length,
      successRate: logs.length > 0 ? successes / logs.length : 0,
      mostCommonCategory,
      bestOutcome,
      totalRewardsEarned: totalRewards,
      eventsByCategory: byCategory,
      eventsByRarity: byRarity,
    };
  }

  /**
   * Find a template by id across all sources.
   */
  private static findTemplate(templateId: string): EventTemplate | undefined {
    // Check base templates
    const base = EVENT_TEMPLATES.find(t => t.id === templateId);
    if (base) return base;

    // Check seasonal events
    for (const set of SEASONAL_EVENTS) {
      const found = set.events.find(t => t.id === templateId);
      if (found) return found;
    }

    // Check holiday events
    const holiday = HOLIDAY_EVENTS.find(h => h.event.id === templateId);
    if (holiday) return holiday.event;

    // Check chain events
    const { EVENT_CHAINS } = require('../data/eventChains');
    for (const chain of EVENT_CHAINS) {
      for (const step of Object.values(chain.steps) as EventTemplate[]) {
        if (step.id === templateId) return step;
      }
    }

    return undefined;
  }
}
