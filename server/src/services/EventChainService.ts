/**
 * EventChainService — Manages multi-step event chain progression.
 *
 * T-0921: Event chain system linking related events in sequence
 * T-0923: Event chain progress tracker
 * T-0924: Branching narrative within events
 * T-0925: Event outcome memory system (past choices affect future events)
 * T-0926: Event reputation tracker
 * T-0929: Player-driven event system
 * T-0930: Event cooldown system
 * T-0931: Event rarity tiers
 * T-0933: Event modifier stacking rules
 * T-0939: Event reward scaling based on guild level
 * T-0940: Event difficulty scaling based on guild progression
 */
import { prisma } from '../db';
import { EVENT_CHAINS, type EventChain } from '../data/eventChains';
import type { EventTemplate, EventRarity } from '../data/eventTemplates';
import { v4 as uuid } from 'uuid';

/** Tracks active chains for a guild */
export interface ChainProgress {
  chainId: string;
  currentStep: number;
  completedSteps: number[];
  startedAt: string;
  lastStepAt: string;
  choiceHistory: Array<{ step: number; choiceIndex: number; success: boolean }>;
}

/** Reputation categories that accumulate based on event choices */
export interface EventReputation {
  merciful: number;
  ruthless: number;
  wise: number;
  bold: number;
  greedy: number;
  generous: number;
}

/** Cooldown entry for events */
export interface EventCooldown {
  templateId: string;
  expiresAt: string;
}

/** Rarity weights for event generation */
const RARITY_WEIGHTS: Record<EventRarity, number> = {
  common: 1.0,
  uncommon: 0.6,
  rare: 0.25,
  legendary: 0.08,
};

/** T-0939: Guild level reward scaling multipliers */
function getRewardScale(guildLevel: number): number {
  if (guildLevel <= 3) return 1.0;
  if (guildLevel <= 6) return 1.15;
  if (guildLevel <= 10) return 1.3;
  if (guildLevel <= 15) return 1.5;
  return 1.75;
}

/** T-0940: Guild level difficulty scaling (reduces success chance slightly) */
function getDifficultyScale(guildLevel: number): number {
  if (guildLevel <= 3) return 0;
  if (guildLevel <= 6) return 0.02;
  if (guildLevel <= 10) return 0.05;
  if (guildLevel <= 15) return 0.08;
  return 0.1;
}

export class EventChainService {
  /**
   * T-0921/T-0923: Get chain progress for a guild.
   */
  static async getChainProgress(guildId: string): Promise<ChainProgress[]> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return [];

    const raw = (guild as any).eventChains;
    if (!raw) return [];

