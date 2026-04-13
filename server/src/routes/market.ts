import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { MarketService } from '../services/MarketService.js';
import { ResourceType } from '../../../shared/src/enums.js';

const router = Router();
router.use(authMiddleware);

// GET / — current prices, trends, confidence
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
    if (message.includes('Not enough') || message.includes('Cannot trade')) {
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
    if (message.includes('Not enough') || message.includes('Cannot trade')) {
      res.status(400).json({ error: 'trade_failed', message });
    } else if (message.includes('No guild') || message.includes('region not set')) {
      res.status(404).json({ error: 'not_found', message });
    } else {
      console.error('Market sell error:', err);
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

export { router as marketRouter };
