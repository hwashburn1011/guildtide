import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { ResourceType } from '@shared/enums';
import type { Resources, ResourceState } from '@shared/types';

const RESOURCE_ICONS: Record<ResourceType, { label: string; color: string; hex: number }> = {
  [ResourceType.Gold]:    { label: 'Gold',    color: '#ffd700', hex: 0xffd700 },
  [ResourceType.Wood]:    { label: 'Wood',    color: '#8b6914', hex: 0x8b6914 },
  [ResourceType.Stone]:   { label: 'Stone',   color: '#a0a0a0', hex: 0xa0a0a0 },
  [ResourceType.Herbs]:   { label: 'Herbs',   color: '#4ecca3', hex: 0x4ecca3 },
  [ResourceType.Ore]:     { label: 'Ore',     color: '#c87533', hex: 0xc87533 },
  [ResourceType.Water]:   { label: 'Water',   color: '#4dabf7', hex: 0x4dabf7 },
  [ResourceType.Food]:    { label: 'Food',    color: '#f59f00', hex: 0xf59f00 },
  [ResourceType.Essence]: { label: 'Essence', color: '#be4bdb', hex: 0xbe4bdb },
};

/**
 * Full-page resource dashboard showing all resources at a glance
 * with current amounts, caps, rates, and efficiency ratings.
 */
export class ResourceDashboard {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentElements: Phaser.GameObjects.GameObject[] = [];
  private visible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(900);
    this.container.setVisible(false);

    // Full-screen overlay background
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x0a0a1e, 0.9);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.container.add(overlay);

    // Title
    const title = scene.add.text(GAME_WIDTH / 2 - 100, 20, 'Resource Dashboard', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.title}px`,
      color: '#ffd700',
      fontStyle: 'bold',
    });
    this.container.add(title);

    // Close
    const closeBtn = scene.add.text(GAME_WIDTH - 40, 15, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);
  }

  setData(state: ResourceState): void {
    for (const el of this.contentElements) el.destroy();
    this.contentElements = [];

    const types = Object.values(ResourceType);
    const cardWidth = 280;
    const cardHeight = 130;
    const cols = 4;
    const startX = (GAME_WIDTH - cols * (cardWidth + 10)) / 2;
    const startY = 70;

    types.forEach((resType, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardWidth + 10);
      const y = startY + row * (cardHeight + 10);

      const info = RESOURCE_ICONS[resType];
      const current = state.current[resType] || 0;
      const cap = state.caps[resType] || 1;
      const rate = state.rates[resType] || 0;
      const netRate = state.netRates[resType] || 0;
      const pct = (current / cap) * 100;

      // Card background
      const card = this.scene.add.graphics();
      card.fillStyle(0x16213e, 0.9);
      card.fillRoundedRect(x, y, cardWidth, cardHeight, 8);
      card.lineStyle(1, info.hex, 0.4);
      card.strokeRoundedRect(x, y, cardWidth, cardHeight, 8);
      this.container.add(card);
      this.contentElements.push(card);

      // Resource icon dot
      const dot = this.scene.add.graphics();
      dot.fillStyle(info.hex, 0.9);
      dot.fillCircle(x + 18, y + 18, 8);
      this.container.add(dot);
      this.contentElements.push(dot);

      // Resource name
      const nameText = this.scene.add.text(x + 32, y + 10, info.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: info.color,
        fontStyle: 'bold',
      });
      this.container.add(nameText);
      this.contentElements.push(nameText);

      // Current / Cap
      const amtText = this.scene.add.text(x + 15, y + 35, `${Math.floor(current)} / ${cap}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      });
      this.container.add(amtText);
      this.contentElements.push(amtText);

      // Efficiency rating
      let efficiency: string;
      let effColor: string;
      if (pct >= 95) { efficiency = 'FULL'; effColor = '#ffd700'; }
      else if (pct >= 70) { efficiency = 'Good'; effColor = '#4ecca3'; }
      else if (pct >= 30) { efficiency = 'Fair'; effColor = '#ffffff'; }
      else if (pct >= 10) { efficiency = 'Low'; effColor = '#ff8c00'; }
      else { efficiency = 'Critical'; effColor = '#ff4444'; }

      const effText = this.scene.add.text(x + 200, y + 10, efficiency, {
        fontFamily: FONTS.primary,
        fontSize: '12px',
        color: effColor,
        fontStyle: 'bold',
      });
      this.container.add(effText);
      this.contentElements.push(effText);

      // Storage bar
      const barWidth = cardWidth - 30;
      const barG = this.scene.add.graphics();
      barG.fillStyle(0x333355, 0.5);
      barG.fillRect(x + 15, y + 62, barWidth, 8);
      const fillColor = pct >= 100 ? 0xffd700 : pct < 20 ? 0xff4444 : 0x4ecca3;
      barG.fillStyle(fillColor, 0.8);
      barG.fillRect(x + 15, y + 62, barWidth * Math.min(1, pct / 100), 8);
      this.container.add(barG);
      this.contentElements.push(barG);

      // Percentage
      const pctText = this.scene.add.text(x + 15 + barWidth - 35, y + 56, `${pct.toFixed(0)}%`, {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: '#8888aa',
      });
      this.container.add(pctText);
      this.contentElements.push(pctText);

      // Production rate
      const rateStr = rate >= 0 ? `+${(rate * 3600).toFixed(1)}/hr` : `${(rate * 3600).toFixed(1)}/hr`;
      const rateColor = rate >= 0 ? '#4ecca3' : '#ff6b6b';
      const rateText = this.scene.add.text(x + 15, y + 80, `Prod: ${rateStr}`, {
        fontFamily: FONTS.primary,
        fontSize: '12px',
        color: rateColor,
      });
      this.container.add(rateText);
      this.contentElements.push(rateText);

      // Net rate
      const netStr = netRate >= 0 ? `+${(netRate * 3600).toFixed(1)}` : `${(netRate * 3600).toFixed(1)}`;
      const netColor = netRate >= 0 ? '#4ecca3' : '#ff6b6b';
      const netText = this.scene.add.text(x + 15, y + 96, `Net: ${netStr}/hr`, {
        fontFamily: FONTS.primary,
        fontSize: '12px',
        color: netColor,
      });
      this.container.add(netText);
      this.contentElements.push(netText);

      // Decay indicator for perishables
      const decay = state.decayRates[resType];
      if (decay && decay > 0) {
        const decayText = this.scene.add.text(x + 150, y + 96, `Decay: ${(decay * 100).toFixed(1)}%/hr`, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: '#ff8c00',
        });
        this.container.add(decayText);
        this.contentElements.push(decayText);
      }
    });

    // Summary row at bottom
    const totalResources = Object.values(state.current).reduce((s, v) => s + v, 0);
    const totalCap = Object.values(state.caps).reduce((s, v) => s + v, 0);
    const overallPct = (totalResources / totalCap) * 100;

    const summaryY = startY + Math.ceil(types.length / cols) * (cardHeight + 10) + 20;
    const summaryText = this.scene.add.text(
      GAME_WIDTH / 2 - 200, summaryY,
      `Total Storage: ${Math.floor(totalResources).toLocaleString()} / ${totalCap.toLocaleString()} (${overallPct.toFixed(1)}%)`,
      {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
      },
    );
    this.container.add(summaryText);
    this.contentElements.push(summaryText);
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
