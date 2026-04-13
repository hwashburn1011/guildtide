import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { AllianceService } from '../services/AllianceService';
import { GuildWarService } from '../services/GuildWarService';
import { JointExpeditionService } from '../services/JointExpeditionService';
import { GuildWarObjective } from '../../../shared/src/enums';
import { AllianceResearchService } from '../services/AllianceResearchService';

const router = Router();
router.use(authMiddleware);

// ========================================
// Alliance CRUD
// ========================================

// Create alliance
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || name.length < 3 || name.length > 30) {
      res.status(400).json({ error: 'validation', message: 'Alliance name must be 3-30 characters' });
      return;
    }
    const alliance = await AllianceService.createAlliance(req.playerId!, name, description ?? '');
    res.json(alliance);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get current player's alliance
router.get('/mine', (req: Request, res: Response) => {
  try {
    const alliance = AllianceService.getPlayerAlliance(req.playerId!);
    if (!alliance) {
      res.status(404).json({ error: 'not_found', message: 'Not in an alliance' });
      return;
    }
    res.json(alliance);
  } catch (err) {
    console.error('Get alliance error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get alliance by ID
router.get('/:allianceId', (req: Request, res: Response) => {
  try {
    const alliance = AllianceService.getAlliance(req.params.allianceId);
    if (!alliance) {
      res.status(404).json({ error: 'not_found', message: 'Alliance not found' });
      return;
    }
    res.json(alliance);
  } catch (err) {
    console.error('Get alliance error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Update alliance description/rules
router.put('/:allianceId', async (req: Request, res: Response) => {
  try {
    const { description, rules } = req.body;
    const alliance = await AllianceService.updateAllianceDescription(
      req.params.allianceId, req.playerId!, description, rules,
    );
    res.json(alliance);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Update alliance emblem
router.put('/:allianceId/emblem', async (req: Request, res: Response) => {
  try {
    const { emblem } = req.body;
    const alliance = await AllianceService.updateAllianceEmblem(
      req.params.allianceId, req.playerId!, emblem,
    );
    res.json(alliance);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Leave alliance
router.post('/:allianceId/leave', async (req: Request, res: Response) => {
  try {
    await AllianceService.leaveAlliance(req.params.allianceId, req.playerId!);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// List all alliances
router.get('/', (req: Request, res: Response) => {
  try {
    const alliances = AllianceService.listAlliances();
    res.json(alliances);
  } catch (err) {
    console.error('List alliances error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Invitations
// ========================================

// Invite a player to alliance
router.post('/:allianceId/invite', async (req: Request, res: Response) => {
  try {
    const { toPlayerId } = req.body;
    const invite = await AllianceService.invitePlayer(
      req.params.allianceId, req.playerId!, toPlayerId,
    );
    res.json(invite);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get pending invites for current player
router.get('/invites/pending', (req: Request, res: Response) => {
  try {
    const invites = AllianceService.getPendingInvites(req.playerId!);
    res.json(invites);
  } catch (err) {
    console.error('Get invites error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Accept invite
router.post('/invites/:inviteId/accept', async (req: Request, res: Response) => {
  try {
    const alliance = await AllianceService.acceptInvite(req.params.inviteId, req.playerId!);
    res.json(alliance);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Decline invite
router.post('/invites/:inviteId/decline', (req: Request, res: Response) => {
  try {
    AllianceService.declineInvite(req.params.inviteId, req.playerId!);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// ========================================
// Member Management
// ========================================

// Kick member
router.post('/:allianceId/kick/:targetId', async (req: Request, res: Response) => {
  try {
    await AllianceService.kickMember(req.params.allianceId, req.playerId!, req.params.targetId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Promote to officer
router.post('/:allianceId/promote/:targetId', async (req: Request, res: Response) => {
  try {
    const member = await AllianceService.promoteOfficer(
      req.params.allianceId, req.playerId!, req.params.targetId,
    );
    res.json(member);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Demote officer
router.post('/:allianceId/demote/:targetId', async (req: Request, res: Response) => {
  try {
    const member = await AllianceService.demoteOfficer(
      req.params.allianceId, req.playerId!, req.params.targetId,
    );
    res.json(member);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get inactive members
router.get('/:allianceId/inactive', (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 14;
    const inactive = AllianceService.getInactiveMembers(req.params.allianceId, days);
    res.json(inactive);
  } catch (err) {
    console.error('Get inactive error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Auto-kick inactive members
router.post('/:allianceId/auto-kick', async (req: Request, res: Response) => {
  try {
    const { days } = req.body;
    const kicked = await AllianceService.autoKickInactive(req.params.allianceId, days ?? 14);
    res.json({ kicked });
  } catch (err) {
    console.error('Auto-kick error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Treasury
// ========================================

// Deposit to treasury
router.post('/:allianceId/treasury/deposit', async (req: Request, res: Response) => {
  try {
    const { resources } = req.body;
    await AllianceService.depositTreasury(req.params.allianceId, req.playerId!, resources);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Withdraw from treasury
router.post('/:allianceId/treasury/withdraw', async (req: Request, res: Response) => {
  try {
    const { resources } = req.body;
    await AllianceService.withdrawTreasury(req.params.allianceId, req.playerId!, resources);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// ========================================
// Regional Synergy
// ========================================

// Get regional synergy
router.get('/:allianceId/synergy', (req: Request, res: Response) => {
  try {
    const synergy = AllianceService.calculateRegionalSynergy(req.params.allianceId);
    res.json(synergy);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// ========================================
// Daily Challenges & Events
// ========================================

// Get daily challenge
router.get('/:allianceId/challenge', (req: Request, res: Response) => {
  try {
    let challenge = AllianceService.getDailyChallenge(req.params.allianceId);
    if (!challenge) {
      challenge = AllianceService.generateDailyChallenge(req.params.allianceId);
    }
    res.json(challenge);
  } catch (err) {
    console.error('Get challenge error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Create alliance event
router.post('/:allianceId/events', (req: Request, res: Response) => {
  try {
    const { title, description, objective, target, durationHours } = req.body;
    const event = AllianceService.createAllianceEvent(
      req.params.allianceId, req.playerId!,
      title, description, objective, target, durationHours ?? 24,
    );
    res.json(event);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get alliance events
router.get('/:allianceId/events', (req: Request, res: Response) => {
  try {
    const events = AllianceService.getAllianceEvents(req.params.allianceId);
    res.json(events);
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Participate in event
router.post('/:allianceId/events/:eventId/participate', (req: Request, res: Response) => {
  try {
    AllianceService.participateInEvent(req.params.allianceId, req.params.eventId, req.playerId!);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// ========================================
// Announcements
// ========================================

// Create announcement
router.post('/:allianceId/announcements', async (req: Request, res: Response) => {
  try {
    const { title, content, pinned } = req.body;
    const ann = await AllianceService.createAnnouncement(
      req.params.allianceId, req.playerId!, title, content, pinned ?? false,
    );
    res.json(ann);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get announcements
router.get('/:allianceId/announcements', (req: Request, res: Response) => {
  try {
    const anns = AllianceService.getAnnouncements(req.params.allianceId);
    res.json(anns);
  } catch (err) {
    console.error('Get announcements error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Recruitment
// ========================================

// Post recruitment listing
router.post('/:allianceId/recruitment', (req: Request, res: Response) => {
  try {
    const { description, minGuildLevel, tags } = req.body;
    const post = AllianceService.postRecruitment(
      req.params.allianceId, req.playerId!, description, minGuildLevel ?? 1, tags ?? [],
    );
    res.json(post);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Browse recruitment listings
router.get('/recruitment/browse', (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const minLevel = parseInt(req.query.minLevel as string) || undefined;
    const posts = AllianceService.browseRecruitmentPosts(search, minLevel);
    res.json(posts);
  } catch (err) {
    console.error('Browse recruitment error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Calendar
// ========================================

// Add calendar entry
router.post('/:allianceId/calendar', (req: Request, res: Response) => {
  try {
    const { title, description, scheduledAt } = req.body;
    const entry = AllianceService.addCalendarEntry(
      req.params.allianceId, req.playerId!, title, description, scheduledAt,
    );
    res.json(entry);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get calendar
router.get('/:allianceId/calendar', (req: Request, res: Response) => {
  try {
    const calendar = AllianceService.getCalendar(req.params.allianceId);
    res.json(calendar);
  } catch (err) {
    console.error('Get calendar error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Weekly Report & Stats
// ========================================

// Get weekly report
router.get('/:allianceId/report', (req: Request, res: Response) => {
  try {
    const report = AllianceService.generateWeeklyReport(req.params.allianceId);
    res.json(report);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get stats dashboard
router.get('/:allianceId/stats', (req: Request, res: Response) => {
  try {
    const stats = AllianceService.getStatsDashboard(req.params.allianceId);
    res.json(stats);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get alliance perks
router.get('/:allianceId/perks', (req: Request, res: Response) => {
  try {
    const alliance = AllianceService.getAlliance(req.params.allianceId);
    if (!alliance) {
      res.status(404).json({ error: 'not_found', message: 'Alliance not found' });
      return;
    }
    const perks = AllianceService.getAlliancePerks(alliance.level);
    res.json(perks);
  } catch (err) {
    console.error('Get perks error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get donation leaderboard
router.get('/:allianceId/donations', (req: Request, res: Response) => {
  try {
    const donations = AllianceService.getDonationLeaderboard(req.params.allianceId);
    res.json(donations);
  } catch (err) {
    console.error('Get donations error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get alliance rankings
router.get('/rankings/all', (req: Request, res: Response) => {
  try {
    const rankings = AllianceService.getAllianceRankings();
    res.json(rankings);
  } catch (err) {
    console.error('Get rankings error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Merge
// ========================================

// Merge two alliances
router.post('/merge', async (req: Request, res: Response) => {
  try {
    const { allianceAId, allianceBId } = req.body;
    const alliance = await AllianceService.mergeAlliances(allianceAId, allianceBId, req.playerId!);
    res.json(alliance);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// ========================================
// Diplomacy
// ========================================

// Create diplomacy pact
router.post('/:allianceId/diplomacy', (req: Request, res: Response) => {
  try {
    const { type, otherAllianceId, durationDays } = req.body;
    const pact = AllianceService.createPact(type, req.params.allianceId, otherAllianceId, durationDays ?? 30);
    res.json(pact);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get diplomacy pacts
router.get('/:allianceId/diplomacy', (req: Request, res: Response) => {
  try {
    const pacts = AllianceService.getDiplomacyPacts(req.params.allianceId);
    res.json(pacts);
  } catch (err) {
    console.error('Get pacts error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Territory
// ========================================

// Get territory map
router.get('/territory/map', (req: Request, res: Response) => {
  try {
    const territories = AllianceService.getTerritoryMap();
    res.json(territories);
  } catch (err) {
    console.error('Get territory map error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Contest territory
router.post('/territory/:regionId/contest', (req: Request, res: Response) => {
  try {
    const { allianceId, points } = req.body;
    const territory = AllianceService.contestTerritory(req.params.regionId, allianceId, points ?? 10);
    res.json(territory);
  } catch (err) {
    console.error('Contest territory error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Guild Wars
// ========================================

// Declare guild war
router.post('/wars/declare', async (req: Request, res: Response) => {
  try {
    const { challengerGuildId, defenderGuildId, objective, wager, durationHours } = req.body;
    const war = await GuildWarService.declareWar(
      challengerGuildId, defenderGuildId, objective, wager, durationHours,
    );
    res.json(war);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get active wars
router.get('/wars/active/:guildId', (req: Request, res: Response) => {
  try {
    const wars = GuildWarService.getActiveWars(req.params.guildId);
    res.json(wars);
  } catch (err) {
    console.error('Get active wars error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get war details
router.get('/wars/:warId', (req: Request, res: Response) => {
  try {
    const war = GuildWarService.getWar(req.params.warId);
    if (!war) {
      res.status(404).json({ error: 'not_found', message: 'War not found' });
      return;
    }
    res.json(war);
  } catch (err) {
    console.error('Get war error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Add war score
router.post('/wars/:warId/score', (req: Request, res: Response) => {
  try {
    const { guildId, points } = req.body;
    const war = GuildWarService.addScore(req.params.warId, guildId, points);
    if (!war) {
      res.status(404).json({ error: 'not_found', message: 'War not found or inactive' });
      return;
    }
    res.json(war);
  } catch (err) {
    console.error('Add score error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get war history
router.get('/wars/history/:guildId', (req: Request, res: Response) => {
  try {
    const history = GuildWarService.getWarHistory(req.params.guildId);
    res.json(history);
  } catch (err) {
    console.error('Get war history error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get war stats
router.get('/wars/stats/:guildId', (req: Request, res: Response) => {
  try {
    const stats = GuildWarService.getWarStats(req.params.guildId);
    res.json(stats);
  } catch (err) {
    console.error('Get war stats error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Distribute war rewards
router.post('/wars/:warId/rewards', async (req: Request, res: Response) => {
  try {
    const result = await GuildWarService.distributeRewards(req.params.warId);
    res.json(result);
  } catch (err) {
    console.error('Distribute rewards error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Matchmaking
router.get('/wars/matchmaking/:guildId', async (req: Request, res: Response) => {
  try {
    const match = await AllianceService.findWarMatch(req.params.guildId);
    if (!match) {
      res.status(404).json({ error: 'not_found', message: 'No suitable opponent found' });
      return;
    }
    res.json(match);
  } catch (err) {
    console.error('Matchmaking error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Alliance banner
router.get('/:allianceId/banner', (req: Request, res: Response) => {
  try {
    const banner = AllianceService.getAllianceBanner(req.params.allianceId);
    res.json(banner);
  } catch (err) {
    console.error('Get banner error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Alliance Research
// ========================================

// Get research tree
router.get('/:allianceId/research/tree', (req: Request, res: Response) => {
  try {
    const tree = AllianceResearchService.getResearchTree();
    const completed = AllianceResearchService.getCompletedResearch(req.params.allianceId);
    const available = AllianceResearchService.getAvailableResearch(req.params.allianceId);
    const active = AllianceResearchService.getActiveResearch(req.params.allianceId);
    res.json({ tree, completed, available, active });
  } catch (err) {
    console.error('Get research error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Start research
router.post('/:allianceId/research/start', (req: Request, res: Response) => {
  try {
    const { nodeId } = req.body;
    const research = AllianceResearchService.startResearch(req.params.allianceId, nodeId);
    res.json(research);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Complete research
router.post('/:allianceId/research/complete', (req: Request, res: Response) => {
  try {
    const node = AllianceResearchService.completeResearch(req.params.allianceId);
    if (!node) {
      res.status(400).json({ error: 'validation', message: 'No research to complete' });
      return;
    }
    res.json(node);
  } catch (err) {
    console.error('Complete research error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get research effects
router.get('/:allianceId/research/effects', (req: Request, res: Response) => {
  try {
    const effects = AllianceResearchService.getResearchEffects(req.params.allianceId);
    res.json(effects);
  } catch (err) {
    console.error('Get research effects error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Joint Expeditions
// ========================================

// Create joint expedition
router.post('/joint-expedition', async (req: Request, res: Response) => {
  try {
    const { guildId, allianceId, destination, heroIds, durationHours } = req.body;
    const expedition = await JointExpeditionService.createJointExpedition(
      guildId, allianceId, destination, heroIds ?? [], durationHours ?? 4,
    );
    res.json(expedition);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Join joint expedition
router.post('/joint-expedition/:expId/join', async (req: Request, res: Response) => {
  try {
    const { guildId, heroIds } = req.body;
    const expedition = await JointExpeditionService.joinExpedition(
      req.params.expId, guildId, heroIds ?? [],
    );
    res.json(expedition);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get active joint expeditions for alliance
router.get('/joint-expedition/active/:allianceId', (req: Request, res: Response) => {
  try {
    const expeditions = JointExpeditionService.getActiveExpeditions(req.params.allianceId);
    res.json(expeditions);
  } catch (err) {
    console.error('Get joint expeditions error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get joint expedition details
router.get('/joint-expedition/:expId', (req: Request, res: Response) => {
  try {
    const expedition = JointExpeditionService.getExpedition(req.params.expId);
    if (!expedition) {
      res.status(404).json({ error: 'not_found', message: 'Expedition not found' });
      return;
    }
    res.json(expedition);
  } catch (err) {
    console.error('Get joint expedition error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Resolve joint expedition
router.post('/joint-expedition/:expId/resolve', (req: Request, res: Response) => {
  try {
    const expedition = JointExpeditionService.resolveExpedition(req.params.expId);
    if (!expedition) {
      res.status(404).json({ error: 'not_found', message: 'Expedition not found or not active' });
      return;
    }
    res.json(expedition);
  } catch (err) {
    console.error('Resolve expedition error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export const alliancesRouter = router;
