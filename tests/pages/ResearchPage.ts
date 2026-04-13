// ---------------------------------------------------------------------------
// Page Object: Research Scene
// ---------------------------------------------------------------------------
import { type Page, type Locator } from '@playwright/test';

export class ResearchPage {
  readonly page: Page;
  readonly canvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('canvas');
  }

  async goto(): Promise<void> {
    await this.page.goto('/#research');
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
