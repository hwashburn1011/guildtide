import { prisma } from '../db';
import {
  RESEARCH_NODES,
  RESEARCH_MAP,
  BRANCH_COMPLETION_BONUSES,
  RESEARCH_MILESTONES,
  RESEARCH_SYNERGIES,
  SEASONAL_RESEARCH_MODIFIERS,
  type ResearchNode,
  type BranchCompletionBonus,
  type ResearchMilestone,
  type ResearchSynergy,
  ResearchBranch,
  getNodesForBranch,
  getBranchCompletion,
  getOverallCompletion,
  suggestNextResearch,
} from '../data/researchData';
import { ResearchService, type ActiveResearch } from './ResearchService';

// ── Research events (T-0644, T-0645, T-0659) ──

export interface ResearchEvent {
  id: string;
  type: 'boost' | 'breakthrough' | 'discovery';
  title: string;
  description: string;
  effects: Record<string, number>;
  duration?: number; // seconds, if temporary
}

const RESEARCH_EVENTS: ResearchEvent[] = [
  {
    id: 'scholar_boost',
    type: 'boost',
    title: 'Scholar Assigned',
    description: 'A Scholar hero is assisting — research time reduced by 10%.',
    effects: { research_time_reduction: 0.10 },
  },
  {
    id: 'breakthrough',
    type: 'breakthrough',
    title: 'Breakthrough!',
    description: 'A moment of genius — one research node instantly completed!',
    effects: { instant_complete: 1 },
  },
  {
    id: 'ancient_library',
    type: 'discovery',
    title: 'Ancient Library Discovered',
    description: 'An ancient library reduces all research costs by 20% for 24 hours.',
    effects: { cost_reduction: 0.20 },
    duration: 86400,
  },
  // T-0671: Real-world triggered events
  {
    id: 'market_crash_boost',
    type: 'boost',
    title: 'Market Instability',
    description: 'Economic turmoil drives scholars to innovate — Economic branch +25% speed.',
    effects: { economic_branch_speed: 0.25 },
    duration: 43200,
  },
  {
    id: 'celestial_alignment',
    type: 'boost',
    title: 'Celestial Alignment',
    description: 'The stars align to empower arcane research — Arcane branch +30% speed.',
    effects: { arcane_branch_speed: 0.30 },
    duration: 21600,
  },
  {
    id: 'border_conflict',
    type: 'boost',
    title: 'Border Conflict',
    description: 'Tensions at the border spur military innovation — Combat branch +20% speed.',
    effects: { combat_branch_speed: 0.20 },
    duration: 43200,
  },
];

// ── Research queue (T-0639) ──

export interface ResearchQueueItem {
  researchId: string;
  addedAt: number;
}

// ── Research history entry (T-0665, timeline) ──

export interface ResearchHistoryEntry {
  researchId: string;
  completedAt: number;
  branch: string;
  name: string;
}

// ── Collaborative research (T-0668) ──

export interface ResearchContribution {
  playerId: string;
  playerName: string;
  points: number;
  timestamp: number;
}

// ── Advanced research state ──

export interface AdvancedResearchState {
  completed: string[];
  active: (ActiveResearch & { remainingSeconds: number; node: ResearchNode }) | null;
  available: ResearchNode[];
  tree: ResearchNode[];
  queue: ResearchQueueItem[];
  branchStats: Record<string, { total: number; done: number; percent: number }>;
  activeBonuses: BranchCompletionBonus[];
  activeSynergies: ResearchSynergy[];
  milestones: Array<ResearchMilestone & { achieved: boolean }>;
  overallPercent: number;
  activeEvents: ResearchEvent[];
  history: ResearchHistoryEntry[];
  advisor: ResearchNode | null;
  speedModifier: number;
  contributions: ResearchContribution[];
  season: string;
}

