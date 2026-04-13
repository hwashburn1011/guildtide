// ---------------------------------------------------------------------------
// API Route Test Helpers — T-1795
// ---------------------------------------------------------------------------
import jwt from 'jsonwebtoken';
import { createMockUser, type MockUser } from './factories';

const TEST_JWT_SECRET = 'test-secret-key-for-unit-tests';

/**
 * Generate a valid JWT token for testing authenticated routes.
 */
export function createAuthToken(user?: Partial<MockUser>): string {
  const mockUser = createMockUser(user);
  return jwt.sign(
    { userId: mockUser.id, email: mockUser.email },
    TEST_JWT_SECRET,
    { expiresIn: '1h' },
  );
}

/**
 * Build standard Authorization header.
 */
export function authHeader(token?: string): Record<string, string> {
  const t = token ?? createAuthToken();
  return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
}

/**
 * Assert that a numeric value is within a percentage tolerance.
 */
export function expectWithinTolerance(
  actual: number,
  expected: number,
  tolerancePct: number = 5,
): void {
  const margin = expected * (tolerancePct / 100);
  if (Math.abs(actual - expected) > margin) {
    throw new Error(
      `Expected ${actual} to be within ${tolerancePct}% of ${expected} (±${margin})`,
    );
  }
}

/**
 * Run a function multiple times and return statistical summary.
 */
export function sampleRuns<T extends number>(
  fn: () => T,
  iterations: number = 1_000,
): { mean: number; min: number; max: number; values: T[] } {
  const values: T[] = [];
  for (let i = 0; i < iterations; i++) {
    values.push(fn());
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return { mean, min: sorted[0], max: sorted[sorted.length - 1], values };
}
