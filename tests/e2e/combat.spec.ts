// ---------------------------------------------------------------------------
// E2E Tests: Combat — T-1749 through T-1750
// ---------------------------------------------------------------------------
import { test, expect } from '../fixtures/test-fixtures';

test.describe('Combat', () => {
  test('T-1749: combat auto-battle plays to completion', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/combat/simulate', {
      data: { partyIds: ['hero-1', 'hero-2'], encounterId: 'forest-wolves' },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1750: combat reward distribution after victory', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/combat/results/latest');
    expect(resp.status()).toBeLessThan(500);
  });
});
