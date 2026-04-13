import { prisma } from '../db';
import {
  PlayerPresenceStatus,
  FriendRequestStatus,
  ChatChannel,
  TradeRequestStatus,
  SocialNotificationType,
} from '../../../shared/src/enums';
import {
  MAX_FRIENDS,
  CHAT_RATE_LIMIT_GLOBAL,
  CHAT_RATE_LIMIT_ALLIANCE,
  CHAT_RATE_LIMIT_PRIVATE,
  CHAT_MESSAGE_MAX_LENGTH,
  TRADE_EXPIRY_HOURS,
  MAX_ACTIVE_TRADES,
  GIFT_DAILY_LIMIT,
  GIFT_MAX_RESOURCES,
  PROFANITY_WORDS,
  SOCIAL_ACHIEVEMENTS,
  MENTORSHIP_XP_PER_LEVEL,
  WS_HEARTBEAT_INTERVAL,
} from '../../../shared/src/constants';
import type {
  PlayerPresence,
  PlayerProfile,
  FriendRequest,
  Friend,
  ChatMessage,
  ChatConversation,
  PlayerTradeRequest,
  TradeHistoryEntry,
  GiftEntry,
  SocialFeedEntry,
  SocialNotification,
  SocialNotificationPrefs,
  PlayerComparison,
  MentorshipLink,
  PlayerCard,
  FollowEntry,
  BlockedPlayer,
  PlayerReport,
  WorldBossEvent,
  WorldBossContributor,
  MultiplayerSeason,
  SeasonRewardTier,
  AntiCheatValidation,
  Resources,
} from '../../../shared/src/types';
import { ResourceType } from '../../../shared/src/enums';

// In-memory stores
const presenceMap: Map<string, PlayerPresence> = new Map();
const friendRequests: Map<string, FriendRequest> = new Map();
const friendLists: Map<string, Set<string>> = new Map(); // playerId -> Set<friendPlayerId>
const chatMessages: Map<string, ChatMessage[]> = new Map(); // channelKey -> messages
const tradeRequests: Map<string, PlayerTradeRequest> = new Map();
const tradeHistory: Map<string, TradeHistoryEntry[]> = new Map();
const giftLog: Map<string, GiftEntry[]> = new Map();
const socialFeed: SocialFeedEntry[] = [];
const notifications: Map<string, SocialNotification[]> = new Map();
const notificationPrefs: Map<string, SocialNotificationPrefs> = new Map();
const blockedPlayers: Map<string, Set<string>> = new Map(); // playerId -> Set<blockedId>
const reports: PlayerReport[] = [];
const mentorships: Map<string, MentorshipLink> = new Map();
const followers: Map<string, Set<string>> = new Map(); // targetId -> Set<followerId>
const playerStatusMessages: Map<string, string> = new Map();
const worldBosses: Map<string, WorldBossEvent> = new Map();
const seasons: Map<string, MultiplayerSeason> = new Map();
const chatRateLimits: Map<string, number[]> = new Map(); // playerId -> timestamps

