import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { ResourceType } from '@shared/enums';
import type { ResourceBreakdown } from '@shared/types';

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

/**
 * Small tooltip showing production/consumption breakdown
 * when hovering over a resource in the resource bar.
 */
export class ResourceTooltip {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentElements: Phaser.GameObjects.GameObject[] = [];
  private visible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(2000);
    this.container.setVisible(false);
  }

  show(
    x: number,
    y: number,
    resource: ResourceType,
    current: number,
    cap: number,
    breakdown: ResourceBreakdown,
  ): void {
    this.hide();
    this.visible = true;

    const color = RESOURCE_COLORS[resource];
    const width = 220;
    let height = 80;
    height += breakdown.production.length * 14;
    height += breakdown.consumption.length * 14;

    this.container.setPosition(x, y);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a1e, 0.95);
    bg.fillRoundedRect(0, 0, width, height, 6);
    bg.lineStyle(1, 0x333366, 0.8);
    bg.strokeRoundedRect(0, 0, width, height, 6);
    this.container.add(bg);
    this.contentElements.push(bg);

    let ty = 8;

    // Resource name + amount
    const nameText = this.scene.add.text(8, ty, `${resource} - ${Math.floor(current)}/${cap}`, {
      fontFamily: FONTS.primary,
      fontSize: '13px',
      color,
      fontStyle: 'bold',
    });
    this.container.add(nameText);
    this.contentElements.push(nameText);
    ty += 20;

    // Production
    if (breakdown.production.length > 0) {
      const prodLabel = this.scene.add.text(8, ty, 'Production:', {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: '#8888aa',
      });
      this.container.add(prodLabel);
      this.contentElements.push(prodLabel);
      ty += 14;

      for (const source of breakdown.production) {
        const srcText = this.scene.add.text(12, ty, `${source.source}: +${source.amount.toFixed(1)}/hr`, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: '#4ecca3',
        });
        this.container.add(srcText);
        this.contentElements.push(srcText);
        ty += 14;
      }
    }

    // Consumption
    if (breakdown.consumption.length > 0) {
      const consLabel = this.scene.add.text(8, ty, 'Consumption:', {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: '#8888aa',
      });
      this.container.add(consLabel);
      this.contentElements.push(consLabel);
      ty += 14;

      for (const sink of breakdown.consumption) {
        const sinkText = this.scene.add.text(12, ty, `${sink.source}: -${sink.amount.toFixed(1)}/hr`, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: '#ff6b6b',
        });
        this.container.add(sinkText);
        this.contentElements.push(sinkText);
        ty += 14;
      }
    }

    // Net rate
    ty += 4;
    const netPrefix = breakdown.netRate >= 0 ? '+' : '';
    const netColor = breakdown.netRate >= 0 ? '#4ecca3' : '#ff6b6b';
    const netText = this.scene.add.text(8, ty, `Net: ${netPrefix}${breakdown.netRate.toFixed(1)}/hr`, {
      fontFamily: FONTS.primary,
      fontSize: '12px',
      color: netColor,
      fontStyle: 'bold',
    });
    this.container.add(netText);
    this.contentElements.push(netText);

    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
    for (const el of this.contentElements) el.destroy();
    this.contentElements = [];
  }

  isVisible(): boolean {
    return this.visible;
  }
}
