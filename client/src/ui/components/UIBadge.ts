import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export interface UIBadgeConfig {
  x: number;
  y: number;
  text?: string;
  value?: number;
  bgColor?: number;
  textColor?: string;
  pill?: boolean;
  fontSize?: number;
}

/**
 * Small circle or pill with number/text, useful for notification counts.
 */
export class UIBadge extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private isPill: boolean;
  private bgColor: number;

  constructor(scene: Phaser.Scene, config: UIBadgeConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.isPill = config.pill ?? false;
    this.bgColor = config.bgColor ?? COLORS.danger;

    const displayText = config.text ?? (config.value !== undefined ? String(config.value) : '');

    this.label = scene.add.text(0, 0, displayText, {
      fontFamily: FONTS.primary,
      fontSize: `${config.fontSize ?? FONTS.sizes.tiny}px`,
      color: config.textColor ?? '#ffffff',
      fontStyle: 'bold',
    });
    this.label.setOrigin(0.5);

    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.add(this.label);

    this.redraw();
  }

  private redraw(): void {
    this.bg.clear();
    this.bg.fillStyle(this.bgColor, 1);

    if (this.isPill) {
      const w = Math.max(this.label.width + 14, 24);
      const h = this.label.height + 6;
      this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    } else {
      const r = Math.max(this.label.width, this.label.height) / 2 + 5;
      this.bg.fillCircle(0, 0, r);
    }
  }

  setValue(value: number): void {
    this.label.setText(String(value));
    this.redraw();
  }

  setText(text: string): void {
    this.label.setText(text);
    this.redraw();
  }

  setColor(color: number): void {
    this.bgColor = color;
    this.redraw();
  }
}
