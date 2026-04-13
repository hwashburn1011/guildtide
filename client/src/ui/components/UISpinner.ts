import * as Phaser from 'phaser';
import { COLORS } from '../../config';

export interface UISpinnerConfig {
  x: number;
  y: number;
  radius?: number;
  lineWidth?: number;
  color?: number;
  speed?: number;
}

/**
 * Animated rotating arc graphic for loading states.
 */
export class UISpinner extends Phaser.GameObjects.Container {
  private arc: Phaser.GameObjects.Graphics;
  private spinRadius: number;
  private lineWidth: number;
  private spinColor: number;
  private spinSpeed: number;

  constructor(scene: Phaser.Scene, config: UISpinnerConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.spinRadius = config.radius ?? 16;
    this.lineWidth = config.lineWidth ?? 3;
    this.spinColor = config.color ?? COLORS.accent;
    this.spinSpeed = config.speed ?? 4;

    this.arc = scene.add.graphics();
    this.add(this.arc);

    this.drawArc();

    // Rotate continuously
    scene.tweens.add({
      targets: this,
      angle: 360,
      duration: 1000 / this.spinSpeed * 4,
      repeat: -1,
      ease: 'Linear',
    });
  }

  private drawArc(): void {
    this.arc.clear();
    // Background circle (faint)
    this.arc.lineStyle(this.lineWidth, this.spinColor, 0.2);
    this.arc.strokeCircle(0, 0, this.spinRadius);
    // Partial arc (the spinner)
    this.arc.lineStyle(this.lineWidth, this.spinColor, 1);
    this.arc.beginPath();
    this.arc.arc(0, 0, this.spinRadius, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(90), false);
    this.arc.strokePath();
  }
}
