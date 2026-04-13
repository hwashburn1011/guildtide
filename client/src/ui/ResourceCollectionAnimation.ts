import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIResourceDelta } from './components/UIResourceDelta';

/**
 * Click-to-collect animation for manual resource gathering.
 * Shows floating icons that fly toward the resource bar.
 */
export class ResourceCollectionAnimation {
  /**
   * Show a collection burst at the given position.
   */
  static show(
    scene: Phaser.Scene,
    x: number,
    y: number,
    resources: Record<string, number>,
  ): void {
    const entries = Object.entries(resources).filter(([, v]) => v > 0);
    entries.forEach(([resource, amount], i) => {
      // Stagger each resource delta
      scene.time.delayedCall(i * 200, () => {
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 20;

        // Resource name label
        const label = scene.add.text(x + offsetX, y + offsetY - 10, resource, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: COLORS.textSecondary,
        }).setOrigin(0.5).setDepth(301);

        scene.tweens.add({
          targets: label,
          y: y + offsetY - 50,
          alpha: 0,
          duration: 1000,
          onComplete: () => label.destroy(),
        });

        UIResourceDelta.show(scene, x + offsetX, y + offsetY, Math.round(amount));
      });
    });
  }
}
