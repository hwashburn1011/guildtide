// ---------------------------------------------------------------------------
// Test Setup — Database, Mocks, Globals (T-1793)
// ---------------------------------------------------------------------------
import { beforeAll, afterAll, afterEach } from 'vitest';

// Mock database setup & teardown
let _dbCleanupFns: Array<() => Promise<void>> = [];

export function onTestDbCleanup(fn: () => Promise<void>): void {
  _dbCleanupFns.push(fn);
}

beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
  process.env.DATABASE_URL = 'file:./test.db';
});

afterEach(async () => {
  for (const fn of _dbCleanupFns) {
    await fn();
  }
  _dbCleanupFns = [];
});

afterAll(async () => {
  // Tear down test resources
});
