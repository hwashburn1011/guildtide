import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';

/**
 * Small widget showing how many days the guild has existed.
 */
export class GuildDayCounter {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private dayText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, createdAt: string) {
    this.scene = scene;
    this.container = scene.add.container(x, y);

    const ageDays = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.7);
    bg.fillRoundedRect(0, 0, 100, 24, 4);
    this.container.add(bg);

    this.dayText = scene.add.text(50, 12, `Day ${ageDays + 1}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);
    this.container.add(this.dayText);
  }

  destroy(): void {
    this.container.destroy();
  }
}
