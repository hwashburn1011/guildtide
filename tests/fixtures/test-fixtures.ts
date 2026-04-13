// ---------------------------------------------------------------------------
// Playwright shared fixtures — T-1695, T-1696, T-1697
// ---------------------------------------------------------------------------
import { test as base, expect, type Page } from '@playwright/test';

// ---- Test data factories (T-1696) ----------------------------------------

export interface TestUser {
  username: string;
  email: string;
  password: string;
}

export interface TestGuild {
  name: string;
  motto: string;
}

let _seq = 0;
function seq(): number {
  return ++_seq;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const n = seq();
  return {
    username: `testuser_${n}`,
    email: `testuser_${n}@guildtide-test.local`,
    password: 'TestPass123!',
    ...overrides,
  };
}

export function createTestGuild(overrides: Partial<TestGuild> = {}): TestGuild {
  const n = seq();
  return {
    name: `Test Guild ${n}`,
    motto: 'For testing glory!',
    ...overrides,
  };
}

// ---- Helpers (T-1697) -----------------------------------------------------

export async function loginAs(page: Page, user: TestUser): Promise<void> {
  await page.goto('/');
  // Wait for login scene to render
  await page.waitForSelector('canvas', { timeout: 15_000 });
  // Type into Phaser scene — we interact via the API shortcut
  const resp = await page.request.post('/api/auth/login', {
    data: { email: user.email, password: user.password },
  });
  const body = await resp.json();
  if (body.token) {
    await page.evaluate((token: string) => {
      localStorage.setItem('auth_token', token);
    }, body.token);
    await page.reload();
  }
}

export async function registerUser(page: Page, user: TestUser): Promise<void> {
  await page.request.post('/api/auth/register', {
    data: {
      username: user.username,
      email: user.email,
      password: user.password,
    },
  });
}

export async function navigateToScene(page: Page, sceneName: string): Promise<void> {
  await page.goto(`/#${sceneName}`);
  await page.waitForSelector('canvas', { timeout: 15_000 });
  // Allow Phaser scene time to boot
  await page.waitForTimeout(1_000);
}

export async function waitForCanvasReady(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 15_000 });
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    return c && c.width > 0 && c.height > 0;
  });
}

// ---- Extended test fixture (T-1695) ---------------------------------------

type GuildtideFixtures = {
  authenticatedPage: Page;
  testUser: TestUser;
  testGuild: TestGuild;
};

export const test = base.extend<GuildtideFixtures>({
  testUser: async ({}, use) => {
    await use(createTestUser());
  },

  testGuild: async ({}, use) => {
    await use(createTestGuild());
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    // Seed user via API, then login
    await registerUser(page, testUser);
    await loginAs(page, testUser);
    await use(page);
  },
});

export { expect };
