import * as Phaser from 'phaser';

/**
 * Static utility class with reusable animation methods for Phaser game objects.
 * Covers: fade, slide, scale, bounce, pulse, shimmer, countUp, typewriter.
 */
export class UIAnimations {
  /**
   * Fade a game object in from alpha 0 to 1.
   */
  static fadeIn(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    duration = 300,
  ): Phaser.Tweens.Tween {
    (target as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0);
    return scene.tweens.add({
      targets: target,
      alpha: 1,
      duration,
      ease: 'Power2',
    });
  }

  /**
   * Fade a game object out from current alpha to 0.
   */
  static fadeOut(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    duration = 300,
  ): Phaser.Tweens.Tween {
    return scene.tweens.add({
      targets: target,
      alpha: 0,
      duration,
      ease: 'Power2',
    });
  }

  /**
   * Slide a game object in from a direction.
   * @param from — 'left', 'right', 'top', 'bottom'
   */
  static slideIn(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
    from: 'left' | 'right' | 'top' | 'bottom' = 'left',
    duration = 400,
    distance = 200,
  ): Phaser.Tweens.Tween {
    const finalX = target.x;
    const finalY = target.y;

    switch (from) {
      case 'left':
        target.x = finalX - distance;
        break;
      case 'right':
        target.x = finalX + distance;
        break;
      case 'top':
        target.y = finalY - distance;
        break;
      case 'bottom':
        target.y = finalY + distance;
        break;
    }

    return scene.tweens.add({
      targets: target,
      x: finalX,
      y: finalY,
      duration,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Scale up a game object from 0 to 1.
   */
  static scaleUp(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    duration = 300,
  ): Phaser.Tweens.Tween {
    (target as unknown as Phaser.GameObjects.Components.Transform).setScale(0);
    return scene.tweens.add({
      targets: target,
      scaleX: 1,
      scaleY: 1,
      duration,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Bounce effect: quick scale up then settle.
   */
  static bounce(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
  ): Phaser.Tweens.Tween {
    return scene.tweens.add({
      targets: target,
      scaleX: { from: 1, to: 1.3 },
      scaleY: { from: 1, to: 1.3 },
      duration: 150,
      yoyo: true,
      ease: 'Bounce.easeOut',
    });
  }

  /**
   * Pulse effect: gentle alpha pulse.
   */
  static pulse(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    repeatCount = -1,
  ): Phaser.Tweens.Tween {
    return scene.tweens.add({
      targets: target,
      alpha: { from: 1, to: 0.5 },
      duration: 600,
      yoyo: true,
      repeat: repeatCount,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Shimmer effect: brief highlight sweep (alpha oscillation).
   * Good for skeleton loading placeholders.
   */
  static shimmer(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    repeatCount = -1,
  ): Phaser.Tweens.Tween {
    return scene.tweens.add({
      targets: target,
      alpha: { from: 0.3, to: 0.8 },
      duration: 800,
      yoyo: true,
      repeat: repeatCount,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Animate a text object's displayed number counting from `from` to `to`.
   */
  static countUp(
    scene: Phaser.Scene,
    textObject: Phaser.GameObjects.Text,
    from: number,
    to: number,
    duration = 1000,
    prefix = '',
    suffix = '',
  ): Phaser.Tweens.Tween {
    return scene.tweens.addCounter({
      from,
      to,
      duration,
      ease: 'Power1',
      onUpdate: (tween) => {
        const value = Math.round(tween.getValue() ?? 0);
        textObject.setText(`${prefix}${value}${suffix}`);
      },
    });
  }

  /**
   * Typewriter effect: display text character by character.
   * @param speed — milliseconds per character
   */
  static typewriter(
    scene: Phaser.Scene,
    textObject: Phaser.GameObjects.Text,
    fullText: string,
    speed = 40,
    onComplete?: () => void,
  ): Phaser.Time.TimerEvent {
    let charIndex = 0;
    textObject.setText('');

    return scene.time.addEvent({
      delay: speed,
      repeat: fullText.length - 1,
      callback: () => {
        charIndex++;
        textObject.setText(fullText.substring(0, charIndex));
        if (charIndex >= fullText.length) {
          onComplete?.();
        }
      },
    });
  }
}
