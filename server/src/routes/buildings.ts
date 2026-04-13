import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import {
  BUILDING_DEFINITIONS,
  BUILDING_COST_MULTIPLIER,
  BUILDING_LEVEL_BONUS,
} from '../../../shared/src/constants';
import { BuildingType, ResourceType } from '../../../shared/src/enums';
import { GuildService } from '../services/GuildService';

const router = Router();
router.use(authMiddleware);

// Get all buildings
router.get('/', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { buildings: true },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    res.json(guild.buildings.map(b => ({
      ...b,
      metadata: b.metadata ? JSON.parse(b.metadata) : null,
    })));
  } catch (err) {
    console.error('Get buildings error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Build or upgrade a building
router.post('/:type/upgrade', async (req: Request, res: Response) => {
  try {
    const buildingType = req.params.type as BuildingType;
    const def = BUILDING_DEFINITIONS[buildingType];

    if (!def) {
      res.status(400).json({ error: 'validation', message: 'Invalid building type' });
      return;
    }

    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { buildings: true },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    // Check if building type is unlocked
    const unlocked = GuildService.getUnlockedBuildings(guild.level);
    if (!unlocked.includes(buildingType)) {
      res.status(400).json({ error: 'locked', message: `${def.name} is not yet unlocked at guild level ${guild.level}` });
      return;
    }

    // Find existing building or create at level 0
    let building = guild.buildings.find(b => b.type === buildingType);
    const currentLevel = building?.level ?? 0;

    // Check building slots when constructing new
    if (currentLevel === 0 && guild.buildings.length >= guild.buildingSlots) {
      res.status(400).json({ error: 'no_slots', message: 'No building slots available. Level up your guild to unlock more.' });
      return;
    }

    if (currentLevel >= def.maxLevel) {
      res.status(400).json({ error: 'max_level', message: 'Building is already at max level' });
      return;
    }

    // Calculate upgrade cost
    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    const costs: Array<[string, number]> = [];

    for (const [resource, baseCost] of Object.entries(def.baseCost)) {
      const cost = Math.ceil((baseCost as number) * Math.pow(BUILDING_COST_MULTIPLIER, currentLevel));
      costs.push([resource, cost]);

      if ((resources[resource as ResourceType] || 0) < cost) {
        res.status(400).json({
          error: 'insufficient_resources',
          message: `Not enough ${resource}. Need ${cost}, have ${Math.floor(resources[resource as ResourceType] || 0)}`,
        });
        return;
      }
    }

    // Deduct costs
    for (const [resource, cost] of costs) {
      resources[resource as ResourceType] -= cost;
    }

    const isNewBuild = !building;

    // Update or create building
    if (building) {
      building = await prisma.building.update({
        where: { id: building.id },
        data: { level: currentLevel + 1 },
      });
    } else {
      // Find next available slot
      const maxSlot = guild.buildings.reduce((max, b) => Math.max(max, b.slot), -1);
      building = await prisma.building.create({
        data: {
          guildId: guild.id,
          type: buildingType,
          level: 1,
          slot: maxSlot + 1,
        },
      });
    }

    // Save updated resources
    await prisma.guild.update({
      where: { id: guild.id },
      data: { resources: JSON.stringify(resources) },
    });

    // Grant guild XP
    if (isNewBuild) {
      await GuildService.grantActionXP(guild.id, 'buildingConstruct');
      await GuildService.logActivity(guild.id, 'building_construct', `Built ${def.name}`);
    } else {
      await GuildService.grantActionXP(guild.id, 'buildingUpgrade', currentLevel + 1);
      await GuildService.logActivity(guild.id, 'building_upgrade', `Upgraded ${def.name} to level ${currentLevel + 1}`);
    }

    res.json({
      building: { ...building, metadata: building.metadata ? JSON.parse(building.metadata) : null },
      resources,
    });
  } catch (err) {
    console.error('Upgrade building error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Demolish a building (50% resource refund)
router.post('/:type/demolish', async (req: Request, res: Response) => {
  try {
    const buildingType = req.params.type as BuildingType;
    const def = BUILDING_DEFINITIONS[buildingType];

    if (!def) {
      res.status(400).json({ error: 'validation', message: 'Invalid building type' });
      return;
    }

    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { buildings: true },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const building = guild.buildings.find(b => b.type === buildingType);
    if (!building || building.level < 1) {
      res.status(400).json({ error: 'not_found', message: 'Building not found' });
      return;
    }

    // Calculate 50% refund of total invested resources
    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    const refund: Partial<Record<ResourceType, number>> = {};

    for (let lvl = 0; lvl < building.level; lvl++) {
      for (const [resource, baseCost] of Object.entries(def.baseCost)) {
        const cost = Math.ceil((baseCost as number) * Math.pow(BUILDING_COST_MULTIPLIER, lvl));
        const refundAmt = Math.floor(cost * 0.5);
        const resType = resource as ResourceType;
        refund[resType] = (refund[resType] ?? 0) + refundAmt;
        resources[resType] = (resources[resType] || 0) + refundAmt;
      }
    }

    // Delete the building
    await prisma.building.delete({ where: { id: building.id } });

    // Update resources
    await prisma.guild.update({
      where: { id: guild.id },
      data: { resources: JSON.stringify(resources) },
    });

    await GuildService.logActivity(guild.id, 'building_demolish', `Demolished ${def.name}`);

    res.json({ refund, resources });
  } catch (err) {
    console.error('Demolish error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get building detail (production rates, workers, upgrade cost comparison)
router.get('/:type/detail', async (req: Request, res: Response) => {
  try {
    const buildingType = req.params.type as BuildingType;
    const def = BUILDING_DEFINITIONS[buildingType];

    if (!def) {
      res.status(400).json({ error: 'validation', message: 'Invalid building type' });
      return;
    }

    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { buildings: true, heroes: true },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const building = guild.buildings.find(b => b.type === buildingType);
    const level = building?.level ?? 0;

    // Current production
    const currentOutput: Partial<Record<ResourceType, number>> = {};
    const nextOutput: Partial<Record<ResourceType, number>> = {};
    for (const [res, base] of Object.entries(def.baseOutput)) {
      const resType = res as ResourceType;
      currentOutput[resType] = level > 0 ? (base as number) * (1 + level * BUILDING_LEVEL_BONUS) : 0;
      nextOutput[resType] = (base as number) * (1 + (level + 1) * BUILDING_LEVEL_BONUS);
    }

    // Upgrade cost
    const upgradeCost: Partial<Record<ResourceType, number>> = {};
    if (level < def.maxLevel) {
      for (const [res, baseCost] of Object.entries(def.baseCost)) {
        upgradeCost[res as ResourceType] = Math.ceil((baseCost as number) * Math.pow(BUILDING_COST_MULTIPLIER, level));
      }
    }

    // Assigned worker
    const assignedHero = guild.heroes.find(h => h.assignment === buildingType && h.status === 'assigned');

    res.json({
      type: buildingType,
      name: def.name,
      description: def.description,
      level,
      maxLevel: def.maxLevel,
      currentOutput,
      nextOutput,
      upgradeCost: level < def.maxLevel ? upgradeCost : null,
      assignedHero: assignedHero ? {
        id: assignedHero.id,
        name: assignedHero.name,
        role: assignedHero.role,
        level: assignedHero.level,
      } : null,
    });
  } catch (err) {
    console.error('Building detail error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Enqueue building for construction (construction queue)
router.post('/queue', async (req: Request, res: Response) => {
  try {
    const { buildingType } = req.body;
    const def = BUILDING_DEFINITIONS[buildingType as BuildingType];

    if (!def) {
      res.status(400).json({ error: 'validation', message: 'Invalid building type' });
      return;
    }

    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { buildings: true },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    // Check slots
    if (guild.buildings.length >= guild.buildingSlots) {
      res.status(400).json({ error: 'no_slots', message: 'No building slots available' });
      return;
    }

    // Check unlock
    const unlocked = GuildService.getUnlockedBuildings(guild.level);
    if (!unlocked.includes(buildingType as BuildingType)) {
      res.status(400).json({ error: 'locked', message: 'Building type not unlocked' });
      return;
    }

    // Check resources
    const resources = JSON.parse(guild.resources) as Record<ResourceType, number>;
    for (const [resource, baseCost] of Object.entries(def.baseCost)) {
      if ((resources[resource as ResourceType] || 0) < (baseCost as number)) {
        res.status(400).json({ error: 'insufficient_resources', message: `Not enough ${resource}` });
        return;
      }
    }

    // Deduct cost
    for (const [resource, baseCost] of Object.entries(def.baseCost)) {
      resources[resource as ResourceType] -= baseCost as number;
    }

    // Create building with construction metadata
    const constructionTime = 30; // 30 seconds for construction
    const maxSlot = guild.buildings.reduce((max, b) => Math.max(max, b.slot), -1);
    const building = await prisma.building.create({
      data: {
        guildId: guild.id,
        type: buildingType,
        level: 0,
        slot: maxSlot + 1,
        metadata: JSON.stringify({
          constructing: true,
          startedAt: new Date().toISOString(),
          duration: constructionTime,
        }),
      },
    });

    await prisma.guild.update({
      where: { id: guild.id },
      data: { resources: JSON.stringify(resources) },
    });

    await GuildService.logActivity(guild.id, 'building_queued', `Started constructing ${def.name}`);

    res.json({
      building: { ...building, metadata: JSON.parse(building.metadata!) },
      resources,
    });
  } catch (err) {
    console.error('Queue building error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Complete construction (called when timer expires)
router.post('/:type/complete', async (req: Request, res: Response) => {
  try {
    const buildingType = req.params.type as BuildingType;

    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { buildings: true },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const building = guild.buildings.find(b => b.type === buildingType && b.level === 0);
    if (!building) {
      res.status(400).json({ error: 'not_found', message: 'No building under construction' });
      return;
    }

    const meta = building.metadata ? JSON.parse(building.metadata) : null;
    if (!meta?.constructing) {
      res.status(400).json({ error: 'not_constructing', message: 'Building is not under construction' });
      return;
    }

    // Check if construction time has elapsed
    const startedAt = new Date(meta.startedAt).getTime();
    const elapsed = (Date.now() - startedAt) / 1000;
    if (elapsed < meta.duration) {
      res.status(400).json({
        error: 'not_ready',
        message: `Construction not complete. ${Math.ceil(meta.duration - elapsed)}s remaining.`,
      });
      return;
    }

    // Complete construction
    const updated = await prisma.building.update({
      where: { id: building.id },
      data: { level: 1, metadata: null },
    });

    await GuildService.grantActionXP(guild.id, 'buildingConstruct');
    await GuildService.logActivity(guild.id, 'building_construct', `Completed construction of ${BUILDING_DEFINITIONS[buildingType]?.name ?? buildingType}`);

    res.json({
      building: { ...updated, metadata: null },
    });
  } catch (err) {
    console.error('Complete construction error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as buildingsRouter };
