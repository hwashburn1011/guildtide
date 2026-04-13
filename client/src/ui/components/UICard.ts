import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export interface UICardConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  titleColor?: string;
  fillColor?: number;
  borderColor?: number;
  cornerRadius?: number;
}

/**
 * Rounded rect container with title area and body area.
 */
export class UICard extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private titleText?: Phaser.GameObjects.Text;
  private bodyContainer: Phaser.GameObjects.Container;
  private cardWidth: number;
  private cardHeight: number;

  private static readonly TITLE_HEIGHT = 36;

  constructor(scene: Phaser.Scene, config: UICardConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.cardWidth = config.width;
    this.cardHeight = config.height;
    const radius = config.cornerRadius ?? 8;
    const fillColor = config.fillColor ?? COLORS.panelBg;
    const borderColor = config.borderColor ?? COLORS.panelBorder;

    // Background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(fillColor, 0.95);
    this.bg.fillRoundedRect(0, 0, this.cardWidth, this.cardHeight, radius);
    this.bg.lineStyle(2, borderColor, 1);
    this.bg.strokeRoundedRect(0, 0, this.cardWidth, this.cardHeight, radius);
    this.add(this.bg);

    let bodyY = 10;

    // Title area
    if (config.title) {
      // Title divider line
      this.bg.lineStyle(1, borderColor, 0.5);
      this.bg.lineBetween(0, UICard.TITLE_HEIGHT, this.cardWidth, UICard.TITLE_HEIGHT);

      this.titleText = scene.add.text(12, 8, config.title, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: config.titleColor ?? COLORS.textPrimary,
        fontStyle: 'bold',
      });
      this.add(this.titleText);
      bodyY = UICard.TITLE_HEIGHT + 8;
    }

    // Body container
    this.bodyContainer = scene.add.container(12, bodyY);
    this.add(this.bodyContainer);
  }

  getBodyContainer(): Phaser.GameObjects.Container {
    return this.bodyContainer;
  }

  setTitle(title: string): void {
    this.titleText?.setText(title);
  }
}
