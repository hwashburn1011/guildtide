import * as Phaser from 'phaser';
import { COLORS } from '../../config';

export interface UIScrollableListConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  showScrollbar?: boolean;
  scrollbarWidth?: number;
  scrollbarColor?: number;
}

/**
 * Phaser container with masked viewport, drag-to-scroll, and optional scrollbar.
 * Add children to getContentContainer() and call refreshScroll() when content changes.
 */
export class UIScrollableList extends Phaser.GameObjects.Container {
  private contentContainer: Phaser.GameObjects.Container;
  private scrollbar?: Phaser.GameObjects.Graphics;
  private viewWidth: number;
  private viewHeight: number;
  private scrollOffset: number = 0;
  private contentHeight: number = 0;
  private showScrollbar: boolean;
  private scrollbarWidth: number;
  private scrollbarColor: number;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartOffset: number = 0;

  constructor(scene: Phaser.Scene, config: UIScrollableListConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.viewWidth = config.width;
    this.viewHeight = config.height;
    this.showScrollbar = config.showScrollbar ?? true;
    this.scrollbarWidth = config.scrollbarWidth ?? 6;
    this.scrollbarColor = config.scrollbarColor ?? COLORS.panelBorder;

    // Content container
    this.contentContainer = scene.add.container(0, 0);
    this.add(this.contentContainer);

    // Mask
    const maskGraphics = scene.make.graphics({ x: 0, y: 0 });
    maskGraphics.fillRect(config.x, config.y, this.viewWidth, this.viewHeight);
    const mask = maskGraphics.createGeometryMask();
    this.contentContainer.setMask(mask);

    // Scrollbar
    if (this.showScrollbar) {
      this.scrollbar = scene.add.graphics();
      this.add(this.scrollbar);
    }

    // Input: drag-to-scroll
    const zone = scene.add.zone(this.viewWidth / 2, this.viewHeight / 2, this.viewWidth, this.viewHeight);
    zone.setInteractive({ draggable: true });

    zone.on('dragstart', (_pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartY = _pointer.y;
      this.dragStartOffset = this.scrollOffset;
    });

    zone.on('drag', (_pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const delta = this.dragStartY - _pointer.y;
      this.setScroll(this.dragStartOffset + delta);
    });

    zone.on('dragend', () => {
      this.isDragging = false;
    });

    // Mouse wheel
    zone.on('wheel', (_pointer: Phaser.Input.Pointer, _dx: number, _dy: number, dz: number) => {
      this.setScroll(this.scrollOffset + dz * 0.5);
    });

    this.add(zone);
  }

  getContentContainer(): Phaser.GameObjects.Container {
    return this.contentContainer;
  }

  /**
   * Call after adding/removing children to recalculate scroll bounds.
   */
  refreshScroll(totalContentHeight: number): void {
    this.contentHeight = totalContentHeight;
    this.setScroll(this.scrollOffset);
    this.drawScrollbar();
  }

  private setScroll(offset: number): void {
    const maxScroll = Math.max(0, this.contentHeight - this.viewHeight);
    this.scrollOffset = Phaser.Math.Clamp(offset, 0, maxScroll);
    this.contentContainer.y = -this.scrollOffset;
    this.drawScrollbar();
  }

  scrollToTop(): void {
    this.setScroll(0);
  }

  scrollToBottom(): void {
    this.setScroll(this.contentHeight);
  }

  private drawScrollbar(): void {
    if (!this.scrollbar || !this.showScrollbar) return;
    this.scrollbar.clear();

    if (this.contentHeight <= this.viewHeight) return;

    const trackX = this.viewWidth - this.scrollbarWidth - 2;
    const ratio = this.viewHeight / this.contentHeight;
    const thumbHeight = Math.max(ratio * this.viewHeight, 20);
    const maxScroll = this.contentHeight - this.viewHeight;
    const thumbY = maxScroll > 0 ? (this.scrollOffset / maxScroll) * (this.viewHeight - thumbHeight) : 0;

    // Track
    this.scrollbar.fillStyle(0x111128, 0.3);
    this.scrollbar.fillRoundedRect(trackX, 0, this.scrollbarWidth, this.viewHeight, 3);

    // Thumb
    this.scrollbar.fillStyle(this.scrollbarColor, 0.8);
    this.scrollbar.fillRoundedRect(trackX, thumbY, this.scrollbarWidth, thumbHeight, 3);
  }
}
