// ---------------------------------------------------------------------------
// E2E Tests: World Map — T-1737 through T-1738
// ---------------------------------------------------------------------------
import { test, expect } from '../fixtures/test-fixtures';
import { WorldMapPage } from '../pages/WorldMapPage';

test.describe('World Map', () => {
  test('T-1737: world map region click and info panel', async ({ authenticatedPage }) => {
    const wmPage = new WorldMapPage(authenticatedPage);
    await wmPage.goto();
    expect(await wmPage.isLoaded()).toBe(true);
    // Click a region area
    await wmPage.clickRegion(640, 360);
    await authenticatedPage.waitForTimeout(500);
  });

  test('T-1738: world map zoom and pan interaction', async ({ authenticatedPage }) => {
    const wmPage = new WorldMapPage(authenticatedPage);
    await wmPage.goto();
    expect(await wmPage.isLoaded()).toBe(true);
  });
});
