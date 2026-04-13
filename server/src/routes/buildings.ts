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
import { BuildingService } from '../services/BuildingService';
import { PRODUCTION_CHAINS, BUILDING_ACHIEVEMENTS } from '../data/buildingSpecializations';

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

    // Check building milestones and achievements (T-0366, T-0367, T-0370)
    const milestones = await BuildingService.checkBuildingMilestones(
      guild.id, buildingType, currentLevel + 1,
    );
    const achievements = await BuildingService.checkBuildingAchievements(guild.id);

    res.json({
      building: { ...building, metadata: building.metadata ? JSON.parse(building.metadata) : null },
      resources,
      milestones: milestones.map(m => m.reward),
      achievements: achievements.map(a => ({ id: a.id, name: a.name, description: a.description })),
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

// Extended building detail with specializations, behaviors, chains
router.get('/:type/extended', async (req: Request, res: Response) => {
  try {
    const buildingType = req.params.type as BuildingType;
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const detail = await BuildingService.getExtendedDetail(guild.id, buildingType);
    if (!detail) {
      res.status(400).json({ error: 'validation', message: 'Invalid building type' });
      return;
    }

    res.json(detail);
  } catch (err) {
    console.error('Extended detail error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Specialize a building
router.post('/:type/specialize', async (req: Request, res: Response) => {
  try {
    const buildingType = req.params.type as BuildingType;
    const { specializationId } = req.body;

    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const result = await BuildingService.applySpecialization(guild.id, buildingType, specializationId);
    if (!result.success) {
      res.status(400).json({ error: 'validation', message: result.error });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Specialize error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Pay maintenance for a building
router.post('/:type/maintenance', async (req: Request, res: Response) => {
  try {
    const buildingType = req.params.type as BuildingType;
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const result = await BuildingService.payMaintenance(guild.id, buildingType);
    if (!result.success) {
      res.status(400).json({ error: 'validation', message: result.error });
      return;
    }

    res.json({ success: true, costs: result.costs });
  } catch (err) {
    console.error('Maintenance error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Toggle auto-collect
router.post('/:type/auto-collect', async (req: Request, res: Response) => {
  try {
    const buildingType = req.params.type as BuildingType;
    const { enabled } = req.body;
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const result = await BuildingService.toggleAutoCollect(guild.id, buildingType, !!enabled);
    res.json(result);
  } catch (err) {
    console.error('Auto-collect error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get production chains
router.get('/chains/all', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { buildings: true },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const allChains = PRODUCTION_CHAINS.map(chain => {
      const active = chain.steps.every(step =>
        guild.buildings.some(b => b.type === step.building && b.level > 0),
      );
      const efficiency = BuildingService.getChainEfficiency(chain, guild.buildings);
      return { ...chain, active, efficiency };
    });

    res.json(allChains);
  } catch (err) {
    console.error('Chains error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get building comparison (current vs next level)
router.get('/:type/compare', async (req: Request, res: Response) => {
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

    const building = guild.buildings.find(b => b.type === buildingType);
    const level = building?.level ?? 0;
    const comparison = BuildingService.getBuildingComparison(buildingType, level);
    res.json(comparison);
  } catch (err) {
    console.error('Compare error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get building info card with stat comparison
router.get('/:type/info', async (req: Request, res: Response) => {
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

    const building = guild.buildings.find(b => b.type === buildingType);
    const level = building?.level ?? 0;
    const infoCard = BuildingService.getInfoCard(buildingType, level);
    res.json(infoCard);
  } catch (err) {
    console.error('Info card error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get building lore
router.get('/:type/lore', async (req: Request, res: Response) => {
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

    const building = guild.buildings.find(b => b.type === buildingType);
    const level = building?.level ?? 0;
    const lore = BuildingService.getLoreEntries(buildingType, level);
    res.json(lore);
  } catch (err) {
    console.error('Lore error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Check building achievements
router.get('/achievements/check', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const newAchievements = await BuildingService.checkBuildingAchievements(guild.id);
    res.json({ achievements: newAchievements, all: BUILDING_ACHIEVEMENTS });
  } catch (err) {
    console.error('Achievements error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Check storage full notifications
router.get('/:type/storage-check', async (req: Request, res: Response) => {
  try {
    const buildingType = req.params.type as BuildingType;
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const full = await BuildingService.checkStorageFull(guild.id, buildingType);
    res.json({ full });
  } catch (err) {
    console.error('Storage check error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Worker efficiency for a building
router.get('/:type/worker-efficiency', async (req: Request, res: Response) => {
  try {
    const buildingType = req.params.type as BuildingType;
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { buildings: true, heroes: true },
    });
    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    const assignedHeroes = guild.heroes.filter(
      h => h.assignment === buildingType && h.status === 'assigned',
    );

    const efficiencies = assignedHeroes.map(hero => {
      const eff = BuildingService.calculateWorkerEfficiency(
        { role: hero.role, level: hero.level },
        buildingType,
      );
      return {
        ...eff,
        heroId: hero.id,
        heroName: hero.name,
      };
    });

    res.json(efficiencies);
  } catch (err) {
    console.error('Worker efficiency error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as buildingsRouter };
