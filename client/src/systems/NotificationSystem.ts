import Phaser from 'phaser';
import { FONTS, GAME_WIDTH } from '../config';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

interface Notification {
  container: Phaser.GameObjects.Container;
  timer: Phaser.Time.TimerEvent;
}

const TYPE_COLORS: Record<NotificationType, { bg: string; border: string }> = {
  success: { bg: '#2d6a4f', border: '#40916c' },
  warning: { bg: '#7f5539', border: '#b08968' },
  error:   { bg: '#6b1d1d', border: '#c0392b' },
  info:    { bg: '#1b3a5c', border: '#2980b9' },
};

const TOAST_HEIGHT = 44;
const TOAST_GAP = 8;
const TOAST_DURATION = 3000;
const FADE_MS = 300;

export class NotificationSystem {
  private static active: Notification[] = [];

  static show(scene: Phaser.Scene, message: string, type: NotificationType = 'info'): void {
    const colors = TYPE_COLORS[type];
    const y = 8 + NotificationSystem.active.length * (TOAST_HEIGHT + TOAST_GAP);

    const width = Math.min(500, GAME_WIDTH - 40);
    const x = GAME_WIDTH / 2;

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(colors.bg).color, 0.95);
    bg.fillRoundedRect(-width / 2, 0, width, TOAST_HEIGHT, 8);
    bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(colors.border).color);
    bg.strokeRoundedRect(-width / 2, 0, width, TOAST_HEIGHT, 8);

    const text = scene.add.text(0, TOAST_HEIGHT / 2, message, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const container = scene.add.container(x, y, [bg, text]);
    container.setDepth(1000);
    container.setAlpha(0);

    // Fade in
    scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: FADE_MS,
    });

    const timer = scene.time.delayedCall(TOAST_DURATION, () => {
      scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: FADE_MS,
        onComplete: () => {
          container.destroy();
          NotificationSystem.active = NotificationSystem.active.filter(n => n.container !== container);
          NotificationSystem.reflow(scene);
        },
      });
    });

    NotificationSystem.active.push({ container, timer });
  }

  private static reflow(scene: Phaser.Scene): void {
    NotificationSystem.active.forEach((n, i) => {
      const targetY = 8 + i * (TOAST_HEIGHT + TOAST_GAP);
      scene.tweens.add({
        targets: n.container,
        y: targetY,
        duration: 200,
      });
    });
  }
}
