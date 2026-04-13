import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Set player region
router.post('/region', async (req: Request, res: Response) => {
  try {
    const { regionId } = req.body;

    if (!regionId) {
      res.status(400).json({ error: 'validation', message: 'Region ID is required' });
      return;
    }

    await prisma.player.update({
      where: { id: req.playerId },
      data: { regionId },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Set region error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as playerRouter };
