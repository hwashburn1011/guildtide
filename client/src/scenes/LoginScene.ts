import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import { GAME_VERSION } from '@shared/constants';

export class LoginScene extends Phaser.Scene {
  private errorText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'LoginScene' });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Background
    this.cameras.main.setBackgroundColor(COLORS.background);

    // Title
    this.add.text(centerX, 120, 'GUILDTIDE', {
      fontFamily: FONTS.primary,
      fontSize: '48px',
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(centerX, 170, 'A Living World Idle RPG', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);

    this.add.text(centerX, 200, 'Build your guild, recruit heroes, and conquer\na world shaped by real weather.', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#7a7a8e',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);

    // Version
    this.add.text(GAME_WIDTH - 12, GAME_HEIGHT - 12, `v${GAME_VERSION}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: '#555566',
    }).setOrigin(1, 1);

    // Error text (hidden initially)
    this.errorText = this.add.text(centerX, centerY + 120, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ff4444',
    }).setOrigin(0.5);

    // Create DOM login form
    const formHtml = `
      <div style="
        background: rgba(22, 33, 62, 0.95);
        border: 2px solid #0f3460;
        border-radius: 12px;
        padding: 32px;
        width: 360px;
        font-family: Arial, sans-serif;
      ">
        <input id="gt-email" type="email" placeholder="Email" style="
          width: 100%; padding: 12px; margin-bottom: 12px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 16px; outline: none;
        " />
        <input id="gt-username" type="text" placeholder="Username (for registration)" style="
          width: 100%; padding: 12px; margin-bottom: 12px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 16px; outline: none;
        " />
        <input id="gt-password" type="password" placeholder="Password" style="
          width: 100%; padding: 12px; margin-bottom: 20px;
          background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
          color: white; font-size: 16px; outline: none;
        " />
        <button id="gt-login" style="
          width: 100%; padding: 12px; margin-bottom: 8px;
          background: #e94560; border: none; border-radius: 6px;
          color: white; font-size: 16px; cursor: pointer; font-weight: bold;
        ">Login</button>
        <button id="gt-register" style="
          width: 100%; padding: 12px;
          background: transparent; border: 1px solid #0f3460; border-radius: 6px;
          color: #a0a0b0; font-size: 14px; cursor: pointer;
        ">Create Account</button>
      </div>
    `;

    const form = this.add.dom(centerX, centerY).createFromHTML(formHtml);

    form.addListener('click');
    form.on('click', async (event: Event) => {
      const target = event.target as HTMLElement;

      const emailInput = document.getElementById('gt-email') as HTMLInputElement;
      const usernameInput = document.getElementById('gt-username') as HTMLInputElement;
      const passwordInput = document.getElementById('gt-password') as HTMLInputElement;

      if (target.id === 'gt-login') {
        await this.handleLogin(emailInput.value, passwordInput.value);
      } else if (target.id === 'gt-register') {
        await this.handleRegister(emailInput.value, usernameInput.value, passwordInput.value);
      }
    });
  }

  private async handleLogin(email: string, password: string): Promise<void> {
    if (!email || !password) {
      this.showError('Please enter email and password');
      return;
    }

    try {
      const response = await apiClient.login({ email, password }) as any;
      localStorage.setItem('guildtide_token', response.token);

      // Store offline gains for GuildHallScene to display
      if (response.offlineGains) {
        sessionStorage.setItem('guildtide_offline_gains', JSON.stringify(response.offlineGains));
        sessionStorage.setItem('guildtide_elapsed_seconds', String(response.elapsedSeconds || 0));
      }

      if (response.guild) {
        this.scene.start('GuildHallScene');
      } else if (!response.player.regionId) {
        this.scene.start('RegionSelectScene');
      } else {
        this.scene.start('GuildHallScene');
      }
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  private async handleRegister(email: string, username: string, password: string): Promise<void> {
    if (!email || !username || !password) {
      this.showError('Please fill in all fields');
      return;
    }

    try {
      const response = await apiClient.register({ email, username, password });
      localStorage.setItem('guildtide_token', response.token);
      this.scene.start('RegionSelectScene');
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Registration failed');
    }
  }

  private showError(message: string): void {
    this.errorText.setText(message);
    this.time.delayedCall(4000, () => {
      this.errorText.setText('');
    });
  }
}
