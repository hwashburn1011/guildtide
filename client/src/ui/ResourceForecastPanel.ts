import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import { ResourceType } from '@shared/enums';
import type { ResourceForecast } from '@shared/types';

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

export class ResourceForecastPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentElements: Phaser.GameObjects.GameObject[] = [];
  private visible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_WIDTH / 2 - 200, 100);
    this.container.setDepth(1000);
    this.container.setVisible(false);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(0, 0, 400, 380, 12);
    bg.lineStyle(2, 0x0f3460, 1);
    bg.strokeRoundedRect(0, 0, 400, 380, 12);
    this.container.add(bg);

    // Title
    const title = scene.add.text(20, 12, 'Resource Forecast', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.container.add(title);

    // Close
    const closeBtn = scene.add.text(370, 10, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);
  }

  setForecasts(forecasts: ResourceForecast[]): void {
    for (const el of this.contentElements) el.destroy();
    this.contentElements = [];

    let y = 50;

    // Header
    const headers = ['Resource', 'Rate/hr', 'Full in', 'Empty in'];
    const xs = [20, 120, 230, 320];
    headers.forEach((h, i) => {
      const t = this.scene.add.text(xs[i], y, h, {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: '#8888aa',
        fontStyle: 'bold',
      });
      this.container.add(t);
      this.contentElements.push(t);
    });
    y += 22;

    for (const forecast of forecasts) {
      const color = RESOURCE_COLORS[forecast.resource];

      // Resource name
      const nameText = this.scene.add.text(20, y, forecast.resource, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color,
      });
      this.container.add(nameText);
      this.contentElements.push(nameText);

      // Rate per hour
      const rateStr = forecast.netRatePerHour >= 0
        ? `+${forecast.netRatePerHour.toFixed(1)}`
        : forecast.netRatePerHour.toFixed(1);
      const rateColor = forecast.netRatePerHour >= 0 ? '#4ecca3' : '#ff6b6b';
      const rateText = this.scene.add.text(120, y, rateStr, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: rateColor,
      });
      this.container.add(rateText);
      this.contentElements.push(rateText);

      // Hours until full
      const fullStr = forecast.hoursUntilFull !== null
        ? ResourceForecastPanel.formatDuration(forecast.hoursUntilFull)
        : '--';
      const fullColor = forecast.hoursUntilFull !== null && forecast.hoursUntilFull < 1
        ? '#ffd700' : '#ffffff';
      const fullText = this.scene.add.text(230, y, fullStr, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: fullColor,
      });
      this.container.add(fullText);
      this.contentElements.push(fullText);

      // Hours until empty
      const emptyStr = forecast.hoursUntilEmpty !== null
        ? ResourceForecastPanel.formatDuration(forecast.hoursUntilEmpty)
        : '--';
      const emptyColor = forecast.hoursUntilEmpty !== null && forecast.hoursUntilEmpty < 2
        ? '#ff4444' : '#ffffff';
      const emptyText = this.scene.add.text(320, y, emptyStr, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: emptyColor,
      });
      this.container.add(emptyText);
      this.contentElements.push(emptyText);

      // Storage bar
      y += 18;
      const barWidth = 360;
      const pct = Math.min(1, forecast.currentAmount / forecast.cap);
      const barG = this.scene.add.graphics();
      barG.x = 20;
      barG.y = y;
      barG.fillStyle(0x333355, 0.5);
      barG.fillRect(0, 0, barWidth, 5);
      const fillColor = pct >= 1 ? 0xffd700 : pct < 0.2 ? 0xff4444 : 0x4ecca3;
      barG.fillStyle(fillColor, 0.7);
      barG.fillRect(0, 0, barWidth * pct, 5);
      this.container.add(barG);
      this.contentElements.push(barG as any);

      y += 14;
    }
  }

  private static formatDuration(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
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
}
