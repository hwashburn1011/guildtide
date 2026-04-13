import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import { ResourceType } from '@shared/enums';

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
 * Shows relative resource values as a horizontal bar chart
 * for quick comparison between resource amounts.
 */
export class ResourceComparisonWidget {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentElements: Phaser.GameObjects.GameObject[] = [];
  private visible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_WIDTH / 2 - 200, 120);
    this.container.setDepth(1000);
    this.container.setVisible(false);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(0, 0, 400, 340, 12);
    bg.lineStyle(2, 0x0f3460, 1);
    bg.strokeRoundedRect(0, 0, 400, 340, 12);
    this.container.add(bg);

    // Title
    const title = scene.add.text(20, 12, 'Resource Comparison', {
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

  setData(resources: Record<ResourceType, number>, caps: Record<ResourceType, number>): void {
    for (const el of this.contentElements) el.destroy();
    this.contentElements = [];

    const types = Object.values(ResourceType);
    const maxVal = Math.max(...types.map(t => resources[t] || 0), 1);
    const barMaxWidth = 250;

    let y = 50;

    for (const resType of types) {
      const info = RESOURCE_COLORS[resType];
      const current = resources[resType] || 0;
      const cap = caps[resType] || 1;
      const barWidth = (current / maxVal) * barMaxWidth;
      const capBarWidth = (cap / Math.max(...types.map(t => caps[t] || 0), 1)) * barMaxWidth;

      // Resource label
      const label = this.scene.add.text(15, y + 2, resType.charAt(0).toUpperCase() + resType.slice(1), {
        fontFamily: FONTS.primary,
        fontSize: '13px',
        color: info.color,
      });
      this.container.add(label);
      this.contentElements.push(label);

      // Cap bar (faint)
      const capBarG = this.scene.add.graphics();
      capBarG.fillStyle(0x333355, 0.3);
      capBarG.fillRect(100, y + 2, capBarWidth, 14);
      this.container.add(capBarG);
      this.contentElements.push(capBarG);

      // Amount bar
      const barG = this.scene.add.graphics();
      barG.fillStyle(info.hex, 0.8);
      barG.fillRect(100, y + 2, barWidth, 14);
      this.container.add(barG);
      this.contentElements.push(barG);

      // Amount text
      const amtText = this.scene.add.text(100 + barWidth + 5, y + 2, Math.floor(current).toString(), {
        fontFamily: FONTS.primary,
        fontSize: '12px',
        color: '#ffffff',
      });
      this.container.add(amtText);
      this.contentElements.push(amtText);

      y += 32;
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
