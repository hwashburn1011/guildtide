/**
 * Item comparison tooltip showing side-by-side stat differences.
 * T-0689, T-0690, T-0739: Item tooltip with stat display and comparison.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';

const RARITY_COLORS: Record<string, string> = {
  common: '#a0a0b0',
  uncommon: '#4ecca3',
  rare: '#4dabf7',
  epic: '#b366ff',
  legendary: '#ffd700',
};

interface ItemData {
  name: string;
  rarity: string;
  category: string;
  description: string;
  effects: {
    statBonuses?: Record<string, number>;
    expeditionBonus?: number;
    buildingBonus?: number;
    resourceBonuses?: Record<string, number>;
    weatherResistances?: string[];
  };
  durability?: number;
  sockets?: number;
  setId?: string;
  sellValue?: number;
  lore?: string;
}

export class ItemCompareTooltip {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Show a single item tooltip */
  showSingle(item: ItemData, x: number, y: number): void {
    this.hide();
    this.container = this.scene.add.container(0, 0).setDepth(300);

    const lines = this.buildTooltipLines(item);
    const tooltipW = 260;
    const tooltipH = lines.length * 16 + 20;

    // Position so it doesn't go off-screen
    const posX = Math.min(x, 1280 - tooltipW - 10);
    const posY = Math.min(y, 720 - tooltipH - 10);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a1e, 0.95);
    bg.fillRoundedRect(posX, posY, tooltipW, tooltipH, 6);
    bg.lineStyle(1, COLORS.panelBorder);
    bg.strokeRoundedRect(posX, posY, tooltipW, tooltipH, 6);
    this.container.add(bg);

    lines.forEach((line, i) => {
      this.container!.add(
        this.scene.add.text(posX + 10, posY + 10 + i * 16, line.text, {
          fontFamily: FONTS.primary,
          fontSize: line.size || '11px',
          color: line.color || COLORS.textPrimary,
          fontStyle: line.bold ? 'bold' : 'normal',
        })
      );
    });
  }

  /** Show side-by-side comparison of two items */
  showComparison(current: ItemData, candidate: ItemData, x: number, y: number): void {
    this.hide();
    this.container = this.scene.add.container(0, 0).setDepth(300);

    const tooltipW = 540;
    const colW = 250;

    const currentLines = this.buildTooltipLines(current);
    const candidateLines = this.buildTooltipLines(candidate);
    const maxLines = Math.max(currentLines.length, candidateLines.length);
    const tooltipH = maxLines * 16 + 40;

    const posX = Math.min(x, 1280 - tooltipW - 10);
    const posY = Math.min(y, 720 - tooltipH - 10);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a1e, 0.95);
    bg.fillRoundedRect(posX, posY, tooltipW, tooltipH, 6);
    bg.lineStyle(1, COLORS.panelBorder);
    bg.strokeRoundedRect(posX, posY, tooltipW, tooltipH, 6);
    this.container.add(bg);

    // Headers
    this.container.add(
      this.scene.add.text(posX + 10, posY + 6, 'Equipped', {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: COLORS.textSecondary,
        fontStyle: 'bold',
      })
    );
    this.container.add(
      this.scene.add.text(posX + colW + 30, posY + 6, 'New Item', {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: COLORS.textGold,
        fontStyle: 'bold',
      })
    );

    // Divider
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x333355);
    divider.lineBetween(posX + colW + 15, posY + 10, posX + colW + 15, posY + tooltipH - 10);
    this.container.add(divider);

    // Current item column
    currentLines.forEach((line, i) => {
      this.container!.add(
        this.scene.add.text(posX + 10, posY + 24 + i * 16, line.text, {
          fontFamily: FONTS.primary,
          fontSize: line.size || '11px',
          color: line.color || COLORS.textPrimary,
          fontStyle: line.bold ? 'bold' : 'normal',
        })
      );
    });

    // Candidate item column
    candidateLines.forEach((line, i) => {
      this.container!.add(
        this.scene.add.text(posX + colW + 30, posY + 24 + i * 16, line.text, {
          fontFamily: FONTS.primary,
          fontSize: line.size || '11px',
          color: line.color || COLORS.textPrimary,
          fontStyle: line.bold ? 'bold' : 'normal',
        })
      );
    });

    // Stat diff summary at bottom
    const diffs = this.calculateDiffs(current, candidate);
    if (diffs.length > 0) {
      const diffY = posY + tooltipH - 18;
      const diffText = diffs.join('  ');
      this.container.add(
        this.scene.add.text(posX + tooltipW / 2, diffY, diffText, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: COLORS.textGold,
          fontStyle: 'bold',
        }).setOrigin(0.5, 0)
      );
    }
  }

  private buildTooltipLines(item: ItemData): Array<{ text: string; color?: string; bold?: boolean; size?: string }> {
    const lines: Array<{ text: string; color?: string; bold?: boolean; size?: string }> = [];
    const rarityColor = RARITY_COLORS[item.rarity] || COLORS.textSecondary;

    lines.push({ text: item.name, color: rarityColor, bold: true, size: '12px' });
    lines.push({ text: `${item.rarity.toUpperCase()} ${item.category}`, color: rarityColor, size: '9px' });

    if (item.effects.statBonuses) {
      for (const [stat, val] of Object.entries(item.effects.statBonuses)) {
        const color = val > 0 ? '#4ecca3' : '#ff4444';
        lines.push({ text: `  ${val > 0 ? '+' : ''}${val} ${stat}`, color });
      }
    }

    if (item.effects.expeditionBonus) {
      lines.push({ text: `  +${item.effects.expeditionBonus}% expedition`, color: '#4dabf7' });
    }

    if (item.effects.buildingBonus) {
      lines.push({ text: `  +${Math.round(item.effects.buildingBonus * 100)}% building`, color: '#4dabf7' });
    }

    if (item.effects.resourceBonuses) {
      for (const [res, val] of Object.entries(item.effects.resourceBonuses)) {
        lines.push({ text: `  +${Math.round(val * 100)}% ${res}`, color: '#f5a623' });
      }
    }

    if (item.effects.weatherResistances && item.effects.weatherResistances.length > 0) {
      lines.push({ text: `  Weather: ${item.effects.weatherResistances.join(', ')}`, color: '#7fa8c9' });
    }

    if (item.durability) {
      lines.push({ text: `  Durability: ${item.durability}`, color: COLORS.textSecondary });
    }

    if (item.sockets) {
      lines.push({ text: `  Sockets: ${item.sockets}`, color: COLORS.textSecondary });
    }

    if (item.sellValue) {
      lines.push({ text: `  Value: ${item.sellValue}g`, color: '#c0a050' });
    }

    if (item.description) {
      // Wrap long descriptions
      const words = item.description.split(' ');
      let line = '';
      for (const word of words) {
        if ((line + word).length > 35) {
          lines.push({ text: line.trim(), color: '#6a6a7a', size: '9px' });
          line = word + ' ';
        } else {
          line += word + ' ';
        }
      }
      if (line.trim()) lines.push({ text: line.trim(), color: '#6a6a7a', size: '9px' });
    }

    if (item.lore) {
      lines.push({ text: '', color: COLORS.textSecondary }); // spacer
      lines.push({ text: `"${item.lore}"`, color: '#8a7a5a', size: '9px' });
    }

    return lines;
  }

  private calculateDiffs(current: ItemData, candidate: ItemData): string[] {
    const diffs: string[] = [];
    const allStats = new Set<string>();

    const cs = current.effects.statBonuses || {};
    const ns = candidate.effects.statBonuses || {};

    for (const k of Object.keys(cs)) allStats.add(k);
    for (const k of Object.keys(ns)) allStats.add(k);

    for (const stat of allStats) {
      const diff = (ns[stat] || 0) - (cs[stat] || 0);
      if (diff !== 0) {
        const prefix = diff > 0 ? '+' : '';
        diffs.push(`${prefix}${diff} ${stat.substring(0, 3).toUpperCase()}`);
      }
    }

    const expDiff = (candidate.effects.expeditionBonus || 0) - (current.effects.expeditionBonus || 0);
    if (expDiff !== 0) {
      diffs.push(`${expDiff > 0 ? '+' : ''}${expDiff}% exp`);
    }

    return diffs;
  }

  hide(): void {
    this.container?.destroy(true);
    this.container = null;
  }
}
