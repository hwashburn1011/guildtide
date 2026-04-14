// ---------------------------------------------------------------------------
// Authentication & authorization middleware
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { config } from '../config';
import { auditService } from '../services/AuditService';

// ---------------------------------------------------------------------------
// Auth payload & types
// ---------------------------------------------------------------------------

export type UserRole = 'user' | 'mod' | 'admin';

export interface AuthPayload {
  playerId: string;
  role?: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      playerId?: string;
      playerRole?: UserRole;
    }
  }
}

// ---------------------------------------------------------------------------
// JWT authentication middleware (T-1655, T-1658)
// ---------------------------------------------------------------------------

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing auth token' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.playerId = payload.playerId;
    req.playerRole = payload.role ?? 'user';
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
}

// ---------------------------------------------------------------------------
// Role-based access control (T-1659, T-1660)
// ---------------------------------------------------------------------------

/**
 * Require a minimum role level to access an endpoint.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.playerRole || !roles.includes(req.playerRole)) {
      auditService.log('security.csrf_failure', {
        playerId: req.playerId,
        ip: req.ip,
        details: { requiredRoles: roles, actualRole: req.playerRole, path: req.path },
        severity: 'warning',
      });
      res.status(403).json({
        error: 'forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }
    next();
  };
}

/** Shorthand: require admin role. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRole('admin')(req, res, next);
}

// ---------------------------------------------------------------------------
// JWT token generation & refresh (T-1656)
// ---------------------------------------------------------------------------

export function generateTokens(playerId: string, role: UserRole = 'user') {
  const accessToken = jwt.sign(
    { playerId, role } as AuthPayload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as string & jwt.SignOptions['expiresIn'] },
  );

  const refreshToken = randomBytes(40).toString('hex');

  return { accessToken, refreshToken };
}

// ---------------------------------------------------------------------------
// Secure cookie flags (T-1657)
// ---------------------------------------------------------------------------

export function setSecureCookie(
  res: Response,
  name: string,
  value: string,
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000,
): void {
  res.cookie(name, value, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    maxAge: maxAgeMs,
    path: '/',
  });
}

// ---------------------------------------------------------------------------
// Secure session token generation (T-1654)
// ---------------------------------------------------------------------------

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------------
// Password complexity validation (T-1653)
// ---------------------------------------------------------------------------

export function validatePasswordComplexity(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (password.length > 128) errors.push('Password must be at most 128 characters');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number');
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// API key management (T-1668)
// ---------------------------------------------------------------------------

/** Hash an API key for secure storage. */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Generate a new API key. */
export function generateApiKey(): { key: string; hash: string } {
  const key = `guildtide_${randomBytes(24).toString('hex')}`;
  const hash = hashApiKey(key);
  return { key, hash };
}

/** Verify an API key against its stored hash. */
export function verifyApiKey(key: string, storedHash: string): boolean {
  return hashApiKey(key) === storedHash;
}

// ---------------------------------------------------------------------------
// Response sanitization (T-1688) — strip internal fields from responses
// ---------------------------------------------------------------------------

const INTERNAL_FIELDS = ['passwordHash', 'resetToken', 'resetTokenExpiresAt', 'lockedUntil', 'failedLoginAttempts'];

export function sanitizeResponse(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeResponse);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (INTERNAL_FIELDS.includes(key)) continue;
    sanitized[key] = typeof value === 'object' ? sanitizeResponse(value) : value;
  }
  return sanitized;
}

// ---------------------------------------------------------------------------
// Admin impersonation audit (T-1679)
// ---------------------------------------------------------------------------

export function impersonateMiddleware(req: Request, res: Response, next: NextFunction): void {
  const impersonateId = req.headers['x-impersonate-player'] as string | undefined;
  if (impersonateId && req.playerRole === 'admin') {
    auditService.log('admin.impersonate', {
      playerId: req.playerId,
      ip: req.ip,
      details: { impersonatedPlayerId: impersonateId },
      severity: 'warning',
    });
    req.playerId = impersonateId;
  }
  next();
}
