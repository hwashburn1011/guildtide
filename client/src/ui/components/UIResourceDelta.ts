import * as Phaser from 'phaser';
import { FONTS } from '../../config';

export interface UIResourceDeltaConfig {
  x: number;
  y: number;
  value: number;
  fontSize?: number;
  duration?: number;
  floatDistance?: number;
}

/**
 * Floating "+15" or "-5" text that animates up and fades out when resource changes.
 * Color-coded green for positive, red for negative.
 */
export class UIResourceDelta extends Phaser.GameObjects.Container {
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: UIResourceDeltaConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);
    this.setDepth(300);

    const isPositive = config.value >= 0;
    const displayText = isPositive ? `+${config.value}` : `${config.value}`;
    const color = isPositive ? '#4ecca3' : '#e94560';
    const duration = config.duration ?? 1200;
    const floatDistance = config.floatDistance ?? 40;

    this.label = scene.add.text(0, 0, displayText, {
      fontFamily: FONTS.primary,
      fontSize: `${config.fontSize ?? FONTS.sizes.body}px`,
      color,
      fontStyle: 'bold',
    });
    this.label.setOrigin(0.5);
    this.add(this.label);

    // Animate up and fade
    scene.tweens.add({
      targets: this,
      y: config.y - floatDistance,
      alpha: 0,
      duration,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      },
    });
  }

  /**
   * Convenience factory method to spawn a delta indicator.
   */
  static show(scene: Phaser.Scene, x: number, y: number, value: number): UIResourceDelta {
    return new UIResourceDelta(scene, { x, y, value });
  }
}
