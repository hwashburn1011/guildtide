import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { AnalyticsService } from '../services/AnalyticsService';

// ============================================================================
// Epic 30: Analytics & Monetization — Server routes (T-2041 – T-2090)
// ============================================================================

const router = Router();

// ---------------------------------------------------------------------------
// T-2041: Event ingestion endpoint (requires auth for player ID)
// ---------------------------------------------------------------------------

router.post('/events', authMiddleware, async (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const { events, session } = req.body;

    if (!Array.isArray(events) || !session?.sessionId) {
      res.status(400).json({ error: 'validation', message: 'events array and session required' });
      return;
    }

    AnalyticsService.ingestEvents(playerId, events, session);
    res.status(202).json({ accepted: events.length });
  } catch (err) {
    console.error('Analytics ingestion error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// T-2054: Dashboard metrics endpoint
// ---------------------------------------------------------------------------

router.get('/dashboard', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const metrics = AnalyticsService.getDashboardMetrics();
    res.json(metrics);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// T-2046–T-2049: Funnel analysis endpoint
// ---------------------------------------------------------------------------

router.get('/funnels/:funnelId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const steps = AnalyticsService.getFunnelAnalysis(req.params.funnelId);
    res.json({ funnelId: req.params.funnelId, steps });
  } catch (err) {
    console.error('Funnel analysis error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// T-2053: Retention data endpoint
// ---------------------------------------------------------------------------

router.get('/retention', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const retention = AnalyticsService.getRetentionData();
    res.json(retention);
  } catch (err) {
    console.error('Retention data error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// T-2055: User segmentation endpoint
// ---------------------------------------------------------------------------

router.get('/segments', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const segments = AnalyticsService.getSegmentDistribution();
    res.json(segments);
  } catch (err) {
    console.error('Segments error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// T-2056: Churn risk endpoint
// ---------------------------------------------------------------------------

router.get('/churn/:playerId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const risk = AnalyticsService.getChurnRisk(req.params.playerId);
    res.json({ playerId: req.params.playerId, churnRisk: risk });
  } catch (err) {
    console.error('Churn prediction error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// T-2057–T-2059: A/B test results endpoint
// ---------------------------------------------------------------------------

router.get('/ab-tests/:testId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const results = AnalyticsService.getABTestResults(req.params.testId);
    res.json(results);
  } catch (err) {
    console.error('AB test results error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// T-2063–T-2064: Feedback endpoints
// ---------------------------------------------------------------------------

router.post('/feedback', authMiddleware, async (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const { category, message, rating } = req.body;

    if (!category || !message) {
      res.status(400).json({ error: 'validation', message: 'category and message required' });
      return;
    }

    AnalyticsService.submitFeedback(playerId, category, message, rating);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

router.get('/feedback', authMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const feedback = AnalyticsService.getFeedback(limit);
    res.json(feedback);
  } catch (err) {
    console.error('Feedback fetch error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// T-2064: NPS endpoint
// ---------------------------------------------------------------------------

router.get('/nps', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const nps = AnalyticsService.getNPSResult();
    res.json(nps);
  } catch (err) {
    console.error('NPS error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// T-2085–T-2087: Revenue metrics endpoint
// ---------------------------------------------------------------------------

router.get('/revenue', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const revenue = AnalyticsService.getRevenueMetrics();
    res.json(revenue);
  } catch (err) {
    console.error('Revenue metrics error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// T-2065: Data export endpoint
// ---------------------------------------------------------------------------

router.get('/export', authMiddleware, async (req: Request, res: Response) => {
  try {
    const startMs = req.query.start ? parseInt(req.query.start as string) : undefined;
    const endMs = req.query.end ? parseInt(req.query.end as string) : undefined;
    const data = AnalyticsService.exportData(startMs, endMs);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.json');
    res.send(data);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export const analyticsRouter = router;
