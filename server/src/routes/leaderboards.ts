import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { LeaderboardService } from '../services/LeaderboardService';
import { LeaderboardCategory } from '../../../shared/src/enums';

const router = Router();
router.use(authMiddleware);

// Get leaderboard by category
router.get('/:category', async (req: Request, res: Response) => {
  try {
    const category = req.params.category as LeaderboardCategory;
    if (!Object.values(LeaderboardCategory).includes(category)) {
      res.status(400).json({ error: 'validation', message: 'Invalid leaderboard category' });
      return;
    }
    const period = (req.query.period as 'weekly' | 'alltime') ?? 'alltime';
    const board = await LeaderboardService.getLeaderboard(category, period, req.playerId!);
    res.json(board);
  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get all leaderboards for the current player
router.get('/', async (req: Request, res: Response) => {
  try {
    const boards = await LeaderboardService.getAllLeaderboards(req.playerId!);
    res.json(boards);
  } catch (err) {
    console.error('Get all leaderboards error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get player's rank in a category
router.get('/:category/my-rank', async (req: Request, res: Response) => {
  try {
    const category = req.params.category as LeaderboardCategory;
    const rank = await LeaderboardService.getPlayerRank(category, req.playerId!);
    res.json(rank);
  } catch (err) {
    console.error('Get player rank error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Search leaderboard
router.get('/:category/search', async (req: Request, res: Response) => {
  try {
    const category = req.params.category as LeaderboardCategory;
    const query = req.query.q as string;
    const results = await LeaderboardService.searchLeaderboard(category, query ?? '');
    res.json(results);
  } catch (err) {
    console.error('Search leaderboard error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Get rank change notifications
router.get('/my/rank-changes', (req: Request, res: Response) => {
  try {
    const changes = LeaderboardService.getRankChanges(req.playerId!);
    res.json(changes);
  } catch (err) {
    console.error('Get rank changes error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// Process weekly reset (admin endpoint)
router.post('/:category/weekly-reset', async (req: Request, res: Response) => {
  try {
    const category = req.params.category as LeaderboardCategory;
    const rewards = await LeaderboardService.processWeeklyReset(category);
    res.json(rewards);
  } catch (err) {
    console.error('Weekly reset error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export const leaderboardsRouter = router;
