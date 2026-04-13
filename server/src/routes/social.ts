import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { SocialService } from '../services/SocialService';
import {
  PlayerPresenceStatus,
  ChatChannel,
  SocialNotificationType,
} from '../../../shared/src/enums';

const router = Router();
router.use(authMiddleware);

// ========================================
// Player Search & Profile
// ========================================

// Search players by username
router.get('/players/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const results = await SocialService.searchPlayers(query);
    res.json(results);
  } catch (err) {
    console.error('Player search error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get player public profile
router.get('/players/:playerId/profile', async (req: Request, res: Response) => {
  try {
    const profile = await SocialService.getPlayerProfile(req.params.playerId);
    if (!profile) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }
    res.json(profile);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get player card (shareable)
router.get('/players/:playerId/card', async (req: Request, res: Response) => {
  try {
    const card = await SocialService.getPlayerCard(req.params.playerId);
    if (!card) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }
    res.json(card);
  } catch (err) {
    console.error('Get player card error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Compare two players
router.get('/players/compare/:playerAId/:playerBId', async (req: Request, res: Response) => {
  try {
    const comparison = await SocialService.compareProfiles(
      req.params.playerAId,
      req.params.playerBId,
    );
    if (!comparison) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }
    res.json(comparison);
  } catch (err) {
    console.error('Compare profiles error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Set player status message
router.put('/players/status', (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    SocialService.setStatusMessage(req.playerId!, message ?? '');
    res.json({ success: true });
  } catch (err) {
    console.error('Set status error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Set player presence
router.put('/presence', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    SocialService.setPresence(req.playerId!, '', status ?? PlayerPresenceStatus.Online);
    res.json({ success: true });
  } catch (err) {
    console.error('Set presence error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Friend System
// ========================================

// Get friend list
router.get('/friends', async (req: Request, res: Response) => {
  try {
    const friends = await SocialService.getFriendList(req.playerId!);
    res.json(friends);
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Send friend request
router.post('/friends/request', async (req: Request, res: Response) => {
  try {
    const { toPlayerId } = req.body;
    const request = await SocialService.sendFriendRequest(req.playerId!, toPlayerId);
    res.json(request);
  } catch (err: any) {
    console.error('Send friend request error:', err);
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get pending friend requests
router.get('/friends/requests', (req: Request, res: Response) => {
  try {
    const requests = SocialService.getPendingFriendRequests(req.playerId!);
    res.json(requests);
  } catch (err) {
    console.error('Get friend requests error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Accept friend request
router.post('/friends/request/:requestId/accept', (req: Request, res: Response) => {
  try {
    SocialService.acceptFriendRequest(req.params.requestId, req.playerId!);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Decline friend request
router.post('/friends/request/:requestId/decline', (req: Request, res: Response) => {
  try {
    SocialService.declineFriendRequest(req.params.requestId, req.playerId!);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Remove friend
router.delete('/friends/:friendId', (req: Request, res: Response) => {
  try {
    SocialService.removeFriend(req.playerId!, req.params.friendId);
    res.json({ success: true });
  } catch (err) {
    console.error('Remove friend error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get friend activity feed
router.get('/friends/feed', (req: Request, res: Response) => {
  try {
    const feed = SocialService.getFriendActivityFeed(req.playerId!);
    res.json(feed);
  } catch (err) {
    console.error('Get friend feed error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Chat System
// ========================================

// Send chat message
router.post('/chat/message', async (req: Request, res: Response) => {
  try {
    const { channel, channelId, content } = req.body;
    const message = await SocialService.sendMessage(channel, channelId, req.playerId!, content);
    res.json(message);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get chat messages
router.get('/chat/:channel/:channelId', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string;
    const messages = SocialService.getMessages(
      req.params.channel as ChatChannel,
      req.params.channelId,
      limit,
      before,
    );
    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Add reaction to message
router.post('/chat/reaction', (req: Request, res: Response) => {
  try {
    const { messageId, channel, channelId, emoji } = req.body;
    SocialService.addReaction(messageId, channel, channelId, req.playerId!, emoji);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Share image in chat
router.post('/chat/image', (req: Request, res: Response) => {
  try {
    const { channel, channelId, imageUrl } = req.body;
    const message = SocialService.shareImage(channel, channelId, req.playerId!, imageUrl);
    res.json(message);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get private message conversations
router.get('/chat/conversations', (req: Request, res: Response) => {
  try {
    const convos = SocialService.getConversations(req.playerId!);
    res.json(convos);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Block & Report
// ========================================

// Block player
router.post('/block/:targetId', (req: Request, res: Response) => {
  try {
    SocialService.blockPlayer(req.playerId!, req.params.targetId);
    res.json({ success: true });
  } catch (err) {
    console.error('Block player error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Unblock player
router.delete('/block/:targetId', (req: Request, res: Response) => {
  try {
    SocialService.unblockPlayer(req.playerId!, req.params.targetId);
    res.json({ success: true });
  } catch (err) {
    console.error('Unblock player error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get blocked players
router.get('/blocked', (req: Request, res: Response) => {
  try {
    const blocked = SocialService.getBlockedPlayers(req.playerId!);
    res.json(blocked);
  } catch (err) {
    console.error('Get blocked error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Report player
router.post('/report', (req: Request, res: Response) => {
  try {
    const { targetId, reason, details } = req.body;
    const report = SocialService.reportPlayer(req.playerId!, targetId, reason, details);
    res.json(report);
  } catch (err) {
    console.error('Report player error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Trading
// ========================================

// Create trade request
router.post('/trade', async (req: Request, res: Response) => {
  try {
    const { toPlayerId, offeredResources, offeredItems, requestedResources, requestedItems } = req.body;
    const trade = await SocialService.createTradeRequest(
      req.playerId!, toPlayerId,
      offeredResources ?? {}, offeredItems ?? [],
      requestedResources ?? {}, requestedItems ?? [],
    );
    res.json(trade);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Accept trade
router.post('/trade/:tradeId/accept', async (req: Request, res: Response) => {
  try {
    const trade = await SocialService.acceptTrade(req.params.tradeId, req.playerId!);
    res.json(trade);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Decline trade
router.post('/trade/:tradeId/decline', (req: Request, res: Response) => {
  try {
    SocialService.declineTrade(req.params.tradeId, req.playerId!);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get active trade requests
router.get('/trades', (req: Request, res: Response) => {
  try {
    const trades = SocialService.getTradeRequests(req.playerId!);
    res.json(trades);
  } catch (err) {
    console.error('Get trades error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get trade history
router.get('/trades/history', (req: Request, res: Response) => {
  try {
    const history = SocialService.getTradeHistory(req.playerId!);
    res.json(history);
  } catch (err) {
    console.error('Get trade history error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Gifts
// ========================================

// Send gift
router.post('/gift', async (req: Request, res: Response) => {
  try {
    const { toPlayerId, resources, message } = req.body;
    const gift = await SocialService.sendGift(req.playerId!, toPlayerId, resources ?? {}, message ?? '');
    res.json(gift);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get gift history
router.get('/gifts', (req: Request, res: Response) => {
  try {
    const gifts = SocialService.getGiftHistory(req.playerId!);
    res.json(gifts);
  } catch (err) {
    console.error('Get gifts error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Claim gift
router.post('/gift/:giftId/claim', (req: Request, res: Response) => {
  try {
    const gift = SocialService.claimGift(req.params.giftId, req.playerId!);
    res.json(gift);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// ========================================
// Social Feed
// ========================================

// Get social feed
router.get('/feed', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const feed = SocialService.getSocialFeed(req.playerId!, limit);
    res.json(feed);
  } catch (err) {
    console.error('Get feed error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Notifications
// ========================================

// Get notifications
router.get('/notifications', (req: Request, res: Response) => {
  try {
    const notifs = SocialService.getNotifications(req.playerId!);
    res.json(notifs);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Mark notification as read
router.post('/notifications/:notifId/read', (req: Request, res: Response) => {
  try {
    SocialService.markNotificationRead(req.params.notifId, req.playerId!);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Mark all notifications as read
router.post('/notifications/read-all', (req: Request, res: Response) => {
  try {
    SocialService.markAllNotificationsRead(req.playerId!);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get/Set notification preferences
router.get('/notifications/prefs', (req: Request, res: Response) => {
  try {
    const prefs = SocialService.getNotificationPrefs(req.playerId!);
    res.json(prefs);
  } catch (err) {
    console.error('Get notification prefs error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

router.put('/notifications/prefs', (req: Request, res: Response) => {
  try {
    SocialService.setNotificationPrefs(req.playerId!, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('Set notification prefs error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Follow System
// ========================================

// Follow player
router.post('/follow/:targetId', (req: Request, res: Response) => {
  try {
    SocialService.followPlayer(req.playerId!, req.params.targetId);
    res.json({ success: true });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Unfollow player
router.delete('/follow/:targetId', (req: Request, res: Response) => {
  try {
    SocialService.unfollowPlayer(req.playerId!, req.params.targetId);
    res.json({ success: true });
  } catch (err) {
    console.error('Unfollow error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get followers
router.get('/followers', (req: Request, res: Response) => {
  try {
    const list = SocialService.getFollowers(req.playerId!);
    res.json(list);
  } catch (err) {
    console.error('Get followers error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get following
router.get('/following', (req: Request, res: Response) => {
  try {
    const list = SocialService.getFollowing(req.playerId!);
    res.json(list);
  } catch (err) {
    console.error('Get following error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Mentorship
// ========================================

// Create mentorship
router.post('/mentorship', async (req: Request, res: Response) => {
  try {
    const { menteeId } = req.body;
    const link = await SocialService.createMentorship(req.playerId!, menteeId);
    res.json(link);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get mentorships
router.get('/mentorships', (req: Request, res: Response) => {
  try {
    const links = SocialService.getMentorships(req.playerId!);
    res.json(links);
  } catch (err) {
    console.error('Get mentorships error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Social Achievements
// ========================================

// Get social achievements
router.get('/achievements', (req: Request, res: Response) => {
  try {
    const unlocked = SocialService.checkSocialAchievements(req.playerId!);
    res.json({ unlocked });
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// World Boss
// ========================================

// Get world bosses
router.get('/world-boss', (req: Request, res: Response) => {
  try {
    const bosses = SocialService.getWorldBosses();
    res.json(bosses);
  } catch (err) {
    console.error('Get world bosses error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Attack world boss
router.post('/world-boss/:bossId/attack', (req: Request, res: Response) => {
  try {
    const { damage, allianceId } = req.body;
    const boss = SocialService.attackWorldBoss(
      req.params.bossId, req.playerId!, allianceId ?? null, damage ?? 100,
    );
    res.json(boss);
  } catch (err: any) {
    res.status(400).json({ error: 'validation', message: err.message });
  }
});

// Get world boss rewards
router.get('/world-boss/:bossId/rewards', (req: Request, res: Response) => {
  try {
    const rewards = SocialService.getWorldBossRewards(req.params.bossId);
    res.json(rewards);
  } catch (err) {
    console.error('Get boss rewards error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Seasons
// ========================================

// Get active season
router.get('/season', (req: Request, res: Response) => {
  try {
    const season = SocialService.getActiveSeason();
    res.json(season);
  } catch (err) {
    console.error('Get season error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ========================================
// Anti-Cheat
// ========================================

// Validate action
router.post('/validate', (req: Request, res: Response) => {
  try {
    const { action, data } = req.body;
    const result = SocialService.validateAction(action, req.playerId!, data ?? {});
    res.json(result);
  } catch (err) {
    console.error('Validate error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Spectator check
router.get('/spectate/:targetId', (req: Request, res: Response) => {
  try {
    const canSpectate = SocialService.canSpectate(req.playerId!, req.params.targetId);
    res.json({ canSpectate });
  } catch (err) {
    console.error('Spectate check error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export const socialRouter = router;
