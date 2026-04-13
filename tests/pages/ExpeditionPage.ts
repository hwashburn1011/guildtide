// ---------------------------------------------------------------------------
// Page Object: Expedition Scene
// ---------------------------------------------------------------------------
import { type Page, type Locator } from '@playwright/test';

export class ExpeditionPage {
  readonly page: Page;
  readonly canvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('canvas');
  }

  async goto(): Promise<void> {
    await this.page.goto('/#expedition');
    await this.canvas.waitFor({ timeout: 15_000 });
    await this.page.waitForTimeout(1_000);
  }

  async isLoaded(): Promise<boolean> {
    return this.canvas.isVisible();
  }

  async screenshotCanvas(): Promise<Buffer> {
    return this.canvas.screenshot();
  }
}
