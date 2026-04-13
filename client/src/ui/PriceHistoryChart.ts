/**
 * Canvas sparkline chart for market price history.
 *
 * T-0556: Price history chart with line graph and time axis
 * T-0557: Price trend indicators with color coding
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';

interface PricePoint {
  timestamp: number;
  price: number;
}

interface ChartConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  data: PricePoint[];
  label: string;
  color?: string;
  showAxis?: boolean;
}

const TREND_COLORS = {
  rising: '#ff4444',
  falling: '#4ecca3',
  stable: '#a0a0b0',
};

export class PriceHistoryChart {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
  }

  render(config: ChartConfig): Phaser.GameObjects.Container {
    this.container.removeAll(true);

    const { x, y, width, height, data, label, showAxis = true } = config;
    this.container.setPosition(x, y);

    if (data.length < 2) {
      this.container.add(
        this.scene.add.text(width / 2, height / 2, 'No data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5),
      );
      return this.container;
    }

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.6);
    bg.fillRoundedRect(0, 0, width, height, 4);
    bg.lineStyle(1, COLORS.panelBorder, 0.5);
    bg.strokeRoundedRect(0, 0, width, height, 4);
    this.container.add(bg);

    // Chart area with padding
    const pad = { top: 25, right: 10, bottom: showAxis ? 25 : 10, left: showAxis ? 40 : 10 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    // Label
    this.container.add(
      this.scene.add.text(pad.left, 5, label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );

    // Determine trend
    const firstPrice = data[0].price;
    const lastPrice = data[data.length - 1].price;
    const change = lastPrice - firstPrice;
    const trend = change > 0 ? 'rising' : change < 0 ? 'falling' : 'stable';
    const lineColor = config.color ?? TREND_COLORS[trend];

    // Price change label
    const pctChange = firstPrice > 0 ? ((change / firstPrice) * 100).toFixed(1) : '0.0';
    const changeText = change >= 0 ? `+${pctChange}%` : `${pctChange}%`;
    this.container.add(
      this.scene.add.text(width - pad.right, 5, changeText, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: lineColor,
        fontStyle: 'bold',
      }).setOrigin(1, 0),
    );

    // Data range
    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Draw grid lines
    const gridGfx = this.scene.add.graphics();
    gridGfx.lineStyle(1, 0x333355, 0.3);
    for (let i = 0; i <= 4; i++) {
      const gy = pad.top + (chartH / 4) * i;
      gridGfx.moveTo(pad.left, gy);
      gridGfx.lineTo(pad.left + chartW, gy);
    }
    gridGfx.strokePath();
    this.container.add(gridGfx);

    // Draw sparkline
    const lineGfx = this.scene.add.graphics();
    const colorNum = Phaser.Display.Color.HexStringToColor(lineColor).color;
    lineGfx.lineStyle(2, colorNum, 1);

    const points: Array<{ px: number; py: number }> = [];
    for (let i = 0; i < data.length; i++) {
      const px = pad.left + (i / (data.length - 1)) * chartW;
      const py = pad.top + chartH - ((data[i].price - minPrice) / priceRange) * chartH;
      points.push({ px, py });
    }

    lineGfx.beginPath();
    lineGfx.moveTo(points[0].px, points[0].py);
    for (let i = 1; i < points.length; i++) {
      lineGfx.lineTo(points[i].px, points[i].py);
    }
    lineGfx.strokePath();

    // Fill area under line
    const fillGfx = this.scene.add.graphics();
    fillGfx.fillStyle(colorNum, 0.1);
    fillGfx.beginPath();
    fillGfx.moveTo(points[0].px, pad.top + chartH);
    for (const p of points) {
      fillGfx.lineTo(p.px, p.py);
    }
    fillGfx.lineTo(points[points.length - 1].px, pad.top + chartH);
    fillGfx.closePath();
    fillGfx.fillPath();

    this.container.add(fillGfx);
    this.container.add(lineGfx);

    // Current price dot
    const lastPt = points[points.length - 1];
    const dot = this.scene.add.graphics();
    dot.fillStyle(colorNum, 1);
    dot.fillCircle(lastPt.px, lastPt.py, 4);
    this.container.add(dot);

    // Y-axis labels
    if (showAxis) {
      for (let i = 0; i <= 4; i++) {
        const val = minPrice + (priceRange / 4) * (4 - i);
        this.container.add(
          this.scene.add.text(pad.left - 5, pad.top + (chartH / 4) * i, `${Math.round(val)}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          }).setOrigin(1, 0.5),
        );
      }

      // X-axis time labels
      const timeLabels = [0, Math.floor(data.length / 2), data.length - 1];
      for (const idx of timeLabels) {
        if (idx >= data.length) continue;
        const d = new Date(data[idx].timestamp);
        const timeStr = `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
        const tx = pad.left + (idx / (data.length - 1)) * chartW;
        this.container.add(
          this.scene.add.text(tx, pad.top + chartH + 5, timeStr, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          }).setOrigin(0.5, 0),
        );
      }
    }

    return this.container;
  }

  /** Render a mini sparkline (no axis, compact) */
  renderSparkline(
    x: number,
    y: number,
    width: number,
    height: number,
    prices: number[],
    color?: string,
  ): Phaser.GameObjects.Container {
    const data = prices.map((price, i) => ({
      timestamp: Date.now() - (prices.length - i) * 3600000,
      price,
    }));
    return this.render({ x, y, width, height, data, label: '', color, showAxis: false });
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
