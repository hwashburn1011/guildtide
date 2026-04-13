import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import {
  BUILDING_DEFINITIONS,
  BUILDING_COST_MULTIPLIER,
} from '../../../shared/src/constants';
import { BuildingType, ResourceType } from '../../../shared/src/enums';

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

    // Find existing building or create at level 0
    let building = guild.buildings.find(b => b.type === buildingType);
    const currentLevel = building?.level ?? 0;

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

    res.json({
      building: { ...building, metadata: building.metadata ? JSON.parse(building.metadata) : null },
      resources,
    });
  } catch (err) {
    console.error('Upgrade building error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as buildingsRouter };
