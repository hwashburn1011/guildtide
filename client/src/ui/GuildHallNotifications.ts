import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { BUILDING_DEFINITIONS, BUILDING_COST_MULTIPLIER } from '@shared/constants';
import { BuildingType, ResourceType } from '@shared/enums';
import type { Building, Resources } from '@shared/types';

/**
 * Shows notification indicators on buildings that need attention:
 * - Upgrade available (has enough resources)
 * - No worker assigned
 * - Construction complete
 */
export class GuildHallNotifications {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private indicators: Phaser.GameObjects.Container[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(150);
  }

  /**
   * Update notification indicators for all buildings.
   */
  update(
    buildings: Building[],
    resources: Resources,
    heroAssignments: Set<string>,
    buildingPositions: Map<string, { x: number; y: number; w: number }>,
  ): void {
    // Clear old indicators
    this.indicators.forEach(i => i.destroy());
    this.indicators = [];

    for (const building of buildings) {
      if (building.level < 1) continue;

      const pos = buildingPositions.get(building.type);
      if (!pos) continue;

      const notifications: string[] = [];

      // Check if upgrade is affordable
      const def = BUILDING_DEFINITIONS[building.type as BuildingType];
      if (def && building.level < def.maxLevel) {
        let canUpgrade = true;
        for (const [res, baseCost] of Object.entries(def.baseCost)) {
          const cost = Math.ceil((baseCost as number) * Math.pow(BUILDING_COST_MULTIPLIER, building.level));
          if ((resources[res as ResourceType] ?? 0) < cost) {
            canUpgrade = false;
            break;
          }
        }
        if (canUpgrade) {
          notifications.push('upgrade');
        }
      }

      // Check if no worker assigned
      if (!heroAssignments.has(building.type)) {
        notifications.push('worker');
      }

      // Check construction complete
      if (building.metadata && (building.metadata as any).constructing) {
        const meta = building.metadata as any;
        const startedAt = new Date(meta.startedAt).getTime();
        const elapsed = (Date.now() - startedAt) / 1000;
        if (elapsed >= (meta.duration ?? 30)) {
          notifications.push('complete');
        }
      }

      if (notifications.length === 0) continue;

      // Render indicator dot
      const indicatorContainer = this.scene.add.container(pos.x + pos.w - 12, 0);

      const dot = this.scene.add.graphics();
      const dotColor = notifications.includes('complete') ? 0x4ecca3
        : notifications.includes('upgrade') ? 0xffd700
        : 0xf5a623;
      dot.fillStyle(dotColor, 1);
      dot.fillCircle(0, 0, 6);
      indicatorContainer.add(dot);

      // Pulse animation
      this.scene.tweens.add({
        targets: dot,
        alpha: 0.4,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });

      // Count text if multiple notifications
      if (notifications.length > 1) {
        const countText = this.scene.add.text(0, 0, `${notifications.length}`, {
          fontFamily: FONTS.primary,
          fontSize: '8px',
          color: '#ffffff',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        indicatorContainer.add(countText);
      }

      this.container.add(indicatorContainer);
      this.indicators.push(indicatorContainer);
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
