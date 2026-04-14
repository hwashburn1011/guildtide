/**
 * Market routes — prices, buy, sell, NPC merchants, auctions, trade routes,
 * analytics, watchlist, futures, quick-sell, order book, history, and more.
 *
 * T-0551 through T-0620
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { MarketService } from '../services/MarketService';
import { MarketAnalyticsService } from '../services/MarketAnalyticsService';
import { ResourceType } from '../../../shared/src/enums';

const router = Router();
router.use(authMiddleware);

// GET / — current prices, trends, confidence, events, deals
router.get('/', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (!player || !player.regionId) {
      res.status(400).json({ error: 'no_region', message: 'Player region not set' });
      return;
    }

    const prices = await MarketService.getPrices(player.regionId);
    res.json(prices);
  } catch (err) {
    console.error('Get market prices error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /buy — buy a resource
router.post('/buy', async (req: Request, res: Response) => {
  try {
    const { resource, quantity } = req.body as { resource: ResourceType; quantity: number };

    if (!resource || !quantity) {
      res.status(400).json({ error: 'validation', message: 'resource and quantity are required' });
      return;
    }

    const result = await MarketService.buy(req.playerId!, resource, quantity);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Trade failed';
    if (message.includes('Not enough') || message.includes('Cannot trade') || message.includes('halted') || message.includes('embargo')) {
      res.status(400).json({ error: 'trade_failed', message });
    } else if (message.includes('No guild') || message.includes('region not set')) {
      res.status(404).json({ error: 'not_found', message });
    } else {
      console.error('Market buy error:', err);
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// POST /sell — sell a resource
router.post('/sell', async (req: Request, res: Response) => {
  try {
    const { resource, quantity } = req.body as { resource: ResourceType; quantity: number };

    if (!resource || !quantity) {
      res.status(400).json({ error: 'validation', message: 'resource and quantity are required' });
      return;
    }

    const result = await MarketService.sell(req.playerId!, resource, quantity);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Trade failed';
    if (message.includes('Not enough') || message.includes('Cannot trade') || message.includes('halted') || message.includes('embargo')) {
      res.status(400).json({ error: 'trade_failed', message });
    } else if (message.includes('No guild') || message.includes('region not set')) {
      res.status(404).json({ error: 'not_found', message });
    } else {
      console.error('Market sell error:', err);
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// POST /quick-sell — T-0612: Quick-sell at floor price
router.post('/quick-sell', async (req: Request, res: Response) => {
  try {
    const { resource, quantity } = req.body as { resource: ResourceType; quantity: number };
    if (!resource || !quantity) {
      res.status(400).json({ error: 'validation', message: 'resource and quantity are required' });
      return;
    }
    const result = await MarketService.quickSell(req.playerId!, resource, quantity);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Quick sell failed';
    res.status(400).json({ error: 'trade_failed', message });
  }
});

// GET /history — T-0563/T-0564: Transaction history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = MarketAnalyticsService.getTransactionHistory(req.playerId!, limit);
    res.json(history);
  } catch (err) {
    console.error('Market history error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /price-history — T-0555/T-0556: Price history for charts
router.get('/price-history', async (req: Request, res: Response) => {
  try {
    const resource = req.query.resource as ResourceType | undefined;
    const limit = parseInt(req.query.limit as string) || 24;
    const history = MarketAnalyticsService.getPriceHistory(resource, limit);
    res.json(history);
  } catch (err) {
    console.error('Price history error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /analytics — T-0592: Market analytics dashboard
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const dashboard = MarketService.getAnalyticsDashboard(req.playerId!);
    res.json(dashboard);
  } catch (err) {
    console.error('Market analytics error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /merchants — T-0565-T-0567: NPC merchants
router.get('/merchants', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (!player || !player.regionId) {
      res.status(400).json({ error: 'no_region', message: 'Player region not set' });
      return;
    }
    const merchants = await MarketService.getNpcMerchants(req.playerId!, player.regionId);
    res.json(merchants);
  } catch (err) {
    console.error('NPC merchants error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /merchants/:id/buy — T-0565/T-0568: Buy from NPC merchant
router.post('/merchants/:id/buy', async (req: Request, res: Response) => {
  try {
    const { resource, quantity } = req.body as { resource: ResourceType; quantity: number };
    if (!resource || !quantity) {
      res.status(400).json({ error: 'validation', message: 'resource and quantity are required' });
      return;
    }
    const result = await MarketService.buyFromMerchant(req.playerId!, req.params.id as string, resource, quantity);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Merchant trade failed';
    res.status(400).json({ error: 'trade_failed', message });
  }
});

// POST /auctions — T-0571/T-0573: Create auction listing
router.post('/auctions', async (req: Request, res: Response) => {
  try {
    const { resource, quantity, startingPrice, buyoutPrice, durationHours } = req.body;
    if (!resource || !quantity || !startingPrice) {
      res.status(400).json({ error: 'validation', message: 'resource, quantity, and startingPrice are required' });
      return;
    }
    const listing = MarketAnalyticsService.createAuction(
      req.playerId!, resource, quantity, startingPrice, buyoutPrice ?? null, durationHours ?? 24,
    );
    res.json(listing);
  } catch (err) {
    console.error('Create auction error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /auctions — T-0572: Active auction listings
router.get('/auctions', async (req: Request, res: Response) => {
  try {
    const resource = req.query.resource as ResourceType | undefined;
    const auctions = MarketAnalyticsService.getActiveAuctions(resource);
    res.json(auctions);
  } catch (err) {
    console.error('Get auctions error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /auctions/:id/bid — T-0574: Place a bid
router.post('/auctions/:id/bid', async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      res.status(400).json({ error: 'validation', message: 'amount is required' });
      return;
    }
    const result = MarketAnalyticsService.placeBid(req.params.id as string, req.playerId!, amount);
    if (!result) {
      res.status(400).json({ error: 'bid_failed', message: 'Bid rejected (expired, too low, or not found)' });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error('Place bid error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /auctions/history — T-0577: Auction history
router.get('/auctions/history', async (req: Request, res: Response) => {
  try {
    const history = MarketAnalyticsService.getAuctionHistory(req.playerId!);
    res.json(history);
  } catch (err) {
    console.error('Auction history error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /trade-routes — T-0578: Create trade route
router.post('/trade-routes', async (req: Request, res: Response) => {
  try {
    const { fromRegion, toRegion, resource, quantity, travelHours } = req.body;
    if (!fromRegion || !toRegion || !resource || !quantity) {
      res.status(400).json({ error: 'validation', message: 'fromRegion, toRegion, resource, and quantity are required' });
      return;
    }
    const route = MarketAnalyticsService.createTradeRoute(
      req.playerId!, fromRegion, toRegion, resource, quantity, travelHours ?? 4,
    );
    res.json(route);
  } catch (err) {
    console.error('Create trade route error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /trade-routes — T-0579/T-0582: Active trade routes
router.get('/trade-routes', async (req: Request, res: Response) => {
  try {
    const routes = MarketAnalyticsService.getActiveTradeRoutes(req.playerId!);
    res.json(routes);
  } catch (err) {
    console.error('Get trade routes error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /trade-routes/profit — T-0580: Trade route profit calculator
router.get('/trade-routes/profit', async (req: Request, res: Response) => {
  try {
    const { resource, quantity, buyPrice, sellPrice } = req.query;
    const estimate = MarketAnalyticsService.getTradeRouteProfitEstimate(
      resource as ResourceType,
      parseInt(quantity as string) || 1,
      parseInt(buyPrice as string) || 0,
      parseInt(sellPrice as string) || 0,
    );
    res.json(estimate);
  } catch (err) {
    console.error('Trade route profit error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /watchlist — T-0588: Player watchlist
router.get('/watchlist', async (req: Request, res: Response) => {
  try {
    const watchlist = MarketAnalyticsService.getWatchlist(req.playerId!);
    res.json(watchlist);
  } catch (err) {
    console.error('Get watchlist error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /watchlist — T-0588/T-0589: Set watchlist with alerts
router.post('/watchlist', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    MarketAnalyticsService.setWatchlist(req.playerId!, items ?? []);
    res.json({ success: true });
  } catch (err) {
    console.error('Set watchlist error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /alerts — T-0589: Check triggered price alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (!player || !player.regionId) {
      res.json([]);
      return;
    }
    const prices = await MarketService.getPrices(player.regionId);
    const currentPrices: Record<string, number> = {};
    for (const item of prices.items) {
      currentPrices[item.resource] = item.currentPrice;
    }
    const alerts = MarketAnalyticsService.checkPriceAlerts(req.playerId!, currentPrices);
    res.json(alerts);
  } catch (err) {
    console.error('Price alerts error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /order-book — T-0599: Pending buy/sell orders
router.get('/order-book', async (req: Request, res: Response) => {
  try {
    const resource = req.query.resource as ResourceType | undefined;
    const orders = MarketAnalyticsService.getOrderBook(resource);
    res.json(orders);
  } catch (err) {
    console.error('Order book error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /futures — T-0602: Create commodity future
router.post('/futures', async (req: Request, res: Response) => {
  try {
    const { resource, quantity, purchasePrice, maturityHours } = req.body;
    if (!resource || !quantity || !purchasePrice) {
      res.status(400).json({ error: 'validation', message: 'resource, quantity, and purchasePrice are required' });
      return;
    }
    const future = MarketAnalyticsService.createFuture(
      req.playerId!, resource, quantity, purchasePrice, maturityHours ?? 24,
    );
    res.json(future);
  } catch (err) {
    console.error('Create future error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /futures — T-0602: Active commodity futures
router.get('/futures', async (req: Request, res: Response) => {
  try {
    const futures = MarketAnalyticsService.getActiveFutures(req.playerId!);
    res.json(futures);
  } catch (err) {
    console.error('Get futures error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /achievements — T-0601: Market achievements
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    const achievements = MarketAnalyticsService.getAchievements(req.playerId!);
    res.json(achievements);
  } catch (err) {
    console.error('Market achievements error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /reputation — T-0606: Merchant guild reputation
router.get('/reputation', async (req: Request, res: Response) => {
  try {
    const rep = MarketAnalyticsService.getReputation(req.playerId!);
    const discount = MarketAnalyticsService.getReputationDiscount(req.playerId!);
    res.json({ reputation: rep, discountPercent: Math.round(discount * 100 * 10) / 10 });
  } catch (err) {
    console.error('Market reputation error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /pnl — T-0609: Profit/loss tracker
router.get('/pnl', async (req: Request, res: Response) => {
  try {
    const pnl = MarketAnalyticsService.getProfitLoss(req.playerId!);
    res.json({ netProfitLoss: pnl });
  } catch (err) {
    console.error('P&L error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /exchange-rates — T-0610: Currency exchange rates
router.get('/exchange-rates', async (_req: Request, res: Response) => {
  try {
    const rates = MarketAnalyticsService.getExchangeRates();
    res.json(rates);
  } catch (err) {
    console.error('Exchange rates error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /demand-forecast — T-0613: Demand forecast
router.get('/demand-forecast', async (req: Request, res: Response) => {
  try {
    const resource = req.query.resource as ResourceType;
    if (!resource) {
      res.status(400).json({ error: 'validation', message: 'resource query param required' });
      return;
    }
    const forecast = MarketAnalyticsService.getDemandForecast(resource);
    res.json(forecast);
  } catch (err) {
    console.error('Demand forecast error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /spotlight — T-0614: Rare item spotlight
router.get('/spotlight', async (_req: Request, res: Response) => {
  try {
    const spotlight = MarketAnalyticsService.getRareItemSpotlight();
    res.json(spotlight);
  } catch (err) {
    console.error('Spotlight error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /tutorial — T-0598: Market tutorial steps
router.get('/tutorial', async (_req: Request, res: Response) => {
  try {
    const steps = MarketAnalyticsService.getMarketTutorialSteps();
    res.json(steps);
  } catch (err) {
    console.error('Tutorial error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /news — T-0603: Market news ticker
router.get('/news', async (_req: Request, res: Response) => {
  try {
    const news = MarketAnalyticsService.getNewsTicker();
    res.json(news);
  } catch (err) {
    console.error('News ticker error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /daily-deals — T-0618: Daily deals
router.get('/daily-deals', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (!player || !player.regionId) {
      res.json([]);
      return;
    }
    const deals = MarketAnalyticsService.getDailyDeals(player.regionId);
    res.json(deals);
  } catch (err) {
    console.error('Daily deals error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /search — T-0593: Market item search with autocomplete
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').toLowerCase();
    const resources = [
      ResourceType.Wood, ResourceType.Stone, ResourceType.Herbs,
      ResourceType.Ore, ResourceType.Water, ResourceType.Food, ResourceType.Essence,
    ];
    const matches = resources.filter(r => r.includes(q));
    res.json(matches.map(r => ({ resource: r, label: r.charAt(0).toUpperCase() + r.slice(1) })));
  } catch (err) {
    console.error('Market search error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /compare — T-0597: Compare prices across merchants
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (!player || !player.regionId) {
      res.status(400).json({ error: 'no_region', message: 'Player region not set' });
      return;
    }
    const merchants = await MarketService.getNpcMerchants(req.playerId!, player.regionId);
    res.json(merchants.map(m => ({
      merchantId: m.id,
      merchantName: m.name,
      prices: Object.fromEntries(m.inventory.map(i => [i.resource, i.pricePerUnit])),
    })));
  } catch (err) {
    console.error('Price compare error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /inflation — T-0619: Inflation index
router.get('/inflation', async (_req: Request, res: Response) => {
  try {
    const index = MarketAnalyticsService.getInflationIndex();
    res.json({ inflationIndex: index });
  } catch (err) {
    console.error('Inflation error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /mini-widget — T-0600: Quick-trade data from any scene
router.get('/mini-widget', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId } });
    if (!player || !player.regionId) {
      res.json([]);
      return;
    }
    const daily = await MarketService.getPrices(player.regionId);
    const currentPrices: Record<string, number> = {};
    for (const item of daily.items) {
      currentPrices[item.resource] = item.currentPrice;
    }
    const widget = MarketAnalyticsService.getQuickTradeData(currentPrices);
    res.json(widget);
  } catch (err) {
    console.error('Mini widget error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as marketRouter };
