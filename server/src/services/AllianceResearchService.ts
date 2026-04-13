import { ResourceType } from '../../../shared/src/enums';
import type { Resources } from '../../../shared/src/types';

// Alliance-shared research tree
export interface AllianceResearchNode {
  id: string;
  name: string;
  description: string;
  cost: Partial<Record<ResourceType, number>>;
  effects: Record<string, number>;
  prerequisiteIds: string[];
  tier: number;
}

const ALLIANCE_RESEARCH_TREE: AllianceResearchNode[] = [
  {
    id: 'ar_shared_knowledge',
    name: 'Shared Knowledge',
    description: 'Increase XP gain for all members by 5%',
    cost: { [ResourceType.Gold]: 500, [ResourceType.Essence]: 20 },
    effects: { xpBonus: 0.05 },
    prerequisiteIds: [],
    tier: 1,
  },
  {
    id: 'ar_trade_network',
    name: 'Trade Network',
    description: 'Increase trade value for all members by 8%',
    cost: { [ResourceType.Gold]: 800, [ResourceType.Essence]: 30 },
    effects: { tradeBonus: 0.08 },
    prerequisiteIds: ['ar_shared_knowledge'],
    tier: 2,
  },
  {
    id: 'ar_expedition_tactics',
    name: 'Expedition Tactics',
    description: 'Increase expedition success rate by 10%',
    cost: { [ResourceType.Gold]: 1000, [ResourceType.Essence]: 50 },
    effects: { expeditionBonus: 0.10 },
    prerequisiteIds: ['ar_shared_knowledge'],
    tier: 2,
  },
  {
    id: 'ar_resource_efficiency',
    name: 'Resource Efficiency',
    description: 'Reduce resource costs by 5% for all members',
    cost: { [ResourceType.Gold]: 1500, [ResourceType.Essence]: 75 },
    effects: { costReduction: 0.05 },
    prerequisiteIds: ['ar_trade_network'],
    tier: 3,
  },
  {
    id: 'ar_war_machine',
    name: 'War Machine',
    description: 'Increase guild war score by 15%',
    cost: { [ResourceType.Gold]: 2000, [ResourceType.Essence]: 100 },
    effects: { warBonus: 0.15 },
    prerequisiteIds: ['ar_expedition_tactics'],
    tier: 3,
  },
  {
    id: 'ar_grand_alliance',
    name: 'Grand Alliance',
    description: '+20% all production for alliance members',
    cost: { [ResourceType.Gold]: 5000, [ResourceType.Essence]: 200 },
    effects: { productionBonus: 0.20 },
    prerequisiteIds: ['ar_resource_efficiency', 'ar_war_machine'],
    tier: 4,
  },
];

// In-memory store: allianceId -> completed research IDs
const allianceResearch: Map<string, Set<string>> = new Map();
const activeResearch: Map<string, { nodeId: string; startedAt: string; completesAt: string }> = new Map();

export class AllianceResearchService {
  static getResearchTree(): AllianceResearchNode[] {
    return ALLIANCE_RESEARCH_TREE;
  }

  static getCompletedResearch(allianceId: string): string[] {
    return Array.from(allianceResearch.get(allianceId) ?? []);
  }

  static getAvailableResearch(allianceId: string): AllianceResearchNode[] {
    const completed = allianceResearch.get(allianceId) ?? new Set();
    return ALLIANCE_RESEARCH_TREE.filter((node) => {
      if (completed.has(node.id)) return false;
      return node.prerequisiteIds.every((prereq) => completed.has(prereq));
    });
  }

  static getActiveResearch(allianceId: string): { nodeId: string; startedAt: string; completesAt: string } | null {
    return activeResearch.get(allianceId) ?? null;
  }

  static startResearch(allianceId: string, nodeId: string): { nodeId: string; startedAt: string; completesAt: string } {
    if (activeResearch.has(allianceId)) {
      throw new Error('Already researching something');
    }

    const available = AllianceResearchService.getAvailableResearch(allianceId);
    const node = available.find((n) => n.id === nodeId);
    if (!node) throw new Error('Research not available');

    const durationMs = node.tier * 2 * 60 * 60 * 1000; // tier * 2 hours
    const research = {
      nodeId,
      startedAt: new Date().toISOString(),
      completesAt: new Date(Date.now() + durationMs).toISOString(),
    };

    activeResearch.set(allianceId, research);
    return research;
  }

  static completeResearch(allianceId: string): AllianceResearchNode | null {
    const active = activeResearch.get(allianceId);
    if (!active) return null;

    if (new Date(active.completesAt).getTime() > Date.now()) {
      return null; // Not finished yet
    }

    const node = ALLIANCE_RESEARCH_TREE.find((n) => n.id === active.nodeId);
    if (!node) return null;

    if (!allianceResearch.has(allianceId)) {
      allianceResearch.set(allianceId, new Set());
    }
    allianceResearch.get(allianceId)!.add(active.nodeId);
    activeResearch.delete(allianceId);

    return node;
  }

  static getResearchEffects(allianceId: string): Record<string, number> {
    const completed = allianceResearch.get(allianceId) ?? new Set();
    const effects: Record<string, number> = {};

    for (const nodeId of completed) {
      const node = ALLIANCE_RESEARCH_TREE.find((n) => n.id === nodeId);
      if (node) {
        for (const [key, value] of Object.entries(node.effects)) {
          effects[key] = (effects[key] ?? 0) + value;
        }
      }
    }

    return effects;
  }
}
