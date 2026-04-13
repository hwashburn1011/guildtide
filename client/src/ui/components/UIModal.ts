import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../../config';
import { UIButton } from './UIButton';

export interface UIModalConfig {
  title: string;
  width?: number;
  height?: number;
  onClose?: () => void;
}

/**
 * Full-screen overlay with centered panel. Open/close with fade.
 * Blocks input behind the modal via a full-screen interactive overlay.
 */
export class UIModal extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Graphics;
  private panel: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text;
  private closeBtn: UIButton;
  private contentContainer: Phaser.GameObjects.Container;
  private modalWidth: number;
  private modalHeight: number;
  private onCloseCallback?: () => void;

  constructor(scene: Phaser.Scene, config: UIModalConfig) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(1000);

    this.modalWidth = config.width ?? 500;
    this.modalHeight = config.height ?? 400;
    this.onCloseCallback = config.onClose;

    // Full-screen semi-transparent overlay (blocks input)
    this.overlay = scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.6);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const overlayZone = scene.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    overlayZone.setInteractive();
    overlayZone.on('pointerdown', () => this.close());
    this.add(this.overlay);
    this.add(overlayZone);

    // Panel
    const px = (GAME_WIDTH - this.modalWidth) / 2;
    const py = (GAME_HEIGHT - this.modalHeight) / 2;

    this.panel = scene.add.graphics();
    this.panel.fillStyle(COLORS.panelBg, 1);
    this.panel.fillRoundedRect(px, py, this.modalWidth, this.modalHeight, 12);
    this.panel.lineStyle(2, COLORS.panelBorder, 1);
    this.panel.strokeRoundedRect(px, py, this.modalWidth, this.modalHeight, 12);
    // Stop clicks on panel from propagating to overlay
    const panelZone = scene.add.zone(
      px + this.modalWidth / 2,
      py + this.modalHeight / 2,
      this.modalWidth,
      this.modalHeight,
    );
    panelZone.setInteractive();
    this.add(this.panel);
    this.add(panelZone);

    // Title
    this.titleText = scene.add.text(px + 20, py + 15, config.title, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.add(this.titleText);

    // Close button
    this.closeBtn = new UIButton(scene, {
      x: px + this.modalWidth - 50,
      y: py + 10,
      width: 36,
      height: 36,
      text: 'X',
      variant: 'ghost',
      fontSize: FONTS.sizes.body,
      onClick: () => this.close(),
    });
    this.add(this.closeBtn);

    // Content area container
    this.contentContainer = scene.add.container(px + 20, py + 55);
    this.add(this.contentContainer);

    // Start hidden, show with fade
    this.setAlpha(0);
  }

  /** Returns the container where content should be added. */
  getContentContainer(): Phaser.GameObjects.Container {
    return this.contentContainer;
  }

  open(): void {
    this.setVisible(true);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });
  }

  close(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.setVisible(false);
        this.onCloseCallback?.();
      },
    });
  }

  setTitle(title: string): void {
    this.titleText.setText(title);
  }
}
