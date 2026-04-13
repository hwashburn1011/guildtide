import { prisma } from '../db';
import { ExpeditionStatus, ResourceType } from '../../../shared/src/enums';
import type {
  JointExpedition,
  JointExpeditionParticipant,
  JointExpeditionResult,
  Resources,
} from '../../../shared/src/types';

// In-memory store for joint expeditions
const jointExpeditions: Map<string, JointExpedition> = new Map();

let idCounter = 1;
function genId(): string {
  return `jexp_${Date.now()}_${idCounter++}`;
}

export class JointExpeditionService {
  /**
   * Create a joint expedition initiated by a guild within an alliance.
   */
  static async createJointExpedition(
    initiatorGuildId: string,
    allianceId: string,
    destination: string,
    heroIds: string[],
    durationHours: number,
  ): Promise<JointExpedition> {
    const guild = await prisma.guild.findUnique({ where: { id: initiatorGuildId } });
    if (!guild) throw new Error('Guild not found');

    const expedition: JointExpedition = {
      id: genId(),
      initiatorGuildId,
      initiatorGuildName: guild.name,
      allianceId,
      participants: [
        {
          guildId: initiatorGuildId,
          guildName: guild.name,
          heroIds,
          contribution: 0,
        },
      ],
      destination,
      startedAt: new Date().toISOString(),
      duration: durationHours * 3600,
      status: ExpeditionStatus.Active,
      result: null,
    };

    jointExpeditions.set(expedition.id, expedition);
    return expedition;
  }

  /**
   * Join an existing joint expedition as an allied guild.
   */
  static async joinExpedition(
    expeditionId: string,
    guildId: string,
    heroIds: string[],
  ): Promise<JointExpedition> {
    const expedition = jointExpeditions.get(expeditionId);
    if (!expedition) throw new Error('Joint expedition not found');
    if (expedition.status !== ExpeditionStatus.Active) throw new Error('Expedition is not active');

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error('Guild not found');

    // Check not already participating
    if (expedition.participants.some((p) => p.guildId === guildId)) {
      throw new Error('Already participating in this expedition');
    }

    expedition.participants.push({
      guildId,
      guildName: guild.name,
      heroIds,
      contribution: 0,
    });

    return expedition;
  }

  /**
   * Update contribution for a participant.
   */
  static addContribution(expeditionId: string, guildId: string, amount: number): void {
    const expedition = jointExpeditions.get(expeditionId);
    if (!expedition) return;

    const participant = expedition.participants.find((p) => p.guildId === guildId);
    if (participant) {
      participant.contribution += amount;
    }
  }

  /**
   * Resolve a joint expedition and calculate reward splits.
   */
  static resolveExpedition(expeditionId: string): JointExpedition | null {
    const expedition = jointExpeditions.get(expeditionId);
    if (!expedition || expedition.status !== ExpeditionStatus.Active) return null;

    const totalContribution = expedition.participants.reduce((sum, p) => sum + p.contribution, 0);
    const success = Math.random() > 0.3; // 70% success rate for joint expeditions

    // Generate total loot
    const totalLoot: Partial<Record<ResourceType, number>> = {
      [ResourceType.Gold]: Math.floor(200 * expedition.participants.length),
      [ResourceType.Essence]: Math.floor(20 * expedition.participants.length),
    };

    const totalXP = 100 * expedition.participants.length;

    // Calculate splits based on contribution
    const splits = expedition.participants.map((p) => {
      const share = totalContribution > 0 ? p.contribution / totalContribution : 1 / expedition.participants.length;
      const loot: Partial<Record<ResourceType, number>> = {};
      for (const [res, amt] of Object.entries(totalLoot)) {
        loot[res as ResourceType] = Math.floor((amt ?? 0) * share);
      }
      return {
        guildId: p.guildId,
        loot,
        xp: Math.floor(totalXP * share),
      };
    });

    expedition.status = ExpeditionStatus.Resolved;
    expedition.result = {
      success,
      totalLoot,
      xpGained: totalXP,
      splits,
    };

    return expedition;
  }

  /**
   * Get all active joint expeditions for an alliance.
   */
  static getActiveExpeditions(allianceId: string): JointExpedition[] {
    const expeditions: JointExpedition[] = [];
    for (const exp of jointExpeditions.values()) {
      if (exp.allianceId === allianceId && exp.status === ExpeditionStatus.Active) {
        expeditions.push(exp);
      }
    }
    return expeditions;
  }

  /**
   * Get a specific joint expedition.
   */
  static getExpedition(expeditionId: string): JointExpedition | null {
    return jointExpeditions.get(expeditionId) ?? null;
  }

  /**
   * Get completed joint expeditions for an alliance.
   */
  static getCompletedExpeditions(allianceId: string): JointExpedition[] {
    const expeditions: JointExpedition[] = [];
    for (const exp of jointExpeditions.values()) {
      if (exp.allianceId === allianceId && exp.status === ExpeditionStatus.Resolved) {
        expeditions.push(exp);
      }
    }
    return expeditions;
  }

  /**
   * Check for and resolve expired expeditions.
   */
  static resolveExpiredExpeditions(): JointExpedition[] {
    const resolved: JointExpedition[] = [];
    const now = Date.now();

    for (const exp of jointExpeditions.values()) {
      if (exp.status === ExpeditionStatus.Active) {
        const endTime = new Date(exp.startedAt).getTime() + exp.duration * 1000;
        if (endTime <= now) {
          const result = JointExpeditionService.resolveExpedition(exp.id);
          if (result) resolved.push(result);
        }
      }
    }

    return resolved;
  }
}
