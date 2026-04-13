/**
 * SeasonalEventBanner — Special seasonal event display with themed visuals.
 *
 * T-0937: Event visual theme system (seasonal decorations during events)
 * T-0938: Event countdown timer for upcoming scheduled events
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';

const SEASON_THEMES: Record<string, { color: number; accent: string; icon: string }> = {
  spring: { color: 0x4ecca3, accent: '#4ecca3', icon: 'Bloom' },
  summer: { color: 0xf5a623, accent: '#f5a623', icon: 'Sun' },
  autumn: { color: 0xe07c24, accent: '#e07c24', icon: 'Leaf' },
  winter: { color: 0x5b9bd5, accent: '#5b9bd5', icon: 'Snow' },
};

const RARITY_GLOW: Record<string, number> = {
  common: 0x888888,
  uncommon: 0x4ecca3,
  rare: 0x5b9bd5,
  legendary: 0xffd700,
};

export class SeasonalEventBanner {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private countdownTimer: Phaser.Time.TimerEvent | null = null;
  private countdownText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show a banner for a seasonal or holiday event at the top of the screen.
   */
  show(event: {
    title: string;
    category: string;
    rarity: string;
    expiresAt: string;
    remainingHours?: number;
  }): void {
    this.hide();

    const season = this.detectSeason(event);
    const theme = SEASON_THEMES[season] || SEASON_THEMES.spring;
    const glowColor = RARITY_GLOW[event.rarity] || RARITY_GLOW.common;

    this.container = this.scene.add.container(0, 0).setDepth(90);

    const bannerW = GAME_WIDTH - 40;
    const bannerH = 50;
    const bx = 20;
    const by = 10;

    // Banner background with glow border
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.95);
    bg.fillRoundedRect(bx, by, bannerW, bannerH, 8);
    bg.lineStyle(2, glowColor, 0.8);
    bg.strokeRoundedRect(bx, by, bannerW, bannerH, 8);

    // Accent stripe
    const stripe = this.scene.add.graphics();
    stripe.fillStyle(theme.color, 0.3);
    stripe.fillRect(bx + 2, by + 2, 6, bannerH - 4);
    this.container.add(bg);
    this.container.add(stripe);

    // Season icon
    this.container.add(
      this.scene.add.text(bx + 20, by + 8, theme.icon, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: theme.accent,
        fontStyle: 'bold',
      }),
    );

    // Event title
    this.container.add(
      this.scene.add.text(bx + 75, by + 8, event.title, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );

    // Rarity badge
    this.container.add(
      this.scene.add.text(bx + 75, by + 30, event.rarity.toUpperCase(), {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: theme.accent,
      }),
    );

    // Category
    this.container.add(
      this.scene.add.text(bx + 160, by + 30, event.category, {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: COLORS.textSecondary,
      }),
    );

    // T-0938: Countdown timer
    const expiresAt = new Date(event.expiresAt).getTime();
    const remaining = Math.max(0, expiresAt - Date.now());
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    this.countdownText = this.scene.add
      .text(bx + bannerW - 20, by + bannerH / 2, `${hours}h ${minutes}m`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: hours < 2 ? '#e94560' : COLORS.textSecondary,
      })
      .setOrigin(1, 0.5);
    this.container.add(this.countdownText);

    // "Expires in" label
    this.container.add(
      this.scene.add
        .text(bx + bannerW - 20, by + 8, 'Expires in', {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: '#666',
        })
        .setOrigin(1, 0),
    );

    // Update countdown every minute
    this.countdownTimer = this.scene.time.addEvent({
      delay: 60000,
      callback: () => this.updateCountdown(expiresAt),
      loop: true,
    });

    // Entrance animation
    this.container.setAlpha(0);
    this.container.y = -bannerH;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: 0,
      duration: 400,
      ease: 'Back.easeOut',
    });
  }

  private updateCountdown(expiresAt: number): void {
    if (!this.countdownText) return;
    const remaining = Math.max(0, expiresAt - Date.now());
    if (remaining <= 0) {
      this.countdownText.setText('Expired');
      this.countdownText.setColor('#e94560');
      return;
    }
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    this.countdownText.setText(`${hours}h ${minutes}m`);
    this.countdownText.setColor(hours < 2 ? '#e94560' : COLORS.textSecondary);
  }

  private detectSeason(event: { category: string }): string {
    // Try to detect season from the current date
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  hide(): void {
    if (this.container) {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        y: -60,
        duration: 300,
        onComplete: () => {
          this.container?.destroy(true);
          this.container = null;
        },
      });
    }
    this.countdownTimer?.remove();
    this.countdownTimer = null;
    this.countdownText = null;
  }
}
