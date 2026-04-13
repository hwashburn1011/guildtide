import * as Phaser from 'phaser';
import { COLORS } from '../../config';

export interface UISplitPaneConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  splitRatio?: number;
  dividerWidth?: number;
  dividerColor?: number;
  leftBg?: number;
  rightBg?: number;
}

/**
 * Left/right pane layout with configurable split ratio.
 */
export class UISplitPane extends Phaser.GameObjects.Container {
  private leftContainer: Phaser.GameObjects.Container;
  private rightContainer: Phaser.GameObjects.Container;
  private divider: Phaser.GameObjects.Graphics;
  private leftBg: Phaser.GameObjects.Graphics;
  private rightBg: Phaser.GameObjects.Graphics;
  private paneWidth: number;
  private paneHeight: number;
  private splitRatio: number;
  private dividerWidth: number;

  constructor(scene: Phaser.Scene, config: UISplitPaneConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.paneWidth = config.width;
    this.paneHeight = config.height;
    this.splitRatio = config.splitRatio ?? 0.5;
    this.dividerWidth = config.dividerWidth ?? 2;

    const leftWidth = this.getLeftWidth();
    const rightWidth = this.getRightWidth();
    const dividerX = leftWidth;

    // Left background
    this.leftBg = scene.add.graphics();
    this.leftBg.fillStyle(config.leftBg ?? COLORS.panelBg, 0.95);
    this.leftBg.fillRect(0, 0, leftWidth, this.paneHeight);
    this.add(this.leftBg);

    // Right background
    this.rightBg = scene.add.graphics();
    this.rightBg.fillStyle(config.rightBg ?? COLORS.panelBg, 0.9);
    this.rightBg.fillRect(dividerX + this.dividerWidth, 0, rightWidth, this.paneHeight);
    this.add(this.rightBg);

    // Divider
    this.divider = scene.add.graphics();
    this.divider.fillStyle(config.dividerColor ?? COLORS.panelBorder, 1);
    this.divider.fillRect(dividerX, 0, this.dividerWidth, this.paneHeight);
    this.add(this.divider);

    // Left content container
    this.leftContainer = scene.add.container(0, 0);
    this.add(this.leftContainer);

    // Right content container
    this.rightContainer = scene.add.container(dividerX + this.dividerWidth, 0);
    this.add(this.rightContainer);
  }

  getLeftContainer(): Phaser.GameObjects.Container {
    return this.leftContainer;
  }

  getRightContainer(): Phaser.GameObjects.Container {
    return this.rightContainer;
  }

  getLeftWidth(): number {
    return Math.floor((this.paneWidth - this.dividerWidth) * this.splitRatio);
  }

  getRightWidth(): number {
    return this.paneWidth - this.dividerWidth - this.getLeftWidth();
  }

  setSplitRatio(ratio: number): void {
    this.splitRatio = Phaser.Math.Clamp(ratio, 0.1, 0.9);
    const leftWidth = this.getLeftWidth();
    const rightWidth = this.getRightWidth();
    const dividerX = leftWidth;

    this.leftBg.clear();
    this.leftBg.fillStyle(COLORS.panelBg, 0.95);
    this.leftBg.fillRect(0, 0, leftWidth, this.paneHeight);

    this.rightBg.clear();
    this.rightBg.fillStyle(COLORS.panelBg, 0.9);
    this.rightBg.fillRect(dividerX + this.dividerWidth, 0, rightWidth, this.paneHeight);

    this.divider.clear();
    this.divider.fillStyle(COLORS.panelBorder, 1);
    this.divider.fillRect(dividerX, 0, this.dividerWidth, this.paneHeight);

    this.rightContainer.x = dividerX + this.dividerWidth;
  }
}
