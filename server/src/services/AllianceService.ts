import { prisma } from '../db';
import {
  AllianceRole,
  AlliancePerm,
  LeaderboardCategory,
  GuildWarStatus,
  GuildWarObjective,
  PlayerPresenceStatus,
  SocialNotificationType,
} from '../../../shared/src/enums';
import {
  ALLIANCE_ROLE_PERMISSIONS,
  ALLIANCE_BASE_XP,
  ALLIANCE_XP_MULTIPLIER,
  ALLIANCE_MAX_LEVEL,
  MAX_ALLIANCE_MEMBERS,
  ALLIANCE_LEVEL_PERKS,
  REGIONAL_SYNERGY_BONUSES,
  GUILD_WAR_DURATION_HOURS,
  GUILD_WAR_MIN_WAGER,
  MATCHMAKING_POWER_TOLERANCE,
  INACTIVE_MEMBER_DEFAULT_DAYS,
} from '../../../shared/src/constants';
import type {
  Alliance,
  AllianceMember,
  AllianceInvite,
  AllianceEmblem,
  AllianceEvent,
  AllianceDailyChallenge,
  AllianceAnnouncement,
  AllianceRecruitmentPost,
  AllianceCalendarEntry,
  AllianceWeeklyReport,
  AlliancePerk,
  AllianceStatsDashboard,
  RegionalSynergy,
  GuildWar,
  GuildWarHistory,
  TerritoryWarRegion,
  DiplomacyPact,
  MatchmakingResult,
  Resources,
} from '../../../shared/src/types';
import { ResourceType } from '../../../shared/src/enums';

// In-memory stores (would be DB tables in production)
const alliances: Map<string, Alliance> = new Map();
const allianceInvites: Map<string, AllianceInvite> = new Map();
const allianceEvents: Map<string, AllianceEvent[]> = new Map();
const allianceDailyChallenges: Map<string, AllianceDailyChallenge> = new Map();
const allianceAnnouncements: Map<string, AllianceAnnouncement[]> = new Map();
const allianceRecruitmentPosts: Map<string, AllianceRecruitmentPost> = new Map();
const allianceCalendars: Map<string, AllianceCalendarEntry[]> = new Map();
const guildWars: Map<string, GuildWar> = new Map();
const guildWarHistory: Map<string, GuildWarHistory[]> = new Map();
const territoryControl: Map<string, TerritoryWarRegion> = new Map();
const diplomacyPacts: Map<string, DiplomacyPact> = new Map();
const playerAllianceMap: Map<string, string> = new Map(); // playerId -> allianceId

