/**
 * Narrative routes — lore, quests, NPC dialog, patterns, journal, books.
 *
 * T-1324: Lore codex UI categories
 * T-1325: Lore entry detail view
 * T-1326: Lore search and filter
 * T-1329: Pattern discovery notification
 * T-1330: Pattern journal
 * T-1340: NPC quest offering
 * T-1344: Quest log UI endpoints
 * T-1346: Quest turn-in
 * T-1349: Quest markers
 * T-1350: Quest availability notifications
 * T-1351: Timeline endpoint
 * T-1353: Timeline UI data
 * T-1356: Prophecy display
 * T-1359: Rumor log
 * T-1368: Mythology gallery
 * T-1374: Journal quick-reference
 * T-1376: Easter egg collection
 * T-1377: Narrative recap
 * T-1378: Book collection
 * T-1379: Book reading
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { NarrativeService } from '../services/NarrativeService';
import type { NarrativeState } from '../services/NarrativeService';
import type { LoreCategory } from '../data/loreEntries';

const router = Router();
router.use(authMiddleware);

// ── Helper: load/save narrative state from guild JSON field ──
async function loadNarrativeState(playerId: string): Promise<{ state: NarrativeState; guildId: string } | null> {
  const guild = await prisma.guild.findUnique({ where: { playerId } });
  if (!guild) return null;
  let state: NarrativeState;
  try {
    const raw = (guild as any).narrativeState;
    state = raw ? JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw)) : NarrativeService.getDefaultState();
  } catch {
    state = NarrativeService.getDefaultState();
  }
  return { state, guildId: guild.id };
}

async function saveNarrativeState(guildId: string, state: NarrativeState): Promise<void> {
  await prisma.guild.update({
    where: { id: guildId },
    data: { narrativeState: JSON.stringify(state) } as any,
  });
}

// ── Lore ──

// T-1324, T-1325, T-1326: Get lore codex with search/filter
router.get('/lore', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state } = loaded;
    const category = req.query.category as LoreCategory | undefined;
    const regionId = req.query.regionId as string | undefined;
    const search = req.query.search as string | undefined;
    const discoveredOnly = req.query.discoveredOnly === 'true';
    const entries = NarrativeService.searchLore(state, { category, regionId, search, discoveredOnly });
    const mapped = entries.map(e => ({
      ...e,
      discovered: state.discoveredLoreIds.includes(e.id),
      text: state.discoveredLoreIds.includes(e.id) ? e.text : undefined,
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Get lore error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1325: Lore entry detail
router.get('/lore/:id', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state } = loaded;
    const entries = NarrativeService.searchLore(state, {});
    const entry = entries.find(e => e.id === req.params.id);
    if (!entry) { res.status(404).json({ error: 'not_found', message: 'Lore entry not found' }); return; }
    const discovered = state.discoveredLoreIds.includes(entry.id);
    res.json({ ...entry, discovered, text: discovered ? entry.text : '???' });
  } catch (err) {
    console.error('Get lore detail error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1370: Lore completion stats
router.get('/lore-completion', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    res.json(NarrativeService.getLoreCompletion(loaded.state));
  } catch (err) {
    console.error('Lore completion error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Discover lore entry
router.post('/lore/:id/discover', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state, guildId } = loaded;
    const result = NarrativeService.discoverLore(state, req.params.id as string);
    await saveNarrativeState(guildId, state);
    res.json(result);
  } catch (err) {
    console.error('Discover lore error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ── Quests ──

// T-1344: Quest log
router.get('/quests', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state } = loaded;
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    const guildLevel = (guild as any)?.level ?? 1;
    const active = Object.keys(state.activeQuestProgress).map(qId => {
      const quest = NarrativeService['getCurrentStage'](state, qId) ? { id: qId, ...(require('../data/questLines').getQuestLineById(qId) ?? {}) } : null;
      return quest;
    }).filter(Boolean);
    const completed = state.completedQuestIds;
    const available = NarrativeService.getNewlyAvailableQuests(state, guildLevel).map(q => ({ id: q.id, title: q.title, description: q.description, category: q.category }));
    res.json({ active, completed, available });
  } catch (err) {
    console.error('Get quests error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1345: Quest progress
router.get('/quests/:questId/progress', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state } = loaded;
    const stage = NarrativeService['getCurrentStage'](state, req.params.questId as string);
    const progress = state.activeQuestProgress[req.params.questId as string] || {};
    res.json({ stage, progress });
  } catch (err) {
    console.error('Quest progress error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Start quest
router.post('/quests/:questId/start', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state, guildId } = loaded;
    const questId = req.params.questId as string;
    if (state.activeQuestProgress[questId] || state.completedQuestIds.includes(questId)) {
      res.status(400).json({ error: 'invalid', message: 'Quest already active or completed' });
      return;
    }
    state.activeQuestProgress[questId] = {};
    await saveNarrativeState(guildId, state);
    const stage = NarrativeService['getCurrentStage'](state, questId);
    res.json({ started: true, currentStage: stage });
  } catch (err) {
    console.error('Start quest error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1345: Update quest objective
router.post('/quests/:questId/progress', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state, guildId } = loaded;
    const { objectiveId, progress } = req.body;
    const result = NarrativeService.updateQuestProgress(state, req.params.questId as string, objectiveId, progress);
    await saveNarrativeState(guildId, state);
    res.json(result);
  } catch (err) {
    console.error('Update quest progress error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1346: Turn in quest
router.post('/quests/:questId/turn-in', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state, guildId } = loaded;
    const rewards = NarrativeService.turnInQuest(state, req.params.questId as string);
    if (!rewards) { res.status(400).json({ error: 'invalid', message: 'Quest not ready for turn-in' }); return; }
    await saveNarrativeState(guildId, state);
    res.json({ turnedIn: true, rewards });
  } catch (err) {
    console.error('Turn in quest error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1349: Quest markers
router.get('/quest-markers', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    res.json(NarrativeService.getQuestMarkers(loaded.state));
  } catch (err) {
    console.error('Quest markers error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ── NPC Dialog ──

// T-1333-1335: Get NPC dialog
router.get('/npc/:npcId/dialog', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const nodeId = req.query.nodeId as string | undefined;
    const node = NarrativeService.getNpcDialog(loaded.state, req.params.npcId as string, nodeId);
    if (!node) { res.status(404).json({ error: 'not_found', message: 'NPC or dialog not found' }); return; }
    // T-1372: Include weather dialog if available
    const weatherCondition = req.query.weather as string | undefined;
    let weatherText: string | undefined;
    if (weatherCondition) {
      weatherText = NarrativeService.getWeatherNpcDialog(req.params.npcId as string, weatherCondition);
    }
    res.json({ node, weatherText });
  } catch (err) {
    console.error('NPC dialog error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1337, T-1373: Choose dialog option
router.post('/npc/:npcId/dialog', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state, guildId } = loaded;
    const { nodeId, choiceIndex } = req.body;
    const node = NarrativeService.getNpcDialog(state, req.params.npcId as string, nodeId);
    if (!node) { res.status(404).json({ error: 'not_found', message: 'Dialog not found' }); return; }
    NarrativeService.recordDialogChoice(state, req.params.npcId as string, nodeId);
    const choice = node.choices[choiceIndex];
    if (!choice) { res.status(400).json({ error: 'invalid', message: 'Invalid choice' }); return; }
    if (choice.relationshipChange) {
      NarrativeService.modifyNpcRelationship(state, req.params.npcId as string, choice.relationshipChange);
    }
    // Deliver hint if rumor node
    if (node.rumor) {
      state.rumorLog.push({ text: node.rumor.text, accuracy: node.rumor.accuracy, verified: false, npcId: req.params.npcId as string, timestamp: Date.now() });
    }
    if (node.unlocksLoreId) {
      NarrativeService.discoverLore(state, node.unlocksLoreId);
    }
    // Pattern hint delivery
    const hint = NarrativeService.deliverPatternHint(state);
    await saveNarrativeState(guildId, state);
    const nextNode = choice.nextNodeId ? NarrativeService.getNpcDialog(state, req.params.npcId as string, choice.nextNodeId) : undefined;
    res.json({
      nextNode,
      relationshipLevel: state.npcRelationships[req.params.npcId as string] || 0,
      startsQuestId: choice.startsQuestId,
      opensShop: choice.opensShop,
      patternHint: hint,
    });
  } catch (err) {
    console.error('NPC dialog choice error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1338: Give gift
router.post('/npc/:npcId/gift', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state, guildId } = loaded;
    const { resource, amount } = req.body;
    const result = NarrativeService.giveGift(state, req.params.npcId as string, resource, amount);
    await saveNarrativeState(guildId, state);
    res.json(result);
  } catch (err) {
    console.error('NPC gift error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get NPC list
router.get('/npcs', async (_req: Request, res: Response) => {
  try {
    res.json(NarrativeService.getAllNpcs().map(n => ({
      id: n.id, name: n.name, title: n.title, personality: n.personality,
      location: n.location, hasShop: n.hasShop, portrait: n.portrait,
    })));
  } catch (err) {
    console.error('Get NPCs error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ── Patterns ──

// T-1329, T-1330: Pattern journal and check
router.get('/patterns', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    res.json(NarrativeService.getPatternJournal(loaded.state));
  } catch (err) {
    console.error('Get patterns error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1327: Check patterns against current conditions
router.post('/patterns/check', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state, guildId } = loaded;
    const { conditions } = req.body;
    const discovered = NarrativeService.checkPatterns(state, conditions);
    await saveNarrativeState(guildId, state);
    res.json({ discovered });
  } catch (err) {
    console.error('Check patterns error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ── Timeline ──

// T-1351, T-1353: World history timeline
router.get('/timeline', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    res.json(NarrativeService.getTimeline(loaded.state));
  } catch (err) {
    console.error('Get timeline error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ── Prophecies ──

// T-1356: Prophecy display
router.get('/prophecies', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    res.json(NarrativeService.getProphecies(loaded.state));
  } catch (err) {
    console.error('Get prophecies error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ── Rumors ──

// T-1359: Rumor log
router.get('/rumors', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    res.json(loaded.state.rumorLog.map((r, i) => ({
      index: i, text: r.text, verified: r.verified, npcId: r.npcId,
      timestamp: r.timestamp,
    })));
  } catch (err) {
    console.error('Get rumors error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ── Books ──

// T-1378: Book collection
router.get('/books', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state } = loaded;
    const allBooks = NarrativeService.getAllBooks();
    res.json(allBooks.map(b => ({
      id: b.id, title: b.title, author: b.author, rarity: b.rarity,
      owned: state.ownedBookIds.includes(b.id),
      read: state.readBookIds.includes(b.id),
      pageCount: b.pages.length,
    })));
  } catch (err) {
    console.error('Get books error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1379: Read a book
router.get('/books/:bookId', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state, guildId } = loaded;
    const result = NarrativeService.readBook(state, req.params.bookId as string);
    if (!result) { res.status(404).json({ error: 'not_found', message: 'Book not owned' }); return; }
    await saveNarrativeState(guildId, state);
    res.json(result);
  } catch (err) {
    console.error('Read book error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1380: Discover a book
router.post('/books/:bookId/discover', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state, guildId } = loaded;
    const result = NarrativeService.discoverBook(state, req.params.bookId as string);
    await saveNarrativeState(guildId, state);
    res.json(result);
  } catch (err) {
    console.error('Discover book error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ── Mythology ──

// T-1367, T-1368: Mythology research and gallery
router.get('/mythology', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const entries = NarrativeService.searchLore(loaded.state, { category: 'mythology', discoveredOnly: true });
    res.json(entries.map(e => ({ id: e.id, title: e.title, text: e.text, illustration: `myth_${e.id}` })));
  } catch (err) {
    console.error('Get mythology error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1367: Research mythology at temple
router.post('/mythology/research', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state, guildId } = loaded;
    const entry = NarrativeService.researchMythology(state);
    await saveNarrativeState(guildId, state);
    res.json({ discovered: entry ?? null });
  } catch (err) {
    console.error('Research mythology error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ── Easter eggs ──

// T-1376: Easter egg collection
router.get('/easter-eggs', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state } = loaded;
    const allEggs = NarrativeService.getAllEasterEggs();
    res.json({
      total: allEggs.length,
      discovered: state.discoveredEasterEggIds.length,
      eggs: allEggs.map(e => ({
        id: e.id,
        discovered: state.discoveredEasterEggIds.includes(e.id),
        name: state.discoveredEasterEggIds.includes(e.id) ? e.name : '???',
        description: state.discoveredEasterEggIds.includes(e.id) ? e.description : '???',
      })),
    });
  } catch (err) {
    console.error('Get easter eggs error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ── Journal / recap ──

// T-1374: Journal quick-reference
router.get('/journal', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state } = loaded;
    const guild = await prisma.guild.findUnique({ where: { playerId: req.playerId } });
    const guildLevel = (guild as any)?.level ?? 1;
    const loreCompletion = NarrativeService.getLoreCompletion(state);
    const activeQuests = Object.keys(state.activeQuestProgress);
    const questMarkers = NarrativeService.getQuestMarkers(state);
    const availableQuests = NarrativeService.getNewlyAvailableQuests(state, guildLevel);
    const patternJournal = NarrativeService.getPatternJournal(state);
    res.json({
      lore: loreCompletion,
      activeQuests: activeQuests.length,
      completedQuests: state.completedQuestIds.length,
      availableQuests: availableQuests.length,
      questMarkers,
      patterns: {
        discovered: patternJournal.discovered.length,
        hinted: patternJournal.hinted.length,
      },
      books: {
        owned: state.ownedBookIds.length,
        read: state.readBookIds.length,
        total: NarrativeService.getAllBooks().length,
      },
      rumors: {
        total: state.rumorLog.length,
        unverified: state.rumorLog.filter(r => !r.verified).length,
      },
      achievements: state.narrativeAchievements,
    });
  } catch (err) {
    console.error('Get journal error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1377: Narrative recap
router.get('/recap', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    const { state, guildId } = loaded;
    const recap = NarrativeService.getRecap(state);
    await saveNarrativeState(guildId, state);
    res.json(recap);
  } catch (err) {
    console.error('Get recap error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// T-1371: Narrative achievements
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    const loaded = await loadNarrativeState(req.playerId);
    if (!loaded) { res.status(404).json({ error: 'not_found', message: 'No guild found' }); return; }
    res.json(loaded.state.narrativeAchievements);
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export const narrativeRouter = router;