let idCounter = 1;
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${idCounter++}`;
}

export class SocialService {
  // ========================================
  // Presence System (T-1144)
  // ========================================

  static setPresence(playerId: string, username: string, status: PlayerPresenceStatus): void {
    presenceMap.set(playerId, {
      playerId,
      username,
      status,
      lastSeen: new Date().toISOString(),
      statusMessage: playerStatusMessages.get(playerId) ?? '',
    });
  }

  static getPresence(playerId: string): PlayerPresence | null {
    return presenceMap.get(playerId) ?? null;
  }

  static setStatusMessage(playerId: string, message: string): void {
    playerStatusMessages.set(playerId, message.slice(0, 100));
    const presence = presenceMap.get(playerId);
    if (presence) presence.statusMessage = message.slice(0, 100);
  }

  // ========================================
  // Player Search & Profile (T-1145, T-1146)
  // ========================================

  static async searchPlayers(query: string): Promise<Array<{ id: string; username: string }>> {
    if (!query || query.length < 2) return [];
    const players = await prisma.player.findMany({
      where: { username: { contains: query } },
      take: 20,
      select: { id: true, username: true },
    });
    return players;
  }

  static async getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return null;

    const guild = await prisma.guild.findUnique({
      where: { playerId },
      include: { heroes: true },
    });

    const heroPower = guild
      ? guild.heroes.reduce((sum: number, h: any) => sum + h.level * 10, 0)
      : 0;

    return {
      id: player.id,
      username: player.username,
      guildName: guild?.name ?? 'No Guild',
      guildLevel: guild?.level ?? 0,
      guildEmblem: guild?.emblem ? JSON.parse(guild.emblem) : null,
      regionId: player.regionId ?? '',
      totalExpeditions: 0,
      totalTradeVolume: 0,
      heroPower,
      achievements: [],
      joinedAt: player.createdAt.toISOString(),
      statusMessage: playerStatusMessages.get(playerId) ?? '',
      presence: presenceMap.get(playerId)?.status ?? PlayerPresenceStatus.Offline,
      mentorLevel: 0,
    };
  }

  static async getPlayerCard(playerId: string): Promise<PlayerCard | null> {
    const profile = await SocialService.getPlayerProfile(playerId);
    if (!profile) return null;

    return {
      playerId: profile.id,
      username: profile.username,
      guildName: profile.guildName,
      guildLevel: profile.guildLevel,
      emblem: profile.guildEmblem,
      topHeroName: 'Unknown',
      topHeroLevel: 0,
      expeditionCount: profile.totalExpeditions,
      achievements: profile.achievements,
      shareUrl: `/player/${playerId}`,
    };
  }

  static async compareProfiles(playerAId: string, playerBId: string): Promise<PlayerComparison | null> {
    const a = await SocialService.getPlayerProfile(playerAId);
    const b = await SocialService.getPlayerProfile(playerBId);
    if (!a || !b) return null;

    return {
      playerA: a,
      playerB: b,
      differences: {
        guildLevel: { a: a.guildLevel, b: b.guildLevel },
        heroPower: { a: a.heroPower, b: b.heroPower },
        totalExpeditions: { a: a.totalExpeditions, b: b.totalExpeditions },
        totalTradeVolume: { a: a.totalTradeVolume, b: b.totalTradeVolume },
      },
    };
  }

  // ========================================
  // Friend System (T-1147, T-1148, T-1149)
  // ========================================

  static async sendFriendRequest(fromPlayerId: string, toPlayerId: string): Promise<FriendRequest> {
    if (fromPlayerId === toPlayerId) throw new Error('Cannot friend yourself');

    const friends = friendLists.get(fromPlayerId);
    if (friends && friends.has(toPlayerId)) throw new Error('Already friends');
    if (friends && friends.size >= MAX_FRIENDS) throw new Error('Friend list full');

    const fromPlayer = await prisma.player.findUnique({ where: { id: fromPlayerId } });
    const toPlayer = await prisma.player.findUnique({ where: { id: toPlayerId } });
    if (!fromPlayer || !toPlayer) throw new Error('Player not found');

    const req: FriendRequest = {
      id: genId('freq'),
      fromPlayerId,
      fromUsername: fromPlayer.username,
      toPlayerId,
      toUsername: toPlayer.username,
      status: FriendRequestStatus.Pending,
      createdAt: new Date().toISOString(),
    };
    friendRequests.set(req.id, req);

    SocialService.addNotification(toPlayerId, SocialNotificationType.FriendRequest,
      'Friend Request', `${fromPlayer.username} wants to be your friend`, { requestId: req.id });

    return req;
  }

  static acceptFriendRequest(requestId: string, playerId: string): void {
    const req = friendRequests.get(requestId);
    if (!req || req.toPlayerId !== playerId) throw new Error('Request not found');
    if (req.status !== FriendRequestStatus.Pending) throw new Error('Already processed');

    req.status = FriendRequestStatus.Accepted;

    // Add to both friend lists
    if (!friendLists.has(req.fromPlayerId)) friendLists.set(req.fromPlayerId, new Set());
    if (!friendLists.has(req.toPlayerId)) friendLists.set(req.toPlayerId, new Set());
    friendLists.get(req.fromPlayerId)!.add(req.toPlayerId);
    friendLists.get(req.toPlayerId)!.add(req.fromPlayerId);
  }

  static declineFriendRequest(requestId: string, playerId: string): void {
    const req = friendRequests.get(requestId);
    if (!req || req.toPlayerId !== playerId) throw new Error('Request not found');
    req.status = FriendRequestStatus.Declined;
  }

  static getPendingFriendRequests(playerId: string): FriendRequest[] {
    const reqs: FriendRequest[] = [];
    for (const req of friendRequests.values()) {
      if (req.toPlayerId === playerId && req.status === FriendRequestStatus.Pending) {
        reqs.push(req);
      }
    }
    return reqs;
  }

  static async getFriendList(playerId: string): Promise<Friend[]> {
    const friendIds = friendLists.get(playerId);
    if (!friendIds || friendIds.size === 0) return [];

    const friends: Friend[] = [];
    for (const fId of friendIds) {
      const player = await prisma.player.findUnique({ where: { id: fId } });
      const guild = await prisma.guild.findUnique({ where: { playerId: fId } });
      const presence = presenceMap.get(fId);

      friends.push({
        playerId: fId,
        username: player?.username ?? 'Unknown',
        guildName: guild?.name ?? 'No Guild',
        guildLevel: guild?.level ?? 0,
        presence: presence?.status ?? PlayerPresenceStatus.Offline,
        lastSeen: presence?.lastSeen ?? new Date().toISOString(),
        addedAt: new Date().toISOString(),
      });
    }
    return friends;
  }

  static removeFriend(playerId: string, friendId: string): void {
    friendLists.get(playerId)?.delete(friendId);
    friendLists.get(friendId)?.delete(playerId);
  }

  static getFriendActivityFeed(playerId: string): SocialFeedEntry[] {
    const friendIds = friendLists.get(playerId);
    if (!friendIds) return [];
    return socialFeed
      .filter((e) => friendIds.has(e.playerId))
      .slice(0, 50);
  }

  // ========================================
  // Chat System (T-1155 - T-1161)
  // ========================================

  static async sendMessage(
    channel: ChatChannel,
    channelId: string,
    senderId: string,
    content: string,
  ): Promise<ChatMessage> {
    // Validate content
    if (!content || content.length === 0) throw new Error('Empty message');
    if (content.length > CHAT_MESSAGE_MAX_LENGTH) throw new Error('Message too long');

    // Rate limiting
    const rateKey = `${senderId}_${channel}`;
    const now = Date.now();
    const timestamps = chatRateLimits.get(rateKey) ?? [];
    const oneMinAgo = now - 60000;
    const recent = timestamps.filter((t) => t > oneMinAgo);

    const limit = channel === ChatChannel.Global ? CHAT_RATE_LIMIT_GLOBAL
      : channel === ChatChannel.Alliance ? CHAT_RATE_LIMIT_ALLIANCE
      : CHAT_RATE_LIMIT_PRIVATE;

    if (recent.length >= limit) throw new Error('Rate limit exceeded');
    recent.push(now);
    chatRateLimits.set(rateKey, recent);

    // Profanity filter
    const filteredContent = SocialService.filterProfanity(content);

    // Spam detection
    if (SocialService.isSpam(senderId, filteredContent)) {
      throw new Error('Message detected as spam');
    }

    const sender = await prisma.player.findUnique({ where: { id: senderId } });

    const msg: ChatMessage = {
      id: genId('msg'),
      channel,
      channelId,
      senderId,
      senderUsername: sender?.username ?? 'Unknown',
      content: filteredContent,
      reactions: {},
      imageUrl: null,
      createdAt: new Date().toISOString(),
    };

    const key = `${channel}_${channelId}`;
    const messages = chatMessages.get(key) ?? [];
    messages.push(msg);
    // Keep last 500 messages per channel
    if (messages.length > 500) messages.splice(0, messages.length - 500);
    chatMessages.set(key, messages);

    return msg;
  }

  static getMessages(
    channel: ChatChannel,
    channelId: string,
    limit: number = 50,
    before?: string,
  ): ChatMessage[] {
    const key = `${channel}_${channelId}`;
    let messages = chatMessages.get(key) ?? [];

    if (before) {
      const idx = messages.findIndex((m) => m.id === before);
      if (idx > 0) messages = messages.slice(0, idx);
    }

    return messages.slice(-limit);
  }

  static addReaction(messageId: string, channel: ChatChannel, channelId: string, playerId: string, emoji: string): void {
    const key = `${channel}_${channelId}`;
    const messages = chatMessages.get(key) ?? [];
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) throw new Error('Message not found');

    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    if (!msg.reactions[emoji].includes(playerId)) {
      msg.reactions[emoji].push(playerId);
    }
  }

  static shareImage(
    channel: ChatChannel,
    channelId: string,
    senderId: string,
    imageUrl: string,
  ): ChatMessage {
    const msg: ChatMessage = {
      id: genId('msg'),
      channel,
      channelId,
      senderId,
      senderUsername: 'Unknown',
      content: '',
      reactions: {},
      imageUrl,
      createdAt: new Date().toISOString(),
    };

    const key = `${channel}_${channelId}`;
    const messages = chatMessages.get(key) ?? [];
    messages.push(msg);
    chatMessages.set(key, messages);
    return msg;
  }

  static getConversations(playerId: string): ChatConversation[] {
    const convos: Map<string, ChatConversation> = new Map();

    for (const [key, messages] of chatMessages.entries()) {
      if (!key.startsWith('private_')) continue;
      for (const msg of messages) {
        if (msg.senderId !== playerId && msg.channelId !== playerId) continue;
        const otherId = msg.senderId === playerId ? msg.channelId : msg.senderId;

        const existing = convos.get(otherId);
        if (!existing || msg.createdAt > existing.lastMessageAt) {
          convos.set(otherId, {
            playerId: otherId,
            username: msg.senderId === playerId ? 'Other' : msg.senderUsername,
            lastMessage: msg.content,
            lastMessageAt: msg.createdAt,
            unreadCount: 0,
          });
        }
      }
    }

    return Array.from(convos.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  }

  static getUnreadCount(playerId: string, channel: ChatChannel, channelId: string): number {
    // Simplified: return 0 for now, real impl tracks last-read cursor
    return 0;
  }

  // ========================================
  // Blocking & Reporting (T-1162, T-1163)
  // ========================================

  static blockPlayer(playerId: string, targetId: string): void {
    if (!blockedPlayers.has(playerId)) blockedPlayers.set(playerId, new Set());
    blockedPlayers.get(playerId)!.add(targetId);
    // Also remove friendship if exists
    friendLists.get(playerId)?.delete(targetId);
    friendLists.get(targetId)?.delete(playerId);
  }

  static unblockPlayer(playerId: string, targetId: string): void {
    blockedPlayers.get(playerId)?.delete(targetId);
  }

  static getBlockedPlayers(playerId: string): BlockedPlayer[] {
    const blocked = blockedPlayers.get(playerId);
    if (!blocked) return [];
    return Array.from(blocked).map((id) => ({
      playerId: id,
      username: 'Unknown',
      blockedAt: new Date().toISOString(),
    }));
  }

  static isBlocked(playerId: string, targetId: string): boolean {
    return blockedPlayers.get(playerId)?.has(targetId) ?? false;
  }

  static reportPlayer(reporterId: string, targetId: string, reason: string, details: string): PlayerReport {
    const report: PlayerReport = {
      id: genId('report'),
      reporterId,
      targetId,
      reason,
      details,
      createdAt: new Date().toISOString(),
    };
    reports.push(report);
    return report;
  }

  // ========================================
  // Player Trading (T-1165 - T-1168)
  // ========================================

  static async createTradeRequest(
    fromPlayerId: string,
    toPlayerId: string,
    offeredResources: Partial<Record<ResourceType, number>>,
    offeredItems: Array<{ templateId: string; quantity: number }>,
    requestedResources: Partial<Record<ResourceType, number>>,
    requestedItems: Array<{ templateId: string; quantity: number }>,
  ): Promise<PlayerTradeRequest> {
    // Check active trade limit
    let activeCount = 0;
    for (const tr of tradeRequests.values()) {
      if (tr.fromPlayerId === fromPlayerId && tr.status === TradeRequestStatus.Pending) {
        activeCount++;
      }
    }
    if (activeCount >= MAX_ACTIVE_TRADES) throw new Error('Too many active trades');

    const fromPlayer = await prisma.player.findUnique({ where: { id: fromPlayerId } });
    const toPlayer = await prisma.player.findUnique({ where: { id: toPlayerId } });
    if (!fromPlayer || !toPlayer) throw new Error('Player not found');

    const trade: PlayerTradeRequest = {
      id: genId('trade'),
      fromPlayerId,
      fromUsername: fromPlayer.username,
      toPlayerId,
      toUsername: toPlayer.username,
      offeredResources,
      offeredItems,
      requestedResources,
      requestedItems,
      status: TradeRequestStatus.Pending,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + TRADE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
    };

    tradeRequests.set(trade.id, trade);

    SocialService.addNotification(toPlayerId, SocialNotificationType.TradeRequest,
      'Trade Request', `${fromPlayer.username} wants to trade with you`, { tradeId: trade.id });

    return trade;
  }

  static async acceptTrade(tradeId: string, playerId: string): Promise<PlayerTradeRequest> {
    const trade = tradeRequests.get(tradeId);
    if (!trade || trade.toPlayerId !== playerId) throw new Error('Trade not found');
    if (trade.status !== TradeRequestStatus.Pending) throw new Error('Trade already processed');

    if (new Date(trade.expiresAt).getTime() < Date.now()) {
      trade.status = TradeRequestStatus.Expired;
      throw new Error('Trade has expired');
    }

    trade.status = TradeRequestStatus.Accepted;

    // Record in trade history
    const entry: TradeHistoryEntry = {
      id: trade.id,
      fromPlayerId: trade.fromPlayerId,
      fromUsername: trade.fromUsername,
      toPlayerId: trade.toPlayerId,
      toUsername: trade.toUsername,
      offeredResources: trade.offeredResources,
      requestedResources: trade.requestedResources,
      completedAt: new Date().toISOString(),
    };

    for (const pid of [trade.fromPlayerId, trade.toPlayerId]) {
      const history = tradeHistory.get(pid) ?? [];
      history.unshift(entry);
      tradeHistory.set(pid, history);
    }

    return trade;
  }

  static declineTrade(tradeId: string, playerId: string): void {
    const trade = tradeRequests.get(tradeId);
    if (!trade || trade.toPlayerId !== playerId) throw new Error('Trade not found');
    trade.status = TradeRequestStatus.Declined;
  }

  static getTradeRequests(playerId: string): PlayerTradeRequest[] {
    const trades: PlayerTradeRequest[] = [];
    for (const tr of tradeRequests.values()) {
      if (
        (tr.fromPlayerId === playerId || tr.toPlayerId === playerId) &&
        tr.status === TradeRequestStatus.Pending
      ) {
        trades.push(tr);
      }
    }
    return trades;
  }

  static getTradeHistory(playerId: string): TradeHistoryEntry[] {
    return tradeHistory.get(playerId) ?? [];
  }

  // ========================================
  // Gift System (T-1192, T-1193)
  // ========================================

  static async sendGift(
    fromPlayerId: string,
    toPlayerId: string,
    resources: Partial<Record<ResourceType, number>>,
    message: string,
  ): Promise<GiftEntry> {
    // Check daily limit
    const todayGifts = (giftLog.get(fromPlayerId) ?? []).filter((g) => {
      const giftDate = new Date(g.createdAt).toDateString();
      return giftDate === new Date().toDateString();
    });
    if (todayGifts.length >= GIFT_DAILY_LIMIT) throw new Error('Daily gift limit reached');

    // Validate amounts against max
    for (const [res, amount] of Object.entries(resources)) {
      const key = res as ResourceType;
      const max = GIFT_MAX_RESOURCES[key] ?? 0;
      if ((amount ?? 0) > max) throw new Error(`Gift amount exceeds maximum for ${key}`);
    }

    const fromPlayer = await prisma.player.findUnique({ where: { id: fromPlayerId } });
    const toPlayer = await prisma.player.findUnique({ where: { id: toPlayerId } });

    const gift: GiftEntry = {
      id: genId('gift'),
      fromPlayerId,
      fromUsername: fromPlayer?.username ?? 'Unknown',
      toPlayerId,
      toUsername: toPlayer?.username ?? 'Unknown',
      resources,
      message: message.slice(0, 200),
      createdAt: new Date().toISOString(),
      claimed: false,
    };

    const fromGifts = giftLog.get(fromPlayerId) ?? [];
    fromGifts.push(gift);
    giftLog.set(fromPlayerId, fromGifts);

    const toGifts = giftLog.get(toPlayerId) ?? [];
    toGifts.push(gift);
    giftLog.set(toPlayerId, toGifts);

    SocialService.addNotification(toPlayerId, SocialNotificationType.GiftReceived,
      'Gift Received', `${fromPlayer?.username} sent you a gift!`, { giftId: gift.id });

    return gift;
  }

  static getGiftHistory(playerId: string): GiftEntry[] {
    return giftLog.get(playerId) ?? [];
  }

  static claimGift(giftId: string, playerId: string): GiftEntry {
    const gifts = giftLog.get(playerId) ?? [];
    const gift = gifts.find((g) => g.id === giftId && g.toPlayerId === playerId);
    if (!gift) throw new Error('Gift not found');
    if (gift.claimed) throw new Error('Gift already claimed');
    gift.claimed = true;
    return gift;
  }

  // ========================================
  // Social Feed (T-1214)
  // ========================================

  static addFeedEntry(playerId: string, username: string, type: string, message: string, data: Record<string, unknown> = {}): void {
    socialFeed.unshift({
      id: genId('feed'),
      playerId,
      username,
      type,
      message,
      data,
      createdAt: new Date().toISOString(),
    });
    // Keep feed manageable
    if (socialFeed.length > 1000) socialFeed.splice(1000);
  }

  static getSocialFeed(playerId: string, limit: number = 50): SocialFeedEntry[] {
    // Return feed for friends and alliance members
    const friendIds = friendLists.get(playerId) ?? new Set();
    return socialFeed
      .filter((e) => friendIds.has(e.playerId) || e.playerId === playerId)
      .slice(0, limit);
  }

  // ========================================
  // Notifications (T-1191)
  // ========================================

  static addNotification(
    playerId: string,
    type: SocialNotificationType,
    title: string,
    message: string,
    data: Record<string, unknown> = {},
  ): void {
    // Check preferences
    const prefs = notificationPrefs.get(playerId);
    if (prefs && prefs[type] === false) return;

    const notif: SocialNotification = {
      id: genId('notif'),
      playerId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: new Date().toISOString(),
    };

    const list = notifications.get(playerId) ?? [];
    list.unshift(notif);
    if (list.length > 100) list.splice(100);
    notifications.set(playerId, list);
  }

  static getNotifications(playerId: string): SocialNotification[] {
    return notifications.get(playerId) ?? [];
  }

  static markNotificationRead(notifId: string, playerId: string): void {
    const list = notifications.get(playerId) ?? [];
    const notif = list.find((n) => n.id === notifId);
    if (notif) notif.read = true;
  }

  static markAllNotificationsRead(playerId: string): void {
    const list = notifications.get(playerId) ?? [];
    for (const n of list) n.read = true;
  }

  static setNotificationPrefs(playerId: string, prefs: SocialNotificationPrefs): void {
    notificationPrefs.set(playerId, prefs);
  }

  static getNotificationPrefs(playerId: string): SocialNotificationPrefs {
    return notificationPrefs.get(playerId) ?? {
      [SocialNotificationType.FriendOnline]: true,
      [SocialNotificationType.FriendRequest]: true,
      [SocialNotificationType.TradeRequest]: true,
      [SocialNotificationType.AllianceInvite]: true,
      [SocialNotificationType.WarDeclared]: true,
      [SocialNotificationType.GiftReceived]: true,
      [SocialNotificationType.ChatMention]: true,
      [SocialNotificationType.RankChange]: true,
      [SocialNotificationType.WorldBoss]: true,
      [SocialNotificationType.AllianceEvent]: true,
    };
  }

  // ========================================
  // Follow System (T-1239)
  // ========================================

  static followPlayer(followerId: string, targetId: string): void {
    if (!followers.has(targetId)) followers.set(targetId, new Set());
    followers.get(targetId)!.add(followerId);
  }

  static unfollowPlayer(followerId: string, targetId: string): void {
    followers.get(targetId)?.delete(followerId);
  }

  static getFollowers(playerId: string): FollowEntry[] {
    const fSet = followers.get(playerId);
    if (!fSet) return [];
    return Array.from(fSet).map((id) => ({
      playerId: id,
      username: 'Unknown',
      guildName: 'Unknown',
      followedAt: new Date().toISOString(),
    }));
  }

  static getFollowing(playerId: string): FollowEntry[] {
    const following: FollowEntry[] = [];
    for (const [targetId, fSet] of followers.entries()) {
      if (fSet.has(playerId)) {
        following.push({
          playerId: targetId,
          username: 'Unknown',
          guildName: 'Unknown',
          followedAt: new Date().toISOString(),
        });
      }
    }
    return following;
  }

  // ========================================
  // Mentorship (T-1202, T-1203)
  // ========================================

  static async createMentorship(mentorId: string, menteeId: string): Promise<MentorshipLink> {
    const mentor = await prisma.player.findUnique({ where: { id: mentorId } });
    const mentee = await prisma.player.findUnique({ where: { id: menteeId } });
    if (!mentor || !mentee) throw new Error('Player not found');

    const link: MentorshipLink = {
      id: genId('mentor'),
      mentorId,
      mentorUsername: mentor.username,
      menteeId,
      menteeUsername: mentee.username,
      startedAt: new Date().toISOString(),
      mentorXpEarned: 0,
      menteeLevel: 1,
    };
    mentorships.set(link.id, link);
    return link;
  }

  static awardMentorXP(mentorshipId: string, menteeLevelsGained: number): void {
    const link = mentorships.get(mentorshipId);
    if (!link) return;
    link.mentorXpEarned += menteeLevelsGained * MENTORSHIP_XP_PER_LEVEL;
    link.menteeLevel += menteeLevelsGained;
  }

  static getMentorships(playerId: string): MentorshipLink[] {
    const links: MentorshipLink[] = [];
    for (const link of mentorships.values()) {
      if (link.mentorId === playerId || link.menteeId === playerId) {
        links.push(link);
      }
    }
    return links;
  }

  // ========================================
  // Social Achievements (T-1197)
  // ========================================

  static checkSocialAchievements(playerId: string): string[] {
    const unlocked: string[] = [];
    const friends = friendLists.get(playerId)?.size ?? 0;
    const trades = (tradeHistory.get(playerId) ?? []).length;
    const gifts = (giftLog.get(playerId) ?? []).filter((g) => g.fromPlayerId === playerId).length;

    for (const ach of SOCIAL_ACHIEVEMENTS) {
      let current = 0;
      switch (ach.type) {
        case 'friends': current = friends; break;
        case 'trades': current = trades; break;
        case 'gifts': current = gifts; break;
      }
      if (current >= ach.requirement) {
        unlocked.push(ach.id);
      }
    }
    return unlocked;
  }

  // ========================================
  // World Boss (T-1205, T-1206, T-1207)
  // ========================================

  static createWorldBoss(
    bossName: string,
    totalHP: number,
    durationHours: number,
    rewards: Partial<Record<ResourceType, number>>,
  ): WorldBossEvent {
    const boss: WorldBossEvent = {
      id: genId('boss'),
      bossName,
      totalHP,
      currentHP: totalHP,
      contributors: [],
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
      defeated: false,
      rewards,
    };
    worldBosses.set(boss.id, boss);
    return boss;
  }

  static attackWorldBoss(bossId: string, playerId: string, allianceId: string | null, damage: number): WorldBossEvent {
    const boss = worldBosses.get(bossId);
    if (!boss) throw new Error('World boss not found');
    if (boss.defeated) throw new Error('World boss already defeated');

    let contributor = boss.contributors.find((c) => c.playerId === playerId);
    if (!contributor) {
      contributor = { playerId, username: 'Unknown', allianceId, damage: 0, hits: 0 };
      boss.contributors.push(contributor);
    }
    contributor.damage += damage;
    contributor.hits++;

    boss.currentHP = Math.max(0, boss.currentHP - damage);
    if (boss.currentHP <= 0) {
      boss.defeated = true;
    }

    return boss;
  }

  static getWorldBosses(): WorldBossEvent[] {
    return Array.from(worldBosses.values());
  }

  static getWorldBossRewards(bossId: string): Array<{ playerId: string; rewards: Partial<Record<ResourceType, number>> }> {
    const boss = worldBosses.get(bossId);
    if (!boss || !boss.defeated) return [];

    const totalDamage = boss.contributors.reduce((sum, c) => sum + c.damage, 0);
    return boss.contributors.map((c) => {
      const share = totalDamage > 0 ? c.damage / totalDamage : 0;
      const rewards: Partial<Record<ResourceType, number>> = {};
      for (const [res, amt] of Object.entries(boss.rewards)) {
        rewards[res as ResourceType] = Math.floor((amt ?? 0) * share);
      }
      return { playerId: c.playerId, rewards };
    });
  }

  // ========================================
  // Seasons (T-1230, T-1231)
  // ========================================

  static createSeason(
    name: string,
    durationDays: number,
    rewardTrack: SeasonRewardTier[],
  ): MultiplayerSeason {
    const season: MultiplayerSeason = {
      id: genId('season'),
      name,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
      rewardTrack,
      currentTier: 0,
    };
    seasons.set(season.id, season);
    return season;
  }

  static getActiveSeason(): MultiplayerSeason | null {
    for (const season of seasons.values()) {
      if (new Date(season.endsAt).getTime() > Date.now()) return season;
    }
    return null;
  }

  // ========================================
  // Anti-Cheat (T-1220)
  // ========================================

  static validateAction(
    action: string,
    playerId: string,
    data: Record<string, unknown>,
  ): AntiCheatValidation {
    // Basic validation checks
    const validation: AntiCheatValidation = {
      action,
      playerId,
      valid: true,
      reason: 'OK',
      timestamp: new Date().toISOString(),
    };

    // Check for impossible resource amounts
    if (data.resourceAmount && typeof data.resourceAmount === 'number') {
      if (data.resourceAmount > 100000) {
        validation.valid = false;
        validation.reason = 'Resource amount exceeds maximum allowed';
      }
      if (data.resourceAmount < 0) {
        validation.valid = false;
        validation.reason = 'Negative resource amounts not allowed';
      }
    }

    // Check for action frequency
    // In real impl, track action timestamps per player
    return validation;
  }

  // ========================================
  // Referral System (T-1218)
  // ========================================

  static async createReferral(referrerId: string, newPlayerId: string): Promise<void> {
    SocialService.addFeedEntry(referrerId, 'Unknown', 'referral',
      'Invited a new player to the game', { newPlayerId });
  }

  // ========================================
  // Helpers
  // ========================================

  static filterProfanity(text: string): string {
    let filtered = text;
    for (const word of PROFANITY_WORDS) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      filtered = filtered.replace(regex, '***');
    }
    return filtered;
  }

  private static isSpam(senderId: string, content: string): boolean {
    // Check for repeated messages
    const key = `spam_${senderId}`;
    const timestamps = chatRateLimits.get(key) ?? [];
    const now = Date.now();
    const recent = timestamps.filter((t) => t > now - 5000);
    if (recent.length >= 5) return true;
    recent.push(now);
    chatRateLimits.set(key, recent);
    return false;
  }

  // ========================================
  // Trade Fair (T-1233)
  // ========================================

  static createTradeFair(
    name: string,
    durationHours: number,
    bonusMultiplier: number,
  ): { id: string; name: string; startsAt: string; endsAt: string; bonusMultiplier: number } {
    const fair = {
      id: genId('fair'),
      name,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
      participants: [] as Array<{ allianceId: string; allianceName: string; offerings: Partial<Resources> }>,
      bonusMultiplier,
    };
    return fair;
  }

  // ========================================
  // Spectator Mode (T-1216)
  // ========================================

  static canSpectate(playerId: string, targetPlayerId: string): boolean {
    // Can spectate if friends or in same alliance
    const friends = friendLists.get(playerId);
    if (friends?.has(targetPlayerId)) return true;
    return false;
  }
}
