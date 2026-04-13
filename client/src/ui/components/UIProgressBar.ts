import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export interface UIProgressBarConfig {
  x: number;
  y: number;
  width: number;
  height?: number;
  value?: number;
  maxValue?: number;
  fillColor?: number;
  bgColor?: number;
  label?: string;
  showPercent?: boolean;
  animateDuration?: number;
}

/**
 * Horizontal progress bar with configurable fill, colors, label, and animated tween.
 */
export class UIProgressBar extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private fill: Phaser.GameObjects.Graphics;
  private labelText?: Phaser.GameObjects.Text;
  private percentText?: Phaser.GameObjects.Text;
  private barWidth: number;
  private barHeight: number;
  private fillColor: number;
  private currentValue: number;
  private maxValue: number;
  private animDuration: number;

  constructor(scene: Phaser.Scene, config: UIProgressBarConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.barWidth = config.width;
    this.barHeight = config.height ?? 20;
    this.fillColor = config.fillColor ?? COLORS.accent;
    this.currentValue = config.value ?? 0;
    this.maxValue = config.maxValue ?? 100;
    this.animDuration = config.animateDuration ?? 300;

    // Background bar
    this.bg = scene.add.graphics();
    this.bg.fillStyle(config.bgColor ?? 0x1a1a2e, 0.8);
    this.bg.fillRoundedRect(0, 0, this.barWidth, this.barHeight, 4);
    this.bg.lineStyle(1, COLORS.panelBorder, 0.6);
    this.bg.strokeRoundedRect(0, 0, this.barWidth, this.barHeight, 4);
    this.add(this.bg);

    // Fill bar
    this.fill = scene.add.graphics();
    this.add(this.fill);
    this.drawFill(this.currentValue / this.maxValue);

    // Optional label
    if (config.label) {
      this.labelText = scene.add.text(-2, -18, config.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      });
      this.add(this.labelText);
    }

    // Optional percent text
    if (config.showPercent) {
      this.percentText = scene.add.text(this.barWidth / 2, this.barHeight / 2, '', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textPrimary,
      });
      this.percentText.setOrigin(0.5);
      this.add(this.percentText);
      this.updatePercentText();
    }
  }

  private drawFill(fraction: number): void {
    this.fill.clear();
    const clamped = Phaser.Math.Clamp(fraction, 0, 1);
    if (clamped > 0) {
      const fillW = Math.max(this.barWidth * clamped, 8);
      this.fill.fillStyle(this.fillColor, 1);
      this.fill.fillRoundedRect(0, 0, fillW, this.barHeight, 4);
    }
  }

  private updatePercentText(): void {
    if (this.percentText) {
      const pct = Math.round((this.currentValue / this.maxValue) * 100);
      this.percentText.setText(`${pct}%`);
    }
  }

  setValue(value: number, animate = true): void {
    const target = Phaser.Math.Clamp(value, 0, this.maxValue);
    if (animate) {
      const startValue = this.currentValue;
      this.scene.tweens.addCounter({
        from: startValue,
        to: target,
        duration: this.animDuration,
        ease: 'Power2',
        onUpdate: (tween) => {
          this.currentValue = tween.getValue() ?? 0;
          this.drawFill(this.currentValue / this.maxValue);
          this.updatePercentText();
        },
      });
    } else {
      this.currentValue = target;
      this.drawFill(this.currentValue / this.maxValue);
      this.updatePercentText();
    }
  }

  getValue(): number {
    return this.currentValue;
  }

  setLabel(text: string): void {
    this.labelText?.setText(text);
  }
}
