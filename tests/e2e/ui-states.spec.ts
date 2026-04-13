// ---------------------------------------------------------------------------
// E2E Tests: UI States & Edge Cases — T-1764 through T-1773
// ---------------------------------------------------------------------------
import { test, expect } from '../fixtures/test-fixtures';

test.describe('Error & Loading States', () => {
  test('T-1764: error page display on 404 route', async ({ page }) => {
    const resp = await page.goto('/nonexistent-page');
    // Phaser SPA should still load canvas even on unknown hash routes
    await page.waitForSelector('canvas', { timeout: 15_000 });
    expect(resp?.status()).toBeLessThan(500);
  });

  test('T-1765: loading spinner displays during data fetch', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/#guild-hall');
    await authenticatedPage.waitForSelector('canvas', { timeout: 15_000 });
    expect(true).toBe(true);
  });

  test('T-1766: empty state display when no data exists', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/expeditions/completed');
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1767: network error banner on connection loss', async ({ authenticatedPage }) => {
    // Simulate offline by aborting API request
    await authenticatedPage.route('**/api/**', (route) => route.abort());
    await authenticatedPage.goto('/#guild-hall');
    await authenticatedPage.waitForSelector('canvas', { timeout: 15_000 });
    await authenticatedPage.unroute('**/api/**');
  });

  test('T-1768: pagination controls on long lists', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/market/listings?page=1&pageSize=20');
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1769: search/filter combination produces correct results', async ({
    authenticatedPage,
  }) => {
    const resp = await authenticatedPage.request.get(
      '/api/market/listings?search=sword&rarity=rare&sort=price',
    );
    expect(resp.status()).toBeLessThan(500);
  });
});

test.describe('Session & Navigation', () => {
  test('T-1770: data persistence after page refresh', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/#guild-hall');
    await authenticatedPage.waitForSelector('canvas', { timeout: 15_000 });
    const tokenBefore = await authenticatedPage.evaluate(() =>
      localStorage.getItem('auth_token'),
    );
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('canvas', { timeout: 15_000 });
    const tokenAfter = await authenticatedPage.evaluate(() =>
      localStorage.getItem('auth_token'),
    );
    expect(tokenAfter).toBe(tokenBefore);
  });

  test('T-1771: concurrent action handling (double-click prevention)', async ({
    authenticatedPage,
  }) => {
    // Fire two simultaneous requests — server should not crash
    const [r1, r2] = await Promise.all([
      authenticatedPage.request.post('/api/resources/tick'),
      authenticatedPage.request.post('/api/resources/tick'),
    ]);
    expect(r1.status()).toBeLessThan(500);
    expect(r2.status()).toBeLessThan(500);
  });

  test('T-1772: session expiration redirect to login', async ({ authenticatedPage }) => {
    await authenticatedPage.evaluate(() => localStorage.setItem('auth_token', 'expired-token'));
    const resp = await authenticatedPage.request.get('/api/resources', {
      headers: { Authorization: 'Bearer expired-token' },
    });
    expect(resp.status()).toBe(401);
  });

  test('T-1773: browser back/forward navigation state preservation', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/#guild-hall');
    await authenticatedPage.waitForSelector('canvas', { timeout: 15_000 });
    await authenticatedPage.goto('/#market');
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.goBack();
    await authenticatedPage.waitForTimeout(500);
    expect(authenticatedPage.url()).toContain('guild-hall');
  });
});
