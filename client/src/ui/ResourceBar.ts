import Phaser from 'phaser';
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

export class ResourceBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private valueTexts: Map<ResourceType, Phaser.GameObjects.Text> = new Map();
  private rateTexts: Map<ResourceType, Phaser.GameObjects.Text> = new Map();
  private currentResources: Resources;
  private rates: Partial<Resources> = {};

  constructor(scene: Phaser.Scene, y: number, resources: Resources) {
    this.scene = scene;
    this.currentResources = { ...resources };
    this.container = scene.add.container(0, y);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.85);
    bg.fillRect(0, 0, GAME_WIDTH, 45);
    bg.lineStyle(1, COLORS.panelBorder, 0.5);
    bg.strokeRect(0, 0, GAME_WIDTH, 45);
    this.container.add(bg);

    const types = Object.values(ResourceType);
    const spacing = GAME_WIDTH / types.length;

    types.forEach((type, i) => {
      const x = spacing * i + 8;
      const info = RESOURCE_ICONS[type];

      // Label
      const label = scene.add.text(x, 4, info.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: info.color,
      });
      this.container.add(label);

      // Value
      const valueText = scene.add.text(x, 17, Math.floor(this.currentResources[type]).toString(), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      });
      this.container.add(valueText);
      this.valueTexts.set(type, valueText);

      // Rate (per second)
      const rateText = scene.add.text(x, 32, '', {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: '#6a6a7a',
      });
      this.container.add(rateText);
      this.rateTexts.set(type, rateText);
    });
  }

  setRates(rates: Partial<Resources>): void {
    this.rates = rates;
    for (const [type, rate] of Object.entries(rates)) {
      const rateText = this.rateTexts.get(type as ResourceType);
      if (rateText && rate) {
        const perSec = rate.toFixed(2);
        rateText.setText(`+${perSec}/s`);
      }
    }
  }

  update(delta: number): void {
    // Visually tick resources based on rates
    const seconds = delta / 1000;
    for (const [type, rate] of Object.entries(this.rates)) {
      if (rate && rate > 0) {
        const resType = type as ResourceType;
        this.currentResources[resType] += rate * seconds;
        const valueText = this.valueTexts.get(resType);
        if (valueText) {
          valueText.setText(Math.floor(this.currentResources[resType]).toString());
        }
      }
    }
  }

  setResources(resources: Resources): void {
    this.currentResources = { ...resources };
    for (const type of Object.values(ResourceType)) {
      const valueText = this.valueTexts.get(type);
      if (valueText) {
        valueText.setText(Math.floor(this.currentResources[type]).toString());
      }
    }
  }

  getResources(): Resources {
    return { ...this.currentResources };
  }
}
