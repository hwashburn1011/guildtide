import * as Phaser from 'phaser';
import { COLORS } from '../../config';

export interface UIPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: number;
  fillAlpha?: number;
  borderColor?: number;
  borderAlpha?: number;
  borderWidth?: number;
  cornerRadius?: number;
}

/**
 * Base panel class: rounded rect background with border.
 * Other panels can extend or compose this.
 */
export class UIPanel extends Phaser.GameObjects.Container {
  protected bg: Phaser.GameObjects.Graphics;
  protected panelWidth: number;
  protected panelHeight: number;

  constructor(scene: Phaser.Scene, config: UIPanelConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.panelWidth = config.width;
    this.panelHeight = config.height;

    const fillColor = config.fillColor ?? COLORS.panelBg;
    const fillAlpha = config.fillAlpha ?? 0.95;
    const borderColor = config.borderColor ?? COLORS.panelBorder;
    const borderAlpha = config.borderAlpha ?? 1;
    const borderWidth = config.borderWidth ?? 2;
    const cornerRadius = config.cornerRadius ?? 8;

    this.bg = scene.add.graphics();
    this.bg.lineStyle(borderWidth, borderColor, borderAlpha);
    this.bg.fillStyle(fillColor, fillAlpha);
    this.bg.fillRoundedRect(0, 0, this.panelWidth, this.panelHeight, cornerRadius);
    this.bg.strokeRoundedRect(0, 0, this.panelWidth, this.panelHeight, cornerRadius);
    this.add(this.bg);
  }

  /** Redraw background (call after resizing). */
  protected redrawBackground(
    width: number,
    height: number,
    fillColor?: number,
    borderColor?: number,
    cornerRadius?: number,
  ): void {
    this.panelWidth = width;
    this.panelHeight = height;
    this.bg.clear();
    this.bg.lineStyle(2, borderColor ?? COLORS.panelBorder, 1);
    this.bg.fillStyle(fillColor ?? COLORS.panelBg, 0.95);
    this.bg.fillRoundedRect(0, 0, width, height, cornerRadius ?? 8);
    this.bg.strokeRoundedRect(0, 0, width, height, cornerRadius ?? 8);
  }
}
