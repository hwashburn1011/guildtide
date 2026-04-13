import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { ResourceType } from '../../../shared/src/enums';
import { ResourceService } from '../services/ResourceService';
import { CONVERSION_RECIPES, RESOURCE_MILESTONES } from '../../../shared/src/constants';
import type { ResourceAlert } from '../../../shared/src/types';

const router = Router();
router.use(authMiddleware);

// GET / — full resource state with caps, rates, multipliers
router.get('/', async (req: Request, res: Response) => {
  try {
    const state = await ResourceService.getFullState(req.playerId!);
    if (!state) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    res.json(state);
  } catch (err) {
    console.error('Get resource state error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /balance — current amounts and caps
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const balance = await ResourceService.getBalance(guild.id);
    res.json(balance);
  } catch (err) {
    console.error('Get balance error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /breakdown — production/consumption breakdown
router.get('/breakdown', async (req: Request, res: Response) => {
  try {
    const resource = req.query.resource as ResourceType | undefined;
    const breakdowns = await ResourceService.getBreakdown(req.playerId!, resource);
    res.json(breakdowns);
  } catch (err) {
    console.error('Get breakdown error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /history — resource snapshots for charts
router.get('/history', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const hours = Math.min(parseInt(req.query.hours as string) || 24, 168); // max 7 days
    const snapshots = await ResourceService.getHistory(guild.id, hours);
    res.json(snapshots);
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /forecast — project when storage will be full or resource will run out
router.get('/forecast', async (req: Request, res: Response) => {
  try {
    const forecasts = await ResourceService.getForecasts(req.playerId!);
    res.json(forecasts);
  } catch (err) {
    console.error('Get forecast error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /recipes — list available conversion recipes
router.get('/recipes', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { buildings: true },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const workshopLevel = guild.buildings.find(b => b.type === 'workshop')?.level ?? 0;
    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;

    const recipes = CONVERSION_RECIPES.map(recipe => {
      const canAfford = Object.entries(recipe.inputs).every(
        ([res, cost]) => (resources[res as ResourceType] || 0) >= (cost ?? 0),
      );
      const meetsLevel = workshopLevel >= recipe.requiredBuildingLevel;
      const maxQuantity = meetsLevel
        ? Math.min(
            100,
            ...Object.entries(recipe.inputs).map(
              ([res, cost]) => Math.floor((resources[res as ResourceType] || 0) / (cost ?? 1)),
            ),
          )
        : 0;

      return {
        ...recipe,
        available: canAfford && meetsLevel,
        meetsLevel,
        canAfford,
        maxQuantity: Math.max(0, maxQuantity),
      };
    });

    res.json(recipes);
  } catch (err) {
    console.error('Get recipes error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /convert — execute a conversion recipe
router.post('/convert', async (req: Request, res: Response) => {
  try {
    const { recipeId, quantity } = req.body;
    if (!recipeId || typeof recipeId !== 'string') {
      res.status(400).json({ error: 'validation', message: 'Provide recipeId' });
      return;
    }

    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const result = await ResourceService.executeConversion(
      guild.id,
      recipeId,
      quantity ?? 1,
    );

    if (!result.success) {
      res.status(400).json({ error: 'conversion_failed', message: result.error });
      return;
    }

    // Return updated resources
    const updated = await prisma.guild.findUnique({ where: { id: guild.id } });
    res.json({
      ...result,
      resources: updated ? JSON.parse(updated.resources) : {},
    });
  } catch (err) {
    console.error('Convert error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /audit — resource audit log
router.get('/audit', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const auditLog = await ResourceService.getAuditLog(guild.id, limit);
    res.json(auditLog);
  } catch (err) {
    console.error('Get audit log error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /alerts/check — check resource alerts
router.post('/alerts/check', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const alerts = req.body.alerts as ResourceAlert[];
    if (!Array.isArray(alerts)) {
      res.status(400).json({ error: 'validation', message: 'Provide alerts array' });
      return;
    }

    const triggered = await ResourceService.checkAlerts(guild.id, alerts);
    res.json({ triggered });
  } catch (err) {
    console.error('Check alerts error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /milestones — get milestone status
router.get('/milestones', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;

    // Get already-awarded milestones
    const awardedLogs = await prisma.eventLog.findMany({
      where: { guildId: guild.id, type: 'resource_milestone' },
    });
    const awardedIds = new Set(
      awardedLogs.map(l => {
        const data = JSON.parse(l.data || '{}');
        return data.milestoneId as string;
      }),
    );

    const milestones = RESOURCE_MILESTONES.map(m => ({
      ...m,
      completed: awardedIds.has(m.id),
      progress: Math.min(1, (resources[m.resource] || 0) / m.threshold),
      currentAmount: resources[m.resource] || 0,
    }));

    res.json(milestones);
  } catch (err) {
    console.error('Get milestones error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /scarcity — get scarcity indicators
router.get('/scarcity', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { buildings: true },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    const caps = ResourceService.calculateCaps(guild.buildings);
    const scarcity = ResourceService.getScarcityIndicators(resources, caps);
    res.json(scarcity);
  } catch (err) {
    console.error('Get scarcity error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /snapshot — take a manual resource snapshot
router.post('/snapshot', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    await ResourceService.takeSnapshot(guild.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Snapshot error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /analytics — resource analytics endpoint for external tracking
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { buildings: true, heroes: true },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    const caps = ResourceService.calculateCaps(guild.buildings);
    const state = await ResourceService.getFullState(req.playerId!);
    const forecasts = await ResourceService.getForecasts(req.playerId!);
    const scarcity = ResourceService.getScarcityIndicators(resources, caps);

    // Aggregate stats
    const totalResources = Object.values(resources).reduce((s, v) => s + v, 0);
    const totalCap = Object.values(caps).reduce((s, v) => s + v, 0);
    const utilization = totalCap > 0 ? totalResources / totalCap : 0;

    // Count audit log entries in last 24h
    const since24h = new Date(Date.now() - 24 * 3600 * 1000);
    const transactionCount = await prisma.eventLog.count({
      where: {
        guildId: guild.id,
        type: 'resource_audit',
        createdAt: { gte: since24h },
      },
    });

    // Count conversions in last 24h
    const conversionCount = await prisma.eventLog.count({
      where: {
        guildId: guild.id,
        type: 'resource_conversion',
        createdAt: { gte: since24h },
      },
    });

    res.json({
      guildId: guild.id,
      guildLevel: guild.level,
      timestamp: new Date().toISOString(),
      resources,
      caps,
      scarcity,
      forecasts,
      rates: state?.rates ?? {},
      netRates: state?.netRates ?? {},
      multipliers: state?.multipliers ?? {},
      summary: {
        totalResources: Math.floor(totalResources),
        totalCapacity: totalCap,
        utilization: Math.round(utilization * 100),
        transactions24h: transactionCount,
        conversions24h: conversionCount,
        buildingCount: guild.buildings.length,
        heroCount: guild.heroes.length,
      },
    });
  } catch (err) {
    console.error('Get analytics error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /priority — set resource priority allocation during shortages
router.post('/priority', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const { priorities } = req.body;
    if (!Array.isArray(priorities)) {
      res.status(400).json({ error: 'validation', message: 'Provide priorities array of resource types' });
      return;
    }

    // Store priority order in guild event log as config
    await prisma.eventLog.create({
      data: {
        guildId: guild.id,
        type: 'resource_priority_config',
        message: 'Resource priority order updated',
        data: JSON.stringify({ priorities }),
      },
    });

    res.json({ priorities });
  } catch (err) {
    console.error('Set priority error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /reserve — set emergency reserve amounts
router.post('/reserve', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const { reserves } = req.body;
    if (typeof reserves !== 'object') {
      res.status(400).json({ error: 'validation', message: 'Provide reserves object { resource: amount }' });
      return;
    }

    // Validate reserve amounts
    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    for (const [res, amount] of Object.entries(reserves)) {
      if (typeof amount !== 'number' || amount < 0) {
        res.status(400).json({ error: 'validation', message: `Invalid reserve for ${res}` });
        return;
      }
    }

    // Store reserves config
    await prisma.eventLog.create({
      data: {
        guildId: guild.id,
        type: 'resource_reserve_config',
        message: 'Emergency reserves updated',
        data: JSON.stringify({ reserves }),
      },
    });

    res.json({ reserves });
  } catch (err) {
    console.error('Set reserve error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /achievements — resource achievement badges
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;

    // Count conversions and trades for achievements
    const conversionCount = await prisma.eventLog.count({
      where: { guildId: guild.id, type: 'resource_conversion' },
    });
    const tradeCount = await prisma.eventLog.count({
      where: { guildId: guild.id, type: 'market_trade' },
    });
    const milestonesCompleted = await prisma.eventLog.count({
      where: { guildId: guild.id, type: 'resource_milestone' },
    });

    const totalResources = Object.values(resources).reduce((s, v) => s + v, 0);

    const badges = [
      {
        id: 'hoarder_bronze',
        name: 'Hoarder (Bronze)',
        description: 'Accumulate 5,000 total resources',
        earned: totalResources >= 5000,
        progress: Math.min(1, totalResources / 5000),
      },
      {
        id: 'hoarder_silver',
        name: 'Hoarder (Silver)',
        description: 'Accumulate 25,000 total resources',
        earned: totalResources >= 25000,
        progress: Math.min(1, totalResources / 25000),
      },
      {
        id: 'hoarder_gold',
        name: 'Hoarder (Gold)',
        description: 'Accumulate 100,000 total resources',
        earned: totalResources >= 100000,
        progress: Math.min(1, totalResources / 100000),
      },
      {
        id: 'converter_novice',
        name: 'Novice Converter',
        description: 'Perform 10 resource conversions',
        earned: conversionCount >= 10,
        progress: Math.min(1, conversionCount / 10),
      },
      {
        id: 'converter_expert',
        name: 'Expert Converter',
        description: 'Perform 100 resource conversions',
        earned: conversionCount >= 100,
        progress: Math.min(1, conversionCount / 100),
      },
      {
        id: 'trader_bronze',
        name: 'Trader (Bronze)',
        description: 'Complete 25 market trades',
        earned: tradeCount >= 25,
        progress: Math.min(1, tradeCount / 25),
      },
      {
        id: 'trader_silver',
        name: 'Trader (Silver)',
        description: 'Complete 100 market trades',
        earned: tradeCount >= 100,
        progress: Math.min(1, tradeCount / 100),
      },
      {
        id: 'milestone_hunter',
        name: 'Milestone Hunter',
        description: 'Complete 5 resource milestones',
        earned: milestonesCompleted >= 5,
        progress: Math.min(1, milestonesCompleted / 5),
      },
      {
        id: 'essence_collector',
        name: 'Essence Collector',
        description: 'Accumulate 200 essence',
        earned: (resources[ResourceType.Essence] || 0) >= 200,
        progress: Math.min(1, (resources[ResourceType.Essence] || 0) / 200),
      },
      {
        id: 'diversified',
        name: 'Diversified',
        description: 'Have at least 100 of every resource type',
        earned: Object.values(resources).every(v => v >= 100),
        progress: Math.min(1, Object.values(resources).filter(v => v >= 100).length / 8),
      },
    ];

    res.json(badges);
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as resourcesRouter };
