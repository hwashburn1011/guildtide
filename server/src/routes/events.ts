import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { EventService } from '../services/EventService';

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

    // Generate events if needed
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

// Get event log
router.get('/log', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const logs = await prisma.eventLog.findMany({
      where: { guildId: guild.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json(logs.map(l => ({
      ...l,
      data: l.data ? JSON.parse(l.data) : null,
    })));
  } catch (err) {
    console.error('Get event log error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as eventsRouter };
