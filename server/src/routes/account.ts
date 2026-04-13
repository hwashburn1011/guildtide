import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All account routes require authentication (except password reset)
router.use(authMiddleware);

// ---- Change Password (T-0122) ----
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'validation', message: 'Current password and new password are required' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'validation', message: 'New password must be at least 8 characters' });
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      res.status(400).json({ error: 'validation', message: 'Password must contain at least one uppercase letter and one number' });
      return;
    }

    const player = await prisma.player.findUnique({ where: { id: req.playerId! } });
    if (!player) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, player.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'auth', message: 'Current password is incorrect' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.player.update({
      where: { id: req.playerId! },
      data: { passwordHash },
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- Change Email (T-0123) ----
router.post('/change-email', async (req: Request, res: Response) => {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) {
      res.status(400).json({ error: 'validation', message: 'New email and password are required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      res.status(400).json({ error: 'validation', message: 'Invalid email format' });
      return;
    }

    const player = await prisma.player.findUnique({ where: { id: req.playerId! } });
    if (!player) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }

    const valid = await bcrypt.compare(password, player.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'auth', message: 'Password is incorrect' });
      return;
    }

    const existing = await prisma.player.findUnique({ where: { email: newEmail } });
    if (existing) {
      res.status(409).json({ error: 'conflict', message: 'Email already in use' });
      return;
    }

    // In production, send verification email. For now, update directly.
    const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    console.log(`[EMAIL STUB] Verification code for ${newEmail}: ${verificationCode}`);

    await prisma.player.update({
      where: { id: req.playerId! },
      data: { email: newEmail },
    });

    res.json({ success: true, message: 'Email updated successfully' });
  } catch (err) {
    console.error('Change email error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- Update Profile (T-0125, T-0128) ----
router.post('/profile', async (req: Request, res: Response) => {
  try {
    const { username, bio, avatarUrl } = req.body;
    const data: Record<string, string> = {};

    if (username !== undefined) {
      if (!username || username.length < 3 || username.length > 20) {
        res.status(400).json({ error: 'validation', message: 'Username must be 3-20 characters' });
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        res.status(400).json({ error: 'validation', message: 'Username can only contain letters, numbers, and underscores' });
        return;
      }
      const existing = await prisma.player.findFirst({
        where: { username, id: { not: req.playerId! } },
      });
      if (existing) {
        res.status(409).json({ error: 'conflict', message: 'Username already taken' });
        return;
      }
      data.username = username;
    }

    if (bio !== undefined) {
      if (bio.length > 200) {
        res.status(400).json({ error: 'validation', message: 'Bio must be 200 characters or fewer' });
        return;
      }
      data.bio = bio;
    }

    if (avatarUrl !== undefined) {
      data.avatarUrl = avatarUrl;
    }

    const player = await prisma.player.update({
      where: { id: req.playerId! },
      data,
    });

    res.json({
      success: true,
      player: {
        id: player.id,
        email: player.email,
        username: player.username,
        bio: player.bio,
        avatarUrl: player.avatarUrl,
        regionId: player.regionId,
        createdAt: player.createdAt,
        lastLoginAt: player.lastLoginAt,
      },
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- Get Profile (T-0125, T-0147) ----
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId! } });
    if (!player) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }

    res.json({
      id: player.id,
      email: player.email,
      username: player.username,
      bio: player.bio,
      avatarUrl: player.avatarUrl,
      regionId: player.regionId,
      isGuest: player.isGuest,
      createdAt: player.createdAt,
      lastLoginAt: player.lastLoginAt,
      notificationPrefs: JSON.parse(player.notificationPrefs),
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- Delete Account (T-0133) ----
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const { password, confirmation } = req.body;
    if (confirmation !== 'DELETE') {
      res.status(400).json({ error: 'validation', message: 'Type DELETE to confirm account deletion' });
      return;
    }

    const player = await prisma.player.findUnique({ where: { id: req.playerId! } });
    if (!player) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }

    if (!player.isGuest) {
      if (!password) {
        res.status(400).json({ error: 'validation', message: 'Password is required' });
        return;
      }
      const valid = await bcrypt.compare(password, player.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'auth', message: 'Password is incorrect' });
        return;
      }
    }

    // Delete all related data
    const guild = await prisma.guild.findUnique({ where: { playerId: player.id } });
    if (guild) {
      await prisma.expedition.deleteMany({ where: { guildId: guild.id } });
      await prisma.item.deleteMany({ where: { guildId: guild.id } });
      await prisma.building.deleteMany({ where: { guildId: guild.id } });
      await prisma.hero.deleteMany({ where: { guildId: guild.id } });
      await prisma.guild.delete({ where: { id: guild.id } });
    }
    await prisma.eventLog.deleteMany({ where: { guildId: player.id } });
    await prisma.player.delete({ where: { id: player.id } });

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- Export Data (T-0134) ----
router.get('/export', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.playerId! },
      include: {
        guild: {
          include: {
            heroes: true,
            buildings: true,
            inventory: true,
            expeditions: true,
          },
        },
      },
    });

    if (!player) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }

    const eventLogs = await prisma.eventLog.findMany({
      where: { guildId: player.id },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      player: {
        id: player.id,
        email: player.email,
        username: player.username,
        bio: player.bio,
        regionId: player.regionId,
        createdAt: player.createdAt,
        lastLoginAt: player.lastLoginAt,
      },
      guild: player.guild ? {
        ...player.guild,
        resources: JSON.parse(player.guild.resources),
        researchIds: JSON.parse(player.guild.researchIds),
        heroes: player.guild.heroes.map(h => ({
          ...h,
          traits: JSON.parse(h.traits),
          stats: JSON.parse(h.stats),
          equipment: JSON.parse(h.equipment),
        })),
        inventory: player.guild.inventory.map(i => ({
          ...i,
          metadata: i.metadata ? JSON.parse(i.metadata) : null,
        })),
        buildings: player.guild.buildings.map(b => ({
          ...b,
          metadata: b.metadata ? JSON.parse(b.metadata) : null,
        })),
        expeditions: player.guild.expeditions.map(e => ({
          ...e,
          heroIds: JSON.parse(e.heroIds),
          result: e.result ? JSON.parse(e.result) : null,
        })),
      } : null,
      eventLogs,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="guildtide-export-${player.username}-${Date.now()}.json"`);
    res.json(exportData);
  } catch (err) {
    console.error('Export data error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- Notification Preferences (T-0145) ----
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId! } });
    if (!player) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }
    res.json({ prefs: JSON.parse(player.notificationPrefs) });
  } catch (err) {
    console.error('Get notification prefs error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

router.post('/notifications', async (req: Request, res: Response) => {
  try {
    const { prefs } = req.body;
    if (!prefs || typeof prefs !== 'object') {
      res.status(400).json({ error: 'validation', message: 'Notification preferences object is required' });
      return;
    }

    await prisma.player.update({
      where: { id: req.playerId! },
      data: { notificationPrefs: JSON.stringify(prefs) },
    });

    res.json({ success: true, prefs });
  } catch (err) {
    console.error('Update notification prefs error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as accountRouter };
