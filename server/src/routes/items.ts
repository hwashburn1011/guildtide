/**
 * Items & Equipment API routes.
 * Covers T-0681 through T-0760.
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { ItemService } from '../services/ItemService';
import { CraftingService } from '../services/CraftingService';
import { EnchantingService } from '../services/EnchantingService';
import { ITEM_TEMPLATES } from '../data/itemTemplates';
import { ITEM_SETS, getActiveSetBonuses } from '../data/itemSets';
import { ENCHANTMENTS } from '../data/enchantments';

const router = Router();
router.use(authMiddleware);

/** Helper to get the guild for the current player */
async function getGuild(req: Request, res: Response) {
  const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
  if (!guild) {
    res.status(404).json({ error: 'not_found', message: 'No guild found' });
    return null;
  }
  return guild;
}

// ===== INVENTORY =====

// GET / — inventory list with template details
router.get('/', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const sortBy = (req.query.sortBy as string) || undefined;
    const filterCategory = (req.query.category as string) || undefined;
    const filterRarity = (req.query.rarity as string) || undefined;
    const searchQuery = (req.query.search as string) || undefined;

    const inventory = await ItemService.getFilteredInventory(guild.id, {
      sortBy: sortBy as any,
      filterCategory,
      filterRarity,
      searchQuery,
    });
    res.json(inventory);
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /templates — all item templates
router.get('/templates', async (_req: Request, res: Response) => {
  try {
    res.json(ITEM_TEMPLATES);
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /sets — all item set definitions
router.get('/sets', async (_req: Request, res: Response) => {
  try {
    res.json(ITEM_SETS);
  } catch (err) {
    console.error('Get sets error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /enchantments — all enchantment definitions
router.get('/enchantments', async (_req: Request, res: Response) => {
  try {
    res.json(ENCHANTMENTS);
  } catch (err) {
    console.error('Get enchantments error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /collection — collection completion stats
router.get('/collection', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const stats = await ItemService.getCollectionStats(guild.id);
    res.json(stats);
  } catch (err) {
    console.error('Collection error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /lore — discovered item lore
router.get('/lore', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const lore = await ItemService.getItemLore(guild.id);
    res.json(lore);
  } catch (err) {
    console.error('Lore error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /capacity — inventory capacity
router.get('/capacity', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const capacity = await ItemService.getInventoryCapacity(guild.id);
    res.json(capacity);
  } catch (err) {
    console.error('Capacity error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /price-estimate/:templateId — market price estimate
router.get('/price-estimate/:templateId', async (req: Request, res: Response) => {
  try {
    const price = ItemService.estimatePrice(req.params.templateId);
    res.json({ templateId: req.params.templateId, estimatedPrice: price });
  } catch (err) {
    console.error('Price estimate error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ===== CRAFTING =====

// POST /craft — simple craft (backward compat)
router.post('/craft', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

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

// GET /recipes — all crafting recipes
router.get('/recipes', async (_req: Request, res: Response) => {
  try {
    res.json(CraftingService.getAllRecipes());
  } catch (err) {
    console.error('Get recipes error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /recipes/:recipeId/sources — material sources for a recipe
router.get('/recipes/:recipeId/sources', async (req: Request, res: Response) => {
  try {
    const sources = CraftingService.getMaterialSources(req.params.recipeId);
    res.json(sources);
  } catch (err) {
    console.error('Material sources error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /crafting-state — crafting queue and history
router.get('/crafting-state', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const state = CraftingService.getCraftingState(guild.metadata);
    res.json(state);
  } catch (err) {
    console.error('Crafting state error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /crafting/queue — add to crafting queue
router.post('/crafting/queue', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { recipeId } = req.body;
    if (!recipeId) {
      res.status(400).json({ error: 'validation', message: 'recipeId is required' });
      return;
    }

    const result = await CraftingService.queueCraft(guild.id, recipeId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'craft_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// POST /crafting/collect — collect completed crafting
router.post('/crafting/collect', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const result = await CraftingService.collectCompleted(guild.id);
    res.json(result);
  } catch (err) {
    console.error('Collect crafting error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /crafting/cancel — cancel queued crafting
router.post('/crafting/cancel', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { recipeId } = req.body;
    if (!recipeId) {
      res.status(400).json({ error: 'validation', message: 'recipeId is required' });
      return;
    }

    const result = await CraftingService.cancelQueueEntry(guild.id, recipeId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'cancel_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// GET /crafting/history — crafting history
router.get('/crafting/history', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const history = await CraftingService.getCraftingHistory(guild.id);
    res.json(history);
  } catch (err) {
    console.error('Crafting history error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// POST /crafting/discover — discover a recipe
router.post('/crafting/discover', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { recipeId } = req.body;
    if (!recipeId) {
      res.status(400).json({ error: 'validation', message: 'recipeId is required' });
      return;
    }

    const state = await CraftingService.discoverRecipe(guild.id, recipeId);
    res.json(state);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'discover_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// ===== EQUIP / UNEQUIP =====

// POST /equip — equip item on hero
router.post('/equip', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

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
    const guild = await getGuild(req, res);
    if (!guild) return;

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

// POST /auto-equip — auto-equip best gear for a hero
router.post('/auto-equip', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { heroId } = req.body;
    if (!heroId) {
      res.status(400).json({ error: 'validation', message: 'heroId is required' });
      return;
    }

    const equipment = await ItemService.autoEquipBest(heroId, guild.id);
    res.json({ equipment });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'auto_equip_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// GET /gear-score/:heroId — gear score for hero
router.get('/gear-score/:heroId', async (req: Request, res: Response) => {
  try {
    const hero = await prisma.hero.findUnique({ where: { id: req.params.heroId } });
    if (!hero) {
      res.status(404).json({ error: 'not_found', message: 'Hero not found' });
      return;
    }

    const equipment = JSON.parse(hero.equipment);
    const score = ItemService.calculateGearScore(equipment);
    res.json({ heroId: hero.id, ...score });
  } catch (err) {
    console.error('Gear score error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /set-bonuses/:heroId — active set bonuses for hero
router.get('/set-bonuses/:heroId', async (req: Request, res: Response) => {
  try {
    const hero = await prisma.hero.findUnique({ where: { id: req.params.heroId } });
    if (!hero) {
      res.status(404).json({ error: 'not_found', message: 'Hero not found' });
      return;
    }

    const equipment = JSON.parse(hero.equipment) as Record<string, string | null>;
    const equippedIds = Object.values(equipment).filter(Boolean) as string[];
    const bonuses = getActiveSetBonuses(equippedIds);
    res.json(bonuses);
  } catch (err) {
    console.error('Set bonuses error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// GET /recommended/:heroId — recommended gear for hero
router.get('/recommended/:heroId', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const recommendations = await ItemService.getRecommendedGear(guild.id, req.params.heroId);
    res.json(recommendations);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'recommend_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// ===== DURABILITY & REPAIR =====

// POST /repair — repair an item
router.post('/repair', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { templateId } = req.body;
    if (!templateId) {
      res.status(400).json({ error: 'validation', message: 'templateId is required' });
      return;
    }

    const result = await ItemService.repairItem(guild.id, templateId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'repair_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// ===== SALVAGE =====

// POST /salvage — salvage items for materials
router.post('/salvage', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { itemId, quantity } = req.body;
    if (!itemId) {
      res.status(400).json({ error: 'validation', message: 'itemId is required' });
      return;
    }

    const result = await ItemService.salvageItem(guild.id, itemId, quantity || 1);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'salvage_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// ===== UPGRADE =====

// POST /upgrade — upgrade item rarity
router.post('/upgrade', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { itemId } = req.body;
    if (!itemId) {
      res.status(400).json({ error: 'validation', message: 'itemId is required' });
      return;
    }

    const result = await ItemService.upgradeItem(guild.id, itemId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'upgrade_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// ===== LOCK / SELL =====

// POST /lock — toggle item lock
router.post('/lock', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { itemId } = req.body;
    if (!itemId) {
      res.status(400).json({ error: 'validation', message: 'itemId is required' });
      return;
    }

    const result = await ItemService.toggleLock(guild.id, itemId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'lock_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// POST /sell — sell items for gold
router.post('/sell', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      res.status(400).json({ error: 'validation', message: 'items array is required' });
      return;
    }

    const result = await ItemService.sellItems(guild.id, items);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'sell_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// ===== TRANSMOG =====

// POST /transmog — set visual override
router.post('/transmog', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { itemId, transmogTemplateId } = req.body;
    if (!itemId) {
      res.status(400).json({ error: 'validation', message: 'itemId is required' });
      return;
    }

    const result = await ItemService.setTransmog(guild.id, itemId, transmogTemplateId || null);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'transmog_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// ===== ENCHANTING =====

// POST /enchant — apply enchantment
router.post('/enchant', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { itemId, enchantmentId } = req.body;
    if (!itemId || !enchantmentId) {
      res.status(400).json({ error: 'validation', message: 'itemId and enchantmentId are required' });
      return;
    }

    const result = await EnchantingService.enchantItem(guild.id, itemId, enchantmentId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'enchant_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// POST /disenchant — remove enchantment
router.post('/disenchant', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { itemId, enchantmentId } = req.body;
    if (!itemId || !enchantmentId) {
      res.status(400).json({ error: 'validation', message: 'itemId and enchantmentId are required' });
      return;
    }

    const result = await EnchantingService.removeEnchantment(guild.id, itemId, enchantmentId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'disenchant_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// ===== GEM SOCKETING =====

// POST /socket-gem — socket a gem into an item
router.post('/socket-gem', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { itemId, gemItemId, socketIndex } = req.body;
    if (!itemId || !gemItemId || socketIndex === undefined) {
      res.status(400).json({ error: 'validation', message: 'itemId, gemItemId, and socketIndex are required' });
      return;
    }

    const result = await EnchantingService.socketGem(guild.id, itemId, gemItemId, socketIndex);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'socket_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// POST /unsocket-gem — remove gem from socket
router.post('/unsocket-gem', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { itemId, socketIndex } = req.body;
    if (!itemId || socketIndex === undefined) {
      res.status(400).json({ error: 'validation', message: 'itemId and socketIndex are required' });
      return;
    }

    const result = await EnchantingService.unsocketGem(guild.id, itemId, socketIndex);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'unsocket_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// GET /gems — gem effect definitions
router.get('/gems', async (_req: Request, res: Response) => {
  try {
    res.json(EnchantingService.getGemEffects());
  } catch (err) {
    console.error('Get gems error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ===== LOADOUTS =====

// POST /loadout — save equipment loadout
router.post('/loadout', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { heroId, name } = req.body;
    if (!heroId || !name) {
      res.status(400).json({ error: 'validation', message: 'heroId and name are required' });
      return;
    }

    const loadout = await ItemService.saveLoadout(guild.id, heroId, name);
    res.json(loadout);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'loadout_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// ===== STORAGE =====

// POST /expand-storage — expand inventory capacity
router.post('/expand-storage', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const result = await ItemService.expandStorage(guild.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'expand_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// ===== ITEM AGING (T-0742) =====

// GET /aging — items with visual aging/patina info
router.get('/aging', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const inventory = await ItemService.getInventory(guild.id);
    const aged = inventory.map((item: any) => {
      const createdDay = item.metadata?.createdDay || 0;
      const currentDay = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
      const ageDays = currentDay - createdDay;
      let patina = 'new';
      if (ageDays > 365) patina = 'ancient';
      else if (ageDays > 180) patina = 'weathered';
      else if (ageDays > 90) patina = 'aged';
      else if (ageDays > 30) patina = 'worn';

      return { id: item.id, templateId: item.templateId, name: item.template?.name, ageDays, patina };
    });

    res.json(aged);
  } catch (err) {
    console.error('Aging error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ===== QUEST REWARD INTEGRATION (T-0744) =====

// POST /quest-reward — award item from quest completion
router.post('/quest-reward', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { templateId, quantity } = req.body;
    if (!templateId) {
      res.status(400).json({ error: 'validation', message: 'templateId is required' });
      return;
    }

    const item = await ItemService.addItem(guild.id, templateId, quantity || 1);
    res.json({ item, message: 'Quest reward received!' });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'reward_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// ===== CRAFTING EVENTS (T-0745) =====

// GET /crafting-events — active crafting events
router.get('/crafting-events', async (_req: Request, res: Response) => {
  try {
    // Calculate active crafting events based on date
    const now = new Date();
    const month = now.getMonth();
    const events = [];

    // Seasonal crafting festivals
    if (month === 11 || month === 0) {
      events.push({
        id: 'winter_forge',
        name: 'Winter Forge Festival',
        description: 'Double quality chance on all crafted items!',
        bonus: { qualityMultiplier: 2, critChanceBonus: 5 },
        active: true,
      });
    }
    if (month >= 5 && month <= 7) {
      events.push({
        id: 'summer_smelt',
        name: 'Summer Smelting Season',
        description: 'Reduced crafting costs by 20%!',
        bonus: { costReduction: 0.2 },
        active: true,
      });
    }
    if (month === 9) {
      events.push({
        id: 'harvest_craft',
        name: 'Harvest Crafting Fair',
        description: 'Food and herb recipes cost 50% less!',
        bonus: { costReduction: 0.5, categories: ['food', 'herbs'] },
        active: true,
      });
    }

    res.json(events);
  } catch (err) {
    console.error('Crafting events error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ===== SEASONAL MATERIALS (T-0757) =====

// GET /seasonal-materials — materials available this season
router.get('/seasonal-materials', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const month = now.getMonth();

    let season: string;
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';

    const seasonalMaterials: Record<string, Array<{ templateId: string; name: string; description: string }>> = {
      spring: [
        { templateId: 'seed_moonpetal', name: 'Moonpetal Seed', description: 'Blooms in spring moonlight' },
        { templateId: 'material_living_wood', name: 'Living Wood', description: 'Most potent in spring' },
      ],
      summer: [
        { templateId: 'material_dragon_scale', name: 'Dragon Scale', description: 'Dragons shed in summer heat' },
        { templateId: 'gem_ruby', name: 'Ruby', description: 'Found in summer-warmed caves' },
      ],
      autumn: [
        { templateId: 'material_moonthread', name: 'Moonthread', description: 'Harvest moon enhances spinning' },
        { templateId: 'seed_cloudberry', name: 'Cloudberry Bush', description: 'Autumn berries are sweetest' },
      ],
      winter: [
        { templateId: 'gem_sapphire', name: 'Sapphire', description: 'Crystal clear in winter frost' },
        { templateId: 'material_phoenix_feather', name: 'Phoenix Feather', description: 'Phoenix nests in winter warmth' },
      ],
    };

    res.json({
      season,
      materials: seasonalMaterials[season] || [],
      bonusDropRate: 1.5,
    });
  } catch (err) {
    console.error('Seasonal materials error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ===== RECIPE DISCOVERY (T-0756) =====

// POST /discover-from-expedition — discover recipe from expedition find
router.post('/discover-from-expedition', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { destinationId } = req.body;

    // Randomly discover a recipe based on expedition destination
    const allRecipes = CraftingService.getAllRecipes();
    const state = CraftingService.getCraftingState(guild.metadata);
    const undiscovered = allRecipes.filter(r => !state.discoveredRecipes.includes(r.id));

    if (undiscovered.length === 0) {
      res.json({ discovered: false, message: 'All recipes already known!' });
      return;
    }

    // 30% chance to discover a recipe
    if (Math.random() > 0.3) {
      res.json({ discovered: false, message: 'No recipe found this time.' });
      return;
    }

    const recipe = undiscovered[Math.floor(Math.random() * undiscovered.length)];
    await CraftingService.discoverRecipe(guild.id, recipe.id);

    res.json({
      discovered: true,
      recipe: { id: recipe.id, name: recipe.name },
      message: `Discovered recipe: ${recipe.name}!`,
    });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'discover_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

// ===== STAT RANDOMIZATION (T-0747) =====

// POST /randomize-stats — randomize item stats within rarity range
router.post('/randomize-stats', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { itemId } = req.body;
    if (!itemId) {
      res.status(400).json({ error: 'validation', message: 'itemId is required' });
      return;
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.guildId !== guild.id) {
      res.status(400).json({ error: 'not_found', message: 'Item not found' });
      return;
    }

    const template = ITEM_TEMPLATES.find(t => t.id === item.templateId);
    if (!template) {
      res.status(400).json({ error: 'not_found', message: 'Template not found' });
      return;
    }

    // Cost: 10 essence per reroll
    const resources = JSON.parse(guild.resources) as Record<string, number>;
    if ((resources.essence || 0) < 10) {
      res.status(400).json({ error: 'insufficient', message: 'Need 10 essence to reroll stats' });
      return;
    }
    resources.essence -= 10;

    // Randomize stats within +/- 20% of template base
    const metadata = item.metadata ? JSON.parse(item.metadata) : {};
    const statRolls: Record<string, number> = {};

    if (template.effects.statBonuses) {
      for (const [stat, base] of Object.entries(template.effects.statBonuses)) {
        const variance = Math.ceil(base * 0.2);
        const roll = base + Math.floor(Math.random() * (variance * 2 + 1)) - variance;
        statRolls[stat] = Math.max(1, roll);
      }
    }

    metadata.statRolls = statRolls;

    await prisma.item.update({
      where: { id: itemId },
      data: { metadata: JSON.stringify(metadata) },
    });

    await prisma.guild.update({
      where: { id: guild.id },
      data: { resources: JSON.stringify(resources) },
    });

    res.json({ statRolls, essenceSpent: 10 });
  } catch (err) {
    console.error('Randomize stats error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ===== ITEM CARD EXPORT (T-0755) =====

// GET /card/:templateId — get item detail card data for sharing
router.get('/card/:templateId', async (req: Request, res: Response) => {
  try {
    const template = ITEM_TEMPLATES.find(t => t.id === req.params.templateId);
    if (!template) {
      res.status(404).json({ error: 'not_found', message: 'Template not found' });
      return;
    }

    // Build card data for client-side rendering/export
    const card = {
      name: template.name,
      rarity: template.rarity,
      category: template.category,
      description: template.description,
      effects: template.effects,
      durability: template.durability,
      sockets: template.sockets,
      sellValue: template.sellValue,
      lore: template.lore,
      setId: template.setId,
      weaponType: template.weaponType,
      isLegendary: template.isLegendaryQuest,
      shareUrl: `guildtide://item/${template.id}`,
    };

    res.json(card);
  } catch (err) {
    console.error('Card export error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ===== AUCTION INTEGRATION (T-0750) =====

// POST /list-auction — list item on auction house
router.post('/list-auction', async (req: Request, res: Response) => {
  try {
    const guild = await getGuild(req, res);
    if (!guild) return;

    const { itemId, startingPrice, buyoutPrice, durationHours } = req.body;
    if (!itemId || !startingPrice) {
      res.status(400).json({ error: 'validation', message: 'itemId and startingPrice are required' });
      return;
    }

    // Remove item from inventory
    await ItemService.removeItem(guild.id, itemId, 1);

    // Store auction listing in guild metadata
    let meta: Record<string, unknown> = {};
    try { if (guild.metadata) meta = JSON.parse(guild.metadata); } catch { /* empty */ }

    const auctions: any[] = (meta.itemAuctions as any[]) || [];
    auctions.push({
      id: `auction_${Date.now()}`,
      itemId,
      startingPrice,
      buyoutPrice: buyoutPrice || startingPrice * 2,
      currentBid: startingPrice,
      durationHours: durationHours || 24,
      listedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (durationHours || 24) * 3600 * 1000).toISOString(),
      status: 'active',
    });

    meta.itemAuctions = auctions;
    await prisma.guild.update({
      where: { id: guild.id },
      data: { metadata: JSON.stringify(meta) },
    });

    res.json({ message: 'Item listed on auction house!' });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: 'auction_failed', message: err.message });
    } else {
      res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
  }
});

export { router as itemsRouter };
