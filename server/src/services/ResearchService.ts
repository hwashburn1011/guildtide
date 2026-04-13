import { prisma } from '../db.js';
import { RESEARCH_NODES, RESEARCH_MAP, type ResearchNode } from '../data/researchData.js';
import { ResourceType } from '../../../shared/src/enums.js';

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
    delete resources.__activeResearch;

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
