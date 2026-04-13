import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { ResearchService } from '../services/ResearchService';
import { ResearchAdvancedService } from '../services/ResearchAdvancedService';

const router = Router();
router.use(authMiddleware);

// Helper to get guild ID from player
async function getGuildId(playerId: string | undefined): Promise<string | null> {
  if (!playerId) return null;
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;
  const guild = await prisma.guild.findFirst({ where: { playerId: player.id } });
  return guild?.id ?? null;
}

// GET / — full research state (basic)
router.get('/', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const state = await ResearchService.getResearchState(guildId);
    res.json(state);
  } catch (err) {
    console.error('Get research state error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /advanced — full advanced research state (T-0646, T-0650, T-0651, T-0652)
router.get('/advanced', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const season = (req.query.season as string) || 'spring';
    const state = await ResearchAdvancedService.getAdvancedState(guildId, season);
    res.json(state);
  } catch (err) {
    console.error('Get advanced research state error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /:id/start — begin researching a node
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const state = await ResearchService.startResearch(guildId, req.params.id as string);
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

// POST /cancel — cancel active research with 50% refund (T-0641)
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const result = await ResearchAdvancedService.cancelResearch(guildId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cancel failed';
    res.status(400).json({ error: 'cancel_failed', message });
  }
});

// POST /queue — add to research queue (T-0639)
router.post('/queue', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const { researchId } = req.body;
    const queue = await ResearchAdvancedService.queueResearch(guildId, researchId);
    res.json({ queue });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Queue failed';
    res.status(400).json({ error: 'queue_failed', message });
  }
});

// DELETE /queue/:id — remove from queue
router.delete('/queue/:id', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const queue = await ResearchAdvancedService.dequeueResearch(guildId, req.params.id as string);
    res.json({ queue });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Dequeue failed';
    res.status(400).json({ error: 'dequeue_failed', message });
  }
});

// POST /undo — undo last research within grace period (T-0669)
router.post('/undo', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const result = await ResearchAdvancedService.undoLastResearch(guildId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Undo failed';
    res.status(400).json({ error: 'undo_failed', message });
  }
});

// POST /contribute — contribute research points (T-0668)
router.post('/contribute', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const { playerName, points } = req.body;
    const contributions = await ResearchAdvancedService.contributeResearch(
      guildId, req.playerId!, playerName || 'Anonymous', points || 1,
    );
    res.json({ contributions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Contribution failed';
    res.status(400).json({ error: 'contribute_failed', message });
  }
});

// POST /event — trigger a research event (T-0644, T-0645, T-0659)
router.post('/event', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const { eventId } = req.body;
    const event = await ResearchAdvancedService.triggerResearchEvent(guildId, eventId);
    res.json({ event });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Event failed';
    res.status(400).json({ error: 'event_failed', message });
  }
});

// GET /search — search nodes by name (T-0647)
router.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  const results = ResearchAdvancedService.searchNodes(query);
  res.json({ results });
});

// GET /filter — filter nodes (T-0670)
router.get('/filter', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const completed: string[] = JSON.parse(guild.researchIds || '[]');
    const resources = JSON.parse(guild.resources || '{}');
    const activeId = resources.__activeResearch?.researchId;

    const results = ResearchAdvancedService.filterNodes(
      {
        branch: req.query.branch as string | undefined,
        status: req.query.status as string | undefined,
        effectType: req.query.effectType as string | undefined,
      },
      completed,
      activeId,
    );
    res.json({ results });
  } catch (err) {
    console.error('Filter error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /prestige — prestige reset (T-0653)
router.post('/prestige', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const result = await ResearchAdvancedService.prestigeReset(guildId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Prestige failed';
    res.status(400).json({ error: 'prestige_failed', message });
  }
});

// POST /specialize — branch specialization (T-0642, T-0643)
router.post('/specialize', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const { branch, subPath } = req.body;
    const result = await ResearchAdvancedService.specialize(guildId, branch, subPath);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Specialization failed';
    res.status(400).json({ error: 'specialize_failed', message });
  }
});

// GET /specializations — get guild specializations
router.get('/specializations', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const specs = await ResearchAdvancedService.getSpecializations(guildId);
    res.json({ specializations: specs });
  } catch (err) {
    console.error('Get specializations error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /export — export tree data for sharing (T-0660)
router.get('/export', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const data = await ResearchAdvancedService.exportTreeData(guildId);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    res.status(400).json({ error: 'export_failed', message });
  }
});

// POST /compare-paths — A/B path comparison (T-0663)
router.post('/compare-paths', async (req: Request, res: Response) => {
  const { pathA, pathB } = req.body;
  const result = ResearchAdvancedService.compareResearchPaths(pathA || [], pathB || []);
  res.json(result);
});

// POST /notification-prefs — set notification preferences (T-0661)
router.post('/notification-prefs', async (req: Request, res: Response) => {
  try {
    const guildId = await getGuildId(req.playerId);
    if (!guildId) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }
    const prefs = await ResearchAdvancedService.setNotificationPrefs(guildId, req.body);
    res.json({ prefs });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to set preferences';
    res.status(400).json({ error: 'prefs_failed', message });
  }
});

export { router as researchRouter };
