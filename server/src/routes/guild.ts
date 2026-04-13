import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import {
  STARTING_RESOURCES,
  BASE_BUILDING_SLOTS,
  GUILD_LEVEL_REWARDS,
  EMBLEM_COLORS,
  EMBLEM_SYMBOLS,
} from '../../../shared/src/constants';
import { IdleProgressService } from '../services/IdleProgressService';
import { GuildService } from '../services/GuildService';
import { ResourceService } from '../services/ResourceService';
import type { GuildEmblem } from '../../../shared/src/types';

const router = Router();
router.use(authMiddleware);

/** Serialize a guild record for the API response. */
function serializeGuild(guild: any) {
  return {
    ...guild,
    resources: JSON.parse(guild.resources),
    researchIds: JSON.parse(guild.researchIds),
    emblem: guild.emblem ? JSON.parse(guild.emblem) : null,
    heroes: (guild.heroes ?? []).map((h: any) => ({
      ...h,
      traits: JSON.parse(h.traits),
      stats: JSON.parse(h.stats),
      equipment: JSON.parse(h.equipment),
    })),
    inventory: (guild.inventory ?? []).map((i: any) => ({
      ...i,
      metadata: i.metadata ? JSON.parse(i.metadata) : null,
    })),
    buildings: (guild.buildings ?? []).map((b: any) => ({
      ...b,
      metadata: b.metadata ? JSON.parse(b.metadata) : null,
    })),
  };
}

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

    res.json(serializeGuild(guild));
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
        buildingSlots: BASE_BUILDING_SLOTS,
      },
    });

    res.status(201).json({
      ...guild,
      resources: STARTING_RESOURCES,
      emblem: null,
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

    // Take a resource snapshot on collect for history tracking
    if (guild) {
      await ResourceService.takeSnapshot(guild.id);
    }

    const balance = guild
      ? await ResourceService.getBalance(guild.id)
      : { current: {}, caps: {} };

    res.json({
      gains: gains.resources,
      elapsedSeconds: gains.elapsedSeconds,
      resources: balance.current,
      caps: balance.caps,
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

// Add XP to guild
router.post('/xp', async (req: Request, res: Response) => {
  try {
    const { amount, action } = req.body;
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    let levelUps;
    if (action) {
      levelUps = await GuildService.grantActionXP(guild.id, action, req.body.multiplier ?? 1);
    } else if (amount && typeof amount === 'number' && amount > 0) {
      levelUps = await GuildService.addXP(guild.id, amount);
    } else {
      res.status(400).json({ error: 'validation', message: 'Provide amount or action' });
      return;
    }

    const updated = await prisma.guild.findUnique({ where: { id: guild.id } });
    res.json({
      level: updated!.level,
      xp: updated!.xp,
      xpToNext: GuildService.xpToNextLevel(updated!.level),
      levelUps,
    });
  } catch (err) {
    console.error('Add XP error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get guild XP info
router.get('/xp', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    res.json({
      level: guild.level,
      xp: guild.xp,
      xpToNext: GuildService.xpToNextLevel(guild.level),
      unlockedBuildings: GuildService.getUnlockedBuildings(guild.level),
      unlockedFeatures: GuildService.getUnlockedFeatures(guild.level),
      buildingSlots: guild.buildingSlots,
      nextReward: GUILD_LEVEL_REWARDS[guild.level + 1] ?? null,
    });
  } catch (err) {
    console.error('Get XP error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Set guild emblem
router.post('/emblem', async (req: Request, res: Response) => {
  try {
    const { color, symbol } = req.body;
    if (!color || !symbol) {
      res.status(400).json({ error: 'validation', message: 'Provide color and symbol' });
      return;
    }
    if (!EMBLEM_COLORS.includes(color) || !EMBLEM_SYMBOLS.includes(symbol)) {
      res.status(400).json({ error: 'validation', message: 'Invalid color or symbol' });
      return;
    }

    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const emblem: GuildEmblem = { color, symbol };
    await GuildService.setEmblem(guild.id, emblem);
    res.json({ emblem });
  } catch (err) {
    console.error('Set emblem error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Set guild motto
router.post('/motto', async (req: Request, res: Response) => {
  try {
    const { motto } = req.body;
    if (typeof motto !== 'string') {
      res.status(400).json({ error: 'validation', message: 'Provide motto string' });
      return;
    }

    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    await GuildService.setMotto(guild.id, motto);
    res.json({ motto: motto.slice(0, 100).trim() });
  } catch (err) {
    console.error('Set motto error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get guild statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const stats = await GuildService.getStats(guild.id);
    res.json(stats);
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get activity feed
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const feed = await GuildService.getActivityFeed(guild.id, limit);
    res.json(feed);
  } catch (err) {
    console.error('Get activity error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Claim daily login reward
router.post('/daily-reward', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const result = await GuildService.claimDailyReward(guild.id);
    if (!result) {
      res.status(400).json({ error: 'already_claimed', message: 'Daily reward already claimed today' });
      return;
    }

    res.json(result);
  } catch (err) {
    console.error('Daily reward error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get building synergies
router.get('/synergies', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { buildings: true },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const synergies = GuildService.getBuildingSynergies(guild.buildings);
    res.json(synergies);
  } catch (err) {
    console.error('Get synergies error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get seasonal decoration
router.get('/seasonal', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    const regionId = player?.regionId || 'new-york';
    const decoration = GuildService.getSeasonalDecoration(regionId);
    res.json(decoration);
  } catch (err) {
    console.error('Get seasonal error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as guildRouter };
