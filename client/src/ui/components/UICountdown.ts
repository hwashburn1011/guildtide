import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export interface UICountdownConfig {
  x: number;
  y: number;
  totalSeconds: number;
  fontSize?: number;
  color?: string;
  showProgressBar?: boolean;
  progressBarWidth?: number;
  onComplete?: () => void;
  onTick?: (remaining: number) => void;
}

/**
 * Countdown timer display (HH:MM:SS) with optional progress bar.
 * Updates every second. Callback on completion.
 */
export class UICountdown extends Phaser.GameObjects.Container {
  private timerText: Phaser.GameObjects.Text;
  private progressBg?: Phaser.GameObjects.Graphics;
  private progressFill?: Phaser.GameObjects.Graphics;
  private totalSeconds: number;
  private remainingSeconds: number;
  private timerEvent?: Phaser.Time.TimerEvent;
  private onComplete?: () => void;
  private onTick?: (remaining: number) => void;
  private barWidth: number;
  private showBar: boolean;

  constructor(scene: Phaser.Scene, config: UICountdownConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.totalSeconds = config.totalSeconds;
    this.remainingSeconds = config.totalSeconds;
    this.onComplete = config.onComplete;
    this.onTick = config.onTick;
    this.barWidth = config.progressBarWidth ?? 120;
    this.showBar = config.showProgressBar ?? false;

    // Timer display
    this.timerText = scene.add.text(0, 0, this.formatTime(this.remainingSeconds), {
      fontFamily: FONTS.primary,
      fontSize: `${config.fontSize ?? FONTS.sizes.body}px`,
      color: config.color ?? COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.timerText.setOrigin(0.5);
    this.add(this.timerText);

    // Optional progress bar
    if (this.showBar) {
      const barY = 16;
      this.progressBg = scene.add.graphics();
      this.progressBg.fillStyle(0x111128, 0.8);
      this.progressBg.fillRoundedRect(-this.barWidth / 2, barY, this.barWidth, 6, 3);
      this.add(this.progressBg);

      this.progressFill = scene.add.graphics();
      this.add(this.progressFill);
      this.drawProgressFill();
    }

    // Start ticking
    this.timerEvent = scene.time.addEvent({
      delay: 1000,
      repeat: this.totalSeconds - 1,
      callback: () => {
        this.remainingSeconds--;
        this.timerText.setText(this.formatTime(this.remainingSeconds));
        this.drawProgressFill();
        this.onTick?.(this.remainingSeconds);

        if (this.remainingSeconds <= 0) {
          this.onComplete?.();
        }
      },
    });
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');

    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  }

  private drawProgressFill(): void {
    if (!this.progressFill || !this.showBar) return;
    this.progressFill.clear();

    const fraction = this.totalSeconds > 0
      ? this.remainingSeconds / this.totalSeconds
      : 0;
    const fillW = Math.max(this.barWidth * fraction, 0);

    if (fillW > 0) {
      // Color shifts from green to red as time runs out
      const color = fraction > 0.5 ? COLORS.success : fraction > 0.2 ? COLORS.warning : COLORS.danger;
      this.progressFill.fillStyle(color, 1);
      this.progressFill.fillRoundedRect(-this.barWidth / 2, 16, fillW, 6, 3);
    }
  }

  getRemaining(): number {
    return this.remainingSeconds;
  }

  pause(): void {
    this.timerEvent?.paused && (this.timerEvent.paused = true);
  }

  resume(): void {
    this.timerEvent?.paused && (this.timerEvent.paused = false);
  }

  reset(totalSeconds?: number): void {
    this.timerEvent?.remove();
    this.totalSeconds = totalSeconds ?? this.totalSeconds;
    this.remainingSeconds = this.totalSeconds;
    this.timerText.setText(this.formatTime(this.remainingSeconds));
    this.drawProgressFill();

    this.timerEvent = this.scene.time.addEvent({
      delay: 1000,
      repeat: this.totalSeconds - 1,
      callback: () => {
        this.remainingSeconds--;
        this.timerText.setText(this.formatTime(this.remainingSeconds));
        this.drawProgressFill();
        this.onTick?.(this.remainingSeconds);
        if (this.remainingSeconds <= 0) {
          this.onComplete?.();
        }
      },
    });
  }

  destroy(fromScene?: boolean): void {
    this.timerEvent?.remove();
    super.destroy(fromScene);
  }
}
