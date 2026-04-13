import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface UIButtonConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
  variant?: ButtonVariant;
  fontSize?: number;
  disabled?: boolean;
  onClick?: () => void;
}

const VARIANT_COLORS: Record<ButtonVariant, { fill: number; hover: number; text: string }> = {
  primary: { fill: COLORS.accent, hover: 0xff5a75, text: '#ffffff' },
  secondary: { fill: COLORS.panelBorder, hover: 0x1a4a80, text: '#ffffff' },
  danger: { fill: COLORS.danger, hover: 0xff5a75, text: '#ffffff' },
  ghost: { fill: 0x000000, hover: 0x2a2a4e, text: '#ffffff' },
};

/**
 * Reusable button with background rect, text, hover/press states, and variants.
 */
export class UIButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private btnWidth: number;
  private btnHeight: number;
  private variant: ButtonVariant;
  private isDisabled: boolean;
  private hitZone: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, config: UIButtonConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.variant = config.variant ?? 'primary';
    this.isDisabled = config.disabled ?? false;
    this.btnWidth = config.width ?? 140;
    this.btnHeight = config.height ?? 40;

    const colors = VARIANT_COLORS[this.variant];

    // Background
    this.bg = scene.add.graphics();
    this.drawBg(colors.fill);
    this.add(this.bg);

    // Label
    this.label = scene.add.text(this.btnWidth / 2, this.btnHeight / 2, config.text, {
      fontFamily: FONTS.primary,
      fontSize: `${config.fontSize ?? FONTS.sizes.body}px`,
      color: colors.text,
      fontStyle: 'bold',
    });
    this.label.setOrigin(0.5);
    this.add(this.label);

    // Hit zone for input
    this.hitZone = scene.add.zone(this.btnWidth / 2, this.btnHeight / 2, this.btnWidth, this.btnHeight);
    this.hitZone.setInteractive({ useHandCursor: true });
    this.add(this.hitZone);

    if (!this.isDisabled) {
      this.hitZone.on('pointerover', () => {
        this.drawBg(colors.hover);
      });
      this.hitZone.on('pointerout', () => {
        this.drawBg(colors.fill);
      });
      this.hitZone.on('pointerdown', () => {
        this.setScale(0.95);
      });
      this.hitZone.on('pointerup', () => {
        this.setScale(1);
        config.onClick?.();
      });
    } else {
      this.setAlpha(0.5);
    }
  }

  private drawBg(color: number): void {
    this.bg.clear();
    const alpha = this.variant === 'ghost' ? 0.15 : 1;
    this.bg.fillStyle(color, alpha);
    this.bg.fillRoundedRect(0, 0, this.btnWidth, this.btnHeight, 6);
  }

  setText(text: string): void {
    this.label.setText(text);
  }

  setDisabled(disabled: boolean): void {
    this.isDisabled = disabled;
    this.setAlpha(disabled ? 0.5 : 1);
    this.hitZone.disableInteractive();
    if (!disabled) {
      this.hitZone.setInteractive({ useHandCursor: true });
    }
  }
}
