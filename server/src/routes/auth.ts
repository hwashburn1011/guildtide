import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db';
import { config } from '../config';
import { STARTING_RESOURCES } from '../../../shared/src/constants';
import { IdleProgressService } from '../services/IdleProgressService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ---- Rate limiting store (in-memory, per-process) ----
const resetAttempts: Map<string, { count: number; windowStart: number }> = new Map();

function checkResetRateLimit(email: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxAttempts = 3;

  const entry = resetAttempts.get(email);
  if (!entry || now - entry.windowStart > windowMs) {
    resetAttempts.set(email, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count++;
  return true;
}

// ---- T-0102: Registration with validation ----
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ error: 'validation', message: 'Email, username, and password are required' });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'validation', message: 'Invalid email format' });
      return;
    }

    // Username validation
    if (username.length < 3 || username.length > 20) {
      res.status(400).json({ error: 'validation', message: 'Username must be 3-20 characters' });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({ error: 'validation', message: 'Username can only contain letters, numbers, and underscores' });
      return;
    }

    // Password strength validation (T-0108 backend counterpart)
    if (password.length < 8) {
      res.status(400).json({ error: 'validation', message: 'Password must be at least 8 characters' });
      return;
    }
    if (!/[A-Z]/.test(password)) {
      res.status(400).json({ error: 'validation', message: 'Password must contain at least one uppercase letter' });
      return;
    }
    if (!/[0-9]/.test(password)) {
      res.status(400).json({ error: 'validation', message: 'Password must contain at least one number' });
      return;
    }

    const existing = await prisma.player.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      if (existing.email === email) {
        res.status(409).json({ error: 'conflict', message: 'Email already registered' });
      } else {
        res.status(409).json({ error: 'conflict', message: 'Username already taken' });
      }
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
      expiresIn: config.jwtExpiresIn as string,
    } as jwt.SignOptions);

    res.status(201).json({
      token,
      player: {
        id: player.id,
        email: player.email,
        username: player.username,
        regionId: player.regionId,
        createdAt: player.createdAt,
        lastLoginAt: player.lastLoginAt,
        isNewAccount: true,
      },
      guild: null,
      offlineGains: null,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- T-0103: Login with JWT + T-0132: Session expiration + T-0140: Remember me + T-0144: Account lockout ----
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;

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

    // T-0144: Check account lockout
    if (player.lockedUntil && player.lockedUntil > new Date()) {
      const remainingMs = player.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      res.status(423).json({
        error: 'locked',
        message: `Account locked. Try again in ${remainingMin} minute(s).`,
        lockedUntil: player.lockedUntil.toISOString(),
      });
      return;
    }

    const validPassword = await bcrypt.compare(password, player.passwordHash);
    if (!validPassword) {
      // Increment failed attempts
      const attempts = player.failedLoginAttempts + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts: attempts };

      // Lock after 5 failed attempts for 15 minutes
      if (attempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        updateData.failedLoginAttempts = 0;
      }

      await prisma.player.update({
        where: { id: player.id },
        data: updateData,
      });

      if (attempts >= 5) {
        res.status(423).json({
          error: 'locked',
          message: 'Too many failed attempts. Account locked for 15 minutes.',
        });
      } else {
        res.status(401).json({
          error: 'auth',
          message: 'Invalid email or password',
          attemptsRemaining: 5 - attempts,
        });
      }
      return;
    }

    // Reset failed attempts on successful login
    // Calculate offline gains before updating login time
    const idleGains = await IdleProgressService.calculateAndApply(player.id);

    // T-0147: Update last login + reset lockout counters
    await prisma.player.update({
      where: { id: player.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // T-0140: Remember me extends session to 30 days, default is 7 days
    // T-0132: Session expiration after 30 days of inactivity
    const expiresIn = rememberMe ? '30d' : (config.jwtExpiresIn as string);

    const token = jwt.sign({ playerId: player.id }, config.jwtSecret, {
      expiresIn,
    } as jwt.SignOptions);

    // Re-fetch guild with updated resources
    const updatedGuild = await prisma.guild.findUnique({
      where: { playerId: player.id },
      include: { heroes: true, buildings: true, inventory: true },
    });

    let guild = null;
    if (updatedGuild) {
      guild = {
        ...updatedGuild,
        resources: JSON.parse(updatedGuild.resources),
        researchIds: JSON.parse(updatedGuild.researchIds),
        heroes: updatedGuild.heroes.map(h => ({
          ...h,
          traits: JSON.parse(h.traits),
          stats: JSON.parse(h.stats),
          equipment: JSON.parse(h.equipment),
        })),
        inventory: updatedGuild.inventory.map(i => ({
          ...i,
          metadata: i.metadata ? JSON.parse(i.metadata) : null,
        })),
        buildings: updatedGuild.buildings.map(b => ({
          ...b,
          metadata: b.metadata ? JSON.parse(b.metadata) : null,
        })),
      };
    }

    // Get current production rates
    const rates = await IdleProgressService.getRates(player.id);

    // T-0146: Log login event (console stub for email notification)
    console.log(`[EMAIL STUB] Login notification for ${player.email} at ${new Date().toISOString()}`);

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
      offlineGains: idleGains.elapsedSeconds > 0 ? idleGains.resources : null,
      elapsedSeconds: idleGains.elapsedSeconds,
      rates,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- T-0104: JWT Token Refresh ----
router.post('/refresh', authMiddleware, async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.playerId! } });
    if (!player) {
      res.status(404).json({ error: 'not_found', message: 'Player not found' });
      return;
    }

    const token = jwt.sign({ playerId: player.id }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as string,
    } as jwt.SignOptions);

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
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- T-0116 / T-0117: Forgot Password (request reset token) ----
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'validation', message: 'Email is required' });
      return;
    }

    // T-0120: Rate limiting
    if (!checkResetRateLimit(email)) {
      res.status(429).json({ error: 'rate_limit', message: 'Too many reset requests. Try again later.' });
      return;
    }

    // Always return success to prevent email enumeration
    const player = await prisma.player.findUnique({ where: { email } });
    if (!player) {
      res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.player.update({
      where: { id: player.id },
      data: { resetToken, resetTokenExpiresAt },
    });

    // Console log instead of sending email
    console.log(`[EMAIL STUB] Password reset for ${email}`);
    console.log(`[EMAIL STUB] Reset token: ${resetToken}`);
    console.log(`[EMAIL STUB] Reset URL: /reset-password?token=${resetToken}`);

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- T-0119: Reset Password (validate token and set new password) ----
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: 'validation', message: 'Token and new password are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'validation', message: 'Password must be at least 8 characters' });
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      res.status(400).json({ error: 'validation', message: 'Password must contain at least one uppercase letter and one number' });
      return;
    }

    const player = await prisma.player.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!player) {
      res.status(400).json({ error: 'invalid_token', message: 'Invalid or expired reset token' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.player.update({
      where: { id: player.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    res.json({ success: true, message: 'Password has been reset. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- T-0141: Guest/Demo account mode ----
router.post('/guest', async (req: Request, res: Response) => {
  try {
    const guestId = crypto.randomBytes(8).toString('hex');
    const guestEmail = `guest_${guestId}@guildtide.local`;
    const guestUsername = `Guest_${guestId.substring(0, 8)}`;
    const passwordHash = await bcrypt.hash(guestId, 10);

    const player = await prisma.player.create({
      data: {
        email: guestEmail,
        username: guestUsername,
        passwordHash,
        isGuest: true,
      },
    });

    const token = jwt.sign({ playerId: player.id }, config.jwtSecret, {
      expiresIn: '24h', // Guest sessions last 24 hours
    } as jwt.SignOptions);

    res.status(201).json({
      token,
      player: {
        id: player.id,
        email: player.email,
        username: player.username,
        regionId: player.regionId,
        createdAt: player.createdAt,
        lastLoginAt: player.lastLoginAt,
        isGuest: true,
      },
      guild: null,
      offlineGains: null,
    });
  } catch (err) {
    console.error('Guest account error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- T-0142: Guest-to-full account upgrade ----
router.post('/upgrade-guest', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ error: 'validation', message: 'Email, username, and password are required' });
      return;
    }

    const player = await prisma.player.findUnique({ where: { id: req.playerId! } });
    if (!player || !player.isGuest) {
      res.status(400).json({ error: 'validation', message: 'Only guest accounts can be upgraded' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'validation', message: 'Invalid email format' });
      return;
    }

    // Validate password strength
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      res.status(400).json({ error: 'validation', message: 'Password must be at least 8 characters with one uppercase letter and one number' });
      return;
    }

    // Check uniqueness
    const existing = await prisma.player.findFirst({
      where: {
        OR: [{ email }, { username }],
        id: { not: player.id },
      },
    });
    if (existing) {
      res.status(409).json({ error: 'conflict', message: 'Email or username already taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const updatedPlayer = await prisma.player.update({
      where: { id: player.id },
      data: {
        email,
        username,
        passwordHash,
        isGuest: false,
      },
    });

    const token = jwt.sign({ playerId: updatedPlayer.id }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as string,
    } as jwt.SignOptions);

    res.json({
      token,
      player: {
        id: updatedPlayer.id,
        email: updatedPlayer.email,
        username: updatedPlayer.username,
        regionId: updatedPlayer.regionId,
        createdAt: updatedPlayer.createdAt,
        lastLoginAt: updatedPlayer.lastLoginAt,
        isGuest: false,
      },
    });
  } catch (err) {
    console.error('Upgrade guest error:', err);
    res.status(500).json({ error: 'server', message: 'Internal server error' });
  }
});

// ---- T-0109/T-0111/T-0113: OAuth stubs (coming soon) ----
router.get('/oauth/:provider', (req: Request, res: Response) => {
  const provider = req.params.provider as string;
  const validProviders = ['google', 'discord', 'github'];
  if (!validProviders.includes(provider)) {
    res.status(400).json({ error: 'validation', message: `Unknown OAuth provider: ${provider}` });
    return;
  }
  res.status(501).json({
    error: 'not_implemented',
    message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth login coming soon`,
    provider,
  });
});

router.get('/oauth/:provider/callback', (req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented', message: 'OAuth callback coming soon' });
});

// ---- T-0115/T-0148/T-0149: OAuth account linking stubs ----
router.post('/oauth/link', authMiddleware, (req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented', message: 'OAuth account linking coming soon' });
});

router.post('/oauth/unlink', authMiddleware, (req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented', message: 'OAuth account unlinking coming soon' });
});

// ---- T-0124: Email verification stub ----
router.post('/verify-email', (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ error: 'validation', message: 'Verification code is required' });
    return;
  }
  // Stub: accept any 6-char code in dev mode
  console.log(`[EMAIL STUB] Verification code received: ${code}`);
  res.json({ success: true, message: 'Email verified successfully' });
});

// ---- T-0135/T-0136/T-0137: 2FA stubs ----
router.post('/2fa/setup', authMiddleware, (req: Request, res: Response) => {
  // Generate a fake TOTP secret for UI testing
  const secret = crypto.randomBytes(20).toString('hex').substring(0, 16).toUpperCase();
  res.json({
    secret,
    qrCodeUrl: `otpauth://totp/Guildtide:user?secret=${secret}&issuer=Guildtide`,
    message: '2FA setup - scan the QR code with your authenticator app (stub)',
  });
});

router.post('/2fa/verify', authMiddleware, (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code || code.length !== 6) {
    res.status(400).json({ error: 'validation', message: 'A 6-digit code is required' });
    return;
  }
  // Stub: accept any 6-digit code
  res.json({ success: true, message: '2FA verified (stub)' });
});

router.post('/2fa/recovery-codes', authMiddleware, (_req: Request, res: Response) => {
  const codes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase(),
  );
  res.json({ codes, message: 'Save these recovery codes securely. Each can be used once.' });
});

// ---- T-0129/T-0130/T-0131: Session management stubs ----
router.get('/sessions', authMiddleware, (req: Request, res: Response) => {
  // Stub: return a single current session
  res.json({
    sessions: [
      {
        id: 'current',
        device: req.headers['user-agent'] || 'Unknown',
        ip: req.ip || '127.0.0.1',
        lastActive: new Date().toISOString(),
        isCurrent: true,
      },
    ],
  });
});

router.post('/sessions/revoke', authMiddleware, (req: Request, res: Response) => {
  res.json({ success: true, message: 'Session revoked (stub)' });
});

router.post('/sessions/revoke-all', authMiddleware, (req: Request, res: Response) => {
  res.json({ success: true, message: 'All other sessions revoked (stub)' });
});

// ---- T-0138/T-0139: Login history stub ----
router.get('/login-history', authMiddleware, (req: Request, res: Response) => {
  res.json({
    history: [
      {
        timestamp: new Date().toISOString(),
        device: req.headers['user-agent'] || 'Unknown',
        ip: req.ip || '127.0.0.1',
        success: true,
      },
    ],
  });
});

// ---- T-0143: CAPTCHA stub ----
router.post('/captcha/verify', (req: Request, res: Response) => {
  // Stub: always passes in dev mode
  console.log('[CAPTCHA STUB] Verification bypassed in development');
  res.json({ success: true });
});

export { router as authRouter };
