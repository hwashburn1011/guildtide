import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { ResourceType } from '@shared/enums';
import type { ResourceBreakdown, ResourceMultipliers, ResourceForecast } from '@shared/types';

const RESOURCE_COLORS: Record<ResourceType, string> = {
  [ResourceType.Gold]: '#ffd700',
  [ResourceType.Wood]: '#8b6914',
  [ResourceType.Stone]: '#a0a0a0',
  [ResourceType.Herbs]: '#4ecca3',
  [ResourceType.Ore]: '#c87533',
  [ResourceType.Water]: '#4dabf7',
  [ResourceType.Food]: '#f59f00',
  [ResourceType.Essence]: '#be4bdb',
};

export class ResourceDetailPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentTexts: Phaser.GameObjects.Text[] = [];
  private visible: boolean = false;
  private selectedResource: ResourceType = ResourceType.Gold;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_WIDTH / 2 - 250, 80);
    this.container.setDepth(1000);
    this.container.setVisible(false);

    // Background panel
    const bg = scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(0, 0, 500, 500, 12);
    bg.lineStyle(2, 0x0f3460, 1);
    bg.strokeRoundedRect(0, 0, 500, 500, 12);
    this.container.add(bg);

    // Title
    const title = scene.add.text(20, 15, 'Resource Details', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.container.add(title);

    // Close button
    const closeBtn = scene.add.text(460, 10, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);

    // Resource tabs
    const types = Object.values(ResourceType);
    const tabWidth = 500 / types.length;
    types.forEach((type, i) => {
      const tab = scene.add.text(i * tabWidth + 5, 50, type.charAt(0).toUpperCase() + type.slice(1), {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: RESOURCE_COLORS[type],
      });
      tab.setInteractive({ useHandCursor: true });
      tab.on('pointerdown', () => {
        this.selectedResource = type;
        // Trigger refresh via callback if provided
      });
      this.container.add(tab);
    });
  }

  show(
    resource: ResourceType,
    breakdown: ResourceBreakdown,
    multipliers: ResourceMultipliers,
    cap: number,
    current: number,
    forecast: ResourceForecast | null,
  ): void {
    this.selectedResource = resource;
    this.visible = true;
    this.container.setVisible(true);

    // Clear previous content
    for (const t of this.contentTexts) t.destroy();
    this.contentTexts = [];

    let y = 75;
    const addText = (x: number, yPos: number, text: string, color: string = COLORS.textPrimary, size: number = FONTS.sizes.small) => {
      const t = this.scene.add.text(x, yPos, text, {
        fontFamily: FONTS.primary,
        fontSize: `${size}px`,
        color,
      });
      this.container.add(t);
      this.contentTexts.push(t);
      return t;
    };

    // Resource name and current/cap
    const resColor = RESOURCE_COLORS[resource];
    addText(20, y, `${resource.charAt(0).toUpperCase() + resource.slice(1)}`, resColor, FONTS.sizes.body);
    addText(200, y, `${Math.floor(current)} / ${cap}`, COLORS.textPrimary, FONTS.sizes.body);
    y += 30;

    // Storage bar
    const barG = this.scene.add.graphics();
    barG.x = 20;
    barG.y = y;
    const barWidth = 460;
    const pct = Math.min(1, current / cap);
    barG.fillStyle(0x333355, 0.5);
    barG.fillRect(0, 0, barWidth, 8);
    barG.fillStyle(pct >= 1 ? 0xffd700 : pct < 0.2 ? 0xff4444 : 0x4ecca3, 0.8);
    barG.fillRect(0, 0, barWidth * pct, 8);
    this.container.add(barG);
    this.contentTexts.push(barG as any);
    y += 20;

    // Production sources
    addText(20, y, 'Production Sources', '#8888aa', FONTS.sizes.small);
    y += 18;

    if (breakdown.production.length === 0) {
      addText(30, y, 'No active production', '#666688');
      y += 16;
    } else {
      for (const source of breakdown.production) {
        addText(30, y, source.source, COLORS.textSecondary);
        addText(350, y, `+${source.amount.toFixed(1)}/hr`, '#4ecca3');
        y += 16;
      }
    }
    y += 10;

    // Consumption
    addText(20, y, 'Consumption', '#8888aa', FONTS.sizes.small);
    y += 18;

    if (breakdown.consumption.length === 0) {
      addText(30, y, 'No active consumption', '#666688');
      y += 16;
    } else {
      for (const sink of breakdown.consumption) {
        addText(30, y, sink.source, COLORS.textSecondary);
        addText(350, y, `-${sink.amount.toFixed(1)}/hr`, '#ff6b6b');
        y += 16;
      }
    }
    y += 10;

    // Net rate
    const netColor = breakdown.netRate >= 0 ? '#4ecca3' : '#ff6b6b';
    const netPrefix = breakdown.netRate >= 0 ? '+' : '';
    addText(20, y, 'Net Rate:', '#8888aa');
    addText(200, y, `${netPrefix}${breakdown.netRate.toFixed(1)}/hr`, netColor, FONTS.sizes.body);
    y += 25;

    // Multipliers
    addText(20, y, 'Active Multipliers', '#8888aa', FONTS.sizes.small);
    y += 18;

    const multCategories: Array<[string, Partial<Record<ResourceType, number>>]> = [
      ['Weather', multipliers.weather],
      ['Season', multipliers.season],
      ['Research', multipliers.research],
      ['Items', multipliers.items],
    ];

    let hasMultiplier = false;
    for (const [label, mults] of multCategories) {
      const val = mults[resource];
      if (val && val !== 0) {
        hasMultiplier = true;
        const pctStr = val > 0 ? `+${(val * 100).toFixed(0)}%` : `${(val * 100).toFixed(0)}%`;
        const color = val > 0 ? '#4ecca3' : '#ff6b6b';
        addText(30, y, label, COLORS.textSecondary);
        addText(350, y, pctStr, color);
        y += 16;
      }
    }
    if (!hasMultiplier) {
      addText(30, y, 'No active multipliers', '#666688');
      y += 16;
    }
    y += 10;

    // Forecast
    if (forecast) {
      addText(20, y, 'Forecast', '#8888aa', FONTS.sizes.small);
      y += 18;

      if (forecast.hoursUntilFull !== null) {
        const hours = forecast.hoursUntilFull;
        const label = hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`;
        addText(30, y, `Storage full in: ${label}`, '#ffd700');
        y += 16;
      }
      if (forecast.hoursUntilEmpty !== null) {
        const hours = forecast.hoursUntilEmpty;
        const label = hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`;
        addText(30, y, `Depleted in: ${label}`, '#ff4444');
        y += 16;
      }
      if (forecast.hoursUntilFull === null && forecast.hoursUntilEmpty === null) {
        addText(30, y, 'Stable (no change projected)', '#666688');
        y += 16;
      }
    }
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
    for (const t of this.contentTexts) t.destroy();
    this.contentTexts = [];
  }

  isVisible(): boolean {
    return this.visible;
  }

  toggle(
    resource: ResourceType,
    breakdown: ResourceBreakdown,
    multipliers: ResourceMultipliers,
    cap: number,
    current: number,
    forecast: ResourceForecast | null,
  ): void {
    if (this.visible && this.selectedResource === resource) {
      this.hide();
    } else {
      this.show(resource, breakdown, multipliers, cap, current, forecast);
    }
  }
}
