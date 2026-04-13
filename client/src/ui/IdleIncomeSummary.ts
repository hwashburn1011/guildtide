import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

/**
 * Compact idle income summary panel shown in the guild hall.
 * Displays the current production rates as a quick overview.
 */
export class IdleIncomeSummary {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
  }

  setRates(rates: Record<string, number>): void {
    this.container.removeAll(true);

    const activeRates = Object.entries(rates).filter(([, v]) => v > 0);
    if (activeRates.length === 0) return;

    // Background
    const w = 220;
    const h = 16 + activeRates.length * 16;
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.8);
    bg.fillRoundedRect(0, 0, w, h, 6);
    bg.lineStyle(1, COLORS.panelBorder, 0.4);
    bg.strokeRoundedRect(0, 0, w, h, 6);
    this.container.add(bg);

    // Header
    this.container.add(
      this.scene.add.text(8, 2, 'Income/s', {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: COLORS.textSecondary,
        fontStyle: 'bold',
      }),
    );

    // Rates
    activeRates.forEach(([res, rate], i) => {
      const y = 16 + i * 16;
      this.container.add(
        this.scene.add.text(8, y, res, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: COLORS.textSecondary,
        }),
      );
      this.container.add(
        this.scene.add.text(w - 8, y, `+${rate.toFixed(2)}`, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: '#4ecca3',
        }).setOrigin(1, 0),
      );
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
