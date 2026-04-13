import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { HeroService } from '../services/HeroService';
import { HeroRole } from '../../../shared/src/enums';

const router = Router();
router.use(authMiddleware);

// Get all heroes
router.get('/', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { heroes: true },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    res.json(guild.heroes.map(h => ({
      ...h,
      traits: JSON.parse(h.traits),
      stats: JSON.parse(h.stats),
      equipment: JSON.parse(h.equipment),
    })));
  } catch (err) {
    console.error('Get heroes error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Recruit a new hero
router.post('/recruit', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const preferredRole = req.body.role as HeroRole | undefined;
    const result = await HeroService.recruit(guild.id, preferredRole);

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'recruit_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// Assign hero to building
router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const { assignment } = req.body; // building type or null to unassign
    const hero = await HeroService.assign(req.params.id as string, assignment ?? null, guild.id);

    res.json(hero);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'assign_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

export { router as heroesRouter };
