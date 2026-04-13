import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import { ResourceType } from '@shared/enums';
import type { Resources } from '@shared/types';

const RESOURCE_ICONS: Record<ResourceType, { label: string; color: string }> = {
  [ResourceType.Gold]: { label: 'Gold', color: '#ffd700' },
  [ResourceType.Wood]: { label: 'Wood', color: '#8b6914' },
  [ResourceType.Stone]: { label: 'Stone', color: '#a0a0a0' },
  [ResourceType.Herbs]: { label: 'Herbs', color: '#4ecca3' },
  [ResourceType.Ore]: { label: 'Ore', color: '#c87533' },
  [ResourceType.Water]: { label: 'Water', color: '#4dabf7' },
  [ResourceType.Food]: { label: 'Food', color: '#f59f00' },
  [ResourceType.Essence]: { label: 'Essence', color: '#be4bdb' },
};

const SCARCITY_COLORS: Record<string, string> = {
  critical: '#ff4444',
  low: '#ff8c00',
  normal: '#ffffff',
  high: '#4ecca3',
  full: '#ffd700',
};

export class ResourceBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private valueTexts: Map<ResourceType, Phaser.GameObjects.Text> = new Map();
  private rateTexts: Map<ResourceType, Phaser.GameObjects.Text> = new Map();
  private capBars: Map<ResourceType, Phaser.GameObjects.Graphics> = new Map();
  private currentResources: Resources;
  private caps: Resources | null = null;
  private rates: Partial<Resources> = {};

  constructor(scene: Phaser.Scene, y: number, resources: Resources) {
    this.scene = scene;
    this.currentResources = { ...resources };
    this.container = scene.add.container(0, y);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.85);
    bg.fillRect(0, 0, GAME_WIDTH, 50);
    bg.lineStyle(1, COLORS.panelBorder, 0.5);
    bg.strokeRect(0, 0, GAME_WIDTH, 50);
    this.container.add(bg);

    const types = Object.values(ResourceType);
    const spacing = GAME_WIDTH / types.length;

    types.forEach((type, i) => {
      const x = spacing * i + 8;
      const info = RESOURCE_ICONS[type];

      // Label
      const label = scene.add.text(x, 3, info.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: info.color,
      });
      this.container.add(label);

      // Value (current/max format)
      const valueText = scene.add.text(x, 15, Math.floor(this.currentResources[type]).toString(), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      });
      this.container.add(valueText);
      this.valueTexts.set(type, valueText);

      // Cap fill bar
      const capBarWidth = spacing - 16;
      const capBar = scene.add.graphics();
      capBar.x = x;
      capBar.y = 30;
      this.container.add(capBar);
      this.capBars.set(type, capBar);

      // Rate (per second)
      const rateText = scene.add.text(x, 37, '', {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: '#6a6a7a',
      });
      this.container.add(rateText);
      this.rateTexts.set(type, rateText);
    });
  }

  setCaps(caps: Resources): void {
    this.caps = caps;
    this.updateDisplay();
  }

  setRates(rates: Partial<Resources>): void {
    this.rates = rates;
    for (const [type, rate] of Object.entries(rates)) {
      const rateText = this.rateTexts.get(type as ResourceType);
      if (rateText && rate) {
        const perSec = rate.toFixed(2);
        const prefix = rate >= 0 ? '+' : '';
        rateText.setText(`${prefix}${perSec}/s`);
        rateText.setColor(rate >= 0 ? '#6a6a7a' : '#ff6b6b');
      }
    }
  }

  update(delta: number): void {
    const seconds = delta / 1000;
    for (const [type, rate] of Object.entries(this.rates)) {
      if (rate && rate > 0) {
        const resType = type as ResourceType;
        this.currentResources[resType] += rate * seconds;
        // Enforce cap
        if (this.caps) {
          this.currentResources[resType] = Math.min(
            this.currentResources[resType],
            this.caps[resType],
          );
        }
      }
    }
    this.updateDisplay();
  }

  private updateDisplay(): void {
    const types = Object.values(ResourceType);
    const spacing = GAME_WIDTH / types.length;

    for (const type of types) {
      const current = this.currentResources[type];
      const valueText = this.valueTexts.get(type);
      const capBar = this.capBars.get(type);

      if (valueText) {
        if (this.caps) {
          const cap = this.caps[type];
          valueText.setText(`${Math.floor(current)}/${cap}`);
          // Scarcity coloring
          const pct = (current / cap) * 100;
          let status: string;
          if (pct >= 100) status = 'full';
          else if (pct >= 80) status = 'high';
          else if (pct >= 20) status = 'normal';
          else if (pct >= 5) status = 'low';
          else status = 'critical';
          valueText.setColor(SCARCITY_COLORS[status]);
        } else {
          valueText.setText(Math.floor(current).toString());
          valueText.setColor(COLORS.textPrimary);
        }
      }

      if (capBar && this.caps) {
        const cap = this.caps[type];
        const pct = Math.min(1, current / cap);
        const barWidth = spacing - 16;
        capBar.clear();
        // Background
        capBar.fillStyle(0x333355, 0.5);
        capBar.fillRect(0, 0, barWidth, 4);
        // Fill
        const fillColor = pct >= 1 ? 0xffd700 : pct < 0.2 ? 0xff4444 : 0x4ecca3;
        capBar.fillStyle(fillColor, 0.8);
        capBar.fillRect(0, 0, barWidth * pct, 4);
      }
    }
  }

  setResources(resources: Resources): void {
    this.currentResources = { ...resources };
    this.updateDisplay();
  }

  getResources(): Resources {
    return { ...this.currentResources };
  }
}
