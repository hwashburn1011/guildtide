import { prisma } from '../db';
import { RESEARCH_NODES, RESEARCH_MAP, type ResearchNode } from '../data/researchData';
import { ResourceType } from '../../../shared/src/enums';

export interface ActiveResearch {
  researchId: string;
  startTime: number; // epoch ms
  duration: number;  // seconds
}

export interface ResearchState {
  completed: string[];
  active: (ActiveResearch & { remainingSeconds: number; node: ResearchNode }) | null;
  available: ResearchNode[];
  tree: ResearchNode[];
}

/**
 * We store active research in the guild's resources JSON under a
 * special `__activeResearch` key to avoid a schema migration.
 */
export class ResearchService {
  // ── Public API ──

  static async getResearchState(guildId: string): Promise<ResearchState> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    // Auto-complete if elapsed
    await this.checkCompletion(guildId);

    // Re-fetch after possible completion
    const updated = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!updated) throw new Error('No guild found');

    const completed: string[] = JSON.parse(updated.researchIds || '[]');
    const resources = JSON.parse(updated.resources || '{}');
    const active: ActiveResearch | null = resources.__activeResearch || null;

    let activeWithMeta: ResearchState['active'] = null;
    if (active) {
      const node = RESEARCH_MAP.get(active.researchId);
      if (node) {
        const elapsed = (Date.now() - active.startTime) / 1000;
        const remaining = Math.max(0, active.duration - elapsed);
        activeWithMeta = { ...active, remainingSeconds: remaining, node };
      }
    }

    const available = RESEARCH_NODES.filter((n) => {
      if (completed.includes(n.id)) return false;
      if (active && active.researchId === n.id) return false;
      return n.prerequisites.every((p) => completed.includes(p));
    });

    return { completed, active: activeWithMeta, available, tree: RESEARCH_NODES };
  }

  static async startResearch(guildId: string, researchId: string): Promise<ResearchState> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('No guild found');

    // Complete any finished research first
    await this.checkCompletion(guildId);
    const refreshed = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!refreshed) throw new Error('No guild found');

    const completed: string[] = JSON.parse(refreshed.researchIds || '[]');
    const resources: Record<string, any> = JSON.parse(refreshed.resources || '{}');
    const active: ActiveResearch | null = resources.__activeResearch || null;

    // Validate
    const node = RESEARCH_MAP.get(researchId);
    if (!node) throw new Error('Unknown research');
    if (completed.includes(researchId)) throw new Error('Already researched');
    if (active) throw new Error('Another research is in progress');

    // Check prerequisites
    for (const prereq of node.prerequisites) {
      if (!completed.includes(prereq)) {
        throw new Error(`Prerequisite not met: ${RESEARCH_MAP.get(prereq)?.name || prereq}`);
      }
    }

    // Check & deduct resources
    for (const [res, amount] of Object.entries(node.cost.resources)) {
      const current = resources[res] || 0;
      if (current < (amount as number)) {
        throw new Error(`Not enough ${res} (need ${amount}, have ${Math.floor(current)})`);
      }
    }
    for (const [res, amount] of Object.entries(node.cost.resources)) {
      resources[res] = (resources[res] || 0) - (amount as number);
    }

    // Set active research
    const newActive: ActiveResearch = {
      researchId,
      startTime: Date.now(),
      duration: node.cost.timeSeconds,
    };
    (resources as any).__activeResearch = newActive;

    await prisma.guild.update({
      where: { id: guildId },
      data: { resources: JSON.stringify(resources) },
    });

    return this.getResearchState(guildId);
  }

  static async checkCompletion(guildId: string): Promise<boolean> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return false;

    const resources: Record<string, any> = JSON.parse(guild.resources || '{}');
    const active: ActiveResearch | null = resources.__activeResearch || null;
    if (!active) return false;

    const elapsed = (Date.now() - active.startTime) / 1000;
    if (elapsed < active.duration) return false;

    // Complete research
    const completed: string[] = JSON.parse(guild.researchIds || '[]');
    completed.push(active.researchId);

    // Record in history (T-0675)
    const node = RESEARCH_MAP.get(active.researchId);
    const history: Array<{ researchId: string; completedAt: number; branch: string; name: string }> =
      resources.__researchHistory || [];
    if (node) {
      history.push({
        researchId: active.researchId,
        completedAt: Date.now(),
        branch: node.branch,
        name: node.name,
      });
    }
    resources.__researchHistory = history;

    // Guild announcement (T-0680)
    const announcements: Array<{ type: string; message: string; timestamp: number }> =
      resources.__guildAnnouncements || [];
    if (node) {
      announcements.push({
        type: 'research_complete',
        message: `Research complete: ${node.name} — ${node.description}`,
        timestamp: Date.now(),
      });
      // Keep last 50 announcements
      if (announcements.length > 50) announcements.splice(0, announcements.length - 50);
    }
    resources.__guildAnnouncements = announcements;

    delete resources.__activeResearch;

    // Auto-start next queued research (T-0639)
    const queue: Array<{ researchId: string; addedAt: number }> = resources.__researchQueue || [];
    let autoStarted = false;
    if (queue.length > 0) {
      const next = queue[0];
      const nextNode = RESEARCH_MAP.get(next.researchId);
      if (nextNode && !completed.includes(next.researchId) &&
          nextNode.prerequisites.every((p) => completed.includes(p))) {
        // Check resources
        let canAfford = true;
        for (const [res, amount] of Object.entries(nextNode.cost.resources)) {
          if ((resources[res] || 0) < (amount as number)) { canAfford = false; break; }
        }
        if (canAfford) {
          for (const [res, amount] of Object.entries(nextNode.cost.resources)) {
            resources[res] = (resources[res] || 0) - (amount as number);
          }
          resources.__activeResearch = {
            researchId: next.researchId,
            startTime: Date.now(),
            duration: nextNode.cost.timeSeconds,
          };
          resources.__researchQueue = queue.slice(1);
          autoStarted = true;
        }
      }
      if (!autoStarted) {
        // Remove unaffordable/invalid item from queue head
        resources.__researchQueue = queue;
      }
    }

    await prisma.guild.update({
      where: { id: guildId },
      data: {
        researchIds: JSON.stringify(completed),
        resources: JSON.stringify(resources),
      },
    });

    return true;
  }
}
