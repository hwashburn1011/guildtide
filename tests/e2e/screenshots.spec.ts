// ---------------------------------------------------------------------------
// E2E Tests: Screenshot Comparisons — T-1774 through T-1780
// ---------------------------------------------------------------------------
import { test, expect } from '../fixtures/test-fixtures';
import { GuildHallPage } from '../pages/GuildHallPage';
import { MarketPage } from '../pages/MarketPage';
import { WorldMapPage } from '../pages/WorldMapPage';
import { ResearchPage } from '../pages/ResearchPage';
import { HeroPage } from '../pages/HeroPage';
import { LoginPage } from '../pages/LoginPage';

test.describe('Visual Regression — Screenshots', () => {
  test('T-1774: screenshot comparison of guild hall scene', async ({ authenticatedPage }) => {
    const ghPage = new GuildHallPage(authenticatedPage);
    await ghPage.goto();
    await authenticatedPage.waitForTimeout(2_000);
    await expect(authenticatedPage).toHaveScreenshot('guild-hall.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('T-1775: screenshot comparison of market scene', async ({ authenticatedPage }) => {
    const mktPage = new MarketPage(authenticatedPage);
    await mktPage.goto();
    await authenticatedPage.waitForTimeout(2_000);
    await expect(authenticatedPage).toHaveScreenshot('market.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('T-1776: screenshot comparison of world map scene', async ({ authenticatedPage }) => {
    const wmPage = new WorldMapPage(authenticatedPage);
    await wmPage.goto();
    await authenticatedPage.waitForTimeout(2_000);
    await expect(authenticatedPage).toHaveScreenshot('world-map.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('T-1777: screenshot comparison of combat scene', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/#combat');
    await authenticatedPage.waitForSelector('canvas', { timeout: 15_000 });
    await authenticatedPage.waitForTimeout(2_000);
    await expect(authenticatedPage).toHaveScreenshot('combat.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('T-1778: screenshot comparison of research tree', async ({ authenticatedPage }) => {
    const resPage = new ResearchPage(authenticatedPage);
    await resPage.goto();
    await authenticatedPage.waitForTimeout(2_000);
    await expect(authenticatedPage).toHaveScreenshot('research-tree.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('T-1779: screenshot comparison of login page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await page.waitForTimeout(2_000);
    await expect(page).toHaveScreenshot('login.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('T-1780: screenshot comparison of hero detail page', async ({ authenticatedPage }) => {
    const heroPage = new HeroPage(authenticatedPage);
    await heroPage.goto();
    await authenticatedPage.waitForTimeout(2_000);
    await expect(authenticatedPage).toHaveScreenshot('hero-detail.png', {
      maxDiffPixelRatio: 0.001,
    });
  });
});
