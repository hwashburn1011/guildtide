// ---------------------------------------------------------------------------
// Page Object: World Map Scene
// ---------------------------------------------------------------------------
import { type Page, type Locator } from '@playwright/test';

export class WorldMapPage {
  readonly page: Page;
  readonly canvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('canvas');
  }

  async goto(): Promise<void> {
    await this.page.goto('/#world-map');
    await this.canvas.waitFor({ timeout: 15_000 });
    await this.page.waitForTimeout(1_000);
  }

  async isLoaded(): Promise<boolean> {
    return this.canvas.isVisible();
  }

  async clickRegion(x: number, y: number): Promise<void> {
    await this.canvas.click({ position: { x, y } });
  }

  async screenshotCanvas(): Promise<Buffer> {
    return this.canvas.screenshot();
  }
}
