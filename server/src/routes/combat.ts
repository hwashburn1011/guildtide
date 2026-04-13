/**
 * Combat API routes.
 *
 * T-1241–T-1320: Full combat system endpoints.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { CombatService } from '../services/CombatService';
import { ArenaService } from '../services/ArenaService';
import { HeroRole } from '../../../shared/src/enums';
import { ENEMY_DEFINITIONS, getEnemyById } from '../data/enemyDefinitions';
import { ELEMENT_CHART, SQUAD_SYNERGIES, getActiveSynergies } from '../data/combatAbilities';

const router = Router();
router.use(authMiddleware);

// ── POST /combat/resolve — Resolve a combat encounter ──
router.post('/resolve', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found' }); return; }

    const { heroIds, region, enemyCount, terrain, weather, difficulty } = req.body;
    if (!heroIds || !Array.isArray(heroIds) || heroIds.length === 0) {
      res.status(400).json({ error: 'bad_request', message: 'heroIds required' });
      return;
    }

    const heroes = await prisma.hero.findMany({
      where: { id: { in: heroIds }, guildId: guild.id },
    });
    if (heroes.length === 0) {
      res.status(400).json({ error: 'bad_request', message: 'No valid heroes found' });
      return;
    }

    const heroData = heroes.map((h: any) => ({
      id: h.id,
      name: h.name,
      role: h.role as HeroRole,
      level: h.level,
      stats: typeof h.stats === 'string' ? JSON.parse(h.stats) : h.stats,
      equipment: typeof h.equipment === 'string' ? JSON.parse(h.equipment) : (h.equipment ?? { weapon: null, armor: null, charm: null, tool: null }),
      morale: h.metadata?.morale ?? 75,
    }));

    const result = CombatService.resolveQuickCombat(
      heroData,
      region ?? 'scrapyard_outskirts',
      enemyCount ?? Math.min(heroes.length + 1, 5),
      { terrain, weather, difficulty },
    );

    // Update bestiary
    for (const enemy of result.enemies) {
      if (!enemy.alive) {
        const def = getEnemyById(enemy.defId);
        if (def) {
          ArenaService.recordEnemyDefeated(guild.id, enemy.defId, {
            name: def.name,
            description: def.description,
            weaknesses: def.weaknesses,
            resistances: def.resistances,
            loot: def.loot,
            region: def.region,
            tier: def.tier,
          });
        }
      }
    }

    // Update combat stats
    ArenaService.updateCombatStats(guild.id, result);

    // Check achievements
    const achievements = CombatService.checkAchievements(result);

    res.json({ combat: result, achievements });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// ── POST /combat/boss — Resolve a boss encounter ──
router.post('/boss', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found' }); return; }

    const { heroIds, bossId, terrain, weather } = req.body;
    if (!heroIds || !bossId) {
      res.status(400).json({ error: 'bad_request', message: 'heroIds and bossId required' });
      return;
    }

    const heroes = await prisma.hero.findMany({
      where: { id: { in: heroIds }, guildId: guild.id },
    });

    const heroData = heroes.map((h: any) => ({
      id: h.id,
      name: h.name,
      role: h.role as HeroRole,
      level: h.level,
      stats: typeof h.stats === 'string' ? JSON.parse(h.stats) : h.stats,
      equipment: typeof h.equipment === 'string' ? JSON.parse(h.equipment) : (h.equipment ?? { weapon: null, armor: null, charm: null, tool: null }),
      morale: h.metadata?.morale ?? 75,
    }));

    const result = CombatService.resolveBossCombat(heroData, bossId, { terrain, weather });

    ArenaService.updateCombatStats(guild.id, result);
    const achievements = CombatService.checkAchievements(result);

    res.json({ combat: result, achievements });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// ── POST /combat/challenge — Challenge mode encounter ──
router.post('/challenge', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found' }); return; }

    const { heroIds, challengeId } = req.body;
    const heroes = await prisma.hero.findMany({
      where: { id: { in: heroIds }, guildId: guild.id },
    });

    const heroData = heroes.map((h: any) => ({
      id: h.id,
      name: h.name,
      role: h.role as HeroRole,
      level: h.level,
      stats: typeof h.stats === 'string' ? JSON.parse(h.stats) : h.stats,
      equipment: typeof h.equipment === 'string' ? JSON.parse(h.equipment) : (h.equipment ?? { weapon: null, armor: null, charm: null, tool: null }),
    }));

    const challenge = CombatService.createChallengeEncounter(challengeId ?? 'gauntlet_1');
    const combatHeroes = heroData.map((h, i) =>
      CombatService.buildCombatHero(h, i < Math.ceil(heroData.length / 2) ? 'front' : 'back'),
    );
    const combatEnemies = challenge.enemies.map((def, i) =>
      CombatService.buildCombatEnemy(def, i),
    );

    const result = CombatService.resolveCombat(combatHeroes, combatEnemies, {
      isBoss: !!challenge.bossId,
      bossId: challenge.bossId,
    });

    res.json({ combat: result, achievements: CombatService.checkAchievements(result) });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// ── POST /combat/flee — Attempt to flee ──
router.post('/flee', async (req: Request, res: Response) => {
  try {
    // Simplified flee — just returns success/failure based on party speed
    const { partySpeed, enemySpeed } = req.body;
    const heroMock = [{ speed: partySpeed ?? 10 }] as any;
    const enemyMock = [{ speed: enemySpeed ?? 10, alive: true }] as any;
    const success = CombatService.attemptFlee(heroMock, enemyMock);
    res.json({ fled: success });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// ── GET /combat/predict — Power prediction ──
router.get('/predict', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found' }); return; }

    const heroIds = (req.query.heroIds as string)?.split(',') ?? [];
    const region = (req.query.region as string) ?? 'scrapyard_outskirts';
    const enemyCount = parseInt(req.query.enemyCount as string) || 3;

    const heroes = await prisma.hero.findMany({
      where: { id: { in: heroIds }, guildId: guild.id },
    });

    const heroData = heroes.map((h: any) => ({
      stats: typeof h.stats === 'string' ? JSON.parse(h.stats) : h.stats,
      level: h.level,
      role: h.role,
    }));

    const partyPower = CombatService.predictCombatPower(heroData);
    const pool = ENEMY_DEFINITIONS.filter(e => e.region === region);
    const sampleEnemies = pool.length > 0 ? pool.slice(0, enemyCount) : ENEMY_DEFINITIONS.slice(0, enemyCount);
    const enemyPower = CombatService.predictEnemyPower(sampleEnemies);

    res.json({
      partyPower,
      enemyPower,
      advantage: partyPower > enemyPower ? 'party' : enemyPower > partyPower ? 'enemy' : 'even',
      ratio: enemyPower > 0 ? +(partyPower / enemyPower).toFixed(2) : 999,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// ── GET /combat/synergies — Check squad synergies ──
router.get('/synergies', (req: Request, res: Response) => {
  try {
    const roles = (req.query.roles as string)?.split(',') ?? [];
    const roleCounts: Record<string, number> = {};
    for (const r of roles) {
      roleCounts[r] = (roleCounts[r] ?? 0) + 1;
    }
    const active = getActiveSynergies(roleCounts);
    res.json({ synergies: active, allSynergies: SQUAD_SYNERGIES });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// ── GET /combat/elements — Elemental chart ──
router.get('/elements', (_req: Request, res: Response) => {
  res.json({ elements: ELEMENT_CHART });
});

// ── GET /combat/enemies — All enemy definitions ──
router.get('/enemies', (_req: Request, res: Response) => {
  res.json({
    enemies: ENEMY_DEFINITIONS.map(e => ({
      id: e.id,
      name: e.name,
      description: e.description,
      region: e.region,
      tier: e.tier,
      hp: e.hp,
      damageType: e.damageType,
      weaknesses: e.weaknesses,
      resistances: e.resistances,
    })),
  });
});

// ── GET /combat/bestiary — Guild's discovered bestiary ──
router.get('/bestiary', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found' }); return; }
    const bestiary = ArenaService.getBestiary(guild.id);
    res.json({ bestiary });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// ── GET /combat/stats — Guild combat statistics ──
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found' }); return; }
    const stats = ArenaService.getCombatStats(guild.id);
    res.json({ stats });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// ── POST /combat/auto-battle — Toggle auto-battle ──
router.post('/auto-battle', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found' }); return; }
    const { enabled } = req.body;
    ArenaService.setAutoBattle(guild.id, !!enabled);
    res.json({ autoBattle: ArenaService.isAutoBattleEnabled(guild.id) });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// ── Arena Routes ──

// POST /combat/arena/defense — Set defense team
router.post('/arena/defense', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found' }); return; }

    const { heroes } = req.body;
    if (!heroes || !Array.isArray(heroes)) {
      res.status(400).json({ error: 'bad_request', message: 'heroes array required' });
      return;
    }

    const team = ArenaService.setDefenseTeam(guild.id, guild.name, heroes);
    res.json({ team });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// GET /combat/arena/opponents — Find opponents
router.get('/arena/opponents', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found' }); return; }

    const opponents = ArenaService.findOpponents(guild.id);
    res.json({ opponents });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// POST /combat/arena/fight — Fight an opponent
router.post('/arena/fight', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found' }); return; }

    const { defenderGuildId, heroIds } = req.body;
    if (!defenderGuildId || !heroIds) {
      res.status(400).json({ error: 'bad_request', message: 'defenderGuildId and heroIds required' });
      return;
    }

    const heroes = await prisma.hero.findMany({
      where: { id: { in: heroIds }, guildId: guild.id },
    });

    const heroData = heroes.map((h: any) => ({
      id: h.id,
      name: h.name,
      role: h.role as HeroRole,
      level: h.level,
      stats: typeof h.stats === 'string' ? JSON.parse(h.stats) : h.stats,
      equipment: typeof h.equipment === 'string' ? JSON.parse(h.equipment) : (h.equipment ?? { weapon: null, armor: null, charm: null, tool: null }),
    }));

    const result = await ArenaService.fight(guild.id, defenderGuildId, heroData);
    res.json({ match: result });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// GET /combat/arena/history — Match history
router.get('/arena/history', async (req: Request, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    if (!guild) { res.status(404).json({ error: 'not_found' }); return; }

    const history = ArenaService.getMatchHistory(guild.id);
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

// GET /combat/arena/leaderboard — Arena leaderboard
router.get('/arena/leaderboard', (_req: Request, res: Response) => {
  try {
    const leaderboard = ArenaService.getLeaderboard();
    res.json({ leaderboard });
  } catch (err: any) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});

export const combatRouter = router;