export class ResearchAdvancedService {
  /**
   * Get full advanced research state (T-0646, T-0650, T-0651, T-0652, T-0666, T-0674)
   */
  static async getAdvancedState(guildId: string, season: string = 'spring'): Promise<AdvancedResearchState> {
    const baseState = await ResearchService.getResearchState(guildId);
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    const resources: Record<string, any> = JSON.parse(guild.resources || '{}');
    const completed = baseState.completed;

    // Queue
    const queue: ResearchQueueItem[] = resources.__researchQueue || [];

    // Branch stats (T-0646)
    const branches = Object.values(ResearchBranch).filter((b) => b !== ResearchBranch.Mastery);
    const branchStats: Record<string, { total: number; done: number; percent: number }> = {};
    for (const branch of branches) {
      const nodes = getNodesForBranch(branch);
      const done = nodes.filter((n) => completed.includes(n.id)).length;
      branchStats[branch] = { total: nodes.length, done, percent: nodes.length > 0 ? done / nodes.length : 0 };
    }

    // Branch completion bonuses (active ones)
    const activeBonuses = BRANCH_COMPLETION_BONUSES.filter((b) => {
      return getBranchCompletion(b.branch, completed) >= 1.0;
    });

    // Synergies (T-0650)
    const activeSynergies = RESEARCH_SYNERGIES.filter((syn) => {
      const countA = getNodesForBranch(syn.branchA).filter((n) => completed.includes(n.id)).length;
      const countB = getNodesForBranch(syn.branchB).filter((n) => completed.includes(n.id)).length;
      return countA >= syn.minNodesEach && countB >= syn.minNodesEach;
    });

    // Milestones (T-0651)
    const overallPercent = getOverallCompletion(completed) * 100;
    const milestones = RESEARCH_MILESTONES.map((m) => ({
      ...m,
      achieved: overallPercent >= m.percent,
    }));

    // Active events
    const storedEvents: ResearchEvent[] = resources.__researchEvents || [];
    const activeEvents = storedEvents.filter((e) => {
      if (!e.duration) return true;
      const eventStart = (resources.__researchEventStarts || {})[e.id] || 0;
      return Date.now() / 1000 - eventStart < e.duration;
    });

    // History
    const history: ResearchHistoryEntry[] = resources.__researchHistory || [];

    // Advisor (T-0652)
    const advisor = suggestNextResearch(completed, baseState.available);

    // Speed modifier (T-0674) — aggregate from Library building, seasonal, events
    let speedModifier = 1.0;
    // Seasonal modifier (T-0666)
    const seasonalMods = SEASONAL_RESEARCH_MODIFIERS[season] || {};
    if (baseState.active) {
      const activeBranch = baseState.active.node.branch;
      if (seasonalMods[activeBranch]) {
        speedModifier += seasonalMods[activeBranch];
      }
    }
    // Research speed from completed nodes
    for (const id of completed) {
      const node = RESEARCH_MAP.get(id);
      if (node?.effects['research_speed']) {
        speedModifier += node.effects['research_speed'];
      }
    }
    // Event-based speed modifiers
    for (const event of activeEvents) {
      if (event.effects['research_time_reduction']) {
        speedModifier += event.effects['research_time_reduction'];
      }
    }

    // Contributions (T-0668)
    const contributions: ResearchContribution[] = resources.__researchContributions || [];

    return {
      completed,
      active: baseState.active,
      available: baseState.available,
      tree: baseState.tree,
      queue,
      branchStats,
      activeBonuses,
      activeSynergies,
      milestones,
      overallPercent,
      activeEvents,
      history,
      advisor,
      speedModifier,
      contributions,
      season,
    };
  }

  /**
   * Queue a research node (T-0639)
   */
  static async queueResearch(guildId: string, researchId: string): Promise<ResearchQueueItem[]> {
    const node = RESEARCH_MAP.get(researchId);
    if (!node) throw new Error('Unknown research');

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    const resources: Record<string, any> = JSON.parse(guild.resources || '{}');
    const queue: ResearchQueueItem[] = resources.__researchQueue || [];

    // Max queue size of 5
    if (queue.length >= 5) throw new Error('Research queue is full (max 5)');

    // Don't allow duplicates in queue
    if (queue.some((q) => q.researchId === researchId)) {
      throw new Error('Already in queue');
    }

    // Don't queue completed research
    const completed: string[] = JSON.parse(guild.researchIds || '[]');
    if (completed.includes(researchId)) throw new Error('Already researched');

    queue.push({ researchId, addedAt: Date.now() });
    resources.__researchQueue = queue;

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    return queue;
  }

  /**
   * Remove a research from the queue
   */
  static async dequeueResearch(guildId: string, researchId: string): Promise<ResearchQueueItem[]> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    const resources: Record<string, any> = JSON.parse(guild.resources || '{}');
    const queue: ResearchQueueItem[] = resources.__researchQueue || [];

