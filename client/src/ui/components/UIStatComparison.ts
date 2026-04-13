import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export interface StatComparisonEntry {
  label: string;
  before: number;
  after: number;
  suffix?: string;
}

export interface UIStatComparisonConfig {
  x: number;
  y: number;
  stats: StatComparisonEntry[];
  rowHeight?: number;
  labelWidth?: number;
  valueWidth?: number;
}

/**
 * Shows before -> after stats with green/red coloring for improvements/decreases.
 * For equipment comparisons.
 */
export class UIStatComparison extends Phaser.GameObjects.Container {
  private stats: StatComparisonEntry[];
  private rowHeight: number;
  private labelWidth: number;
  private valueWidth: number;

  constructor(scene: Phaser.Scene, config: UIStatComparisonConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.stats = config.stats;
    this.rowHeight = config.rowHeight ?? 28;
    this.labelWidth = config.labelWidth ?? 100;
    this.valueWidth = config.valueWidth ?? 60;

    this.buildRows();
  }

  private buildRows(): void {
    this.removeAll(true);

    this.stats.forEach((stat, i) => {
      const y = i * this.rowHeight;
      const suffix = stat.suffix ?? '';
      const diff = stat.after - stat.before;
      const isImprovement = diff > 0;
      const isDecrease = diff < 0;

      // Label
      const label = this.scene.add.text(0, y, stat.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      });
      label.setOrigin(0, 0.5);
      this.add(label);

      // Before value
      const beforeText = this.scene.add.text(
        this.labelWidth,
        y,
        `${stat.before}${suffix}`,
        {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        },
      );
      beforeText.setOrigin(0, 0.5);
      this.add(beforeText);

      // Arrow
      const arrow = this.scene.add.text(
        this.labelWidth + this.valueWidth,
        y,
        '\u2192',
        {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        },
      );
      arrow.setOrigin(0.5, 0.5);
      this.add(arrow);

      // After value (colored)
      const afterColor = isImprovement ? '#4ecca3' : isDecrease ? '#e94560' : COLORS.textPrimary;
      const afterText = this.scene.add.text(
        this.labelWidth + this.valueWidth + 20,
        y,
        `${stat.after}${suffix}`,
        {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: afterColor,
          fontStyle: 'bold',
        },
      );
      afterText.setOrigin(0, 0.5);
      this.add(afterText);

      // Delta text
      if (diff !== 0) {
        const sign = diff > 0 ? '+' : '';
        const deltaText = this.scene.add.text(
          this.labelWidth + this.valueWidth * 2 + 30,
          y,
          `(${sign}${diff}${suffix})`,
          {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: afterColor,
          },
        );
        deltaText.setOrigin(0, 0.5);
        this.add(deltaText);
      }
    });
  }

  setStats(stats: StatComparisonEntry[]): void {
    this.stats = stats;
    this.buildRows();
  }

  getHeight(): number {
    return this.stats.length * this.rowHeight;
  }
}
