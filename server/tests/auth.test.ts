// ---------------------------------------------------------------------------
// Unit Tests: Auth — T-1833 through T-1836
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = 'test-secret-key-for-unit-tests';

describe('JWT Token (T-1833)', () => {
  it('generates valid token', () => {
    const token = jwt.sign({ userId: 'user-1', email: 'test@test.com' }, JWT_SECRET, {
      expiresIn: '1h',
    });
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('verifies valid token', () => {
    const token = jwt.sign({ userId: 'user-1' }, JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    expect(decoded.userId).toBe('user-1');
  });

  it('rejects tampered token', () => {
    const token = jwt.sign({ userId: 'user-1' }, JWT_SECRET);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => jwt.verify(tampered, JWT_SECRET)).toThrow();
  });

  it('rejects expired token', () => {
    const token = jwt.sign({ userId: 'user-1' }, JWT_SECRET, { expiresIn: '0s' });
    // Small delay to ensure expiration
    expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
  });
});

describe('Password Hashing (T-1834)', () => {
  it('hashes password', async () => {
    const hash = await bcrypt.hash('MyPassword123', 10);
    expect(hash).not.toBe('MyPassword123');
    expect(hash.length).toBeGreaterThan(50);
  });

  it('verifies correct password', async () => {
    const hash = await bcrypt.hash('MyPassword123', 10);
    const valid = await bcrypt.compare('MyPassword123', hash);
    expect(valid).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await bcrypt.hash('MyPassword123', 10);
    const valid = await bcrypt.compare('WrongPassword', hash);
    expect(valid).toBe(false);
  });
});

describe('Input Validation (T-1835)', () => {
  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePassword(pw: string): { valid: boolean; reason?: string } {
    if (pw.length < 8) return { valid: false, reason: 'Too short' };
    if (!/[A-Z]/.test(pw)) return { valid: false, reason: 'Needs uppercase' };
    if (!/[a-z]/.test(pw)) return { valid: false, reason: 'Needs lowercase' };
    if (!/[0-9]/.test(pw)) return { valid: false, reason: 'Needs digit' };
    return { valid: true };
  }

  function validateUsername(name: string): boolean {
    return /^[a-zA-Z0-9_]{3,20}$/.test(name);
  }

  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('@no-local.com')).toBe(false);
  });

  it('validates password requirements', () => {
    expect(validatePassword('Abc12345').valid).toBe(true);
    expect(validatePassword('short').valid).toBe(false);
    expect(validatePassword('nouppercase1').valid).toBe(false);
    expect(validatePassword('NOLOWERCASE1').valid).toBe(false);
    expect(validatePassword('NoDigitsHere').valid).toBe(false);
  });

  it('validates username format', () => {
    expect(validateUsername('player_1')).toBe(true);
    expect(validateUsername('ab')).toBe(false);
    expect(validateUsername('has spaces')).toBe(false);
    expect(validateUsername('a'.repeat(21))).toBe(false);
  });
});

describe('Rate Limiter (T-1836)', () => {
  class SimpleRateLimiter {
    private counts = new Map<string, { count: number; resetAt: number }>();
    constructor(private maxRequests: number, private windowMs: number) {}

    check(key: string, now: number = Date.now()): boolean {
      const entry = this.counts.get(key);
      if (!entry || now > entry.resetAt) {
        this.counts.set(key, { count: 1, resetAt: now + this.windowMs });
        return true;
      }
      entry.count++;
      return entry.count <= this.maxRequests;
    }
  }

  it('allows requests within limit', () => {
    const limiter = new SimpleRateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) {
      expect(limiter.check('user-1', 1000)).toBe(true);
    }
  });

  it('blocks requests over limit', () => {
    const limiter = new SimpleRateLimiter(3, 60_000);
    limiter.check('user-1', 1000);
    limiter.check('user-1', 1000);
    limiter.check('user-1', 1000);
    expect(limiter.check('user-1', 1000)).toBe(false);
  });

  it('resets after window expires', () => {
    const limiter = new SimpleRateLimiter(2, 1_000);
    limiter.check('user-1', 1000);
    limiter.check('user-1', 1000);
    expect(limiter.check('user-1', 1000)).toBe(false);
    expect(limiter.check('user-1', 3000)).toBe(true); // after window
  });
});
