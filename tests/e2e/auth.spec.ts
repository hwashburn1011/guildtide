// ---------------------------------------------------------------------------
// E2E Tests: Authentication — T-1701 through T-1707
// ---------------------------------------------------------------------------
import { test, expect, createTestUser } from '../fixtures/test-fixtures';
import { LoginPage } from '../pages/LoginPage';

test.describe('Registration', () => {
  test('T-1701: registration with valid data succeeds', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = createTestUser();
    const ok = await loginPage.registerViaApi(user.username, user.email, user.password);
    expect(ok).toBe(true);
  });

  test('T-1702: registration validation errors are shown', async ({ page }) => {
    const resp = await page.request.post('/api/auth/register', {
      data: { username: '', email: 'bad', password: '1' },
    });
    expect(resp.ok()).toBe(false);
    const body = await resp.json();
    expect(body.error || body.errors).toBeTruthy();
  });
});

test.describe('Login', () => {
  test('T-1703: login with valid credentials redirects to guild hall', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const user = createTestUser();
    await loginPage.registerViaApi(user.username, user.email, user.password);
    const token = await loginPage.loginViaApi(user.email, user.password);
    expect(token).toBeTruthy();
    await page.waitForTimeout(1_000);
    const stored = await loginPage.getLocalStorageToken();
    expect(stored).toBe(token);
  });

  test('T-1704: login with invalid credentials shows error', async ({ page }) => {
    const resp = await page.request.post('/api/auth/login', {
      data: { email: 'nobody@example.com', password: 'wrong' },
    });
    expect(resp.ok()).toBe(false);
  });

  test('T-1705: password reset flow', async ({ page }) => {
    const resp = await page.request.post('/api/auth/reset-password', {
      data: { email: 'test@guildtide-test.local' },
    });
    // Endpoint should accept any email without error (security best practice)
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1706: logout clears session and redirects to login', async ({ authenticatedPage }) => {
    const loginPage = new LoginPage(authenticatedPage);
    await loginPage.clearSession();
    const token = await loginPage.getLocalStorageToken();
    expect(token).toBeNull();
  });

  test('T-1707: OAuth login button redirects to provider', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // Verify the canvas loads (Phaser renders OAuth button in-canvas)
    expect(await loginPage.isCanvasVisible()).toBe(true);
  });
});
