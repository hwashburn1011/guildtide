/**
 * Finance routes — Sapphire Exchange, ventures, financial data, observatory summary.
 *
 * T-0991 through T-1070: Financial data integration endpoints
 */
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { FinancialDataService, FINANCIAL_TOOLTIPS } from '../services/FinancialDataService';
import { SapphireExchangeService } from '../services/SapphireExchangeService';

const router = Router();
router.use(authMiddleware);

// GET / — Full financial snapshot
router.get('/', async (_req: Request, res: Response) => {
  try {
    const snapshot = await FinancialDataService.getFinancialSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error('Financial snapshot error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /observatory — Observatory building summary (T-0995)
router.get('/observatory', async (_req: Request, res: Response) => {
  try {
    const summary = await SapphireExchangeService.getObservatorySummary();
    res.json(summary);
  } catch (err) {
    console.error('Observatory summary error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /ticker — Market ticker scrolling data (T-1057)
router.get('/ticker', async (_req: Request, res: Response) => {
  try {
    const ticker = await SapphireExchangeService.getMarketTicker();
    res.json(ticker);
  } catch (err) {
    console.error('Market ticker error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /sectors — Sector dashboard (T-1040)
router.get('/sectors', async (_req: Request, res: Response) => {
  try {
    const dashboard = await SapphireExchangeService.getSectorDashboard();
    res.json(dashboard);
  } catch (err) {
    console.error('Sector dashboard error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /news — Economic newspaper NPC articles (T-1060)
router.get('/news', async (_req: Request, res: Response) => {
  try {
    const articles = await SapphireExchangeService.getNewspaperArticles();
    res.json(articles);
  } catch (err) {
    console.error('Financial news error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /advisor — Economic advisor NPC predictions (T-1066)
router.get('/advisor', async (_req: Request, res: Response) => {
  try {
    const predictions = await SapphireExchangeService.getAdvisorPredictions();
    res.json(predictions);
  } catch (err) {
    console.error('Advisor predictions error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /tooltips — Educational tooltips (T-1035)
router.get('/tooltips', async (_req: Request, res: Response) => {
  try {
    res.json(FINANCIAL_TOOLTIPS);
  } catch (err) {
    console.error('Tooltips error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- Ventures (T-1038, T-1039) ----

// GET /ventures — Player's active ventures
router.get('/ventures', async (req: Request, res: Response) => {
  try {
    const ventures = SapphireExchangeService.getPlayerVentures(req.playerId!);
    res.json(ventures);
  } catch (err) {
    console.error('Get ventures error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /ventures — Create a new venture investment
router.post('/ventures', async (req: Request, res: Response) => {
  try {
    const { sector, investedGold } = req.body as { sector: string; investedGold: number };
    if (!sector || !investedGold || investedGold <= 0) {
      res.status(400).json({ error: 'validation', message: 'sector and positive investedGold required' });
      return;
    }
    const venture = SapphireExchangeService.createVenture(req.playerId!, sector, investedGold);
    res.json(venture);
  } catch (err) {
    console.error('Create venture error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /ventures/:id/liquidate — Liquidate a venture
router.post('/ventures/:id/liquidate', async (req: Request, res: Response) => {
  try {
    const result = SapphireExchangeService.liquidateVenture(req.playerId!, req.params.id);
    if (!result) {
      res.status(404).json({ error: 'not_found', message: 'Venture not found or already liquidated' });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error('Liquidate venture error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- Commodity Futures (T-1056) ----

// GET /futures — Player's commodity futures
router.get('/futures', async (req: Request, res: Response) => {
  try {
    const futures = SapphireExchangeService.getPlayerFutures(req.playerId!);
    res.json(futures);
  } catch (err) {
    console.error('Get futures error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /futures — Create commodity future
router.post('/futures', async (req: Request, res: Response) => {
  try {
    const { commodity, quantity, price, maturityHours } = req.body;
    if (!commodity || !quantity || !price) {
      res.status(400).json({ error: 'validation', message: 'commodity, quantity, and price required' });
      return;
    }
    const future = SapphireExchangeService.createCommodityFuture(
      req.playerId!, commodity, quantity, price, maturityHours ?? 24,
    );
    res.json(future);
  } catch (err) {
    console.error('Create future error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- Events ----

// GET /events — Active exchange events
router.get('/events', async (_req: Request, res: Response) => {
  try {
    const events = SapphireExchangeService.getActiveEvents();
    res.json(events);
  } catch (err) {
    console.error('Exchange events error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /notifications — Financial event notifications (T-1026)
router.get('/notifications', async (_req: Request, res: Response) => {
  try {
    const notifications = FinancialDataService.getEventNotifications();
    res.json(notifications);
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- Settings (T-1034) ----

// GET /settings — Financial integration settings
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = FinancialDataService.getSettings();
    res.json(settings);
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /settings — Update financial integration settings
router.post('/settings', async (req: Request, res: Response) => {
  try {
    FinancialDataService.updateSettings(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- Privacy (T-1058) ----

// GET /privacy — Privacy notice
router.get('/privacy', async (_req: Request, res: Response) => {
  try {
    const notice = SapphireExchangeService.getPrivacyNotice();
    res.json(notice);
  } catch (err) {
    console.error('Privacy notice error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /privacy/consent — Set consent
router.post('/privacy/consent', async (req: Request, res: Response) => {
  try {
    const { consented } = req.body;
    SapphireExchangeService.setFinancialConsent(req.playerId!, consented);
    res.json({ success: true });
  } catch (err) {
    console.error('Consent error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- Analytics & Reports ----

// GET /monthly-report — Monthly financial report (T-1048)
router.get('/monthly-report', async (_req: Request, res: Response) => {
  try {
    const report = await SapphireExchangeService.getMonthlyFinancialReport();
    res.json(report);
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /calendar — Market event calendar (T-1046)
router.get('/calendar', async (_req: Request, res: Response) => {
  try {
    const calendar = SapphireExchangeService.getMarketEventCalendar();
    res.json(calendar);
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /rotation — Sector rotation calendar (T-1069)
router.get('/rotation', async (_req: Request, res: Response) => {
  try {
    const rotation = SapphireExchangeService.getSectorRotationCalendar();
    res.json(rotation);
  } catch (err) {
    console.error('Rotation error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /research-nodes — Research tree financial nodes (T-1050)
router.get('/research-nodes', async (_req: Request, res: Response) => {
  try {
    const nodes = SapphireExchangeService.getResearchTreeFinancialNodes();
    res.json(nodes);
  } catch (err) {
    console.error('Research nodes error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /simulate — Impact simulation (T-1052)
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const result = SapphireExchangeService.simulateImpact(req.body);
    res.json(result);
  } catch (err) {
    console.error('Simulate error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /export — Export financial data (T-1054)
router.get('/export', async (req: Request, res: Response) => {
  try {
    const data = await SapphireExchangeService.exportFinancialData(req.playerId!);
    res.json(data);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /audit — Audit trail (T-1043)
router.get('/audit', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const log = FinancialDataService.getAuditLog(limit);
    res.json(log);
  } catch (err) {
    console.error('Audit error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /health — Health check (T-1051)
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await FinancialDataService.getHealthCheck();
    res.json(health);
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /anonymized — Anonymized aggregate report (T-1059)
router.get('/anonymized', async (_req: Request, res: Response) => {
  try {
    const report = SapphireExchangeService.getAnonymizedReport();
    res.json(report);
  } catch (err) {
    console.error('Anonymized report error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /inflation — Inflation meter (T-1063)
router.get('/inflation', async (_req: Request, res: Response) => {
  try {
    const meter = SapphireExchangeService.getInflationMeter();
    res.json({ inflationMeter: meter });
  } catch (err) {
    console.error('Inflation meter error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /loading-skeleton — Loading skeleton config (T-1068)
router.get('/loading-skeleton', async (_req: Request, res: Response) => {
  try {
    const config = SapphireExchangeService.getLoadingSkeletonConfig();
    res.json(config);
  } catch (err) {
    console.error('Loading skeleton error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as financeRouter };
