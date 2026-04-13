/**
 * World routes — weather, forecast, data pipeline, and real-world data endpoints.
 *
 * T-0776: Weather change notification
 * T-0781: Weather location setting
 * T-0782: Weather location auto-detect
 * T-0783: Weather-based expedition modifier display
 * T-0788: Weather comparison between player locations
 * T-0789: Weather achievements
 * T-0794: Fear & Greed indicator in Observatory
 * T-0798: Stock market sentiment in Observatory
 * T-0802: Crypto sentiment widget
 * T-0807: News ticker
 * T-0811: Sports event notification
 * T-0815: Lunar calendar
 * T-0821: Data source configuration panel
 * T-0822: Real-world data modifier summary
 * T-0823: Real-world data opt-out toggle
 * T-0827: Celebration event overlay
 * T-0828: API usage tracking
 * T-0830: Data freshness indicator
 * T-0835: Real-world data changelog
 * T-0836: Observatory research upgrades
 * T-0842: Data feed aggregation endpoint
 * T-0845: Real-world data impact report
 * T-0849: Event correlation leaderboard
 * T-0852: Integration documentation endpoint
 * T-0855: Data anonymization
 * T-0858: Health check endpoint
 * T-0859: Graceful degradation
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { WeatherService } from '../services/WeatherService';
import { WeatherForecastService } from '../services/WeatherForecastService';
import { DataPipelineService } from '../services/DataPipelineService';
import { dataCache } from '../services/ExternalDataCache';
import {
  calculateMoonPhase,
  getMoonPhaseEffect,
  getAstronomicalEvents,
  getActiveCompoundEffects,
  MOON_PHASE_EFFECTS,
} from '../data/realWorldMappings';

const router = Router();
router.use(authMiddleware);

// Get current world state for player's region
router.get('/state', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.playerId },
    });

    if (!player || !player.regionId) {
      res.status(400).json({ error: 'no_region', message: 'No region set' });
      return;
    }

    // T-0823: Check opt-out
    const optedOut = DataPipelineService.isPlayerOptedOut(req.playerId);

    const worldState = await WeatherService.getWorldState(player.regionId);
    if (!worldState) {
      res.status(500).json({ error: 'server', message: 'Failed to get world state' });
      return;
    }

    // T-0860: Filter modifiers by player preferences
    if (optedOut) {
      for (const key of Object.keys(worldState.modifiers)) {
        worldState.modifiers[key] = 1.0;
      }
    } else {
      worldState.modifiers = DataPipelineService.getPlayerModifiers(
        req.playerId,
        worldState.modifiers,
      );
    }

    // T-0789: Record weather achievement
    WeatherService.recordWeatherAchievement(req.playerId, worldState.weather.condition);

    res.json(worldState);
  } catch (err) {
    console.error('Get world state error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0777: Weather forecast (next 5 days)
router.get('/forecast', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.playerId },
    });

    if (!player || !player.regionId) {
      res.status(400).json({ error: 'no_region', message: 'No region set' });
      return;
    }

    const forecast = await WeatherForecastService.getForecast(player.regionId);
    const pattern = WeatherForecastService.analyzePatterns(player.regionId);

    res.json({ forecast, pattern });
  } catch (err) {
    console.error('Forecast error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0778: Weather history (past 7 days)
router.get('/weather-history', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.playerId },
    });

    if (!player || !player.regionId) {
      res.status(400).json({ error: 'no_region', message: 'No region set' });
      return;
    }

    const days = parseInt(req.query.days as string) || 7;
    const history = WeatherForecastService.getWeatherHistory(player.regionId, days);
    res.json({ history });
  } catch (err) {
    console.error('Weather history error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0788: Compare weather between regions
router.get('/weather-compare', async (req: Request, res: Response) => {
  try {
    const regions = (req.query.regions as string || '').split(',').filter(Boolean);
    if (regions.length === 0) {
      res.status(400).json({ error: 'bad_request', message: 'Provide region IDs' });
      return;
    }

    const comparison = await WeatherService.compareWeather(regions.slice(0, 5));
    res.json({ comparison });
  } catch (err) {
    console.error('Weather compare error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0789: Weather achievements
router.get('/weather-achievements', (req: Request, res: Response) => {
  const achievements = WeatherService.getWeatherAchievements(req.playerId);
  res.json(achievements);
});

// T-0787: Severe weather alerts
router.get('/weather-alerts', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.playerId },
    });

    if (!player || !player.regionId) {
      res.status(400).json({ error: 'no_region', message: 'No region set' });
      return;
    }

    const alerts = WeatherService.getSevereAlerts(player.regionId);
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0815: Lunar calendar
router.get('/lunar-calendar', (_req: Request, res: Response) => {
  const now = new Date();
  const calendar: Array<{
    date: string;
    phase: string;
    label: string;
    icon: string;
  }> = [];

  for (let i = 0; i < 30; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    const phase = calculateMoonPhase(day);
    const effect = MOON_PHASE_EFFECTS[phase];
    calendar.push({
      date: day.toISOString().split('T')[0],
      phase,
      label: effect.label,
      icon: effect.icon,
    });
  }

  const currentEffect = getMoonPhaseEffect(now);
  res.json({ calendar, currentPhase: currentEffect });
});

// T-0842: Data pipeline aggregate snapshot
router.get('/data-pipeline', async (_req: Request, res: Response) => {
  try {
    const snapshot = await DataPipelineService.getSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error('Data pipeline error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0818: Data pipeline health dashboard
router.get('/data-pipeline/health', (_req: Request, res: Response) => {
  const health = DataPipelineService.getHealthDashboard();
  const circuitBreakers = dataCache.getCircuitBreakerStates();
  const cbArray: Array<{ source: string; state: string; failures: number }> = [];
  for (const [source, state] of circuitBreakers.entries()) {
    cbArray.push({ source, state: state.state, failures: state.failures });
  }
  res.json({ sources: health, circuitBreakers: cbArray });
});

// T-0858: Health check endpoint for monitoring
router.get('/data-pipeline/healthcheck', (_req: Request, res: Response) => {
  const health = DataPipelineService.getHealthDashboard();
  const allHealthy = health.every((s) => s.reliability > 0.5);
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    sources: health.map((s) => ({ source: s.source, reliability: s.reliability, lastError: s.lastError })),
  });
});

// T-0828: API usage tracking
router.get('/data-pipeline/usage', (_req: Request, res: Response) => {
  const usage = DataPipelineService.getUsageReport();
  res.json(usage);
});

// T-0830: Data freshness indicators
router.get('/data-pipeline/freshness', (_req: Request, res: Response) => {
  const freshness = DataPipelineService.getFreshnessInfo();
  res.json({ sources: freshness });
});

// T-0821: Data source configuration
router.get('/data-pipeline/config', (_req: Request, res: Response) => {
  const configs = DataPipelineService.getSourceConfigs();
  res.json(configs);
});

router.post('/data-pipeline/config/:source', (req: Request, res: Response) => {
  const { source } = req.params;
  const { enabled } = req.body;
  if (typeof enabled === 'boolean') {
    DataPipelineService.setSourceEnabled(source, enabled);
  }
  res.json({ success: true });
});

// T-0823: Real-world data opt-out toggle
router.post('/data-pipeline/opt-out', (req: Request, res: Response) => {
  const { optOut } = req.body;
  DataPipelineService.setPlayerOptOut(req.playerId, !!optOut);
  res.json({ optedOut: !!optOut });
});

router.get('/data-pipeline/opt-out', (req: Request, res: Response) => {
  res.json({ optedOut: DataPipelineService.isPlayerOptedOut(req.playerId) });
});

// T-0860: Per-modifier toggle
router.post('/data-pipeline/modifiers/:modifier', (req: Request, res: Response) => {
  const { modifier } = req.params;
  const { enabled } = req.body;
  DataPipelineService.setModifierEnabled(req.playerId, modifier, !!enabled);
  res.json({ success: true });
});

// T-0822: Real-world data modifier summary
router.get('/modifier-summary', async (req: Request, res: Response) => {
  try {
    const snapshot = await DataPipelineService.getSnapshot();
    const modifiers = DataPipelineService.getPlayerModifiers(
      req.playerId,
      snapshot.modifierSummary,
    );

    // T-0832: Compound effects
    const conditions = new Set<string>();
    // Add weather condition if available
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (player?.regionId) {
      const worldState = await WeatherService.getWorldState(player.regionId);
      if (worldState) {
        conditions.add(`weather:${worldState.weather.condition}`);
        if (worldState.festival) conditions.add('festival:active');
      }
    }
    conditions.add(`moon:${snapshot.moonPhase.phase}`);
    if (snapshot.fearGreed) {
      const fgLabel = snapshot.fearGreed.value <= 40 ? 'fear' : snapshot.fearGreed.value >= 60 ? 'greed' : 'neutral';
      conditions.add(`market:${fgLabel}`);
    }

    const compoundEffects = getActiveCompoundEffects(conditions);

    res.json({
      modifiers,
      compoundEffects: compoundEffects.map((e) => ({
        name: e.name,
        description: e.description,
        modifiers: e.modifiers,
      })),
    });
  } catch (err) {
    console.error('Modifier summary error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0835: Changelog
router.get('/data-pipeline/changelog', (_req: Request, res: Response) => {
  const archive = DataPipelineService.getArchive(7);
  if (archive.length < 2) {
    res.json({ changes: ['Not enough data for changelog yet.'] });
    return;
  }
  const prev = archive[archive.length - 2].snapshot;
  const current = archive[archive.length - 1].snapshot;
  // Build a minimal snapshot for comparison
  const changes = DataPipelineService.generateChangelog(prev, current as any);
  res.json({ changes });
});

// T-0845: Impact report
router.get('/data-pipeline/impact-report', (_req: Request, res: Response) => {
  const archive = DataPipelineService.getArchive(30);
  const report = archive.map((entry) => ({
    date: entry.date,
    modifiers: entry.snapshot.modifierSummary || {},
    moonPhase: entry.snapshot.moonPhase?.label || 'unknown',
    celebrations: (entry.snapshot.celebrations || []).length,
  }));
  res.json({ report });
});

// T-0831: Historical archive
router.get('/data-pipeline/archive', (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const archive = DataPipelineService.getArchive(days);
  res.json({ archive });
});

// T-0849: Event correlation leaderboard (placeholder)
router.get('/data-pipeline/leaderboard', (_req: Request, res: Response) => {
  // Future: track player predictions vs. actual outcomes
  res.json({
    leaderboard: [],
    message: 'Prediction leaderboard will populate as players make forecasts.',
  });
});

// T-0852: Integration documentation
router.get('/data-pipeline/docs', (_req: Request, res: Response) => {
  res.json({
    dataSources: [
      { name: 'OpenWeatherMap', type: 'weather', refreshRate: '30 minutes', description: 'Real-time weather data for all regions.' },
      { name: 'Fear & Greed Index', type: 'financial', refreshRate: 'Daily', description: 'Market sentiment indicator affecting trade volatility.' },
      { name: 'Stock Index', type: 'financial', refreshRate: 'Daily', description: 'S&P 500 performance affecting merchant guild prosperity.' },
      { name: 'Crypto Sentiment', type: 'financial', refreshRate: 'Hourly', description: 'Cryptocurrency market sentiment affecting trade volatility.' },
      { name: 'News Headlines', type: 'news', refreshRate: '2 hours', description: 'Top headlines analyzed for sentiment, triggering world events.' },
      { name: 'Sports Results', type: 'sports', refreshRate: '4 hours', description: 'Major sports events triggering in-game tournaments.' },
      { name: 'Moon Phase', type: 'astronomical', refreshRate: 'Calculated', description: 'Algorithmic moon phase affecting magic and stealth.' },
      { name: 'Astronomical Events', type: 'astronomical', refreshRate: 'Calculated', description: 'Solstices, equinoxes, and eclipses with bonus effects.' },
    ],
    mappingRules: 'Each data source maps to specific game modifiers through the realWorldMappings module. Effects are multiplicatively stacked and can be disabled per-player.',
  });
});

// T-0855: Data anonymization info
router.get('/data-pipeline/privacy', (_req: Request, res: Response) => {
  res.json({
    policy: 'No personal location data is stored. Only region IDs (city-level) are used for weather lookups. Browser geolocation is optional and never transmitted to external APIs directly.',
    dataRetention: '30 days for weather history, 90 days for data pipeline snapshots.',
    optOutAvailable: true,
  });
});

// T-0765: Force cache refresh
router.post('/weather/refresh', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.playerId },
    });

    if (!player || !player.regionId) {
      res.status(400).json({ error: 'no_region', message: 'No region set' });
      return;
    }

    WeatherService.invalidateCache(player.regionId);
    await WeatherService.updateRegionState(player.regionId);
    res.json({ success: true, message: 'Weather cache refreshed' });
  } catch (err) {
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0783: Expedition weather modifiers
router.get('/expedition-modifiers', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.playerId },
    });

    if (!player || !player.regionId) {
      res.status(400).json({ error: 'no_region', message: 'No region set' });
      return;
    }

    const worldState = await WeatherService.getWorldState(player.regionId);
    if (!worldState) {
      res.status(500).json({ error: 'server', message: 'Failed to get world state' });
      return;
    }

    res.json({
      weather: worldState.weather,
      expeditionModifiers: {
        travelSpeed: worldState.modifiers.travelSpeed || 1.0,
        huntBonus: worldState.modifiers.huntBonus || 1.0,
        floodRisk: worldState.modifiers.floodRisk || 0,
      },
      severeAlerts: worldState.severeAlerts,
    });
  } catch (err) {
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-0836: Observatory upgrade info
router.get('/observatory-upgrades', (_req: Request, res: Response) => {
  const upgrades = [
    { level: 1, dataSources: ['weather'], description: 'Basic weather readings' },
    { level: 2, dataSources: ['weather', 'moon'], description: 'Lunar phase tracking unlocked' },
    { level: 3, dataSources: ['weather', 'moon', 'market_fear_greed'], description: 'Market sentiment readings' },
    { level: 4, dataSources: ['weather', 'moon', 'market_fear_greed', 'stocks'], description: 'Stock market analysis' },
    { level: 5, dataSources: ['weather', 'moon', 'market_fear_greed', 'stocks', 'news'], description: 'News ticker activated' },
    { level: 6, dataSources: ['weather', 'moon', 'market_fear_greed', 'stocks', 'news', 'crypto'], description: 'Crypto sentiment tracking' },
    { level: 7, dataSources: ['weather', 'moon', 'market_fear_greed', 'stocks', 'news', 'crypto', 'sports'], description: 'Sports event detection' },
    { level: 8, dataSources: ['all'], description: 'Full astronomical observatory — all data sources active' },
  ];
  res.json({ upgrades });
});

// T-0824: Tutorial data
router.get('/data-tutorial', (_req: Request, res: Response) => {
  res.json({
    steps: [
      { title: 'The Living World', text: 'Guildtide draws from real-world data to create a dynamic, ever-changing game world.' },
      { title: 'Weather Matters', text: 'Real weather from your region affects crop growth, expedition safety, and market activity.' },
      { title: 'Market Pulse', text: 'Global financial sentiment influences your guild\'s trade economy. Watch the Observatory!' },
      { title: 'Celestial Influence', text: 'Moon phases affect magic potency and stealth. Plan your expeditions by the lunar calendar.' },
      { title: 'Your Choice', text: 'You can opt out of real-world data effects at any time in Settings. Fixed values will be used instead.' },
    ],
  });
});

export { router as worldRouter };
