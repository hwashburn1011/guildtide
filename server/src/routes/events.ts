/**
 * Events routes — enhanced with chain, stats, predictions, achievements, reputation.
 *
 * T-0870: Event log page
 * T-0923: Event chain progress tracker
 * T-0926: Event reputation tracker
 * T-0932: Event prediction system (Observatory)
 * T-0934: Event achievement system
 * T-0935: Event statistics page
 * T-0936: Event notification preferences
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { EventService } from '../services/EventService';
import { EventChainService } from '../services/EventChainService';

const router = Router();
router.use(authMiddleware);

// Get active events for player's region
router.get('/', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (!player?.regionId) {
      res.status(400).json({ error: 'no_region', message: 'No region set' });
      return;
    }

    await EventService.generateEvents(player.regionId);
    const events = await EventService.getActiveEvents(player.regionId);
    res.json(events);
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Respond to an event
router.post('/:eventId/respond', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (!player?.regionId) {
      res.status(400).json({ error: 'no_region', message: 'No region set' });
      return;
    }

    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const { choiceIndex } = req.body;
    if (choiceIndex === undefined || choiceIndex === null) {
      res.status(400).json({ error: 'validation', message: 'Choice index required' });
      return;
    }

    const result = await EventService.resolveEvent(
      guild.id,
      player.regionId,
      req.params.eventId as string,
      choiceIndex,
    );

    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'event_error', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// T-0870/T-0935: Get event log with filtering and statistics
router.get('/log', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const category = req.query.category as string | undefined;
    const rarity = req.query.rarity as string | undefined;

    const where: any = { guildId: guild.id, type: 'event_resolved' };

    const logs = await prisma.eventLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Filter by category/rarity if specified
    let filtered = logs.map(l => ({
      ...l,
      data: l.data ? JSON.parse(l.data) : null,
    }));

    if (category) {
      filtered = filtered.filter(l => l.data?.category === category);
    }
    if (rarity) {
      filtered = filtered.filter(l => l.data?.rarity === rarity);
    }

    res.json(filtered);
  } catch (err) {
    console.error('Get event log error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0935: Event statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const stats = await EventService.getEventStats(guild.id);
    res.json(stats);
  } catch (err) {
    console.error('Get event stats error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0934: Event achievements
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const achievements = await EventService.getEventAchievements(guild.id);
    res.json(achievements);
  } catch (err) {
    console.error('Get event achievements error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0926: Event reputation
router.get('/reputation', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const reputation = await EventChainService.getReputation(guild.id);
    res.json(reputation);
  } catch (err) {
    console.error('Get event reputation error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0932: Event predictions (Observatory)
router.get('/predictions', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (!player?.regionId) {
      res.status(400).json({ error: 'no_region', message: 'No region set' });
      return;
    }

    const predictions = await EventService.predictUpcoming(player.regionId);
    res.json(predictions);
  } catch (err) {
    console.error('Get event predictions error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0923: Get chain progress
router.get('/chains', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const progress = await EventChainService.getChainProgress(guild.id);
    const definitions = EventChainService.getChainDefinitions();

    res.json({ definitions, activeChains: progress });
  } catch (err) {
    console.error('Get chain progress error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0936: Event notification preferences
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (!player) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }

    const prefs = (player as any).eventPreferences
      ? JSON.parse((player as any).eventPreferences)
      : {
          alertOnCommon: false,
          alertOnUncommon: true,
          alertOnRare: true,
          alertOnLegendary: true,
          alertCategories: ['military', 'crisis', 'magical', 'exploration'],
          muteCategories: [],
        };

    res.json(prefs);
  } catch (err) {
    console.error('Get event preferences error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

router.put('/preferences', async (req: Request, res: Response) => {
  try {
    await prisma.player.update({
      where: { id: req.playerId },
      data: { eventPreferences: JSON.stringify(req.body) } as any,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Update event preferences error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as eventsRouter };
