import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface UITooltipConfig {
  text: string;
  target: Phaser.GameObjects.GameObject & { x: number; y: number; width?: number; height?: number };
  position?: TooltipPosition;
  maxWidth?: number;
}

/**
 * Small text popup shown on hover over a target game object.
 * Auto-hides when pointer leaves the target.
 */
export class UITooltip extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: UITooltipConfig) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(2000);

    const position = config.position ?? 'top';
    const maxWidth = config.maxWidth ?? 200;

    // Text
    this.label = scene.add.text(0, 0, config.text, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      wordWrap: { width: maxWidth },
      padding: { x: 8, y: 6 },
    });
    this.label.setOrigin(0.5);

    // Background
    const tw = this.label.width + 4;
    const th = this.label.height + 4;
    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x111128, 0.95);
    this.bg.fillRoundedRect(-tw / 2, -th / 2, tw, th, 4);
    this.bg.lineStyle(1, COLORS.panelBorder, 0.8);
    this.bg.strokeRoundedRect(-tw / 2, -th / 2, tw, th, 4);

    this.add(this.bg);
    this.add(this.label);

    // Position relative to target
    const target = config.target;
    const targetW = (target as { width?: number }).width ?? 0;
    const targetH = (target as { height?: number }).height ?? 0;
    const gap = 8;

    switch (position) {
      case 'top':
        this.setPosition(target.x + targetW / 2, target.y - th / 2 - gap);
        break;
      case 'bottom':
        this.setPosition(target.x + targetW / 2, target.y + targetH + th / 2 + gap);
        break;
      case 'left':
        this.setPosition(target.x - tw / 2 - gap, target.y + targetH / 2);
        break;
      case 'right':
        this.setPosition(target.x + targetW + tw / 2 + gap, target.y + targetH / 2);
        break;
    }

    this.setVisible(false);

    // Auto-show/hide on target hover
    if (target.input || (target as Phaser.GameObjects.Zone).setInteractive) {
      target.on('pointerover', () => this.show());
      target.on('pointerout', () => this.hide());
    }
  }

  show(): void {
    this.setVisible(true);
    this.setAlpha(0);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 120,
      ease: 'Power1',
    });
  }

  hide(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 100,
      ease: 'Power1',
      onComplete: () => this.setVisible(false),
    });
  }

  setText(text: string): void {
    this.label.setText(text);
  }
}
