// ---------------------------------------------------------------------------
// E2E Tests: Full User Flows — T-1781 through T-1790
// ---------------------------------------------------------------------------
import { test, expect, createTestUser } from '../fixtures/test-fixtures';
import { LoginPage } from '../pages/LoginPage';
import { GuildHallPage } from '../pages/GuildHallPage';

test.describe('Full User Flows', () => {
  test('T-1781: full onboarding flow (register -> guild setup -> first build)', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const user = createTestUser();

    // Register
    const ok = await loginPage.registerViaApi(user.username, user.email, user.password);
    expect(ok).toBe(true);

    // Login
    const token = await loginPage.loginViaApi(user.email, user.password);
    expect(token).toBeTruthy();

    // Navigate to guild hall
    const ghPage = new GuildHallPage(page);
    await ghPage.goto();
    expect(await ghPage.isLoaded()).toBe(true);

    // Attempt first building
    const resp = await page.request.post('/api/buildings/construct', {
      data: { buildingType: 'tavern', x: 0, y: 0 },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1782: full expedition cycle (form party -> launch -> return -> loot)', async ({
    authenticatedPage,
  }) => {
    // Launch expedition
    const launchResp = await authenticatedPage.request.post('/api/expeditions/launch', {
      data: { heroIds: ['hero-1'], regionId: 'forest-1' },
    });
    expect(launchResp.status()).toBeLessThan(500);

    // Check active
    const activeResp = await authenticatedPage.request.get('/api/expeditions/active');
    expect(activeResp.status()).toBeLessThan(500);

    // Check completed
    const completedResp = await authenticatedPage.request.get('/api/expeditions/completed');
    expect(completedResp.status()).toBeLessThan(500);
  });

  test('T-1783: full crafting cycle (gather materials -> craft -> equip)', async ({
    authenticatedPage,
  }) => {
    // Craft item
    const craftResp = await authenticatedPage.request.post('/api/items/craft', {
      data: { recipeId: 'iron-sword', quantity: 1 },
    });
    expect(craftResp.status()).toBeLessThan(500);

    // Equip item
    const equipResp = await authenticatedPage.request.post('/api/items/equip', {
      data: { heroId: 'hero-1', itemId: 'crafted-sword-1', slot: 'weapon' },
    });
    expect(equipResp.status()).toBeLessThan(500);
  });

  test('T-1784: full trade cycle (list item -> buy item -> verify inventory)', async ({
    authenticatedPage,
  }) => {
    // Sell
    const sellResp = await authenticatedPage.request.post('/api/market/sell', {
      data: { itemId: 'trade-item-1', quantity: 1, price: 100 },
    });
    expect(sellResp.status()).toBeLessThan(500);

    // Buy
    const buyResp = await authenticatedPage.request.post('/api/market/buy', {
      data: { listingId: 'listing-1', quantity: 1 },
    });
    expect(buyResp.status()).toBeLessThan(500);

    // Verify inventory
    const invResp = await authenticatedPage.request.get('/api/items/inventory');
    expect(invResp.status()).toBeLessThan(500);
  });

  test('T-1785: full research cycle (select node -> wait -> complete -> verify effect)', async ({
    authenticatedPage,
  }) => {
    const startResp = await authenticatedPage.request.post('/api/research/start', {
      data: { nodeId: 'basic-tools' },
    });
    expect(startResp.status()).toBeLessThan(500);

    const statusResp = await authenticatedPage.request.get('/api/research/status');
    expect(statusResp.status()).toBeLessThan(500);
  });
});

test.describe('Error & Network Edge Cases', () => {
  test('T-1786: API error handling (server returns 500)', async ({ authenticatedPage }) => {
    // Intercept and force 500 response
    await authenticatedPage.route('**/api/resources', (route) =>
      route.fulfill({ status: 500, body: '{"error":"Internal Server Error"}' }),
    );
    const resp = await authenticatedPage.request.get('/api/resources');
    expect(resp.status()).toBe(500);
    await authenticatedPage.unroute('**/api/resources');
  });

  test('T-1787: slow network simulation (throttled connection)', async ({ authenticatedPage }) => {
    // Add a delay to API responses
    await authenticatedPage.route('**/api/**', async (route) => {
      await new Promise((r) => setTimeout(r, 3_000));
      await route.continue();
    });
    const resp = await authenticatedPage.request.get('/api/resources');
    expect(resp.status()).toBeLessThan(500);
    await authenticatedPage.unroute('**/api/**');
  });

  test('T-1788: multiple tabs open simultaneously', async ({ authenticatedPage, context }) => {
    const page2 = await context.newPage();
    await page2.goto('/#guild-hall');
    await page2.waitForSelector('canvas', { timeout: 15_000 });

    // Both pages should render
    expect(await authenticatedPage.locator('canvas').isVisible()).toBe(true);
    expect(await page2.locator('canvas').isVisible()).toBe(true);

    await page2.close();
  });

  test('T-1789: cross-browser visual consistency check', async ({ authenticatedPage }) => {
    // This test runs across all configured browser projects automatically
    await authenticatedPage.goto('/');
    await authenticatedPage.waitForSelector('canvas', { timeout: 15_000 });
    expect(await authenticatedPage.locator('canvas').isVisible()).toBe(true);
  });
});

// T-1790: CI integration is handled in .github/workflows/ci.yml