let idCounter = 1;
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${idCounter++}`;
}

export class AllianceService {
  // --- Alliance CRUD ---

  static async createAlliance(
    playerId: string,
    name: string,
    description: string,
  ): Promise<Alliance> {
    if (playerAllianceMap.has(playerId)) {
      throw new Error('Player already in an alliance');
    }
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Player not found');

    const guild = await prisma.guild.findUnique({ where: { playerId } });
    if (!guild) throw new Error('Guild not found');

    const alliance: Alliance = {
      id: genId('alliance'),
      name,
      description,
      rules: '',
      emblem: null,
      leaderId: playerId,
      level: 1,
      xp: 0,
      members: [
        {
          playerId,
          username: player.username,
          guildName: guild.name,
          guildLevel: guild.level,
          role: AllianceRole.Leader,
          joinedAt: new Date().toISOString(),
          activityScore: 100,
          contributionXP: 0,
          lastActive: new Date().toISOString(),
        },
      ],
      treasury: {},
      createdAt: new Date().toISOString(),
      maxMembers: MAX_ALLIANCE_MEMBERS,
      isRecruiting: true,
      tags: [],
    };

    alliances.set(alliance.id, alliance);
    playerAllianceMap.set(playerId, alliance.id);
    return alliance;
  }

  static getAlliance(allianceId: string): Alliance | null {
    return alliances.get(allianceId) ?? null;
  }

  static getPlayerAlliance(playerId: string): Alliance | null {
    const allianceId = playerAllianceMap.get(playerId);
    if (!allianceId) return null;
    return alliances.get(allianceId) ?? null;
  }

  static async updateAllianceDescription(
    allianceId: string,
    playerId: string,
    description: string,
    rules?: string,
  ): Promise<Alliance> {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');
    AllianceService.checkPermission(alliance, playerId, AlliancePerm.Manage);
    alliance.description = description;
    if (rules !== undefined) alliance.rules = rules;
    return alliance;
  }

  static async updateAllianceEmblem(
    allianceId: string,
    playerId: string,
    emblem: AllianceEmblem,
  ): Promise<Alliance> {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');
    AllianceService.checkPermission(alliance, playerId, AlliancePerm.Manage);
    alliance.emblem = emblem;
    return alliance;
  }

  // --- Invitations ---

  static async invitePlayer(
    allianceId: string,
    fromPlayerId: string,
    toPlayerId: string,
  ): Promise<AllianceInvite> {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');
    AllianceService.checkPermission(alliance, fromPlayerId, AlliancePerm.Invite);

    if (alliance.members.length >= alliance.maxMembers) {
      throw new Error('Alliance is full');
    }
    if (playerAllianceMap.has(toPlayerId)) {
      throw new Error('Player is already in an alliance');
    }

    const fromPlayer = await prisma.player.findUnique({ where: { id: fromPlayerId } });
    const invite: AllianceInvite = {
      id: genId('invite'),
      allianceId,
      allianceName: alliance.name,
      fromPlayerId,
      fromUsername: fromPlayer?.username ?? 'Unknown',
      toPlayerId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    allianceInvites.set(invite.id, invite);
    return invite;
  }

  static async acceptInvite(inviteId: string, playerId: string): Promise<Alliance> {
    const invite = allianceInvites.get(inviteId);
    if (!invite || invite.toPlayerId !== playerId) throw new Error('Invite not found');
    if (invite.status !== 'pending') throw new Error('Invite already processed');

    const alliance = alliances.get(invite.allianceId);
    if (!alliance) throw new Error('Alliance not found');

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    const guild = await prisma.guild.findUnique({ where: { playerId } });
    if (!player || !guild) throw new Error('Player/Guild not found');

    alliance.members.push({
      playerId,
      username: player.username,
      guildName: guild.name,
      guildLevel: guild.level,
      role: AllianceRole.Member,
      joinedAt: new Date().toISOString(),
      activityScore: 0,
      contributionXP: 0,
      lastActive: new Date().toISOString(),
    });

    playerAllianceMap.set(playerId, alliance.id);
    invite.status = 'accepted';
    return alliance;
  }

  static declineInvite(inviteId: string, playerId: string): void {
    const invite = allianceInvites.get(inviteId);
    if (!invite || invite.toPlayerId !== playerId) throw new Error('Invite not found');
    invite.status = 'declined';
  }

  static getPendingInvites(playerId: string): AllianceInvite[] {
    const invites: AllianceInvite[] = [];
    for (const inv of allianceInvites.values()) {
      if (inv.toPlayerId === playerId && inv.status === 'pending') {
        invites.push(inv);
      }
    }
    return invites;
  }

  // --- Member Management ---

  static async leaveAlliance(allianceId: string, playerId: string): Promise<void> {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');

    if (alliance.leaderId === playerId) {
      // Transfer leadership or disband
      const others = alliance.members.filter((m) => m.playerId !== playerId);
      if (others.length > 0) {
        const newLeader = others.find((m) => m.role === AllianceRole.Officer) ?? others[0];
        alliance.leaderId = newLeader.playerId;
        newLeader.role = AllianceRole.Leader;
      } else {
        alliances.delete(allianceId);
      }
    }

    alliance.members = alliance.members.filter((m) => m.playerId !== playerId);
    playerAllianceMap.delete(playerId);
  }

  static async kickMember(
    allianceId: string,
    kickerId: string,
    targetId: string,
  ): Promise<void> {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');
    AllianceService.checkPermission(alliance, kickerId, AlliancePerm.Kick);

    const target = alliance.members.find((m) => m.playerId === targetId);
    if (!target) throw new Error('Member not found');
    if (target.role === AllianceRole.Leader) throw new Error('Cannot kick the leader');

    alliance.members = alliance.members.filter((m) => m.playerId !== targetId);
    playerAllianceMap.delete(targetId);
  }

  static async promoteOfficer(
    allianceId: string,
    leaderId: string,
    targetId: string,
  ): Promise<AllianceMember> {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');
    if (alliance.leaderId !== leaderId) throw new Error('Only the leader can promote');

    const member = alliance.members.find((m) => m.playerId === targetId);
    if (!member) throw new Error('Member not found');
    member.role = AllianceRole.Officer;
    return member;
  }

  static async demoteOfficer(
    allianceId: string,
    leaderId: string,
    targetId: string,
  ): Promise<AllianceMember> {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');
    if (alliance.leaderId !== leaderId) throw new Error('Only the leader can demote');

    const member = alliance.members.find((m) => m.playerId === targetId);
    if (!member) throw new Error('Member not found');
    if (member.role === AllianceRole.Leader) throw new Error('Cannot demote the leader');
    member.role = AllianceRole.Member;
    return member;
  }

  // --- Alliance XP & Leveling ---

  static addAllianceXP(allianceId: string, amount: number, contributorId: string): void {
    const alliance = alliances.get(allianceId);
    if (!alliance) return;

    alliance.xp += amount;
    const member = alliance.members.find((m) => m.playerId === contributorId);
    if (member) member.contributionXP += amount;

    // Level up check
    while (alliance.level < ALLIANCE_MAX_LEVEL) {
      const needed = Math.floor(
        ALLIANCE_BASE_XP * Math.pow(ALLIANCE_XP_MULTIPLIER, alliance.level - 1),
      );
      if (alliance.xp < needed) break;
      alliance.xp -= needed;
      alliance.level++;
    }
  }

  static getAlliancePerks(allianceLevel: number): typeof ALLIANCE_LEVEL_PERKS {
    return ALLIANCE_LEVEL_PERKS.filter((p) => p.level <= allianceLevel);
  }

  // --- Treasury ---

  static async depositTreasury(
    allianceId: string,
    playerId: string,
    resources: Partial<Record<ResourceType, number>>,
  ): Promise<void> {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');
    AllianceService.checkPermission(alliance, playerId, AlliancePerm.Treasury);

    for (const [res, amount] of Object.entries(resources)) {
      if ((amount ?? 0) <= 0) continue;
      const key = res as ResourceType;
      alliance.treasury[key] = (alliance.treasury[key] ?? 0) + (amount ?? 0);
    }
  }

  static async withdrawTreasury(
    allianceId: string,
    playerId: string,
    resources: Partial<Record<ResourceType, number>>,
  ): Promise<void> {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');
    AllianceService.checkPermission(alliance, playerId, AlliancePerm.Treasury);

    for (const [res, amount] of Object.entries(resources)) {
      if ((amount ?? 0) <= 0) continue;
      const key = res as ResourceType;
      const current = alliance.treasury[key] ?? 0;
      if (current < (amount ?? 0)) throw new Error(`Not enough ${key} in treasury`);
      alliance.treasury[key] = current - (amount ?? 0);
    }
  }

  // --- Regional Synergy ---

  static calculateRegionalSynergy(allianceId: string): RegionalSynergy {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');

    // Collect regions from members (via their guild's region)
    const regions = new Set<string>();
    // In real impl, query each member's region from DB
    // For now, return empty synergy
    const synergy: RegionalSynergy = {
      allianceId,
      regions: Array.from(regions),
      bonuses: {},
      synergyPairs: [],
    };

    // Check regional synergy pairs
    for (const bonus of REGIONAL_SYNERGY_BONUSES) {
      if (regions.has(bonus.climateA) && regions.has(bonus.climateB)) {
        synergy.synergyPairs.push({
          regionA: bonus.climateA,
          regionB: bonus.climateB,
          bonus: bonus.bonus,
          amount: bonus.amount,
        });
        synergy.bonuses[bonus.bonus] =
          (synergy.bonuses[bonus.bonus] ?? 0) + bonus.amount;
      }
    }

    return synergy;
  }

  // --- Daily Challenges ---

  static generateDailyChallenge(allianceId: string): AllianceDailyChallenge {
    const objectives = [
      { obj: 'Complete expeditions', target: 10 },
      { obj: 'Earn gold', target: 5000 },
      { obj: 'Recruit heroes', target: 3 },
      { obj: 'Research technologies', target: 2 },
    ];
    const pick = objectives[Math.floor(Math.random() * objectives.length)];
    const challenge: AllianceDailyChallenge = {
      id: genId('challenge'),
      allianceId,
      objective: pick.obj,
      target: pick.target,
      current: 0,
      reward: { [ResourceType.Gold]: 200, [ResourceType.Essence]: 10 },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    allianceDailyChallenges.set(allianceId, challenge);
    return challenge;
  }

  static getDailyChallenge(allianceId: string): AllianceDailyChallenge | null {
    return allianceDailyChallenges.get(allianceId) ?? null;
  }

  // --- Alliance Events ---

  static createAllianceEvent(
    allianceId: string,
    playerId: string,
    title: string,
    description: string,
    objective: string,
    target: number,
    durationHours: number,
  ): AllianceEvent {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');
    AllianceService.checkPermission(alliance, playerId, AlliancePerm.Manage);

    const event: AllianceEvent = {
      id: genId('event'),
      allianceId,
      title,
      description,
      objective,
      target,
      current: 0,
      participants: [],
      reward: { [ResourceType.Gold]: 500 },
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
    };

    const events = allianceEvents.get(allianceId) ?? [];
    events.push(event);
    allianceEvents.set(allianceId, events);
    return event;
  }

  static getAllianceEvents(allianceId: string): AllianceEvent[] {
    return allianceEvents.get(allianceId) ?? [];
  }

  static participateInEvent(allianceId: string, eventId: string, playerId: string): void {
    const events = allianceEvents.get(allianceId) ?? [];
    const event = events.find((e) => e.id === eventId);
    if (!event) throw new Error('Event not found');
    if (!event.participants.includes(playerId)) {
      event.participants.push(playerId);
    }
  }

  // --- Announcements ---

  static async createAnnouncement(
    allianceId: string,
    playerId: string,
    title: string,
    content: string,
    pinned: boolean,
  ): Promise<AllianceAnnouncement> {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');
    AllianceService.checkPermission(alliance, playerId, AlliancePerm.Manage);

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    const ann: AllianceAnnouncement = {
      id: genId('ann'),
      allianceId,
      authorId: playerId,
      authorUsername: player?.username ?? 'Unknown',
      title,
      content,
      pinned,
      createdAt: new Date().toISOString(),
    };

    const anns = allianceAnnouncements.get(allianceId) ?? [];
    anns.unshift(ann);
    allianceAnnouncements.set(allianceId, anns);
    return ann;
  }

  static getAnnouncements(allianceId: string): AllianceAnnouncement[] {
    return allianceAnnouncements.get(allianceId) ?? [];
  }

  // --- Recruitment ---

  static postRecruitment(
    allianceId: string,
    playerId: string,
    description: string,
    minGuildLevel: number,
    tags: string[],
  ): AllianceRecruitmentPost {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');
    AllianceService.checkPermission(alliance, playerId, AlliancePerm.Manage);

    const post: AllianceRecruitmentPost = {
      id: genId('recruit'),
      allianceId,
      allianceName: alliance.name,
      description,
      minGuildLevel,
      tags,
      memberCount: alliance.members.length,
      maxMembers: alliance.maxMembers,
      allianceLevel: alliance.level,
      createdAt: new Date().toISOString(),
    };
    allianceRecruitmentPosts.set(allianceId, post);
    return post;
  }

  static browseRecruitmentPosts(
    search?: string,
    minLevel?: number,
  ): AllianceRecruitmentPost[] {
    const posts = Array.from(allianceRecruitmentPosts.values());
    return posts.filter((p) => {
      if (search && !p.allianceName.toLowerCase().includes(search.toLowerCase())) return false;
      if (minLevel && p.allianceLevel < minLevel) return false;
      return true;
    });
  }

  // --- Calendar ---

  static addCalendarEntry(
    allianceId: string,
    playerId: string,
    title: string,
    description: string,
    scheduledAt: string,
  ): AllianceCalendarEntry {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');
    AllianceService.checkPermission(alliance, playerId, AlliancePerm.Manage);

    const entry: AllianceCalendarEntry = {
      id: genId('cal'),
      allianceId,
      title,
      description,
      scheduledAt,
      createdBy: playerId,
    };
    const cal = allianceCalendars.get(allianceId) ?? [];
    cal.push(entry);
    allianceCalendars.set(allianceId, cal);
    return entry;
  }

  static getCalendar(allianceId: string): AllianceCalendarEntry[] {
    return allianceCalendars.get(allianceId) ?? [];
  }

  // --- Weekly Report ---

  static generateWeeklyReport(allianceId: string): AllianceWeeklyReport {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');

    const weekEnd = new Date();
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const topContributors = [...alliance.members]
      .sort((a, b) => b.contributionXP - a.contributionXP)
      .slice(0, 5)
      .map((m) => ({ playerId: m.playerId, username: m.username, xp: m.contributionXP }));

    return {
      allianceId,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      totalXpEarned: alliance.members.reduce((sum, m) => sum + m.contributionXP, 0),
      topContributors,
      expeditionsCompleted: 0,
      warResults: [],
      newMembers: 0,
      membersLeft: 0,
    };
  }

  // --- Alliance Stats Dashboard ---

  static getStatsDashboard(allianceId: string): AllianceStatsDashboard {
    const alliance = alliances.get(allianceId);
    if (!alliance) throw new Error('Alliance not found');

    const totalPower = alliance.members.reduce((sum, m) => sum + m.guildLevel * 100, 0);
    const avgGuildLevel =
      alliance.members.reduce((sum, m) => sum + m.guildLevel, 0) / (alliance.members.length || 1);

    const now = Date.now();
    const active24h = alliance.members.filter(
      (m) => now - new Date(m.lastActive).getTime() < 24 * 60 * 60 * 1000,
    ).length;

    let treasuryValue = 0;
    for (const amt of Object.values(alliance.treasury)) {
      treasuryValue += amt ?? 0;
    }

    const xpNeeded = Math.floor(
      ALLIANCE_BASE_XP * Math.pow(ALLIANCE_XP_MULTIPLIER, alliance.level - 1),
    );

    return {
      memberCount: alliance.members.length,
      totalPower,
      avgGuildLevel: Math.round(avgGuildLevel * 10) / 10,
      activeMembers24h: active24h,
      totalExpeditions: 0,
      treasuryValue,
      allianceLevel: alliance.level,
      allianceXP: alliance.xp,
      xpToNextLevel: xpNeeded,
    };
  }

  // --- Merge ---

  static async mergeAlliances(
    allianceAId: string,
    allianceBId: string,
    leaderId: string,
  ): Promise<Alliance> {
    const a = alliances.get(allianceAId);
    const b = alliances.get(allianceBId);
    if (!a || !b) throw new Error('Alliance not found');
    if (a.leaderId !== leaderId && b.leaderId !== leaderId) {
      throw new Error('Only a leader can initiate a merge');
    }

    const totalMembers = a.members.length + b.members.length;
    if (totalMembers > MAX_ALLIANCE_MEMBERS) {
      throw new Error('Combined members exceed maximum');
    }

    // Merge B into A
    for (const member of b.members) {
      member.role = AllianceRole.Member;
      a.members.push(member);
      playerAllianceMap.set(member.playerId, a.id);
    }

    // Merge treasury
    for (const [res, amt] of Object.entries(b.treasury)) {
      const key = res as ResourceType;
      a.treasury[key] = (a.treasury[key] ?? 0) + (amt ?? 0);
    }

    a.xp += b.xp;
    alliances.delete(allianceBId);
    return a;
  }

  // --- Activity Tracking ---

  static updateMemberActivity(allianceId: string, playerId: string, score: number): void {
    const alliance = alliances.get(allianceId);
    if (!alliance) return;
    const member = alliance.members.find((m) => m.playerId === playerId);
    if (member) {
      member.activityScore += score;
      member.lastActive = new Date().toISOString();
    }
  }

  static getInactiveMembers(allianceId: string, days: number = INACTIVE_MEMBER_DEFAULT_DAYS): AllianceMember[] {
    const alliance = alliances.get(allianceId);
    if (!alliance) return [];
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
    return alliance.members.filter(
      (m) => new Date(m.lastActive).getTime() < threshold && m.role !== AllianceRole.Leader,
    );
  }

  static async autoKickInactive(allianceId: string, days: number): Promise<string[]> {
    const inactive = AllianceService.getInactiveMembers(allianceId, days);
    const kicked: string[] = [];
    const alliance = alliances.get(allianceId);
    if (!alliance) return kicked;

    for (const member of inactive) {
      alliance.members = alliance.members.filter((m) => m.playerId !== member.playerId);
      playerAllianceMap.delete(member.playerId);
      kicked.push(member.username);
    }
    return kicked;
  }

  // --- Resource Donation Leaderboard ---

  static getDonationLeaderboard(allianceId: string): Array<{ playerId: string; username: string; donated: number }> {
    const alliance = alliances.get(allianceId);
    if (!alliance) return [];
    return [...alliance.members]
      .sort((a, b) => b.contributionXP - a.contributionXP)
      .map((m) => ({ playerId: m.playerId, username: m.username, donated: m.contributionXP }));
  }

  // --- Guild Wars ---

  static async declareWar(
    challengerGuildId: string,
    defenderGuildId: string,
    objective: GuildWarObjective,
    wager: Partial<Record<ResourceType, number>>,
  ): Promise<GuildWar> {
    const challenger = await prisma.guild.findUnique({ where: { id: challengerGuildId } });
    const defender = await prisma.guild.findUnique({ where: { id: defenderGuildId } });
    if (!challenger || !defender) throw new Error('Guild not found');

    const war: GuildWar = {
      id: genId('war'),
      challengerGuildId,
      challengerGuildName: challenger.name,
      defenderGuildId,
      defenderGuildName: defender.name,
      objective,
      wager,
      challengerScore: 0,
      defenderScore: 0,
      status: GuildWarStatus.Active,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + GUILD_WAR_DURATION_HOURS * 60 * 60 * 1000).toISOString(),
      winnerId: null,
    };

    guildWars.set(war.id, war);
    return war;
  }

  static getActiveWars(guildId: string): GuildWar[] {
    const wars: GuildWar[] = [];
    for (const war of guildWars.values()) {
      if (
        war.status === GuildWarStatus.Active &&
        (war.challengerGuildId === guildId || war.defenderGuildId === guildId)
      ) {
        wars.push(war);
      }
    }
    return wars;
  }

  static updateWarScore(warId: string, guildId: string, points: number): GuildWar | null {
    const war = guildWars.get(warId);
    if (!war || war.status !== GuildWarStatus.Active) return null;

    if (war.challengerGuildId === guildId) {
      war.challengerScore += points;
    } else if (war.defenderGuildId === guildId) {
      war.defenderScore += points;
    }

    // Check if war ended
    if (new Date(war.endsAt).getTime() <= Date.now()) {
      war.status = GuildWarStatus.Resolved;
      war.winnerId =
        war.challengerScore >= war.defenderScore
          ? war.challengerGuildId
          : war.defenderGuildId;
    }

    return war;
  }

  static resolveExpiredWars(): GuildWar[] {
    const resolved: GuildWar[] = [];
    for (const war of guildWars.values()) {
      if (war.status === GuildWarStatus.Active && new Date(war.endsAt).getTime() <= Date.now()) {
        war.status = GuildWarStatus.Resolved;
        war.winnerId =
          war.challengerScore >= war.defenderScore
            ? war.challengerGuildId
            : war.defenderGuildId;
        resolved.push(war);
      }
    }
    return resolved;
  }

  static getWarHistory(guildId: string): GuildWarHistory[] {
    return guildWarHistory.get(guildId) ?? [];
  }

  // --- Territory Wars ---

  static getTerritoryMap(): TerritoryWarRegion[] {
    return Array.from(territoryControl.values());
  }

  static contestTerritory(regionId: string, allianceId: string, points: number): TerritoryWarRegion {
    let territory = territoryControl.get(regionId);
    if (!territory) {
      territory = {
        regionId,
        regionName: regionId,
        controllingAllianceId: null,
        controllingAllianceName: null,
        contestedBy: [],
        contestPoints: {},
      };
      territoryControl.set(regionId, territory);
    }

    if (!territory.contestedBy.includes(allianceId)) {
      territory.contestedBy.push(allianceId);
    }
    territory.contestPoints[allianceId] = (territory.contestPoints[allianceId] ?? 0) + points;

    // Check for control change
    let maxPoints = 0;
    let maxAlliance: string | null = null;
    for (const [aid, pts] of Object.entries(territory.contestPoints)) {
      if (pts > maxPoints) {
        maxPoints = pts;
        maxAlliance = aid;
      }
    }
    if (maxAlliance && maxPoints >= 100) {
      territory.controllingAllianceId = maxAlliance;
      const alliance = alliances.get(maxAlliance);
      territory.controllingAllianceName = alliance?.name ?? null;
    }

    return territory;
  }

  // --- Diplomacy ---

  static createPact(
    type: 'non_aggression' | 'trade_agreement',
    allianceAId: string,
    allianceBId: string,
    durationDays: number,
  ): DiplomacyPact {
    const a = alliances.get(allianceAId);
    const b = alliances.get(allianceBId);
    if (!a || !b) throw new Error('Alliance not found');

    const pact: DiplomacyPact = {
      id: genId('pact'),
      type,
      allianceAId,
      allianceAName: a.name,
      allianceBId,
      allianceBName: b.name,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
      active: true,
    };
    diplomacyPacts.set(pact.id, pact);
    return pact;
  }

  static getDiplomacyPacts(allianceId: string): DiplomacyPact[] {
    const pacts: DiplomacyPact[] = [];
    for (const pact of diplomacyPacts.values()) {
      if (
        pact.active &&
        (pact.allianceAId === allianceId || pact.allianceBId === allianceId)
      ) {
        pacts.push(pact);
      }
    }
    return pacts;
  }

  // --- Matchmaking ---

  static async findWarMatch(guildId: string): Promise<MatchmakingResult | null> {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return null;

    const myPower = guild.level * 100;
    const tolerance = myPower * MATCHMAKING_POWER_TOLERANCE;

    const allGuilds = await prisma.guild.findMany({
      where: { id: { not: guildId } },
    });

    for (const g of allGuilds) {
      const power = g.level * 100;
      if (Math.abs(power - myPower) <= tolerance) {
        return {
          matchedGuildId: g.id,
          matchedGuildName: g.name,
          matchedGuildLevel: g.level,
          matchedPowerScore: power,
          compatibilityScore: 1 - Math.abs(power - myPower) / (myPower || 1),
        };
      }
    }
    return null;
  }

  // --- Banner Display ---

  static getAllianceBanner(allianceId: string): AllianceEmblem | null {
    const alliance = alliances.get(allianceId);
    return alliance?.emblem ?? null;
  }

  // --- Permission Check ---

  private static checkPermission(
    alliance: Alliance,
    playerId: string,
    perm: AlliancePerm,
  ): void {
    const member = alliance.members.find((m) => m.playerId === playerId);
    if (!member) throw new Error('Not a member of this alliance');
    const perms = ALLIANCE_ROLE_PERMISSIONS[member.role];
    if (!perms.includes(perm)) {
      throw new Error(`Insufficient permissions: requires ${perm}`);
    }
  }

  // --- Listing all alliances ---

  static listAlliances(): Alliance[] {
    return Array.from(alliances.values());
  }

  // --- Alliance ranking ---

  static getAllianceRankings(): Array<{ allianceId: string; name: string; level: number; totalPower: number }> {
    return Array.from(alliances.values())
      .map((a) => ({
        allianceId: a.id,
        name: a.name,
        level: a.level,
        totalPower: a.members.reduce((sum, m) => sum + m.guildLevel * 100, 0),
      }))
      .sort((a, b) => b.totalPower - a.totalPower);
  }
}