    try {
      return JSON.parse(raw) as ChainProgress[];
    } catch {
      return [];
    }
  }

  /**
   * T-0921: Start a new chain for a guild.
   */
  static async startChain(guildId: string, chainId: string): Promise<ChainProgress | null> {
    const chain = EVENT_CHAINS.find(c => c.id === chainId);
    if (!chain) return null;

    const existing = await this.getChainProgress(guildId);
    if (existing.find(p => p.chainId === chainId)) return null; // Already active

    const progress: ChainProgress = {
      chainId,
      currentStep: 1,
      completedSteps: [],
      startedAt: new Date().toISOString(),
      lastStepAt: new Date().toISOString(),
      choiceHistory: [],
    };

    existing.push(progress);
    await this.saveChainProgress(guildId, existing);
    return progress;
  }

  /**
   * T-0924: Advance chain to the next step (supports branching via nextChainStep).
   */
  static async advanceChain(
    guildId: string,
    chainId: string,
    choiceIndex: number,
    success: boolean,
    nextStep?: number,
  ): Promise<EventTemplate | null> {
    const chains = await this.getChainProgress(guildId);
    const progress = chains.find(p => p.chainId === chainId);
    if (!progress) return null;

    const chain = EVENT_CHAINS.find(c => c.id === chainId);
    if (!chain) return null;

    // Record choice history
    progress.choiceHistory.push({
      step: progress.currentStep,
      choiceIndex,
      success,
    });
    progress.completedSteps.push(progress.currentStep);

    // Determine next step (branching narrative support)
    const targetStep = nextStep ?? progress.currentStep + 1;

    if (targetStep > chain.totalSteps || !chain.steps[targetStep]) {
      // Chain complete — remove from active
      const idx = chains.indexOf(progress);
      chains.splice(idx, 1);
      await this.saveChainProgress(guildId, chains);
      return null;
    }

    progress.currentStep = targetStep;
    progress.lastStepAt = new Date().toISOString();
    await this.saveChainProgress(guildId, chains);

    return chain.steps[targetStep];
  }

  /**
   * T-0925: Get choice history for a guild (past choices affect future events).
   */
  static async getChoiceHistory(guildId: string): Promise<Array<{
    chainId: string;
    step: number;
    choiceIndex: number;
    success: boolean;
  }>> {
    const chains = await this.getChainProgress(guildId);
    const history: Array<{ chainId: string; step: number; choiceIndex: number; success: boolean }> = [];

    for (const chain of chains) {
      for (const entry of chain.choiceHistory) {
        history.push({ chainId: chain.chainId, ...entry });
      }
    }

    return history;
  }

  /**
   * T-0926: Get event reputation for a guild.
   * Reputation is calculated from event log data.
   */
  static async getReputation(guildId: string): Promise<EventReputation> {
    const logs = await prisma.eventLog.findMany({
      where: { guildId, type: 'event_resolved' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const rep: EventReputation = {
      merciful: 0,
      ruthless: 0,
      wise: 0,
      bold: 0,
      greedy: 0,
      generous: 0,
    };

    for (const log of logs) {
      if (!log.data) continue;
      try {
        const data = JSON.parse(log.data);
        const templateId: string = data.templateId || '';
        const choiceIndex: number = data.choiceIndex ?? 0;

        // Classify choices based on patterns
        if (templateId.includes('plague') || templateId.includes('refugee')) {
          if (choiceIndex === 0) rep.merciful += 1; // Help first
          if (choiceIndex === 2) rep.ruthless += 1; // Turn away
        }
        if (templateId.includes('scholar') || templateId.includes('prophecy') || templateId.includes('study')) {
          rep.wise += 1;
        }
        if (templateId.includes('dragon') || templateId.includes('monster') || templateId.includes('duel')) {
          if (choiceIndex === 0) rep.bold += 1; // Fight
        }
        if (templateId.includes('black_market') || templateId.includes('treasure')) {
          if (choiceIndex === 1) rep.greedy += 1; // Sell
          if (choiceIndex === 0) rep.bold += 1; // Explore
        }
        if (templateId.includes('festival') || templateId.includes('feast') || templateId.includes('circus')) {
          rep.generous += 1;
        }
      } catch {
        // Skip unparseable logs
      }
    }

    return rep;
  }

  /**
   * T-0930: Check if an event template is on cooldown for a region.
   */
  static async isOnCooldown(regionId: string, templateId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const state = await prisma.regionState.findUnique({
      where: { regionId_date: { regionId, date: today } },
    });
    if (!state) return false;

    try {
      const cooldowns: EventCooldown[] = JSON.parse((state as any).eventCooldowns || '[]');
      const now = new Date();
      return cooldowns.some(c => c.templateId === templateId && new Date(c.expiresAt) > now);
    } catch {
      return false;
    }
  }

  /**
   * T-0930: Set a cooldown for an event template.
   */
  static async setCooldown(regionId: string, templateId: string, hours: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const state = await prisma.regionState.findUnique({
      where: { regionId_date: { regionId, date: today } },
    });
    if (!state) return;

    let cooldowns: EventCooldown[] = [];
    try {
      cooldowns = JSON.parse((state as any).eventCooldowns || '[]');
    } catch {
      cooldowns = [];
    }

    // Remove expired cooldowns
    const now = new Date();
    cooldowns = cooldowns.filter(c => new Date(c.expiresAt) > now);

    // Add new cooldown
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);
    cooldowns.push({ templateId, expiresAt: expiresAt.toISOString() });

    await prisma.regionState.update({
      where: { regionId_date: { regionId, date: today } },
      data: { eventCooldowns: JSON.stringify(cooldowns) } as any,
    });
  }

  /**
   * T-0931: Get rarity weight for event generation.
   */
  static getRarityWeight(rarity: EventRarity): number {
    return RARITY_WEIGHTS[rarity];
  }

  /**
   * T-0933: Calculate stacked event modifiers from multiple active events.
   */
  static calculateStackedModifiers(activeEvents: any[]): {
    resourceMultiplier: number;
    xpMultiplier: number;
    riskModifier: number;
  } {
    let resourceMultiplier = 1.0;
    let xpMultiplier = 1.0;
    let riskModifier = 0;

    // Each active event provides small bonuses
    const eventCount = activeEvents.filter((e: any) => !e.resolved).length;
    if (eventCount > 1) {
      // Multiple active events provide diminishing returns
      resourceMultiplier += (eventCount - 1) * 0.05;
      xpMultiplier += (eventCount - 1) * 0.03;
      riskModifier += (eventCount - 1) * 0.02;
    }

    return { resourceMultiplier, xpMultiplier, riskModifier };
  }

  /**
   * T-0939: Scale event rewards based on guild level.
   */
  static scaleRewards(
    rewards: { resources?: Record<string, number>; xp?: number },
    guildLevel: number,
  ): { resources?: Record<string, number>; xp?: number } {
    const scale = getRewardScale(guildLevel);
    const scaled: { resources?: Record<string, number>; xp?: number } = {};

    if (rewards.resources) {
      scaled.resources = {};
      for (const [key, value] of Object.entries(rewards.resources)) {
        scaled.resources[key] = Math.round(value * scale);
      }
    }

    if (rewards.xp) {
      scaled.xp = Math.round(rewards.xp * scale);
    }

    return scaled;
  }

  /**
   * T-0940: Scale event difficulty based on guild progression.
   */
  static scaleDifficulty(baseRisk: number, guildLevel: number): number {
    const extraRisk = getDifficultyScale(guildLevel);
    return Math.min(0.95, baseRisk + extraRisk);
  }

  /**
   * Get all available chain definitions.
   */
  static getChainDefinitions(): Array<{ id: string; title: string; description: string; totalSteps: number }> {
    return EVENT_CHAINS.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      totalSteps: c.totalSteps,
    }));
  }

  /**
   * Get the next chain event template for a guild.
   */
  static async getNextChainEvent(guildId: string, chainId: string): Promise<EventTemplate | null> {
    const chains = await this.getChainProgress(guildId);
    const progress = chains.find(p => p.chainId === chainId);
    if (!progress) return null;

    const chain = EVENT_CHAINS.find(c => c.id === chainId);
    if (!chain) return null;

    return chain.steps[progress.currentStep] || null;
  }

  private static async saveChainProgress(guildId: string, chains: ChainProgress[]): Promise<void> {
    await prisma.guild.update({
      where: { id: guildId },
      data: { eventChains: JSON.stringify(chains) } as any,
    });
  }
}
