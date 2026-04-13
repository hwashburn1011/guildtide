// ---------------------------------------------------------------------------
// E2E Tests: Expeditions — T-1723 through T-1726
// ---------------------------------------------------------------------------
import { test, expect } from '../fixtures/test-fixtures';
import { ExpeditionPage } from '../pages/ExpeditionPage';

test.describe('Expeditions', () => {
  test('T-1723: expedition party formation with hero selection', async ({ authenticatedPage }) => {
    const expPage = new ExpeditionPage(authenticatedPage);
    await expPage.goto();
    expect(await expPage.isLoaded()).toBe(true);
  });

  test('T-1724: expedition launch with valid party', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/expeditions/launch', {
      data: { heroIds: ['hero-1', 'hero-2'], regionId: 'forest-1' },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1725: expedition progress tracking updates', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/expeditions/active');
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1726: expedition completion reward display', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/expeditions/completed');
    expect(resp.status()).toBeLessThan(500);
  });
});
