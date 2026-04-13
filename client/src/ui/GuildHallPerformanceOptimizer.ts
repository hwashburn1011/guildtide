import * as Phaser from 'phaser';

/**
 * Performance optimization utilities for the guild hall scene.
 * Pools game objects, reduces draw calls for large building counts,
 * and manages visibility culling.
 */
export class GuildHallPerformanceOptimizer {
  private scene: Phaser.Scene;
  private tickCounter: number = 0;
  private readonly TICK_INTERVAL = 3; // Only update visuals every N frames

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Should the scene update visual animations this frame?
   * Returns true every TICK_INTERVAL frames to reduce CPU usage.
   */
  shouldUpdateVisuals(): boolean {
    this.tickCounter++;
    return this.tickCounter % this.TICK_INTERVAL === 0;
  }

  /**
   * Cull containers that are outside the visible viewport.
   * For scrollable guild halls with many buildings.
   */
  cullOffscreen(
    containers: Phaser.GameObjects.Container[],
    viewportY: number,
    viewportH: number,
  ): void {
    for (const container of containers) {
      const isVisible = container.y + 200 > viewportY && container.y < viewportY + viewportH;
      container.setVisible(isVisible);
    }
  }

  /**
   * Batch-update building card text instead of recreating.
   * Returns true if the value changed and needs redraw.
   */
  static updateTextIfChanged(
    text: Phaser.GameObjects.Text,
    newValue: string,
  ): boolean {
    if (text.text !== newValue) {
      text.setText(newValue);
      return true;
    }
    return false;
  }

  /**
   * Reduce particle density based on building count.
   * More buildings = fewer particles per tick.
   */
  static getParticleDensity(buildingCount: number): number {
    if (buildingCount <= 6) return 1.0;
    if (buildingCount <= 12) return 0.7;
    if (buildingCount <= 20) return 0.4;
    return 0.2;
  }

  /**
   * Should production ticks be shown? Throttle based on building count.
   */
  static shouldShowProductionTick(buildingCount: number): boolean {
    const density = GuildHallPerformanceOptimizer.getParticleDensity(buildingCount);
    return Math.random() < density;
  }
}
