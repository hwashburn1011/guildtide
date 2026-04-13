/**
 * Region API routes — world map, region details, travel, outposts, factions, discovery.
 *
 * T-1071–T-1140: World map and region system endpoints.
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { RegionService } from '../services/RegionService';

const router = Router();
router.use(authMiddleware);

// T-1071, T-1084: Get world map overview (all regions with fog-of-war)
router.get('/map', async (req: Request, res: Response) => {
  try {
    const overview = RegionService.getMapOverview(req.playerId);
    const dayNight = RegionService.getDayNightOverlay();
    const legend = RegionService.getMapLegend();
    res.json({ regions: overview, dayNight, legend });
  } catch (err) {
    console.error('Map overview error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1082: Get full region detail
router.get('/detail/:regionId', async (req: Request, res: Response) => {
  try {
    const detail = RegionService.getRegionDetail(req.playerId, req.params.regionId);
    if (!detail) {
      res.status(404).json({ error: 'not_found', message: 'Region not found' });
      return;
    }
    res.json(detail);
  } catch (err) {
    console.error('Region detail error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1083, T-1085: Discover a region
router.post('/discover/:regionId', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    const guild = await prisma.guild.findFirst({ where: { playerId: req.playerId } });
    const guildLevel = guild?.level || 1;

    const result = RegionService.discoverRegion(req.playerId, req.params.regionId, guildLevel);
    res.json(result);
  } catch (err) {
    console.error('Region discover error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1112: Discover hidden region
router.post('/discover-hidden/:regionId', async (req: Request, res: Response) => {
  try {
    const result = RegionService.discoverHiddenRegion(req.playerId, req.params.regionId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1089, T-1090: Start travel
router.post('/travel', async (req: Request, res: Response) => {
  try {
    const { fromRegionId, toRegionId, speedBonus } = req.body;
    const result = RegionService.startTravel(req.playerId, fromRegionId, toRegionId, speedBonus || 0);
    res.json(result);
  } catch (err) {
    console.error('Travel error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1128: Get travel status (for map animation)
router.get('/travel/status', (req: Request, res: Response) => {
  const status = RegionService.getTravelStatus(req.playerId);
  res.json({ travel: status });
});

// T-1092, T-1093: Build outpost
router.post('/outpost', async (req: Request, res: Response) => {
  try {
    const { regionId, buildingType } = req.body;
    const result = RegionService.buildOutpost(req.playerId, regionId, buildingType);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1094: Get outpost production
router.get('/outpost/:regionId/production', (req: Request, res: Response) => {
  const production = RegionService.getOutpostProduction(req.playerId, req.params.regionId);
  res.json({ production });
});

// T-1100, T-1101: Get faction reputation
router.get('/factions/:regionId', (req: Request, res: Response) => {
  const factions = RegionService.getFactionReputation(req.playerId, req.params.regionId);
  res.json({ factions });
});

// T-1102: Change faction reputation
router.post('/factions/:regionId/:factionId/reputation', (req: Request, res: Response) => {
  const { delta } = req.body;
  const newRep = RegionService.changeFactionReputation(req.playerId, req.params.regionId, req.params.factionId, delta || 0);
  res.json({ reputation: newRep });
});

// T-1121: Advance exploration
router.post('/explore/:regionId', (req: Request, res: Response) => {
  const { amount } = req.body;
  const result = RegionService.advanceExploration(req.playerId, req.params.regionId, amount || 5);
  res.json(result);
});

// T-1131: Claim region
router.post('/claim/:regionId', (req: Request, res: Response) => {
  const result = RegionService.claimRegion(req.playerId, req.params.regionId);
  res.json(result);
});

// T-1132: Get defense mission
router.get('/defense/:regionId', (req: Request, res: Response) => {
  const mission = RegionService.getDefenseMission(req.playerId, req.params.regionId);
  res.json({ mission });
});

// T-1135: Set/remove trade embargo
router.post('/embargo/:regionId', (req: Request, res: Response) => {
  const { active } = req.body;
  RegionService.setEmbargo(req.playerId, req.params.regionId, !!active);
  res.json({ success: true });
});

// T-1107: Compare regions
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const regions = (req.query.regions as string || '').split(',').filter(Boolean);
    if (regions.length < 2) {
      res.status(400).json({ error: 'bad_request', message: 'Provide at least 2 region IDs' });
      return;
    }
    const comparison = await RegionService.compareRegions(regions);
    res.json({ comparison });
  } catch (err) {
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1098: Region achievements
router.get('/achievements', (req: Request, res: Response) => {
  const achievements = RegionService.getRegionAchievements(req.playerId);
  res.json(achievements);
});

// T-1105: Search regions
router.get('/search', (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  const results = RegionService.searchRegions(query);
  res.json({ results });
});

// T-1106: Weather overlay for all regions
router.get('/weather-overlay', async (req: Request, res: Response) => {
  try {
    const discovered = RegionService.getDiscoveredRegions(req.playerId);
    const overlay = await RegionService.getWeatherOverlay(discovered);
    res.json({ overlay });
  } catch (err) {
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1116: Map pins
router.get('/pins', (req: Request, res: Response) => {
  res.json({ pins: RegionService.getPins(req.playerId) });
});

router.post('/pins', (req: Request, res: Response) => {
  const { x, y, label, color } = req.body;
  const pin = RegionService.addPin(req.playerId, x, y, label || 'Pin', color || '#ffd700');
  res.json({ pin });
});

router.delete('/pins/:pinId', (req: Request, res: Response) => {
  const removed = RegionService.removePin(req.playerId, req.params.pinId);
  res.json({ success: removed });
});

// T-1119: Region population
router.get('/population/:regionId', (req: Request, res: Response) => {
  const pop = RegionService.getRegionPopulation(req.params.regionId);
  res.json(pop);
});

// T-1125: Region gallery
router.get('/gallery', (req: Request, res: Response) => {
  const gallery = RegionService.getRegionGallery(req.playerId);
  res.json({ gallery });
});

// T-1134: Distance calculator
router.get('/distance', (req: Request, res: Response) => {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).json({ error: 'bad_request', message: 'Provide from and to region IDs' });
    return;
  }
  const result = RegionService.getDistance(from as string, to as string);
  if (!result) {
    res.status(404).json({ error: 'not_found', message: 'One or both regions not found' });
    return;
  }
  res.json(result);
});

// T-1137: NPC caravan routes
router.get('/caravans', (_req: Request, res: Response) => {
  const routes = RegionService.getCaravanRoutes();
  res.json({ routes });
});

// T-1118: Day/night overlay
router.get('/day-night', (_req: Request, res: Response) => {
  res.json(RegionService.getDayNightOverlay());
});

// T-1104: Map legend
router.get('/legend', (_req: Request, res: Response) => {
  res.json(RegionService.getMapLegend());
});

// T-1130: World map tutorial
router.get('/tutorial', (_req: Request, res: Response) => {
  res.json({
    steps: [
      { title: 'Welcome to the World Map', text: 'This is your gateway to exploring the world. Each region has unique biomes, resources, and challenges.' },
      { title: 'Fog of War', text: 'Undiscovered regions appear dimmed. Explore them by sending expeditions or meeting unlock requirements.' },
      { title: 'Biome Types', text: 'Each region has a biome (Forest, Mountain, Desert, etc.) that determines its resources and encounters.' },
      { title: 'Travel', text: 'Click a discovered region and choose "Travel" to send an expedition. Travel time depends on distance and route.' },
      { title: 'Outposts', text: 'Build outposts in discovered regions to establish presence and produce resources remotely.' },
      { title: 'Factions', text: 'Each region has factions. Build reputation through trade and quests to unlock better deals.' },
      { title: 'Claim Territory', text: 'Once you reach 50% exploration, you can claim a region as guild territory.' },
    ],
  });
});

// T-1113: Force resource regeneration (admin/tick)
router.post('/regenerate-resources', (_req: Request, res: Response) => {
  RegionService.regenerateResources();
  res.json({ success: true });
});

export { router as regionsRouter };
