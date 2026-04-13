import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIProgressBar } from './components/UIProgressBar';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import type { Building } from '@shared/types';

/**
 * Shows a progress bar overlay on buildings that are under construction.
 * Automatically completes when the timer expires.
 */
export class ConstructionProgressOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private progressBar!: UIProgressBar;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private building: Building;
  private onComplete: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    building: Building,
    onComplete: () => void,
  ) {
    this.scene = scene;
    this.building = building;
    this.onComplete = onComplete;
    this.container = scene.add.container(x, y);
    this.container.setDepth(100);

    const meta = building.metadata as any;
    if (!meta?.constructing) {
      this.container.destroy();
      return;
    }

    const startedAt = new Date(meta.startedAt).getTime();
    const duration = (meta.duration ?? 30) * 1000;
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, duration - elapsed);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(0, 0, width, 30, 4);
    this.container.add(bg);

    // Label
    this.container.add(
      scene.add.text(5, 2, 'Constructing...', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#f5a623',
        fontStyle: 'italic',
      }),
    );

    // Progress bar
    const progress = elapsed / duration;
    this.progressBar = new UIProgressBar(scene, {
      x: 5,
      y: 16,
      width: width - 10,
      height: 10,
      value: progress * 100,
      maxValue: 100,
      fillColor: 0xf5a623,
    });
    this.container.add(this.progressBar);

    if (remaining > 0) {
      // Animate progress to completion
      scene.tweens.addCounter({
        from: progress * 100,
        to: 100,
        duration: remaining,
        onUpdate: (tween) => {
          this.progressBar.setValue(tween.getValue() ?? 0, false);
        },
        onComplete: () => this.completeConstruction(),
      });
    } else {
      this.completeConstruction();
    }
  }

  private async completeConstruction(): Promise<void> {
    try {
      await apiClient.completeConstruction(this.building.type);
      NotificationSystem.show(this.scene, `Construction complete!`, 'success');
      this.onComplete();
    } catch {
      // May already be complete
    }
    this.destroy();
  }

  destroy(): void {
    if (this.timerEvent) {
      this.timerEvent.destroy();
    }
    this.container.destroy();
  }
}
