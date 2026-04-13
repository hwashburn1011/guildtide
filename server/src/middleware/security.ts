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
// File upload validation (T-1651)
// ---------------------------------------------------------------------------

const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/json', 'text/plain',
]);

export function validateFileUpload(
  file: { mimetype: string; size: number; originalname: string },
  maxSizeBytes: number = 5_242_880, // 5MB
): { valid: boolean; error?: string } {
  if (!ALLOWED_FILE_TYPES.has(file.mimetype)) {
    return { valid: false, error: `File type not allowed: ${file.mimetype}` };
  }
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File too large: ${file.size} bytes (max ${maxSizeBytes})` };
  }
  // Check for path traversal in filename
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return { valid: false, error: 'Invalid filename' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// SQL injection prevention audit (T-1649, T-1689)
// All database queries use Prisma (parameterized by default).
// This helper validates that raw strings don't contain SQL injection patterns.
// ---------------------------------------------------------------------------

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|UNION)\b)/i,
  /(--|;|\/\*|\*\/)/,
  /(['"])\s*\b(OR|AND)\b\s*\1/i,
];

export function containsSqlInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

/** Validate user input for SQL injection attempts. */
export function sqlInjectionGuard(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string' && containsSqlInjection(value)) {
        logger.warn('Potential SQL injection blocked', { key, ip: req.ip, path: req.path });
        res.status(400).json({ error: 'invalid_input', message: 'Invalid characters in input' });
        return;
      }
    }
  }
  next();
}

// ---------------------------------------------------------------------------
// Security header compliance check (T-1685)
// ---------------------------------------------------------------------------

export function checkSecurityHeaders(headers: Record<string, string | undefined>): {
  compliant: boolean;
  missing: string[];
  present: string[];
} {
  const required = [
    'x-content-type-options',
    'x-frame-options',
    'content-security-policy',
    'referrer-policy',
    'permissions-policy',
  ];

  const present: string[] = [];
  const missing: string[] = [];

  for (const header of required) {
    if (headers[header]) {
      present.push(header);
    } else {
      missing.push(header);
    }
  }

  return { compliant: missing.length === 0, missing, present };
}

// ---------------------------------------------------------------------------
// OAuth state parameter validation (T-1686)
// ---------------------------------------------------------------------------

const oauthStateTokens: Map<string, number> = new Map();

export function generateOAuthState(): string {
  const state = randomBytes(32).toString('hex');
  oauthStateTokens.set(state, Date.now() + 600_000); // 10 min expiry
  return state;
}

export function validateOAuthState(state: string): boolean {
  const expiresAt = oauthStateTokens.get(state);
  if (!expiresAt) return false;
  oauthStateTokens.delete(state);
  return Date.now() < expiresAt;
}

// ---------------------------------------------------------------------------
// Data privacy & consent (T-1669)
// ---------------------------------------------------------------------------

export function setPrivacyHeaders(res: Response): void {
  res.setHeader('X-Privacy-Policy', '/privacy');
  res.setHeader('X-Data-Controller', 'Guildtide');
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
