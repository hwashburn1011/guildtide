import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ResearchService } from '../services/ResearchService.js';

const router = Router();
router.use(authMiddleware);

// GET / — full research state
router.get('/', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (!player) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }

    const guild = await prisma.guild.findFirst({ where: { playerId: player.id } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const state = await ResearchService.getResearchState(guild.id);
    res.json(state);
  } catch (err) {
    console.error('Get research state error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /:id/start — begin researching a node
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (!player) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }

    const guild = await prisma.guild.findFirst({ where: { playerId: player.id } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const state = await ResearchService.startResearch(guild.id, req.params.id as string);
    res.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Research failed';
    if (
      message.includes('Not enough') ||
      message.includes('Already') ||
      message.includes('Another') ||
      message.includes('Prerequisite') ||
      message.includes('Unknown')
    ) {
      res.status(400).json({ error: 'research_failed', message });
    } else {
      console.error('Start research error:', err);
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

export { router as researchRouter };
