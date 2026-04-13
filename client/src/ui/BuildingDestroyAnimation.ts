/**
 * Building destruction animation for demolish action.
 *
 * T-0365: Building destruction animation for demolish
 */
import * as Phaser from 'phaser';
import { COLORS } from '../config';

export class BuildingDestroyAnimation {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Play a destruction animation at the given position.
   * Creates falling debris particles and a dust cloud effect.
   */
  play(x: number, y: number, onComplete?: () => void): void {
    const container = this.scene.add.container(x, y);

    // Create debris particles (falling rectangles)
    const debrisCount = 12;
    const debris: Phaser.GameObjects.Rectangle[] = [];

    for (let i = 0; i < debrisCount; i++) {
      const size = Phaser.Math.Between(4, 12);
      const color = Phaser.Math.RND.pick([0x8B4513, 0xA0522D, 0x666666, 0x999999]);
      const piece = this.scene.add.rectangle(
        Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(-20, 10),
        size, size, color,
      );
      container.add(piece);
      debris.push(piece);
    }

    // Animate debris flying outward and falling
    for (const piece of debris) {
      this.scene.tweens.add({
        targets: piece,
        x: piece.x + Phaser.Math.Between(-80, 80),
        y: piece.y + Phaser.Math.Between(40, 120),
        alpha: 0,
        rotation: Phaser.Math.Between(-3, 3),
        scaleX: 0.3,
        scaleY: 0.3,
        duration: Phaser.Math.Between(600, 1200),
        ease: 'Quad.easeIn',
      });
    }

    // Dust cloud (expanding fading circle)
    const dust = this.scene.add.arc(0, 10, 15, 0, 360, false, 0xcccccc, 0.6);
    container.add(dust);

    this.scene.tweens.add({
      targets: dust,
      scaleX: 4,
      scaleY: 3,
      alpha: 0,
      duration: 800,
      ease: 'Quad.easeOut',
    });

    // Screen shake
    this.scene.cameras.main.shake(300, 0.005);

    // Flash the building location
    const flash = this.scene.add.rectangle(0, 0, 60, 60, 0xffffff, 0.8);
    container.add(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 300,
      ease: 'Quad.easeOut',
    });

    // Cleanup after animation
    this.scene.time.delayedCall(1500, () => {
      container.destroy(true);
      onComplete?.();
    });
  }

  /**
   * Play a construction-complete celebration effect.
   */
  playBuildComplete(x: number, y: number): void {
    const container = this.scene.add.container(x, y);

    // Rising sparkle particles
    const sparkleCount = 8;
    for (let i = 0; i < sparkleCount; i++) {
      const sparkle = this.scene.add.arc(
        Phaser.Math.Between(-25, 25),
        Phaser.Math.Between(-10, 10),
        3, 0, 360, false,
        Phaser.Math.RND.pick([0xffd700, 0x4ecca3, 0xffffff]),
        0.9,
      );
      container.add(sparkle);

      this.scene.tweens.add({
        targets: sparkle,
        y: sparkle.y - Phaser.Math.Between(40, 80),
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Phaser.Math.Between(500, 1000),
        ease: 'Quad.easeOut',
        delay: i * 50,
      });
    }

    // Glow ring
    const ring = this.scene.add.arc(0, 0, 20, 0, 360, false, 0xffd700, 0.5);
    container.add(ring);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
    });

    this.scene.time.delayedCall(1200, () => {
      container.destroy(true);
    });
  }
}
