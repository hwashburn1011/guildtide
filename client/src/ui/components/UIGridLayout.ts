import * as Phaser from 'phaser';

export interface UIGridLayoutConfig {
  x: number;
  y: number;
  columns: number;
  cellWidth: number;
  cellHeight: number;
  gap?: number;
  padding?: number;
}

/**
 * Arranges child containers in a grid with configurable columns,
 * cell size, and gap. Auto-wraps to new rows.
 */
export class UIGridLayout extends Phaser.GameObjects.Container {
  private columns: number;
  private cellWidth: number;
  private cellHeight: number;
  private gap: number;
  private layoutPadding: number;
  private items: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, config: UIGridLayoutConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.columns = config.columns;
    this.cellWidth = config.cellWidth;
    this.cellHeight = config.cellHeight;
    this.gap = config.gap ?? 8;
    this.layoutPadding = config.padding ?? 0;
  }

  /**
   * Add an item to the grid. It will be positioned automatically.
   */
  addItem(item: Phaser.GameObjects.GameObject & { x: number; y: number }): void {
    this.items.push(item);
    this.add(item);
    this.layoutItems();
  }

  /**
   * Remove an item from the grid and re-layout.
   */
  removeItem(item: Phaser.GameObjects.GameObject): void {
    const idx = this.items.indexOf(item);
    if (idx !== -1) {
      this.items.splice(idx, 1);
      this.remove(item, true);
      this.layoutItems();
    }
  }

  /**
   * Clear all items and re-layout.
   */
  clearItems(): void {
    this.items.forEach((item) => this.remove(item, true));
    this.items = [];
  }

  /**
   * Replace all items and re-layout.
   */
  setItems(items: Array<Phaser.GameObjects.GameObject & { x: number; y: number }>): void {
    this.clearItems();
    items.forEach((item) => {
      this.items.push(item);
      this.add(item);
    });
    this.layoutItems();
  }

  /**
   * Reposition all items based on grid config.
   */
  layoutItems(): void {
    this.items.forEach((item, index) => {
      const col = index % this.columns;
      const row = Math.floor(index / this.columns);
      const posItem = item as unknown as { x: number; y: number };
      posItem.x = this.layoutPadding + col * (this.cellWidth + this.gap);
      posItem.y = this.layoutPadding + row * (this.cellHeight + this.gap);
    });
  }

  /**
   * Returns total grid width.
   */
  getGridWidth(): number {
    const cols = Math.min(this.items.length, this.columns);
    return this.layoutPadding * 2 + cols * this.cellWidth + Math.max(0, cols - 1) * this.gap;
  }

  /**
   * Returns total grid height.
   */
  getGridHeight(): number {
    const rows = Math.ceil(this.items.length / this.columns);
    return this.layoutPadding * 2 + rows * this.cellHeight + Math.max(0, rows - 1) * this.gap;
  }

  getItemCount(): number {
    return this.items.length;
  }

  setColumns(columns: number): void {
    this.columns = columns;
    this.layoutItems();
  }
}
