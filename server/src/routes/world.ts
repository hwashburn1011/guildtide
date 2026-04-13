import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { WeatherService } from '../services/WeatherService.js';

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

    const worldState = await WeatherService.getWorldState(player.regionId);
    if (!worldState) {
      res.status(500).json({ error: 'server', message: 'Failed to get world state' });
      return;
    }

    res.json(worldState);
  } catch (err) {
    console.error('Get world state error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as worldRouter };
