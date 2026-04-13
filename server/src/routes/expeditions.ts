import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { ExpeditionService } from '../services/ExpeditionService';
import { EXPEDITION_DESTINATIONS } from '../data/expeditionData';

const router = Router();
router.use(authMiddleware);

// GET / — list active and recent expeditions for the guild
router.get('/', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const expeditions = await ExpeditionService.listForGuild(guild.id);
    res.json(expeditions);
  } catch (err) {
    console.error('List expeditions error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /destinations — list all available destinations
router.get('/destinations', async (_req: Request, res: Response) => {
  res.json(EXPEDITION_DESTINATIONS);
});

// POST /launch — launch a new expedition
router.post('/launch', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const { type, heroIds, destinationId } = req.body;

    if (!type || !heroIds || !destinationId) {
      res.status(400).json({
        error: 'bad_request',
        message: 'Missing type, heroIds, or destinationId',
      });
      return;
    }

    if (!Array.isArray(heroIds) || heroIds.length === 0) {
      res.status(400).json({
        error: 'bad_request',
        message: 'heroIds must be a non-empty array',
      });
      return;
    }

    const expedition = await ExpeditionService.launch(
      guild.id,
      type,
      heroIds,
      destinationId,
    );

    res.status(201).json(expedition);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'launch_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// POST /:id/collect — resolve and collect results of a completed expedition
router.post('/:id/collect', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    // Verify expedition belongs to this guild
    const expeditionId = req.params.id as string;
    const expedition = await ExpeditionService.getById(expeditionId);
    if (!expedition || expedition.guildId !== guild.id) {
      res.status(404).json({
        error: 'not_found',
        message: 'Expedition not found',
      });
      return;
    }

    const result = await ExpeditionService.resolve(expeditionId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'collect_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

export { router as expeditionsRouter };
