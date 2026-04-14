/**
 * Expedition API routes.
 *
 * Extended for T-0471 through T-0550: full expedition system with encounters,
 * bosses, discoveries, chains, statistics, achievements, templates, and more.
 */

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

// GET /destinations — list all available destinations with difficulty ratings
router.get('/destinations', async (_req: Request, res: Response) => {
  const destinations = EXPEDITION_DESTINATIONS.map(d => ({
    ...d,
    difficultyRating: ExpeditionService.getDifficultyRating(d.id),
  }));
  res.json(destinations);
});

// GET /statistics — expedition stats and achievements
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const stats = await ExpeditionService.getStatistics(guild.id);
    res.json(stats);
  } catch (err) {
    console.error('Expedition statistics error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /diary — full expedition history with pagination
router.get('/diary', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const page = parseInt(req.query.page as string) || 0;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const diary = await ExpeditionService.getDiary(guild.id, page, pageSize);
    res.json(diary);
  } catch (err) {
    console.error('Expedition diary error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /discoveries — rare discovery collection
router.get('/discoveries', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const discoveries = await ExpeditionService.getRareDiscoveries(guild.id);
    res.json(discoveries);
  } catch (err) {
    console.error('Discoveries error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /bosses — available boss expeditions
router.get('/bosses', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const bosses = await ExpeditionService.getAvailableBosses(guild.id);
    res.json(bosses);
  } catch (err) {
    console.error('Bosses error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /chains — expedition chain definitions
router.get('/chains', async (_req: Request, res: Response) => {
  res.json(ExpeditionService.getChains());
});

// GET /fog-of-war — which destinations have been visited
router.get('/fog-of-war', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const fog = await ExpeditionService.getFogOfWar(guild.id);
    res.json(fog);
  } catch (err) {
    console.error('Fog of war error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /weather-forecast — weather impact on expeditions
router.get('/weather-forecast', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const forecast = await ExpeditionService.getWeatherForecast(guild.id);
    res.json(forecast ?? { condition: 'unknown', impact: 'No forecast available', modifier: 0 });
  } catch (err) {
    console.error('Weather forecast error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /leaderboard/:destinationId — fastest completion times
router.get('/leaderboard/:destinationId', async (req: Request, res: Response) => {
  try {
    const leaderboard = await ExpeditionService.getLeaderboard(req.params.destinationId as string);
    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /encounter-history/:destinationId — past encounter results
router.get('/encounter-history/:destinationId', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const history = await ExpeditionService.getEncounterHistory(
      guild.id,
      req.params.destinationId as string,
    );
    res.json(history);
  } catch (err) {
    console.error('Encounter history error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /validate-party — validate party composition
router.post('/validate-party', async (req: Request, res: Response) => {
  const { heroIds, destinationId } = req.body;
  const validation = ExpeditionService.validatePartyComposition(heroIds || [], destinationId);
  res.json(validation);
});

// POST /party-power — calculate party power score
router.post('/party-power', async (req: Request, res: Response) => {
  try {
    const { heroIds } = req.body;
    const power = await ExpeditionService.calculatePartyPower(heroIds || []);
    res.json({ power });
  } catch (err) {
    console.error('Party power error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /recommend/:destinationId — get party recommendation
router.get('/recommend/:destinationId', async (req: Request, res: Response) => {
  const recommendation = ExpeditionService.getRecommendation(req.params.destinationId as string);
  res.json(recommendation ?? { recommendedRoles: [], minimumPower: 0, tips: [] });
});

// GET /scout/:destinationId — scouting pre-check
router.get('/scout/:destinationId', async (req: Request, res: Response) => {
  const scoutLevel = parseInt(req.query.scoutLevel as string) || 1;
  const result = ExpeditionService.scoutDestination(req.params.destinationId as string, scoutLevel);
  res.json(result ?? { revealedEncounters: [], estimatedDanger: 'Unknown' });
});

// GET /post-mortem/:destinationId — post-mortem analysis
router.get('/post-mortem/:destinationId', async (req: Request, res: Response) => {
  const analysis = ExpeditionService.getPostMortem(req.params.destinationId as string);
  res.json(analysis ?? {});
});

// GET /templates — saved party templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const templates = await ExpeditionService.getPartyTemplates(guild.id);
    res.json(templates);
  } catch (err) {
    console.error('Templates error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /templates — save a party template
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const { name, heroIds, destinationId } = req.body;
    const template = await ExpeditionService.savePartyTemplate(
      guild.id,
      name || 'Unnamed Template',
      heroIds || [],
      destinationId,
    );
    res.status(201).json(template);
  } catch (err) {
    console.error('Save template error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
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

    const { type, heroIds, destinationId, bossId, chainId, chainStep, isTimedChallenge, isFleet } = req.body;

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
      { bossId, chainId, chainStep, isTimedChallenge, isFleet },
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

// POST /:id/retreat — retreat from active expedition
router.post('/:id/retreat', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const expeditionId = req.params.id as string;
    const expedition = await ExpeditionService.getById(expeditionId);
    if (!expedition || expedition.guildId !== guild.id) {
      res.status(404).json({
        error: 'not_found',
        message: 'Expedition not found',
      });
      return;
    }

    const result = await ExpeditionService.retreat(expeditionId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'retreat_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

export { router as expeditionsRouter };
