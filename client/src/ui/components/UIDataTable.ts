import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export interface DataTableColumn {
  key: string;
  label: string;
  width: number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface UIDataTableConfig {
  x: number;
  y: number;
  columns: DataTableColumn[];
  rows: Record<string, string | number>[];
  rowHeight?: number;
  headerColor?: number;
  evenRowColor?: number;
  oddRowColor?: number;
  onSort?: (key: string, ascending: boolean) => void;
}

/**
 * Table with column headers, sortable by clicking header, row data,
 * and alternating row colors.
 */
export class UIDataTable extends Phaser.GameObjects.Container {
  private columns: DataTableColumn[];
  private rows: Record<string, string | number>[];
  private rowHeight: number;
  private headerColor: number;
  private evenRowColor: number;
  private oddRowColor: number;
  private sortKey: string | null = null;
  private sortAscending: boolean = true;
  private onSortCallback?: (key: string, ascending: boolean) => void;
  private headerContainer: Phaser.GameObjects.Container;
  private bodyContainer: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, config: UIDataTableConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.columns = config.columns;
    this.rows = [...config.rows];
    this.rowHeight = config.rowHeight ?? 32;
    this.headerColor = config.headerColor ?? 0x1a1a3e;
    this.evenRowColor = config.evenRowColor ?? 0x111128;
    this.oddRowColor = config.oddRowColor ?? 0x16213e;
    this.onSortCallback = config.onSort;

    this.headerContainer = scene.add.container(0, 0);
    this.add(this.headerContainer);

    this.bodyContainer = scene.add.container(0, this.rowHeight);
    this.add(this.bodyContainer);

    this.buildHeader();
    this.buildRows();
  }

  private getTotalWidth(): number {
    return this.columns.reduce((sum, col) => sum + col.width, 0);
  }

  private buildHeader(): void {
    this.headerContainer.removeAll(true);

    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(this.headerColor, 1);
    headerBg.fillRect(0, 0, this.getTotalWidth(), this.rowHeight);
    this.headerContainer.add(headerBg);

    let xOff = 0;
    this.columns.forEach((col) => {
      const sortIndicator = this.sortKey === col.key
        ? (this.sortAscending ? ' \u25b2' : ' \u25bc')
        : '';

      const headerText = this.scene.add.text(xOff + 8, this.rowHeight / 2, col.label + sortIndicator, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      });
      headerText.setOrigin(0, 0.5);
      this.headerContainer.add(headerText);

      if (col.sortable !== false) {
        const zone = this.scene.add.zone(xOff + col.width / 2, this.rowHeight / 2, col.width, this.rowHeight);
        zone.setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          if (this.sortKey === col.key) {
            this.sortAscending = !this.sortAscending;
          } else {
            this.sortKey = col.key;
            this.sortAscending = true;
          }
          this.sortRows();
          this.buildHeader();
          this.buildRows();
          this.onSortCallback?.(col.key, this.sortAscending);
        });
        this.headerContainer.add(zone);
      }

      xOff += col.width;
    });
  }

  private buildRows(): void {
    this.bodyContainer.removeAll(true);

    this.rows.forEach((row, rowIndex) => {
      const rowBg = this.scene.add.graphics();
      const bgColor = rowIndex % 2 === 0 ? this.evenRowColor : this.oddRowColor;
      rowBg.fillStyle(bgColor, 0.8);
      rowBg.fillRect(0, rowIndex * this.rowHeight, this.getTotalWidth(), this.rowHeight);
      this.bodyContainer.add(rowBg);

      let xOff = 0;
      this.columns.forEach((col) => {
        const cellValue = String(row[col.key] ?? '');
        const cellText = this.scene.add.text(
          xOff + 8,
          rowIndex * this.rowHeight + this.rowHeight / 2,
          cellValue,
          {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textSecondary,
          },
        );
        cellText.setOrigin(0, 0.5);

        if (col.align === 'center') {
          cellText.setX(xOff + col.width / 2);
          cellText.setOrigin(0.5, 0.5);
        } else if (col.align === 'right') {
          cellText.setX(xOff + col.width - 8);
          cellText.setOrigin(1, 0.5);
        }

        this.bodyContainer.add(cellText);
        xOff += col.width;
      });
    });
  }

  private sortRows(): void {
    if (!this.sortKey) return;
    const key = this.sortKey;
    const asc = this.sortAscending;
    this.rows.sort((a, b) => {
      const va = a[key] ?? '';
      const vb = b[key] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return asc ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      return asc ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }

  setRows(rows: Record<string, string | number>[]): void {
    this.rows = [...rows];
    if (this.sortKey) this.sortRows();
    this.buildRows();
  }

  getTableHeight(): number {
    return this.rowHeight * (this.rows.length + 1);
  }
}
