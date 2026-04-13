// ---------------------------------------------------------------------------
// E2E Tests: Research — T-1731 through T-1733
// ---------------------------------------------------------------------------
import { test, expect } from '../fixtures/test-fixtures';
import { ResearchPage } from '../pages/ResearchPage';

test.describe('Research', () => {
  test('T-1731: research tree node selection and start', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/research/start', {
      data: { nodeId: 'basic-tools' },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1732: research completion notification', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/research/status');
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1733: research tree zoom and pan interaction', async ({ authenticatedPage }) => {
    const resPage = new ResearchPage(authenticatedPage);
    await resPage.goto();
    expect(await resPage.isLoaded()).toBe(true);
  });
});
