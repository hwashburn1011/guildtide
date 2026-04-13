import { prisma } from '../db';
import { EVENT_TEMPLATES, type EventTemplate } from '../data/eventTemplates';
import { WeatherService } from './WeatherService';
import { v4 as uuid } from 'uuid';

export class EventService {
  /**
   * Generate events for a region based on current world state.
   * Called when player loads world state or on a schedule.
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
    // Don't generate if we already have events for today
    if (existingEvents.length > 0) return;

    const weather = worldState.weather;
    const modifiers = worldState.modifiers;
    const newEvents: any[] = [];

    for (const template of EVENT_TEMPLATES) {
      // Check weather trigger
      if (template.trigger.weather && !template.trigger.weather.includes(weather.condition)) {
        continue;
      }

      // Check flood risk trigger
      if (template.trigger.minFloodRisk && modifiers.floodRisk < template.trigger.minFloodRisk) {
        continue;
      }

      // Roll for chance
      if (Math.random() > template.trigger.chance) {
        continue;
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + template.durationHours);

      newEvents.push({
        id: uuid(),
        templateId: template.id,
        type: 'world',
        title: template.title,
        description: template.description,
        expiresAt: expiresAt.toISOString(),
        choices: template.choices.map(c => ({
          label: c.label,
          description: c.description,
          requires: c.requires || null,
          risk: c.risk,
        })),
      });

      // Max 2 events per day
      if (newEvents.length >= 2) break;
    }

    if (newEvents.length > 0) {
      await prisma.regionState.update({
        where: { regionId_date: { regionId, date: today } },
        data: { activeEvents: JSON.stringify(newEvents) },
      });
    }
  }

  /**
   * Get active (non-expired) events for a region.
   */
  static async getActiveEvents(regionId: string): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const state = await prisma.regionState.findUnique({
      where: { regionId_date: { regionId, date: today } },
    });
    if (!state) return [];

    const events = JSON.parse(state.activeEvents) as any[];
    const now = new Date();

    return events.filter(e => new Date(e.expiresAt) > now && !e.resolved);
  }

  /**
   * Resolve an event choice for a guild.
   */
  static async resolveEvent(
    guildId: string,
    regionId: string,
    eventId: string,
    choiceIndex: number,
  ): Promise<{ success: boolean; narrative: string; rewards?: Record<string, number> }> {
    const today = new Date().toISOString().split('T')[0];
    const state = await prisma.regionState.findUnique({
      where: { regionId_date: { regionId, date: today } },
    });
    if (!state) throw new Error('No world state found');

    const events = JSON.parse(state.activeEvents) as any[];
    const event = events.find((e: any) => e.id === eventId);
    if (!event) throw new Error('Event not found');
    if (event.resolved) throw new Error('Event already resolved');

    const template = EVENT_TEMPLATES.find(t => t.id === event.templateId);
    if (!template) throw new Error('Event template not found');

    const choice = template.choices[choiceIndex];
    if (!choice) throw new Error('Invalid choice');

    // Check requirements
    const guild = await prisma.guild.findUnique({ where: { id: guildId }, include: { heroes: true } });
    if (!guild) throw new Error('Guild not found');

    const resources = JSON.parse(guild.resources) as Record<string, number>;

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
        // Deduct resource cost
        resources[choice.requires.resource] -= choice.requires.amount;
      }
    }

    // Roll for success
    const success = Math.random() > choice.risk;

    if (success && choice.rewards.resources) {
      for (const [res, amount] of Object.entries(choice.rewards.resources)) {
        resources[res] = (resources[res] || 0) + amount;
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

    // Log the event
    await prisma.eventLog.create({
      data: {
        guildId,
        type: 'event_resolved',
        message: success ? choice.rewards.narrative : choice.failNarrative,
        data: JSON.stringify({
          eventId,
          templateId: event.templateId,
          choiceIndex,
          success,
          rewards: success ? choice.rewards.resources : null,
        }),
      },
    });

    return {
      success,
      narrative: success ? choice.rewards.narrative : choice.failNarrative,
      rewards: success ? choice.rewards.resources : undefined,
    };
  }
}
