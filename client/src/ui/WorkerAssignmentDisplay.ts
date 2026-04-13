import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import type { Hero, Building } from '@shared/types';

/**
 * Renders a small worker badge on building cards showing assigned hero.
 * Also shows a worker count on each building.
 */
export class WorkerAssignmentDisplay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
  }

  /**
   * Render worker indicators for a set of buildings and heroes.
   */
  render(
    buildings: Building[],
    heroes: Hero[],
    buildingPositions: Map<string, { x: number; y: number }>,
  ): void {
    this.container.removeAll(true);

    for (const building of buildings) {
      if (building.level < 1) continue;

      const pos = buildingPositions.get(building.type);
      if (!pos) continue;

      const assignedHeroes = heroes.filter(
        h => h.assignment === building.type && h.status === 'assigned',
      );

      if (assignedHeroes.length === 0) continue;

      // Worker count badge
      const badgeBg = this.scene.add.graphics();
      badgeBg.fillStyle(0x2980b9, 0.9);
      badgeBg.fillCircle(pos.x, pos.y, 10);
      badgeBg.lineStyle(1, 0x3498db);
      badgeBg.strokeCircle(pos.x, pos.y, 10);
      this.container.add(badgeBg);

      const countText = this.scene.add.text(pos.x, pos.y, `${assignedHeroes.length}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.container.add(countText);

      // Hero name tooltip on hover
      if (assignedHeroes.length > 0) {
        const heroNames = assignedHeroes.map(h => h.name).join(', ');
        const zone = this.scene.add.zone(pos.x, pos.y, 24, 24).setInteractive();
        this.container.add(zone);

        zone.on('pointerover', () => {
          const tooltip = this.scene.add.text(pos.x + 14, pos.y - 6, heroNames, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textPrimary,
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: { x: 6, y: 3 },
          });
          tooltip.setName('worker-tooltip');
          this.container.add(tooltip);
        });

        zone.on('pointerout', () => {
          const tooltip = this.container.getByName('worker-tooltip');
          if (tooltip) tooltip.destroy();
        });
      }
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
