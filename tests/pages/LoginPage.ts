// ---------------------------------------------------------------------------
// Page Object: Login Scene
// ---------------------------------------------------------------------------
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly canvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('canvas');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.canvas.waitFor({ timeout: 15_000 });
  }

  async loginViaApi(email: string, password: string): Promise<string | null> {
    const resp = await this.page.request.post('/api/auth/login', {
      data: { email, password },
    });
    const body = await resp.json();
    if (body.token) {
      await this.page.evaluate((t: string) => localStorage.setItem('auth_token', t), body.token);
      await this.page.reload();
      return body.token;
    }
    return null;
  }

  async registerViaApi(username: string, email: string, password: string): Promise<boolean> {
    const resp = await this.page.request.post('/api/auth/register', {
      data: { username, email, password },
    });
    return resp.ok();
  }

  async isCanvasVisible(): Promise<boolean> {
    return this.canvas.isVisible();
  }

  async getLocalStorageToken(): Promise<string | null> {
    return this.page.evaluate(() => localStorage.getItem('auth_token'));
  }

  async clearSession(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
    await this.page.reload();
  }
}
