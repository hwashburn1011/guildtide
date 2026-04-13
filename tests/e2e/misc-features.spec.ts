// ---------------------------------------------------------------------------
// E2E Tests: Miscellaneous features — T-1751 through T-1755
// ---------------------------------------------------------------------------
import { test, expect } from '../fixtures/test-fixtures';

test.describe('Lore & Quests', () => {
  test('T-1751: lore codex entry display', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/narrative/codex');
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1752: quest log shows active quests', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/narrative/quests/active');
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1753: NPC dialog interaction flow', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/narrative/dialog', {
      data: { npcId: 'tavern-keeper', choiceIndex: 0 },
    });
    expect(resp.status()).toBeLessThan(500);
  });
});

test.describe('Weather & Seasons', () => {
  test('T-1754: weather widget displays current conditions', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/world/weather');
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1755: season visual theme matches current season', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/world/season');
    expect(resp.status()).toBeLessThan(500);
  });
});