    resources.__researchQueue = queue.filter((q) => q.researchId !== researchId);

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    return resources.__researchQueue;
  }

  /**
   * Cancel active research with partial refund (T-0641)
   */
  static async cancelResearch(guildId: string): Promise<{ refunded: Record<string, number> }> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    const resources: Record<string, any> = JSON.parse(guild.resources || '{}');
    const active: ActiveResearch | null = resources.__activeResearch || null;
    if (!active) throw new Error('No active research to cancel');

    const node = RESEARCH_MAP.get(active.researchId);
    if (!node) throw new Error('Unknown research node');

    // 50% refund
    const refunded: Record<string, number> = {};
    for (const [res, amt] of Object.entries(node.cost.resources)) {
      const refundAmt = Math.floor((amt as number) * 0.50);
      resources[res] = (resources[res] || 0) + refundAmt;
      refunded[res] = refundAmt;
    }

    delete resources.__activeResearch;

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    return { refunded };
  }

  /**
   * Undo last research within 5-minute grace period (T-0669)
   */
  static async undoLastResearch(guildId: string): Promise<{ undone: string; refunded: Record<string, number> }> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    const resources: Record<string, any> = JSON.parse(guild.resources || '{}');
    const history: ResearchHistoryEntry[] = resources.__researchHistory || [];

    if (history.length === 0) throw new Error('No research history to undo');

    const last = history[history.length - 1];
    const gracePeriod = 5 * 60 * 1000; // 5 minutes in ms
    if (Date.now() - last.completedAt > gracePeriod) {
      throw new Error('Grace period expired (5 minutes)');
    }

    const node = RESEARCH_MAP.get(last.researchId);
    if (!node) throw new Error('Unknown research node');

    // Remove from completed
    const completed: string[] = JSON.parse(guild.researchIds || '[]');
    const idx = completed.indexOf(last.researchId);
    if (idx >= 0) completed.splice(idx, 1);

    // Full refund on undo
    const refunded: Record<string, number> = {};
    for (const [res, amt] of Object.entries(node.cost.resources)) {
      resources[res] = (resources[res] || 0) + (amt as number);
      refunded[res] = amt as number;
    }

    // Remove from history
    history.pop();
    resources.__researchHistory = history;

    await prisma.guild.update({
      where: { id: guildId },
      data: {
        researchIds: JSON.stringify(completed),
        resources: JSON.stringify(resources),
      },
    });

    return { undone: last.researchId, refunded };
  }

  /**
   * Contribute research points from a guild member (T-0668)
   */
  static async contributeResearch(
    guildId: string,
    playerId: string,
    playerName: string,
    points: number,
  ): Promise<ResearchContribution[]> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    const resources: Record<string, any> = JSON.parse(guild.resources || '{}');
    const contributions: ResearchContribution[] = resources.__researchContributions || [];

    contributions.push({ playerId, playerName, points, timestamp: Date.now() });

    // Apply points: reduce active research time
    const active: ActiveResearch | null = resources.__activeResearch || null;
    if (active) {
      // Each point reduces 1 second
      active.duration = Math.max(1, active.duration - points);
      resources.__activeResearch = active;
    }

    resources.__researchContributions = contributions;

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    return contributions;
  }

  /**
   * Trigger a random research event (T-0644, T-0645, T-0659)
   */
  static async triggerResearchEvent(guildId: string, eventId: string): Promise<ResearchEvent> {
    const event = RESEARCH_EVENTS.find((e) => e.id === eventId);
    if (!event) throw new Error('Unknown research event');

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    const resources: Record<string, any> = JSON.parse(guild.resources || '{}');

    if (event.type === 'breakthrough') {
      // Instantly complete active research
      const active: ActiveResearch | null = resources.__activeResearch || null;
      if (active) {
        const completed: string[] = JSON.parse(guild.researchIds || '[]');
        completed.push(active.researchId);

        const node = RESEARCH_MAP.get(active.researchId);
        const history: ResearchHistoryEntry[] = resources.__researchHistory || [];
        if (node) {
          history.push({
            researchId: active.researchId,
            completedAt: Date.now(),
            branch: node.branch,
            name: node.name,
          });
        }
        resources.__researchHistory = history;
        delete resources.__activeResearch;

        await prisma.guild.update({
          where: { id: guildId },
          data: {
            researchIds: JSON.stringify(completed),
            resources: JSON.stringify(resources),
          },
        });

        return event;
      }
    }

    // Store event
    const events: ResearchEvent[] = resources.__researchEvents || [];
    events.push(event);
    resources.__researchEvents = events;

    if (event.duration) {
      const starts = resources.__researchEventStarts || {};
      starts[event.id] = Date.now() / 1000;
      resources.__researchEventStarts = starts;
    }

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    return event;
  }

  /**
   * Record research completion in history
   */
  static async recordCompletion(guildId: string, researchId: string): Promise<void> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return;

    const resources: Record<string, any> = JSON.parse(guild.resources || '{}');
    const node = RESEARCH_MAP.get(researchId);
    if (!node) return;

    const history: ResearchHistoryEntry[] = resources.__researchHistory || [];
    history.push({
      researchId,
      completedAt: Date.now(),
      branch: node.branch,
      name: node.name,
    });
    resources.__researchHistory = history;

    // Auto-start next from queue
    const queue: ResearchQueueItem[] = resources.__researchQueue || [];
    if (queue.length > 0) {
      resources.__researchQueue = queue;
      await prisma.guild.update({
        where: { id: guildId },
        data: { resources: JSON.stringify(resources) },
      });

      // Try starting next queued research
      const nextItem = queue[0];
      try {
        await ResearchService.startResearch(guildId, nextItem.researchId);
        // Remove from queue on success
        const updatedGuild = await prisma.guild.findUnique({ where: { id: guildId } });
        if (updatedGuild) {
          const updatedRes = JSON.parse(updatedGuild.resources || '{}');
          const updatedQueue: ResearchQueueItem[] = updatedRes.__researchQueue || [];
          updatedRes.__researchQueue = updatedQueue.filter((q) => q.researchId !== nextItem.researchId);
          await prisma.guild.update({
            where: { id: guildId },
            data: { resources: JSON.stringify(updatedRes) },
          });
        }
      } catch {
        // Queue item can't start yet — leave it
      }
    } else {
      await prisma.guild.update({
        where: { id: guildId },
        data: { resources: JSON.stringify(resources) },
      });
    }
  }

  /**
   * Get research tree search results (T-0647)
   */
  static searchNodes(query: string): ResearchNode[] {
    const q = query.toLowerCase();
    return RESEARCH_NODES.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.branch.toLowerCase().includes(q),
    );
  }

  /**
   * Get filtered nodes (T-0670)
   */
  static filterNodes(
    opts: { branch?: string; status?: string; effectType?: string },
    completed: string[],
    activeId?: string,
  ): ResearchNode[] {
    return RESEARCH_NODES.filter((n) => {
      if (opts.branch && n.branch !== opts.branch) return false;
      if (opts.status) {
        const isComplete = completed.includes(n.id);
        const isActive = n.id === activeId;
        const isAvailable = !isComplete && !isActive && n.prerequisites.every((p) => completed.includes(p));
        const isLocked = !isComplete && !isActive && !isAvailable;
        if (opts.status === 'completed' && !isComplete) return false;
        if (opts.status === 'active' && !isActive) return false;
        if (opts.status === 'available' && !isAvailable) return false;
        if (opts.status === 'locked' && !isLocked) return false;
      }
      if (opts.effectType) {
        const hasEffect = Object.keys(n.effects).some((k) => k.includes(opts.effectType!));
        if (!hasEffect) return false;
      }
      return true;
    });
  }

  /**
   * Get branch info for display (T-0678)
   */
  static getBranchEffects(branch: ResearchBranch, completed: string[]): Record<string, number> {
    const effects: Record<string, number> = {};
    const nodes = getNodesForBranch(branch);
    for (const node of nodes) {
      if (!completed.includes(node.id)) continue;
      for (const [k, v] of Object.entries(node.effects)) {
        effects[k] = (effects[k] || 0) + v;
      }
    }
    return effects;
  }

  /**
   * Get recommended path for a branch (T-0679)
   */
  static getRecommendedPath(branch: ResearchBranch, completed: string[]): ResearchNode[] {
    const nodes = getNodesForBranch(branch);
    const remaining = nodes.filter((n) => !completed.includes(n.id));
    // Sort by tier to get natural progression order
    remaining.sort((a, b) => a.tier - b.tier);
    return remaining;
  }

  /**
   * Check for prestige reset (T-0653)
   */
  static async prestigeReset(guildId: string): Promise<{ kept: string[]; prestigeLevel: number }> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    const completed: string[] = JSON.parse(guild.researchIds || '[]');
    const resources: Record<string, any> = JSON.parse(guild.resources || '{}');

    // Keep tier 1 nodes on prestige
    const kept = completed.filter((id) => {
      const node = RESEARCH_MAP.get(id);
      return node && node.tier <= 1;
    });

    const currentPrestige = resources.__prestigeLevel || 0;
    resources.__prestigeLevel = currentPrestige + 1;
    delete resources.__activeResearch;
    resources.__researchQueue = [];
    resources.__researchHistory = [];

    await prisma.guild.update({
      where: { id: guildId },
      data: {
        researchIds: JSON.stringify(kept),
        resources: JSON.stringify(resources),
      },
    });

    return { kept, prestigeLevel: currentPrestige + 1 };
  }

  /**
   * Branch specialization (T-0642, T-0643) — at tier 3, choose a sub-path
   */
  static async specialize(guildId: string, branch: string, subPath: string): Promise<{ specialization: string }> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    const completed: string[] = JSON.parse(guild.researchIds || '[]');
    const resources: Record<string, any> = JSON.parse(guild.resources || '{}');

    // Check tier 3 prerequisite: at least 3 nodes completed in this branch
    const branchNodes = getNodesForBranch(branch as ResearchBranch);
    const completedInBranch = branchNodes.filter((n) => completed.includes(n.id));
    if (completedInBranch.length < 3) {
      throw new Error('Need at least 3 completed nodes in this branch to specialize');
    }

    // Store specialization
    const specs = resources.__specializations || {};
    if (specs[branch]) throw new Error('Already specialized in this branch');
    specs[branch] = subPath;
    resources.__specializations = specs;

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    return { specialization: subPath };
  }

  /**
   * Get specializations for a guild
   */
  static async getSpecializations(guildId: string): Promise<Record<string, string>> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return {};
    const resources = JSON.parse(guild.resources || '{}');
    return resources.__specializations || {};
  }

  /**
   * Compare research trees between guilds (T-0658)
   */
  static async compareResearch(guildIdA: string, guildIdB: string): Promise<{
    guildA: { completed: string[]; percent: number };
    guildB: { completed: string[]; percent: number };
    shared: string[];
    uniqueA: string[];
    uniqueB: string[];
  }> {
    const [guildA, guildB] = await Promise.all([
      prisma.guild.findUnique({ where: { id: guildIdA } }),
      prisma.guild.findUnique({ where: { id: guildIdB } }),
    ]);

    const completedA: string[] = JSON.parse(guildA?.researchIds || '[]');
    const completedB: string[] = JSON.parse(guildB?.researchIds || '[]');

    const setA = new Set(completedA);
    const setB = new Set(completedB);

    const shared = completedA.filter((id) => setB.has(id));
    const uniqueA = completedA.filter((id) => !setB.has(id));
    const uniqueB = completedB.filter((id) => !setA.has(id));

    return {
      guildA: { completed: completedA, percent: getOverallCompletion(completedA) * 100 },
      guildB: { completed: completedB, percent: getOverallCompletion(completedB) * 100 },
      shared,
      uniqueA,
      uniqueB,
    };
  }

  /**
   * Export research tree as shareable data (T-0660)
   */
  static async exportTreeData(guildId: string): Promise<{
    guildName: string;
    completed: string[];
    percent: number;
    branchStats: Record<string, number>;
    timestamp: number;
  }> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    const completed: string[] = JSON.parse(guild.researchIds || '[]');
    const branchStats: Record<string, number> = {};
    const branches = Object.values(ResearchBranch);
    for (const branch of branches) {
      branchStats[branch] = getBranchCompletion(branch, completed) * 100;
    }

    return {
      guildName: guild.name,
      completed,
      percent: getOverallCompletion(completed) * 100,
      branchStats,
      timestamp: Date.now(),
    };
  }

  /**
   * Research notification preferences (T-0661)
   */
  static async setNotificationPrefs(
    guildId: string,
    prefs: { onComplete: boolean; onQueueAdvance: boolean; onEvent: boolean },
  ): Promise<typeof prefs> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    const resources: Record<string, any> = JSON.parse(guild.resources || '{}');
    resources.__researchNotifPrefs = prefs;

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    return prefs;
  }

  /**
   * A/B path comparison tool (T-0663)
   */
  static compareResearchPaths(
    pathA: string[],
    pathB: string[],
  ): {
    pathA: { nodes: ResearchNode[]; totalCost: Record<string, number>; totalTime: number; effects: Record<string, number> };
    pathB: { nodes: ResearchNode[]; totalCost: Record<string, number>; totalTime: number; effects: Record<string, number> };
  } {
    const calcPath = (ids: string[]) => {
      const nodes = ids.map((id) => RESEARCH_MAP.get(id)).filter(Boolean) as ResearchNode[];
      const totalCost: Record<string, number> = {};
      let totalTime = 0;
      const effects: Record<string, number> = {};

      for (const node of nodes) {
        for (const [k, v] of Object.entries(node.cost.resources)) {
          totalCost[k] = (totalCost[k] || 0) + (v as number);
        }
        totalTime += node.cost.timeSeconds;
        for (const [k, v] of Object.entries(node.effects)) {
          effects[k] = (effects[k] || 0) + v;
        }
      }

      return { nodes, totalCost, totalTime, effects };
    };

    return { pathA: calcPath(pathA), pathB: calcPath(pathB) };
  }
}
