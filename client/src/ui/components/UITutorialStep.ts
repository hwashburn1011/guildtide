import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { UIButton } from './UIButton';

export interface TutorialTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UITutorialStepConfig {
  target: TutorialTarget;
  text: string;
  arrowPosition?: 'top' | 'bottom' | 'left' | 'right';
  stepNumber?: number;
  totalSteps?: number;
  onNext?: () => void;
  onSkip?: () => void;
}

/**
 * Highlights a screen region with a dark overlay everywhere else,
 * shows instruction text with arrow pointing to the target.
 * Next/Skip buttons.
 */
export class UITutorialStep extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Graphics;
  private textBubble: Phaser.GameObjects.Graphics;
  private instructionText: Phaser.GameObjects.Text;
  private stepLabel: Phaser.GameObjects.Text;
  private arrowGraphic: Phaser.GameObjects.Graphics;
  private nextBtn: UIButton;
  private skipBtn: UIButton;

  constructor(scene: Phaser.Scene, config: UITutorialStepConfig) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(500);

    const { target, text, arrowPosition = 'bottom' } = config;
    const padding = 8;

    // Dark overlay with cutout for the target
    this.overlay = scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);

    // Top bar
    this.overlay.fillRect(0, 0, GAME_WIDTH, target.y - padding);
    // Bottom bar
    this.overlay.fillRect(0, target.y + target.height + padding, GAME_WIDTH, GAME_HEIGHT - target.y - target.height - padding);
    // Left bar
    this.overlay.fillRect(0, target.y - padding, target.x - padding, target.height + padding * 2);
    // Right bar
    this.overlay.fillRect(
      target.x + target.width + padding,
      target.y - padding,
      GAME_WIDTH - target.x - target.width - padding,
      target.height + padding * 2,
    );

    // Block input on overlay
    const overlayZone = scene.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    overlayZone.setInteractive();
    this.add(this.overlay);
    this.add(overlayZone);

    // Highlight border around target
    const highlight = scene.add.graphics();
    highlight.lineStyle(3, COLORS.accent, 1);
    highlight.strokeRoundedRect(
      target.x - padding,
      target.y - padding,
      target.width + padding * 2,
      target.height + padding * 2,
      6,
    );
    this.add(highlight);

    // Text bubble position
    const bubbleWidth = 280;
    const bubbleHeight = 100;
    let bubbleX: number;
    let bubbleY: number;

    switch (arrowPosition) {
      case 'top':
        bubbleX = target.x + target.width / 2 - bubbleWidth / 2;
        bubbleY = target.y - padding - bubbleHeight - 20;
        break;
      case 'bottom':
        bubbleX = target.x + target.width / 2 - bubbleWidth / 2;
        bubbleY = target.y + target.height + padding + 20;
        break;
      case 'left':
        bubbleX = target.x - padding - bubbleWidth - 20;
        bubbleY = target.y + target.height / 2 - bubbleHeight / 2;
        break;
      case 'right':
        bubbleX = target.x + target.width + padding + 20;
        bubbleY = target.y + target.height / 2 - bubbleHeight / 2;
        break;
    }

    // Clamp to screen
    bubbleX = Phaser.Math.Clamp(bubbleX, 10, GAME_WIDTH - bubbleWidth - 10);
    bubbleY = Phaser.Math.Clamp(bubbleY, 10, GAME_HEIGHT - bubbleHeight - 10);

    // Background bubble
    this.textBubble = scene.add.graphics();
    this.textBubble.fillStyle(COLORS.panelBg, 0.97);
    this.textBubble.fillRoundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
    this.textBubble.lineStyle(2, COLORS.accent, 0.8);
    this.textBubble.strokeRoundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
    this.add(this.textBubble);

    // Arrow indicator
    this.arrowGraphic = scene.add.graphics();
    this.arrowGraphic.fillStyle(COLORS.accent, 1);
    this.drawArrow(target, bubbleX, bubbleY, bubbleWidth, bubbleHeight, arrowPosition);
    this.add(this.arrowGraphic);

    // Instruction text
    this.instructionText = scene.add.text(bubbleX + 12, bubbleY + 10, text, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      wordWrap: { width: bubbleWidth - 24 },
    });
    this.add(this.instructionText);

    // Step label
    const stepStr = config.stepNumber && config.totalSteps
      ? `Step ${config.stepNumber} of ${config.totalSteps}`
      : '';
    this.stepLabel = scene.add.text(bubbleX + 12, bubbleY + bubbleHeight - 24, stepStr, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    this.add(this.stepLabel);

    // Next button
    this.nextBtn = new UIButton(scene, {
      x: bubbleX + bubbleWidth - 80,
      y: bubbleY + bubbleHeight - 32,
      width: 64,
      height: 26,
      text: 'Next',
      variant: 'primary',
      fontSize: FONTS.sizes.tiny,
      onClick: () => config.onNext?.(),
    });
    this.add(this.nextBtn);

    // Skip button
    this.skipBtn = new UIButton(scene, {
      x: bubbleX + bubbleWidth - 150,
      y: bubbleY + bubbleHeight - 32,
      width: 60,
      height: 26,
      text: 'Skip',
      variant: 'ghost',
      fontSize: FONTS.sizes.tiny,
      onClick: () => config.onSkip?.(),
    });
    this.add(this.skipBtn);
  }

  private drawArrow(
    target: TutorialTarget,
    bubbleX: number,
    bubbleY: number,
    bubbleW: number,
    bubbleH: number,
    position: string,
  ): void {
    const arrowSize = 10;
    let ax: number, ay: number;

    switch (position) {
      case 'bottom':
        ax = bubbleX + bubbleW / 2;
        ay = bubbleY;
        this.arrowGraphic.fillTriangle(ax, ay - arrowSize, ax - arrowSize, ay, ax + arrowSize, ay);
        break;
      case 'top':
        ax = bubbleX + bubbleW / 2;
        ay = bubbleY + bubbleH;
        this.arrowGraphic.fillTriangle(ax, ay + arrowSize, ax - arrowSize, ay, ax + arrowSize, ay);
        break;
      case 'right':
        ax = bubbleX;
        ay = bubbleY + bubbleH / 2;
        this.arrowGraphic.fillTriangle(ax - arrowSize, ay, ax, ay - arrowSize, ax, ay + arrowSize);
        break;
      case 'left':
        ax = bubbleX + bubbleW;
        ay = bubbleY + bubbleH / 2;
        this.arrowGraphic.fillTriangle(ax + arrowSize, ay, ax, ay - arrowSize, ax, ay + arrowSize);
        break;
    }
  }

  dismiss(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => this.destroy(),
    });
  }
}
