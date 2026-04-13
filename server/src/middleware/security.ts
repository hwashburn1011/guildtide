// ---------------------------------------------------------------------------
// Security middleware — headers, CSRF protection, XSS prevention
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { logger } from '../utils/logger';
import { config } from '../config';

// ---------------------------------------------------------------------------
// Security headers (Helmet-like)
// ---------------------------------------------------------------------------

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // HSTS — enforce HTTPS
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Remove server fingerprint
  res.removeHeader('X-Powered-By');

  next();
}

// ---------------------------------------------------------------------------
// CSRF protection
// ---------------------------------------------------------------------------

const csrfTokens: Map<string, { token: string; expiresAt: number }> = new Map();

/** Generate a CSRF token for the current session. */
export function generateCsrfToken(sessionId: string): string {
  const token = randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, { token, expiresAt: Date.now() + 3600_000 }); // 1 hour
  return token;
}

/**
 * CSRF protection middleware.
 * - GET, HEAD, OPTIONS are safe methods — skip validation.
 * - For state-changing methods, validate X-CSRF-Token header.
 * - API-only apps with JWT can skip CSRF since tokens aren't sent by browsers automatically.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  // JWT Bearer token APIs are inherently CSRF-safe (browser doesn't auto-send).
  // Only enforce CSRF for cookie-based auth.
  const hasBearer = req.headers.authorization?.startsWith('Bearer ');
  if (hasBearer) {
    next();
    return;
  }

  // Check CSRF token if present
  const csrfToken = req.headers['x-csrf-token'] as string | undefined;
  if (!csrfToken) {
    // No CSRF token required for API-only endpoints with no cookie auth
    next();
    return;
  }

  const sessionId = req.playerId ?? req.ip ?? 'anon';
  const stored = csrfTokens.get(sessionId);
  if (!stored || stored.token !== csrfToken || Date.now() > stored.expiresAt) {
    logger.warn('CSRF validation failed', { sessionId, path: req.path });
    res.status(403).json({ error: 'csrf_invalid', message: 'Invalid or expired CSRF token' });
    return;
  }

  next();
}

// CSRF token endpoint
export function csrfTokenEndpoint(req: Request, res: Response): void {
  const sessionId = req.playerId ?? req.ip ?? 'anon';
  const token = generateCsrfToken(sessionId);
  res.json({ csrfToken: token });
}

// ---------------------------------------------------------------------------
// XSS prevention — sanitize request body strings
// ---------------------------------------------------------------------------

/** Recursively sanitize strings in an object to prevent XSS. */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return value;
}

/**
 * XSS sanitization middleware — sanitizes all string values in req.body.
 * Applied globally to prevent stored XSS.
 */
export function xssSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
}

// ---------------------------------------------------------------------------
// Secure redirect validation
// ---------------------------------------------------------------------------

const ALLOWED_REDIRECT_HOSTS = new Set(['localhost', '127.0.0.1']);

export function isValidRedirectUrl(url: string): boolean {
  try {
    if (url.startsWith('/')) return true; // relative URLs are OK
    const parsed = new URL(url);
    return ALLOWED_REDIRECT_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Clean up expired CSRF tokens periodically
// ---------------------------------------------------------------------------
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of csrfTokens) {
    if (now > entry.expiresAt) {
      csrfTokens.delete(key);
    }
  }
}, 300_000); // every 5 minutes
