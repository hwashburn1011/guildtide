import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { BUILDING_DEFINITIONS, BUILDING_LEVEL_BONUS, BUILDING_COST_MULTIPLIER } from '@shared/constants';
import { BuildingType } from '@shared/enums';
import type { Building } from '@shared/types';

/**
 * Real-time production rate tooltip that appears on building hover.
 */
export class BuildingTooltip {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(500);
    this.container.setVisible(false);
  }

  show(building: Building, x: number, y: number): void {
    this.container.removeAll(true);
    this.container.setPosition(x, y);

    const def = BUILDING_DEFINITIONS[building.type as BuildingType];
    if (!def) return;

    const lines: Array<{ text: string; color: string }> = [];
    lines.push({ text: def.name, color: COLORS.textGold });
    lines.push({ text: `Level ${building.level} / ${def.maxLevel}`, color: COLORS.textSecondary });

    if (building.level > 0) {
      const outputs = Object.entries(def.baseOutput);
      if (outputs.length > 0) {
        lines.push({ text: '', color: COLORS.textSecondary }); // spacer
        lines.push({ text: 'Production:', color: COLORS.textPrimary });
        for (const [res, base] of outputs) {
          const rate = (base as number) * (1 + building.level * BUILDING_LEVEL_BONUS);
          lines.push({ text: `  ${res}: +${rate.toFixed(3)}/s`, color: '#4ecca3' });
        }
      }
    }

    // Next upgrade cost
    if (building.level < def.maxLevel) {
      lines.push({ text: '', color: COLORS.textSecondary });
      lines.push({ text: 'Upgrade cost:', color: COLORS.textPrimary });
      for (const [res, baseCost] of Object.entries(def.baseCost)) {
        const cost = Math.ceil((baseCost as number) * Math.pow(BUILDING_COST_MULTIPLIER, building.level));
        lines.push({ text: `  ${cost} ${res}`, color: '#f5a623' });
      }
    }

    // Calculate size
    const lineH = 16;
    const w = 200;
    const h = lines.length * lineH + 16;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a1e, 0.95);
    bg.fillRoundedRect(0, 0, w, h, 6);
    bg.lineStyle(1, COLORS.panelBorder, 0.8);
    bg.strokeRoundedRect(0, 0, w, h, 6);
    this.container.add(bg);

    // Lines
    lines.forEach((line, i) => {
      if (line.text) {
        this.container.add(
          this.scene.add.text(8, 8 + i * lineH, line.text, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: line.color,
          }),
        );
      }
    });

    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy();
  }
}
