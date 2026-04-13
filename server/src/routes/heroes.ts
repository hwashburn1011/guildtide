import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { HeroService } from '../services/HeroService';
import { HeroProgressionService } from '../services/HeroProgressionService';
import { SKILL_TREES } from '../data/heroSkillTrees';
import { SPECIALIZATIONS, CLASS_EVOLUTIONS, RARITY_COLORS } from '../services/HeroProgressionService';
import { HeroRole } from '../../../shared/src/enums';

const router = Router();
router.use(authMiddleware);

// Get all heroes
router.get('/', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { playerId: req.playerId },
      include: { heroes: true },
    });

    if (!guild) {
      res.status(404).json({ error: 'not_found', message: 'No guild found' });
      return;
    }

    res.json(guild.heroes.map(h => {
      const metadata = h.metadata ? JSON.parse(h.metadata) : {};
      const stats = JSON.parse(h.stats);
      const traits = JSON.parse(h.traits);
      return {
        ...h,
        traits,
        stats,
        equipment: JSON.parse(h.equipment),
        morale: metadata.morale ?? 70,
        moraleLabel: metadata.morale >= 80 ? 'happy' : metadata.morale >= 60 ? 'neutral' : metadata.morale >= 40 ? 'unhappy' : 'angry',
        unlockedSkills: metadata.unlockedSkills || [],
        skillPoints: metadata.skillPoints || 0,
        nickname: metadata.nickname || null,
        favorited: metadata.favorited || false,
        injury: metadata.injury || null,
        training: metadata.training || null,
        powerScore: Object.values(stats as Record<string, number>).reduce((a: number, b: number) => a + b, 0) + h.level * 3 + (metadata.unlockedSkills || []).length * 5,
        rarityTier: (() => {
          const total = Object.values(stats as Record<string, number>).reduce((a: number, b: number) => a + b, 0) + traits.length * 5;
          if (total >= 50) return 5;
          if (total >= 40) return 4;
          if (total >= 32) return 3;
          if (total >= 25) return 2;
          return 1;
        })(),
      };
    }));
  } catch (err) {
    console.error('Get heroes error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get hero detail
router.get('/:id/detail', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const detail = await HeroProgressionService.getHeroDetail(req.params.id, guild.id);
    res.json(detail);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'detail_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Recruit a new hero
router.post('/recruit', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const preferredRole = req.body.role as HeroRole | undefined;
    const result = await HeroService.recruit(guild.id, preferredRole);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'recruit_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Assign hero to building
router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const { assignment } = req.body;
    const hero = await HeroService.assign(req.params.id, assignment ?? null, guild.id);
    res.json(hero);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'assign_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Dismiss hero
router.post('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const result = await HeroProgressionService.dismiss(req.params.id, guild.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'dismiss_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Award XP
router.post('/:id/xp', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const { amount, source } = req.body;
    const result = await HeroProgressionService.awardXP(req.params.id, amount || 0, source || 'manual');
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'xp_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Unlock skill
router.post('/:id/skills/unlock', async (req: Request, res: Response) => {
  try {
    const { skillId } = req.body;
    const result = await HeroProgressionService.unlockSkill(req.params.id, skillId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'skill_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Respec skills
router.post('/:id/skills/respec', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const result = await HeroProgressionService.respecSkills(req.params.id, guild.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'respec_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get skill tree for role
router.get('/skill-trees/:role', async (_req: Request, res: Response) => {
  const tree = SKILL_TREES[_req.params.role as HeroRole];
  if (!tree) { res.status(404).json({ error: 'not_found', message: 'No skill tree for this role' }); return; }
  res.json(tree);
});

// Retire hero
router.post('/:id/retire', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const result = await HeroProgressionService.retireHero(req.params.id, guild.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'retire_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Train hero
router.post('/:id/train', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const { stat } = req.body;
    const result = await HeroProgressionService.startTraining(req.params.id, stat, guild.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'train_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Adjust morale
router.post('/:id/morale', async (req: Request, res: Response) => {
  try {
    const { delta } = req.body;
    const result = await HeroProgressionService.adjustMorale(req.params.id, delta || 0);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'morale_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Specialize hero
router.post('/:id/specialize', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const { specializationId } = req.body;
    const result = await HeroProgressionService.specialize(req.params.id, specializationId, guild.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'specialize_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Evolve class
router.post('/:id/evolve', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const { evolutionId } = req.body;
    const result = await HeroProgressionService.evolveClass(req.params.id, evolutionId, guild.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'evolve_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Set nickname
router.post('/:id/nickname', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const { nickname } = req.body;
    const result = await HeroProgressionService.setNickname(req.params.id, nickname, guild.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'nickname_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Toggle favorite
router.post('/:id/favorite', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const result = await HeroProgressionService.toggleFavorite(req.params.id, guild.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'favorite_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Compare heroes
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const { heroA, heroB } = req.query;
    const result = await HeroProgressionService.compareHeroes(heroA as string, heroB as string, guild.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'compare_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Search heroes
router.get('/search', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const { q } = req.query;
    const results = await HeroProgressionService.searchHeroes(guild.id, (q as string) || '');
    res.json(results);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'search_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Roster dashboard
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const dashboard = await HeroProgressionService.getRosterDashboard(guild.id);
    res.json(dashboard);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Auto-assign suggestions
router.get('/auto-assign', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const suggestions = await HeroProgressionService.getAutoAssignSuggestions(guild.id);
    res.json(suggestions);
  } catch (err) {
    console.error('Auto-assign error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Batch assign idle
router.post('/batch/assign-idle', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const result = await HeroProgressionService.batchAssignIdle(guild.id);
    res.json(result);
  } catch (err) {
    console.error('Batch assign error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Batch rest all
router.post('/batch/rest-all', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const result = await HeroProgressionService.batchRestAll(guild.id);
    res.json(result);
  } catch (err) {
    console.error('Batch rest error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get specializations for a role
router.get('/specializations/:role', async (req: Request, res: Response) => {
  const specs = SPECIALIZATIONS[req.params.role];
  if (!specs) { res.status(404).json({ error: 'not_found', message: 'No specializations for this role' }); return; }
  res.json(specs);
});

// Get class evolutions for a role
router.get('/evolutions/:role', async (req: Request, res: Response) => {
  const evolutions = CLASS_EVOLUTIONS[req.params.role];
  if (!evolutions) { res.status(404).json({ error: 'not_found', message: 'No evolutions for this role' }); return; }
  res.json(evolutions);
});

// Check birthdays
router.get('/birthdays', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const birthdays = await HeroProgressionService.checkBirthdays(guild.id);
    res.json(birthdays);
  } catch (err) {
    console.error('Birthday check error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Reroll hero stats
router.post('/:id/reroll', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const result = await HeroProgressionService.rerollStats(req.params.id, guild.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'reroll_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Set wish list
router.post('/:id/wishlist', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const { items } = req.body;
    const result = await HeroProgressionService.setWishList(req.params.id, items || [], guild.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) res.status(400).json({ error: 'wishlist_failed', message: err.message });
    else res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get recruitment history
router.get('/recruitment-history', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }

    const history = await HeroProgressionService.getRecruitmentHistory(guild.id);
    res.json(history);
  } catch (err) {
    console.error('Recruitment history error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as heroesRouter };
