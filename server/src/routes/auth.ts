import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { STARTING_RESOURCES } from '../../../shared/src/constants.js';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ error: 'validation', message: 'Email, username, and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'validation', message: 'Password must be at least 6 characters' });
      return;
    }

    const existing = await prisma.player.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      res.status(409).json({ error: 'conflict', message: 'Email or username already taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const player = await prisma.player.create({
      data: {
        email,
        username,
        passwordHash,
      },
    });

    const token = jwt.sign({ playerId: player.id }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    res.status(201).json({
      token,
      player: {
        id: player.id,
        email: player.email,
        username: player.username,
        regionId: player.regionId,
        createdAt: player.createdAt,
        lastLoginAt: player.lastLoginAt,
      },
      guild: null,
      offlineGains: null,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'validation', message: 'Email and password are required' });
      return;
    }

    const player = await prisma.player.findUnique({
      where: { email },
      include: {
        guild: {
          include: {
            heroes: true,
            buildings: true,
            inventory: true,
          },
        },
      },
    });

    if (!player) {
      res.status(401).json({ error: 'auth', message: 'Invalid email or password' });
      return;
    }

    const validPassword = await bcrypt.compare(password, player.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'auth', message: 'Invalid email or password' });
      return;
    }

    // Update last login
    await prisma.player.update({
      where: { id: player.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign({ playerId: player.id }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    // Parse guild resources if guild exists
    let guild = null;
    if (player.guild) {
      guild = {
        ...player.guild,
        resources: JSON.parse(player.guild.resources),
        heroes: player.guild.heroes.map(h => ({
          ...h,
          traits: JSON.parse(h.traits),
          stats: JSON.parse(h.stats),
          equipment: JSON.parse(h.equipment),
        })),
      };
    }

    res.json({
      token,
      player: {
        id: player.id,
        email: player.email,
        username: player.username,
        regionId: player.regionId,
        createdAt: player.createdAt,
        lastLoginAt: player.lastLoginAt,
      },
      guild,
      offlineGains: null, // TODO: calculate offline gains
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

export { router as authRouter };
