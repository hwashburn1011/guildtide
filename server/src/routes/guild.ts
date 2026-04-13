import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { STARTING_RESOURCES } from '../../../shared/src/constants.js';
import { IdleProgressService } from '../services/IdleProgressService.js';

const router = Router();
router.use(authMiddleware);

// Get current guild
router.get('/', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: {
        heroes: true,
        buildings: true,
        inventory: true,
      },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found. Create one first.' });
      return;
    }

    res.json({
      ...guild,
      resources: JSON.parse(guild.resources),
      researchIds: JSON.parse(guild.researchIds),
      heroes: guild.heroes.map(h => ({
        ...h,
        traits: JSON.parse(h.traits),
        stats: JSON.parse(h.stats),
        equipment: JSON.parse(h.equipment),
      })),
      inventory: guild.inventory.map(i => ({
        ...i,
        metadata: i.metadata ? JSON.parse(i.metadata) : null,
      })),
      buildings: guild.buildings.map(b => ({
        ...b,
        metadata: b.metadata ? JSON.parse(b.metadata) : null,
      })),
    });
  } catch (err) {
    console.error('Get guild error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Create guild
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || name.length < 3 || name.length > 30) {
      res.status(400).json({ error: 'validation', message: 'Guild name must be 3-30 characters' });
      return;
    }

    const existing = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });

    if (existing) {
      res.status(409).json({ error: 'conflict', message: 'You already have a guild' });
      return;
    }

    const guild = await prisma.guild.create({
      data: {
        playerId: req.playerId!,
        name,
        resources: JSON.stringify(STARTING_RESOURCES),
      },
    });

    res.status(201).json({
      ...guild,
      resources: STARTING_RESOURCES,
      researchIds: [],
      heroes: [],
      buildings: [],
      inventory: [],
    });
  } catch (err) {
    console.error('Create guild error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Collect idle resources (periodic client sync)
router.post('/collect', async (req: Request, res: Response) => {
  try {
    const gains = await IdleProgressService.calculateAndApply(req.playerId!);
    const rates = await IdleProgressService.getRates(req.playerId!);

    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });

    res.json({
      gains: gains.resources,
      elapsedSeconds: gains.elapsedSeconds,
      resources: guild ? JSON.parse(guild.resources) : {},
      rates,
    });
  } catch (err) {
    console.error('Collect error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get current production rates
router.get('/rates', async (req: Request, res: Response) => {
  try {
    const rates = await IdleProgressService.getRates(req.playerId!);
    res.json(rates);
  } catch (err) {
    console.error('Get rates error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as guildRouter };
