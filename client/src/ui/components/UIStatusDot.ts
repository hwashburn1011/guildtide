import * as Phaser from 'phaser';
import { FONTS } from '../../config';

export type DotStatus = 'online' | 'idle' | 'busy' | 'offline';

export interface UIStatusDotConfig {
  x: number;
  y: number;
  status?: DotStatus;
  size?: number;
  showLabel?: boolean;
}

const STATUS_COLORS: Record<DotStatus, number> = {
  online: 0x4ecca3,
  idle: 0xf5a623,
  busy: 0xe94560,
  offline: 0x666677,
};

/**
 * Small colored circle indicating status.
 * Green=online, Yellow=idle, Red=busy, Grey=offline.
 */
export class UIStatusDot extends Phaser.GameObjects.Container {
  private dot: Phaser.GameObjects.Graphics;
  private labelText?: Phaser.GameObjects.Text;
  private currentStatus: DotStatus;
  private dotSize: number;

  constructor(scene: Phaser.Scene, config: UIStatusDotConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.currentStatus = config.status ?? 'offline';
    this.dotSize = config.size ?? 8;

    this.dot = scene.add.graphics();
    this.add(this.dot);

    if (config.showLabel) {
      this.labelText = scene.add.text(this.dotSize + 6, 0, this.capitalize(this.currentStatus), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#a0a0b0',
      });
      this.labelText.setOrigin(0, 0.5);
      this.add(this.labelText);
    }

    this.draw();
  }

  private draw(): void {
    this.dot.clear();
    const color = STATUS_COLORS[this.currentStatus];
    this.dot.fillStyle(color, 1);
    this.dot.fillCircle(0, 0, this.dotSize);

    // Outer glow for online/busy
    if (this.currentStatus === 'online' || this.currentStatus === 'busy') {
      this.dot.fillStyle(color, 0.3);
      this.dot.fillCircle(0, 0, this.dotSize + 3);
      this.dot.fillStyle(color, 1);
      this.dot.fillCircle(0, 0, this.dotSize);
    }
  }

  setStatus(status: DotStatus): void {
    this.currentStatus = status;
    this.draw();
    this.labelText?.setText(this.capitalize(status));
  }

  getStatus(): DotStatus {
    return this.currentStatus;
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
