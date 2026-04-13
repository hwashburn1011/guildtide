/**
 * Adjacency bonus indicator overlay on the building grid.
 * Shows connection lines and bonus percentages between synergistic buildings.
 *
 * T-0356: Building adjacency bonus system
 * T-0357: Adjacency bonus indicator overlay on grid
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { BUILDING_SYNERGIES } from '@shared/constants';
import type { Building } from '@shared/types';

export class BuildingAdjacencyOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private lines: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.lines = scene.add.graphics();
    this.container.add(this.lines);
  }

  /**
   * Render adjacency bonus lines between buildings that have active synergies.
   */
  render(
    buildings: Building[],
    positions: Map<string, { x: number; y: number }>,
  ): void {
    this.clear();

    const builtTypes = new Set(
      buildings.filter(b => b.level > 0).map(b => b.type),
    );

    for (const synergy of BUILDING_SYNERGIES) {
      if (!builtTypes.has(synergy.buildingA) || !builtTypes.has(synergy.buildingB)) {
        continue;
      }

      const posA = positions.get(synergy.buildingA);
      const posB = positions.get(synergy.buildingB);
      if (!posA || !posB) continue;

      // Draw connecting line
      this.lines.lineStyle(2, COLORS.gold, 0.4);
      this.lines.beginPath();
      this.lines.moveTo(posA.x, posA.y);
      this.lines.lineTo(posB.x, posB.y);
      this.lines.closePath();
      this.lines.strokePath();

      // Midpoint label
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2;

      // Bonus badge
      const badgeBg = this.scene.add.rectangle(midX, midY, 60, 20, 0x1a1a2e, 0.9);
      badgeBg.setStrokeStyle(1, COLORS.gold);
      this.container.add(badgeBg);

      const bonusText = this.scene.add.text(midX, midY, `+${synergy.bonusPercent}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.container.add(bonusText);

      // Tooltip description on hover
      badgeBg.setInteractive({ useHandCursor: true });
      const tooltip = this.scene.add.text(midX, midY - 20, synergy.description, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textPrimary,
        backgroundColor: '#1a1a2e',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setVisible(false);
      this.container.add(tooltip);

      badgeBg.on('pointerover', () => tooltip.setVisible(true));
      badgeBg.on('pointerout', () => tooltip.setVisible(false));
    }
  }

  /**
   * Toggle visibility of the overlay.
   */
  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  clear(): void {
    this.lines.clear();
    // Remove all but the graphics object
    const children = this.container.getAll();
    for (const child of children) {
      if (child !== this.lines) {
        child.destroy();
      }
    }
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    this.clear();
    this.lines.destroy();
    this.container.destroy();
  }
}
