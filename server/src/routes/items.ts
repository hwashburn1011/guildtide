import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ItemService } from '../services/ItemService.js';
import { ITEM_TEMPLATES } from '../data/itemTemplates.js';

const router = Router();
router.use(authMiddleware);

// GET / — inventory list with template details
router.get('/', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const inventory = await ItemService.getInventory(guild.id);
    res.json(inventory);
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /templates — all item templates (for craft UI)
router.get('/templates', async (_req: Request, res: Response) => {
  try {
    res.json(ITEM_TEMPLATES);
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /craft — craft an item
router.post('/craft', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const { templateId } = req.body;
    if (!templateId) {
      res.status(400).json({ error: 'validation', message: 'templateId is required' });
      return;
    }

    const result = await ItemService.craftItem(guild.id, templateId);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'craft_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// POST /equip — equip item on hero
router.post('/equip', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const { heroId, itemId, slot } = req.body;
    if (!heroId || !itemId || !slot) {
      res.status(400).json({ error: 'validation', message: 'heroId, itemId, and slot are required' });
      return;
    }

    const hero = await ItemService.equipItem(heroId, itemId, slot, guild.id);
    res.json(hero);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'equip_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// POST /unequip — unequip from slot
router.post('/unequip', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const { heroId, slot } = req.body;
    if (!heroId || !slot) {
      res.status(400).json({ error: 'validation', message: 'heroId and slot are required' });
      return;
    }

    const hero = await ItemService.unequipItem(heroId, slot, guild.id);
    res.json(hero);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'unequip_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

export { router as itemsRouter };
