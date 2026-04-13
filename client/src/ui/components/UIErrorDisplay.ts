import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { UIButton } from './UIButton';

export interface UIErrorDisplayConfig {
  x?: number;
  y?: number;
  width?: number;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Error message display with retry button.
 * Suitable for network errors and API failures.
 */
export class UIErrorDisplay extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private iconText: Phaser.GameObjects.Text;
  private messageText: Phaser.GameObjects.Text;
  private retryBtn?: UIButton;
  private dismissBtn?: UIButton;

  constructor(scene: Phaser.Scene, config: UIErrorDisplayConfig = {}) {
    const w = config.width ?? 400;
    const cx = config.x ?? (GAME_WIDTH - w) / 2;
    const cy = config.y ?? GAME_HEIGHT / 2 - 80;

    super(scene, cx, cy);
    scene.add.existing(this);
    this.setDepth(900);

    const h = 180;

    // Panel background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x2a1015, 0.95);
    this.bg.fillRoundedRect(0, 0, w, h, 10);
    this.bg.lineStyle(2, COLORS.danger, 0.8);
    this.bg.strokeRoundedRect(0, 0, w, h, 10);
    this.add(this.bg);

    // Error icon
    this.iconText = scene.add.text(w / 2, 30, '!', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.title}px`,
      color: COLORS.textAccent,
      fontStyle: 'bold',
    });
    this.iconText.setOrigin(0.5);
    this.add(this.iconText);

    // Message
    this.messageText = scene.add.text(w / 2, 70, config.message ?? 'Something went wrong.', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
      wordWrap: { width: w - 40 },
      align: 'center',
    });
    this.messageText.setOrigin(0.5, 0);
    this.add(this.messageText);

    // Buttons
    const btnY = 130;
    if (config.onRetry) {
      this.retryBtn = new UIButton(scene, {
        x: w / 2 - 80,
        y: btnY,
        width: 100,
        height: 34,
        text: 'Retry',
        variant: 'primary',
        fontSize: FONTS.sizes.small,
        onClick: config.onRetry,
      });
      this.add(this.retryBtn);
    }

    if (config.onDismiss) {
      this.dismissBtn = new UIButton(scene, {
        x: config.onRetry ? w / 2 + 20 : w / 2 - 50,
        y: btnY,
        width: 100,
        height: 34,
        text: 'Dismiss',
        variant: 'ghost',
        fontSize: FONTS.sizes.small,
        onClick: () => {
          this.hide();
          config.onDismiss?.();
        },
      });
      this.add(this.dismissBtn);
    }

    this.setVisible(false);
  }

  show(message?: string): void {
    if (message) {
      this.messageText.setText(message);
    }
    this.setVisible(true);
    this.setAlpha(0);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });
  }

  hide(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => this.setVisible(false),
    });
  }

  setMessage(message: string): void {
    this.messageText.setText(message);
  }
}
