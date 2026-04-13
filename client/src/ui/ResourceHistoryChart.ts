import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { ResourceType } from '@shared/enums';
import type { ResourceSnapshot } from '@shared/types';

const LINE_COLORS: Record<ResourceType, number> = {
  [ResourceType.Gold]: 0xffd700,
  [ResourceType.Wood]: 0x8b6914,
  [ResourceType.Stone]: 0xa0a0a0,
  [ResourceType.Herbs]: 0x4ecca3,
  [ResourceType.Ore]: 0xc87533,
  [ResourceType.Water]: 0x4dabf7,
  [ResourceType.Food]: 0xf59f00,
  [ResourceType.Essence]: 0xbe4bdb,
};

export type TimeRange = '1h' | '6h' | '24h' | '7d';

export class ResourceHistoryChart {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private chartGraphics: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private visible: boolean = false;

  private chartX: number = 60;
  private chartY: number = 50;
  private chartWidth: number = 520;
  private chartHeight: number = 280;

  private selectedResources: Set<ResourceType> = new Set([ResourceType.Gold, ResourceType.Food]);
  private timeRange: TimeRange = '24h';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
    this.container.setDepth(999);
    this.container.setVisible(false);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(0, 0, 620, 400, 12);
    bg.lineStyle(2, 0x0f3460, 1);
    bg.strokeRoundedRect(0, 0, 620, 400, 12);
    this.container.add(bg);

    // Title
    const title = scene.add.text(20, 12, 'Resource History', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.container.add(title);

    // Close button
    const closeBtn = scene.add.text(590, 10, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);

    // Time range buttons
    const ranges: TimeRange[] = ['1h', '6h', '24h', '7d'];
    ranges.forEach((range, i) => {
      const btn = scene.add.text(250 + i * 60, 15, range, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: range === this.timeRange ? '#ffd700' : '#8888aa',
        fontStyle: range === this.timeRange ? 'bold' : 'normal',
      });
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.timeRange = range;
        // Caller should re-fetch data and call draw()
      });
      this.container.add(btn);
    });

    // Resource toggle legend
    const types = Object.values(ResourceType);
    types.forEach((type, i) => {
      const col = i < 4 ? 0 : 1;
      const row = i % 4;
      const lx = 20 + col * 100;
      const ly = 350 + row * 14;

      const isSelected = this.selectedResources.has(type);
      const toggle = scene.add.text(lx, ly, `[${isSelected ? 'x' : ' '}] ${type}`, {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: isSelected ? '#ffffff' : '#666688',
      });
      toggle.setInteractive({ useHandCursor: true });
      toggle.on('pointerdown', () => {
        if (this.selectedResources.has(type)) {
          this.selectedResources.delete(type);
          toggle.setText(`[ ] ${type}`);
          toggle.setColor('#666688');
        } else {
          this.selectedResources.add(type);
          toggle.setText(`[x] ${type}`);
          toggle.setColor('#ffffff');
        }
      });
      this.container.add(toggle);
    });

    this.chartGraphics = scene.add.graphics();
    this.container.add(this.chartGraphics);
  }

  draw(snapshots: ResourceSnapshot[]): void {
    this.chartGraphics.clear();

    // Clear old labels
    for (const l of this.labels) l.destroy();
    this.labels = [];

    if (snapshots.length < 2) {
      const noData = this.scene.add.text(
        this.chartX + this.chartWidth / 2 - 60,
        this.chartY + this.chartHeight / 2,
        'Not enough data',
        { fontFamily: FONTS.primary, fontSize: '14px', color: '#666688' },
      );
      this.container.add(noData);
      this.labels.push(noData);
      return;
    }

    // Draw chart axes
    this.chartGraphics.lineStyle(1, 0x444466, 0.5);
    this.chartGraphics.strokeRect(this.chartX, this.chartY, this.chartWidth, this.chartHeight);

    // Grid lines
    for (let i = 1; i < 4; i++) {
      const gy = this.chartY + (this.chartHeight / 4) * i;
      this.chartGraphics.moveTo(this.chartX, gy);
      this.chartGraphics.lineTo(this.chartX + this.chartWidth, gy);
    }
    this.chartGraphics.strokePath();

    // Get time range
    const timeStart = new Date(snapshots[0].timestamp).getTime();
    const timeEnd = new Date(snapshots[snapshots.length - 1].timestamp).getTime();
    const timeSpan = timeEnd - timeStart || 1;

    // Find max value for selected resources
    let maxVal = 0;
    for (const snap of snapshots) {
      for (const resType of this.selectedResources) {
        const val = snap.resources[resType] || 0;
        if (val > maxVal) maxVal = val;
      }
    }
    if (maxVal === 0) maxVal = 100;

    // Y-axis labels
    for (let i = 0; i <= 4; i++) {
      const val = Math.floor(maxVal * (1 - i / 4));
      const ly = this.chartY + (this.chartHeight / 4) * i - 6;
      const label = this.scene.add.text(5, ly, val.toString(), {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: '#666688',
      });
      this.container.add(label);
      this.labels.push(label);
    }

    // Draw lines for each selected resource
    for (const resType of this.selectedResources) {
      const color = LINE_COLORS[resType];
      this.chartGraphics.lineStyle(2, color, 0.9);
      this.chartGraphics.beginPath();

      let first = true;
      for (const snap of snapshots) {
        const t = new Date(snap.timestamp).getTime();
        const val = snap.resources[resType] || 0;
        const px = this.chartX + ((t - timeStart) / timeSpan) * this.chartWidth;
        const py = this.chartY + this.chartHeight - (val / maxVal) * this.chartHeight;

        if (first) {
          this.chartGraphics.moveTo(px, py);
          first = false;
        } else {
          this.chartGraphics.lineTo(px, py);
        }
      }

      this.chartGraphics.strokePath();
    }

    // Time labels on X axis
    const timeLabels = 5;
    for (let i = 0; i <= timeLabels; i++) {
      const t = timeStart + (timeSpan / timeLabels) * i;
      const d = new Date(t);
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      const lx = this.chartX + (this.chartWidth / timeLabels) * i - 12;
      const label = this.scene.add.text(lx, this.chartY + this.chartHeight + 4, timeStr, {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: '#666688',
      });
      this.container.add(label);
      this.labels.push(label);
    }
  }

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }

  getTimeRange(): TimeRange {
    return this.timeRange;
  }

  getTimeRangeHours(): number {
    const map: Record<TimeRange, number> = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };
    return map[this.timeRange];
  }

  getSelectedResources(): ResourceType[] {
    return Array.from(this.selectedResources);
  }
}
