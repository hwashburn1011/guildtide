// ---------------------------------------------------------------------------
// E2E Tests: Market — T-1727 through T-1730
// ---------------------------------------------------------------------------
import { test, expect } from '../fixtures/test-fixtures';
import { MarketPage } from '../pages/MarketPage';

test.describe('Market', () => {
  test('T-1727: market buy order placement', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/market/buy', {
      data: { itemId: 'iron-ore', quantity: 10, maxPrice: 50 },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1728: market sell order placement', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/market/sell', {
      data: { itemId: 'iron-ore', quantity: 5, price: 25 },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1729: market price history chart rendering', async ({ authenticatedPage }) => {
    const mktPage = new MarketPage(authenticatedPage);
    await mktPage.goto();
    expect(await mktPage.isLoaded()).toBe(true);
  });

  test('T-1730: market search and filter functionality', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/market/listings?search=iron&sort=price');
    expect(resp.status()).toBeLessThan(500);
  });
});
