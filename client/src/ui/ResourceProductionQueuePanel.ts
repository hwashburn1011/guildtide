import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import { ResourceType } from '@shared/enums';
import type { Resources } from '@shared/types';

const RESOURCE_COLORS: Record<ResourceType, { color: string; hex: number }> = {
  [ResourceType.Gold]:    { color: '#ffd700', hex: 0xffd700 },
  [ResourceType.Wood]:    { color: '#8b6914', hex: 0x8b6914 },
  [ResourceType.Stone]:   { color: '#a0a0a0', hex: 0xa0a0a0 },
  [ResourceType.Herbs]:   { color: '#4ecca3', hex: 0x4ecca3 },
  [ResourceType.Ore]:     { color: '#c87533', hex: 0xc87533 },
  [ResourceType.Water]:   { color: '#4dabf7', hex: 0x4dabf7 },
  [ResourceType.Food]:    { color: '#f59f00', hex: 0xf59f00 },
  [ResourceType.Essence]: { color: '#be4bdb', hex: 0xbe4bdb },
};

/**
 * Visual display of current resource production flow,
 * showing which buildings are actively producing which resources
 * and the current throughput for each.
 */
export class ResourceProductionQueuePanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentElements: Phaser.GameObjects.GameObject[] = [];
  private visible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_WIDTH / 2 - 250, 80);
    this.container.setDepth(1000);
    this.container.setVisible(false);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(0, 0, 500, 400, 12);
    bg.lineStyle(2, 0x0f3460, 1);
    bg.strokeRoundedRect(0, 0, 500, 400, 12);
    this.container.add(bg);

    // Title
    const title = scene.add.text(20, 12, 'Production Overview', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.container.add(title);

    // Close
    const closeBtn = scene.add.text(470, 10, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);
  }

  setData(
    rates: Record<ResourceType, number>,
    buildings: Array<{ type: string; level: number; name: string }>,
    caps: Record<ResourceType, number>,
    resources: Record<ResourceType, number>,
  ): void {
    for (const el of this.contentElements) el.destroy();
    this.contentElements = [];

    let y = 50;

    // Sort resources by production rate (highest first)
    const sortedTypes = Object.values(ResourceType)
      .filter(t => rates[t] > 0)
      .sort((a, b) => rates[b] - rates[a]);

    if (sortedTypes.length === 0) {
      const noData = this.scene.add.text(150, 180, 'No active production', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: '#666688',
      });
      this.container.add(noData);
      this.contentElements.push(noData);
      return;
    }

    for (const resType of sortedTypes) {
      const info = RESOURCE_COLORS[resType];
      const rate = rates[resType];
      const current = resources[resType] || 0;
      const cap = caps[resType] || 1;
      const pct = Math.min(1, current / cap);
      const isFull = pct >= 1;

      // Resource row
      const rowBg = this.scene.add.graphics();
      rowBg.fillStyle(isFull ? 0x3a2a1e : 0x1a2a4e, 0.5);
      rowBg.fillRoundedRect(15, y, 470, 36, 6);
      this.container.add(rowBg);
      this.contentElements.push(rowBg);

      // Animated dot (pulsing circle to indicate active production)
      const dot = this.scene.add.graphics();
      dot.fillStyle(info.hex, isFull ? 0.3 : 0.9);
      dot.fillCircle(30, y + 18, 6);
      if (!isFull) {
        dot.lineStyle(1, 0xffffff, 0.3);
        dot.strokeCircle(30, y + 18, 8);
      }
      this.container.add(dot);
      this.contentElements.push(dot);

      // Resource name
      const nameText = this.scene.add.text(45, y + 5, resType.charAt(0).toUpperCase() + resType.slice(1), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: info.color,
        fontStyle: 'bold',
      });
      this.container.add(nameText);
      this.contentElements.push(nameText);

      // Rate
      const ratePerHour = rate * 3600;
      const rateStr = `+${ratePerHour.toFixed(1)}/hr`;
      const rateText = this.scene.add.text(150, y + 5, rateStr, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: isFull ? '#888888' : '#4ecca3',
      });
      this.container.add(rateText);
      this.contentElements.push(rateText);

      // Progress bar to cap
      const barWidth = 150;
      const barG = this.scene.add.graphics();
      barG.x = 260;
      barG.y = y + 12;
      barG.fillStyle(0x333355, 0.5);
      barG.fillRect(0, 0, barWidth, 10);
      const fillColor = isFull ? 0xffd700 : 0x4ecca3;
      barG.fillStyle(fillColor, 0.7);
      barG.fillRect(0, 0, barWidth * pct, 10);
      this.container.add(barG);
      this.contentElements.push(barG);

      // Status label
      const statusStr = isFull ? 'FULL' : `${(pct * 100).toFixed(0)}%`;
      const statusColor = isFull ? '#ffd700' : '#ffffff';
      const statusText = this.scene.add.text(420, y + 8, statusStr, {
        fontFamily: FONTS.primary,
        fontSize: '12px',
        color: statusColor,
        fontStyle: isFull ? 'bold' : 'normal',
      });
      this.container.add(statusText);
      this.contentElements.push(statusText);

      // Status warning
      if (isFull) {
        const warnText = this.scene.add.text(45, y + 22, 'Production wasted! Upgrade storage or convert resources.', {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: '#ff8c00',
        });
        this.container.add(warnText);
        this.contentElements.push(warnText);
      }

      y += isFull ? 44 : 40;
    }

    // Idle resources (no production)
    const idleTypes = Object.values(ResourceType).filter(t => rates[t] <= 0);
    if (idleTypes.length > 0) {
      y += 10;
      const idleTitle = this.scene.add.text(20, y, 'No Production:', {
        fontFamily: FONTS.primary,
        fontSize: '12px',
        color: '#666688',
      });
      this.container.add(idleTitle);
      this.contentElements.push(idleTitle);
      y += 18;

      const idleStr = idleTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
      const idleText = this.scene.add.text(30, y, idleStr, {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: '#555577',
        wordWrap: { width: 440 },
      });
      this.container.add(idleText);
      this.contentElements.push(idleText);
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
}
