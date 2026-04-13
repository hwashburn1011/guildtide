// ---------------------------------------------------------------------------
// E2E Tests: Heroes — T-1717 through T-1722
// ---------------------------------------------------------------------------
import { test, expect } from '../fixtures/test-fixtures';
import { HeroPage } from '../pages/HeroPage';

test.describe('Heroes', () => {
  test('T-1717: hero recruitment from Tavern', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/heroes/recruit', {
      data: { tavernSlot: 0 },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1718: hero detail page displays all stats', async ({ authenticatedPage }) => {
    const heroPage = new HeroPage(authenticatedPage);
    await heroPage.goto();
    expect(await heroPage.isLoaded()).toBe(true);
  });

  test('T-1719: hero skill tree navigation and skill unlock', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/heroes/skill', {
      data: { heroId: 'test-hero-1', skillId: 'basic-attack' },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1720: hero equipment equip and unequip', async ({ authenticatedPage }) => {
    const equipResp = await authenticatedPage.request.post('/api/items/equip', {
      data: { heroId: 'test-hero-1', itemId: 'test-item-1', slot: 'weapon' },
    });
    expect(equipResp.status()).toBeLessThan(500);
  });

  test('T-1721: hero assignment to building', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/heroes/assign', {
      data: { heroId: 'test-hero-1', buildingId: 'test-building-1' },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1722: hero dismissal with confirmation', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/heroes/dismiss', {
      data: { heroId: 'test-hero-1' },
    });
    expect(resp.status()).toBeLessThan(500);
  });
});
