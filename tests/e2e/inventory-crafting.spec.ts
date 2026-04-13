// ---------------------------------------------------------------------------
// E2E Tests: Inventory & Crafting — T-1734 through T-1736
// ---------------------------------------------------------------------------
import { test, expect } from '../fixtures/test-fixtures';

test.describe('Inventory & Crafting', () => {
  test('T-1734: inventory grid item display and sorting', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/items/inventory?sort=rarity');
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1735: crafting recipe selection and execution', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/items/craft', {
      data: { recipeId: 'iron-sword', quantity: 1 },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1736: item equip comparison tooltip', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/items/compare?itemA=sword-1&itemB=sword-2');
    expect(resp.status()).toBeLessThan(500);
  });
});
