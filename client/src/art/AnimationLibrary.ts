/**
 * AnimationLibrary — Tween-based animation presets for idle, combat,
 * production, walking, construction, currency, and hero animations.
 *
 * T-1453: Hero idle animation sprites (10 roles x 4 frames)
 * T-1454: Building construction animation sprites
 * T-1456: Currency/coin animation sprites
 * T-1433: Expedition route path visual (dotted line with direction)
 */
import * as Phaser from 'phaser';

export type AnimationPreset =
  | 'idle_bob' | 'idle_breathe' | 'idle_glow'
  | 'combat_attack' | 'combat_hit' | 'combat_dodge' | 'combat_die'
  | 'walk_bounce' | 'walk_slide'
  | 'production_pulse' | 'production_spin'
  | 'construction_build' | 'construction_complete'
  | 'coin_flip' | 'coin_collect'
  | 'level_up_burst' | 'level_up_glow'
  | 'appear_pop' | 'appear_fade' | 'appear_slide_up'
  | 'disappear_shrink' | 'disappear_fade'
  | 'shake' | 'bounce' | 'wobble' | 'float' | 'pulse' | 'spin';

interface AnimConfig {
  duration: number;
  ease: string;
  repeat: number;
  yoyo: boolean;
  props: Record<string, any>;
}

const PRESETS: Record<AnimationPreset, AnimConfig> = {
  idle_bob: { duration: 1200, ease: 'Sine.easeInOut', repeat: -1, yoyo: true, props: { y: '-=4' } },
  idle_breathe: { duration: 2000, ease: 'Sine.easeInOut', repeat: -1, yoyo: true, props: { scaleX: 1.03, scaleY: 0.97 } },
  idle_glow: { duration: 1500, ease: 'Sine.easeInOut', repeat: -1, yoyo: true, props: { alpha: 0.7 } },

  combat_attack: { duration: 200, ease: 'Power2', repeat: 0, yoyo: true, props: { x: '+=20', scaleX: 1.1 } },
  combat_hit: { duration: 150, ease: 'Power2', repeat: 0, yoyo: true, props: { x: '-=8', tint: 0xff0000 } },
  combat_dodge: { duration: 300, ease: 'Back.easeOut', repeat: 0, yoyo: true, props: { x: '-=30', alpha: 0.5 } },
  combat_die: { duration: 800, ease: 'Power2', repeat: 0, yoyo: false, props: { alpha: 0, scaleY: 0.1, y: '+=20' } },

  walk_bounce: { duration: 400, ease: 'Sine.easeInOut', repeat: -1, yoyo: true, props: { y: '-=3' } },
  walk_slide: { duration: 600, ease: 'Linear', repeat: 0, yoyo: false, props: { x: '+=40' } },

  production_pulse: { duration: 800, ease: 'Sine.easeInOut', repeat: -1, yoyo: true, props: { scaleX: 1.05, scaleY: 1.05 } },
  production_spin: { duration: 2000, ease: 'Linear', repeat: -1, yoyo: false, props: { angle: 360 } },

  construction_build: { duration: 1500, ease: 'Power1', repeat: 0, yoyo: false, props: { scaleY: 1, alpha: 1 } },
  construction_complete: { duration: 500, ease: 'Back.easeOut', repeat: 0, yoyo: false, props: { scaleX: 1.15, scaleY: 1.15 } },

  coin_flip: { duration: 400, ease: 'Sine.easeInOut', repeat: 2, yoyo: true, props: { scaleX: 0.1, y: '-=15' } },
  coin_collect: { duration: 600, ease: 'Power2', repeat: 0, yoyo: false, props: { y: '-=40', alpha: 0, scaleX: 0.5, scaleY: 0.5 } },

  level_up_burst: { duration: 600, ease: 'Back.easeOut', repeat: 0, yoyo: true, props: { scaleX: 1.3, scaleY: 1.3 } },
  level_up_glow: { duration: 1000, ease: 'Sine.easeInOut', repeat: 2, yoyo: true, props: { alpha: 0.5 } },

  appear_pop: { duration: 300, ease: 'Back.easeOut', repeat: 0, yoyo: false, props: { scaleX: 1, scaleY: 1 } },
  appear_fade: { duration: 400, ease: 'Sine.easeIn', repeat: 0, yoyo: false, props: { alpha: 1 } },
  appear_slide_up: { duration: 400, ease: 'Power2', repeat: 0, yoyo: false, props: { y: '-=20', alpha: 1 } },

  disappear_shrink: { duration: 300, ease: 'Power2', repeat: 0, yoyo: false, props: { scaleX: 0, scaleY: 0, alpha: 0 } },
  disappear_fade: { duration: 400, ease: 'Sine.easeOut', repeat: 0, yoyo: false, props: { alpha: 0 } },

  shake: { duration: 100, ease: 'Sine.easeInOut', repeat: 3, yoyo: true, props: { x: '+=4' } },
  bounce: { duration: 400, ease: 'Bounce.easeOut', repeat: 0, yoyo: false, props: { y: '-=20' } },
  wobble: { duration: 300, ease: 'Sine.easeInOut', repeat: 2, yoyo: true, props: { angle: 5 } },
  float: { duration: 2000, ease: 'Sine.easeInOut', repeat: -1, yoyo: true, props: { y: '-=8' } },
  pulse: { duration: 600, ease: 'Sine.easeInOut', repeat: -1, yoyo: true, props: { scaleX: 1.08, scaleY: 1.08 } },
  spin: { duration: 1000, ease: 'Linear', repeat: -1, yoyo: false, props: { angle: 360 } },
};

export class AnimationLibrary {
  private scene: Phaser.Scene;
  private activeTweens: Map<string, Phaser.Tweens.Tween> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Play a preset animation on a game object.
   */
  play(
    target: Phaser.GameObjects.GameObject,
    preset: AnimationPreset,
    id?: string,
    overrides?: Partial<AnimConfig>,
  ): Phaser.Tweens.Tween {
    const cfg = { ...PRESETS[preset], ...overrides };
    const tweenConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
      targets: target,
      duration: cfg.duration,
      ease: cfg.ease,
      repeat: cfg.repeat,
      yoyo: cfg.yoyo,
      ...cfg.props,
    };

    const tween = this.scene.tweens.add(tweenConfig);
    if (id) {
      const existing = this.activeTweens.get(id);
      if (existing?.isPlaying()) existing.stop();
      this.activeTweens.set(id, tween);
    }
    return tween;
  }

  /**
   * Stop a named animation.
   */
  stop(id: string): void {
    const tween = this.activeTweens.get(id);
    if (tween?.isPlaying()) tween.stop();
    this.activeTweens.delete(id);
  }

  /**
   * Play hero idle animation (role-specific breathing + bob).
   */
  playHeroIdle(target: Phaser.GameObjects.GameObject, role: string, id?: string): void {
    const roleAnimMap: Record<string, AnimationPreset> = {
      farmer: 'idle_breathe',
      scout: 'idle_bob',
      merchant: 'idle_breathe',
      blacksmith: 'production_pulse',
      alchemist: 'idle_glow',
      hunter: 'idle_bob',
      defender: 'idle_breathe',
      mystic: 'float',
      caravan_master: 'idle_bob',
      archivist: 'idle_breathe',
    };
    this.play(target, roleAnimMap[role] || 'idle_bob', id);
  }

  /**
   * Animate building construction (grows from ground up).
   */
  playConstruction(
    target: Phaser.GameObjects.GameObject & { scaleY: number; alpha: number },
    onComplete?: () => void,
  ): void {
    (target as any).scaleY = 0.1;
    (target as any).alpha = 0.3;
    const tween = this.scene.tweens.add({
      targets: target,
      scaleY: 1,
      alpha: 1,
      duration: 1500,
      ease: 'Power1',
      onComplete: () => {
        // Completion pop
        this.scene.tweens.add({
          targets: target,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 200,
          ease: 'Back.easeOut',
          yoyo: true,
          onComplete: () => onComplete?.(),
        });
      },
    });
    this.activeTweens.set('construction_' + Date.now(), tween);
  }

  /**
   * Coin collect animation (flip + float up + fade).
   */
  playCoinCollect(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    amount: number,
  ): void {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xffd700, 1);
    gfx.fillCircle(0, 0, 8);
    gfx.lineStyle(1, 0xb8860b, 1);
    gfx.strokeCircle(0, 0, 8);
    gfx.setPosition(x, y);
    container.add(gfx);

    const label = this.scene.add.text(x + 12, y, `+${amount}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffd700',
      fontStyle: 'bold',
    });
    container.add(label);

    this.scene.tweens.add({
      targets: [gfx, label],
      y: y - 40,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        gfx.destroy();
        label.destroy();
      },
    });
  }

  /**
   * Draw an animated expedition route (dotted line with moving dash).
   */
  drawExpeditionRoute(
    gfx: Phaser.GameObjects.Graphics,
    points: { x: number; y: number }[],
    progress: number,
    color: number = 0xf5a623,
  ): void {
    if (points.length < 2) return;

    // Draw dotted path
    gfx.lineStyle(2, color, 0.4);
    const dashLen = 8;
    const gapLen = 6;
    const offset = (Date.now() * 0.02) % (dashLen + gapLen);

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / dist;
      const ny = dy / dist;

      let d = offset;
      while (d < dist) {
        const sx = p1.x + nx * d;
        const sy = p1.y + ny * d;
        const ex = Math.min(d + dashLen, dist);
        const endX = p1.x + nx * ex;
        const endY = p1.y + ny * ex;
        gfx.lineBetween(sx, sy, endX, endY);
        d += dashLen + gapLen;
      }
    }

    // Progress marker
    const totalLen = this.getPathLength(points);
    const targetDist = totalLen * progress;
    const pos = this.getPointAtDistance(points, targetDist);

    gfx.fillStyle(color, 1);
    gfx.fillCircle(pos.x, pos.y, 5);
    gfx.lineStyle(2, 0xffffff, 0.8);
    gfx.strokeCircle(pos.x, pos.y, 5);

    // Direction arrow at progress point
    const aheadPos = this.getPointAtDistance(points, Math.min(targetDist + 10, totalLen));
    const angle = Math.atan2(aheadPos.y - pos.y, aheadPos.x - pos.x);
    gfx.fillStyle(color, 0.9);
    gfx.fillTriangle(
      pos.x + Math.cos(angle) * 10,
      pos.y + Math.sin(angle) * 10,
      pos.x + Math.cos(angle + 2.5) * 6,
      pos.y + Math.sin(angle + 2.5) * 6,
      pos.x + Math.cos(angle - 2.5) * 6,
      pos.y + Math.sin(angle - 2.5) * 6,
    );
  }

  private getPathLength(points: { x: number; y: number }[]): number {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  }

  private getPointAtDistance(points: { x: number; y: number }[], dist: number): { x: number; y: number } {
    let remaining = dist;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (remaining <= segLen) {
        const t = remaining / segLen;
        return { x: points[i].x + dx * t, y: points[i].y + dy * t };
      }
      remaining -= segLen;
    }
    return points[points.length - 1];
  }

  /**
   * Stop all active tweens.
   */
  destroy(): void {
    for (const tween of this.activeTweens.values()) {
      if (tween.isPlaying()) tween.stop();
    }
    this.activeTweens.clear();
  }
}
