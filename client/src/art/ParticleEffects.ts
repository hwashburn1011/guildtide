/**
 * ParticleEffects — Expanded particle effect library for weather, combat,
 * crafting, level-up, celebrations, and ambient effects.
 *
 * T-1412: Rain particle effect system with variable intensity
 * T-1413: Snow particle effect system with accumulation visual
 * T-1414: Sun ray light beam effect
 * T-1415: Fog overlay effect with transparency gradient
 * T-1416: Storm lightning flash effect
 * T-1417: Wind particle effect (leaves, dust)
 * T-1418: Firefly particle effect for night scenes
 * T-1419: Ember particle effect for volcanic regions
 * T-1420: Bubble particle effect for coastal/underwater areas
 * T-1421: Magical sparkle particle effect for enchanting
 * T-1437: Combat hit effect animations (slash, explosion, magic burst)
 * T-1449: Celebration animation sprites (fireworks, confetti, sparkle)
 */
import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
}

type EffectType =
  | 'rain' | 'snow' | 'sun_rays' | 'fog' | 'lightning'
  | 'wind' | 'firefly' | 'ember' | 'bubble' | 'sparkle'
  | 'slash' | 'explosion' | 'magic_burst'
  | 'firework' | 'confetti' | 'level_up' | 'crafting_spark'
  | 'heal' | 'poison_cloud' | 'shield_shimmer';

export class ParticleEffects {
  private scene: Phaser.Scene;
  private particles: Map<string, Particle[]> = new Map();
  private graphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private activeEffects: Set<string> = new Set();
  private updateEvent: Phaser.Time.TimerEvent | null = null;
  private lightningFlash: Phaser.GameObjects.Rectangle | null = null;
  private fogOverlay: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.updateEvent = scene.time.addEvent({
      delay: 16,
      callback: this.update,
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * Start a continuous particle effect.
   */
  startEffect(id: string, type: EffectType, config?: Partial<EffectConfig>): void {
    if (this.activeEffects.has(id)) return;
    this.activeEffects.add(id);

    const gfx = this.scene.add.graphics().setDepth(100);
    this.graphics.set(id, gfx);
    this.particles.set(id, []);

    const cfg: EffectConfig = { ...DEFAULT_CONFIGS[type], ...config };
    this.spawnBatch(id, type, cfg);

    if (cfg.continuous) {
      this.scene.time.addEvent({
        delay: cfg.spawnInterval,
        callback: () => {
          if (this.activeEffects.has(id)) this.spawnBatch(id, type, cfg);
        },
        loop: true,
      });
    }
  }

  /**
   * Fire a one-shot effect at a position.
   */
  burstEffect(type: EffectType, x: number, y: number, count: number = 20): void {
    const id = `burst_${type}_${Date.now()}`;
    const gfx = this.scene.add.graphics().setDepth(110);
    this.graphics.set(id, gfx);
    this.activeEffects.add(id);

    const particles: Particle[] = [];
    const cfg = DEFAULT_CONFIGS[type] || DEFAULT_CONFIGS.sparkle;

    for (let i = 0; i < count; i++) {
      particles.push(this.createParticle(type, x, y, cfg));
    }
    this.particles.set(id, particles);

    // Auto-cleanup after max life
    this.scene.time.delayedCall(cfg.maxLife + 500, () => {
      this.stopEffect(id);
    });
  }

  /**
   * Stop and clean up a particle effect.
   */
  stopEffect(id: string): void {
    this.activeEffects.delete(id);
    const gfx = this.graphics.get(id);
    if (gfx?.scene) gfx.destroy();
    this.graphics.delete(id);
    this.particles.delete(id);
  }

  /**
   * Start a lightning flash effect.
   */
  triggerLightning(): void {
    if (this.lightningFlash?.scene) this.lightningFlash.destroy();
    this.lightningFlash = this.scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.7,
    ).setDepth(200);

    this.scene.tweens.add({
      targets: this.lightningFlash,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        if (this.lightningFlash?.scene) this.lightningFlash.destroy();
        this.lightningFlash = null;
      },
    });
  }

  /**
   * Show/hide fog overlay.
   */
  setFog(enabled: boolean, density: number = 0.3): void {
    if (enabled) {
      if (!this.fogOverlay || !this.fogOverlay.scene) {
        this.fogOverlay = this.scene.add.rectangle(
          GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xd3d3d3, 0,
        ).setDepth(90);
      }
      this.scene.tweens.add({
        targets: this.fogOverlay,
        alpha: density,
        duration: 2000,
        ease: 'Sine.easeInOut',
      });
    } else if (this.fogOverlay?.scene) {
      this.scene.tweens.add({
        targets: this.fogOverlay,
        alpha: 0,
        duration: 2000,
        onComplete: () => {
          if (this.fogOverlay?.scene) this.fogOverlay.destroy();
          this.fogOverlay = null;
        },
      });
    }
  }

  /**
   * Sun ray light beams.
   */
  drawSunRays(gfx: Phaser.GameObjects.Graphics, x: number, y: number, count: number = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const length = 200 + Math.random() * 100;
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      gfx.lineStyle(3 + Math.random() * 4, 0xffd700, 0.08 + Math.random() * 0.07);
      gfx.lineBetween(x, y, endX, endY);
    }
  }

  private update(): void {
    for (const [id, particles] of this.particles.entries()) {
      const gfx = this.graphics.get(id);
      if (!gfx?.scene) continue;
      gfx.clear();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 16;
        p.rotation += p.rotationSpeed;

        const lifeRatio = Math.max(0, p.life / p.maxLife);
        const alpha = p.alpha * lifeRatio;

        if (p.life <= 0 || p.y > GAME_HEIGHT + 20 || p.x < -20 || p.x > GAME_WIDTH + 20) {
          particles.splice(i, 1);
          continue;
        }

        gfx.fillStyle(p.color, alpha);
        gfx.fillCircle(p.x, p.y, p.size * (0.5 + lifeRatio * 0.5));
      }
    }
  }

  private spawnBatch(id: string, type: EffectType, cfg: EffectConfig): void {
    const particles = this.particles.get(id);
    if (!particles) return;

    for (let i = 0; i < cfg.spawnCount; i++) {
      const x = cfg.areaX + Math.random() * cfg.areaW;
      const y = cfg.areaY + Math.random() * cfg.areaH;
      particles.push(this.createParticle(type, x, y, cfg));
    }
  }

  private createParticle(type: EffectType, x: number, y: number, cfg: EffectConfig): Particle {
    const life = cfg.minLife + Math.random() * (cfg.maxLife - cfg.minLife);
    const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
    const size = cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize);

    let vx = 0, vy = 0, rotSpeed = 0;
    switch (type) {
      case 'rain':
        vx = -0.5 + Math.random() * -1;
        vy = 4 + Math.random() * 4;
        break;
      case 'snow':
        vx = -0.5 + Math.random();
        vy = 0.5 + Math.random() * 1.5;
        rotSpeed = (Math.random() - 0.5) * 0.05;
        break;
      case 'wind':
        vx = 2 + Math.random() * 3;
        vy = -0.5 + Math.random();
        rotSpeed = (Math.random() - 0.5) * 0.1;
        break;
      case 'firefly':
        vx = (Math.random() - 0.5) * 0.5;
        vy = (Math.random() - 0.5) * 0.5;
        break;
      case 'ember':
        vx = (Math.random() - 0.5) * 1.5;
        vy = -1 - Math.random() * 2;
        break;
      case 'bubble':
        vx = (Math.random() - 0.5) * 0.3;
        vy = -0.5 - Math.random() * 1;
        break;
      case 'sparkle':
      case 'magic_burst':
      case 'heal':
      case 'shield_shimmer':
        vx = (Math.random() - 0.5) * 2;
        vy = (Math.random() - 0.5) * 2;
        break;
      case 'slash':
        vx = (Math.random() - 0.5) * 6;
        vy = (Math.random() - 0.5) * 4;
        break;
      case 'explosion':
        { const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed; }
        break;
      case 'firework':
        { const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 4;
        vx = Math.cos(a) * s;
        vy = Math.sin(a) * s - 1; }
        break;
      case 'confetti':
        vx = (Math.random() - 0.5) * 3;
        vy = 1 + Math.random() * 2;
        rotSpeed = (Math.random() - 0.5) * 0.2;
        break;
      case 'level_up':
        vx = (Math.random() - 0.5) * 1;
        vy = -2 - Math.random() * 2;
        break;
      case 'crafting_spark':
        { const ca = Math.random() * Math.PI * 2;
        const cs = 1 + Math.random() * 3;
        vx = Math.cos(ca) * cs;
        vy = Math.sin(ca) * cs; }
        break;
      case 'poison_cloud':
        vx = (Math.random() - 0.5) * 0.8;
        vy = -0.3 - Math.random() * 0.5;
        break;
      default:
        vx = (Math.random() - 0.5) * 2;
        vy = (Math.random() - 0.5) * 2;
    }

    return {
      x, y, vx, vy,
      life, maxLife: life,
      size, color,
      alpha: cfg.alpha,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: rotSpeed,
    };
  }

  destroy(): void {
    for (const id of this.activeEffects) {
      this.stopEffect(id);
    }
    if (this.updateEvent) this.updateEvent.destroy();
    if (this.lightningFlash?.scene) this.lightningFlash.destroy();
    if (this.fogOverlay?.scene) this.fogOverlay.destroy();
  }
}

interface EffectConfig {
  colors: number[];
  minSize: number;
  maxSize: number;
  minLife: number;
  maxLife: number;
  alpha: number;
  spawnCount: number;
  spawnInterval: number;
  continuous: boolean;
  areaX: number;
  areaY: number;
  areaW: number;
  areaH: number;
}

const DEFAULT_CONFIGS: Record<string, EffectConfig> = {
  rain: {
    colors: [0x87ceeb, 0x4682b4, 0x6495ed],
    minSize: 1, maxSize: 2, minLife: 500, maxLife: 1000,
    alpha: 0.6, spawnCount: 10, spawnInterval: 50, continuous: true,
    areaX: 0, areaY: -10, areaW: GAME_WIDTH, areaH: 10,
  },
  snow: {
    colors: [0xffffff, 0xe0e8ff, 0xc0d0ff],
    minSize: 2, maxSize: 5, minLife: 3000, maxLife: 6000,
    alpha: 0.8, spawnCount: 3, spawnInterval: 100, continuous: true,
    areaX: 0, areaY: -10, areaW: GAME_WIDTH, areaH: 10,
  },
  sun_rays: {
    colors: [0xffd700, 0xffa500, 0xffff00],
    minSize: 2, maxSize: 4, minLife: 2000, maxLife: 4000,
    alpha: 0.3, spawnCount: 2, spawnInterval: 200, continuous: true,
    areaX: 0, areaY: 0, areaW: GAME_WIDTH, areaH: GAME_HEIGHT * 0.3,
  },
  fog: {
    colors: [0xd3d3d3, 0xc0c0c0, 0xa9a9a9],
    minSize: 15, maxSize: 30, minLife: 5000, maxLife: 8000,
    alpha: 0.15, spawnCount: 2, spawnInterval: 500, continuous: true,
    areaX: -20, areaY: GAME_HEIGHT * 0.3, areaW: GAME_WIDTH + 40, areaH: GAME_HEIGHT * 0.5,
  },
  lightning: {
    colors: [0xffffff, 0xf0f0ff],
    minSize: 1, maxSize: 3, minLife: 100, maxLife: 200,
    alpha: 1.0, spawnCount: 30, spawnInterval: 0, continuous: false,
    areaX: 0, areaY: 0, areaW: GAME_WIDTH, areaH: GAME_HEIGHT,
  },
  wind: {
    colors: [0xdeb887, 0xd2b48c, 0xc4a882, 0x8fbc8f],
    minSize: 2, maxSize: 5, minLife: 2000, maxLife: 4000,
    alpha: 0.5, spawnCount: 3, spawnInterval: 150, continuous: true,
    areaX: -20, areaY: 0, areaW: 20, areaH: GAME_HEIGHT,
  },
  firefly: {
    colors: [0xffff00, 0xadff2f, 0x00ff7f],
    minSize: 2, maxSize: 4, minLife: 3000, maxLife: 6000,
    alpha: 0.7, spawnCount: 1, spawnInterval: 300, continuous: true,
    areaX: 0, areaY: GAME_HEIGHT * 0.3, areaW: GAME_WIDTH, areaH: GAME_HEIGHT * 0.5,
  },
  ember: {
    colors: [0xff4500, 0xff6347, 0xff8c00, 0xffa500],
    minSize: 2, maxSize: 4, minLife: 1500, maxLife: 3000,
    alpha: 0.8, spawnCount: 3, spawnInterval: 100, continuous: true,
    areaX: 0, areaY: GAME_HEIGHT * 0.6, areaW: GAME_WIDTH, areaH: GAME_HEIGHT * 0.3,
  },
  bubble: {
    colors: [0x87ceeb, 0x00bfff, 0x4682b4],
    minSize: 3, maxSize: 7, minLife: 2000, maxLife: 5000,
    alpha: 0.4, spawnCount: 2, spawnInterval: 200, continuous: true,
    areaX: 0, areaY: GAME_HEIGHT * 0.5, areaW: GAME_WIDTH, areaH: GAME_HEIGHT * 0.4,
  },
  sparkle: {
    colors: [0xffd700, 0xffffff, 0x87ceeb, 0xff69b4],
    minSize: 1, maxSize: 4, minLife: 500, maxLife: 1500,
    alpha: 0.9, spawnCount: 15, spawnInterval: 0, continuous: false,
    areaX: 0, areaY: 0, areaW: 0, areaH: 0,
  },
  slash: {
    colors: [0xffffff, 0xcccccc, 0xff4444],
    minSize: 1, maxSize: 3, minLife: 200, maxLife: 400,
    alpha: 0.9, spawnCount: 20, spawnInterval: 0, continuous: false,
    areaX: 0, areaY: 0, areaW: 0, areaH: 0,
  },
  explosion: {
    colors: [0xff4500, 0xff6347, 0xffa500, 0xffd700, 0x333333],
    minSize: 2, maxSize: 6, minLife: 300, maxLife: 800,
    alpha: 0.9, spawnCount: 30, spawnInterval: 0, continuous: false,
    areaX: 0, areaY: 0, areaW: 0, areaH: 0,
  },
  magic_burst: {
    colors: [0x9370db, 0xba55d3, 0x8a2be2, 0xffffff],
    minSize: 2, maxSize: 5, minLife: 400, maxLife: 1000,
    alpha: 0.8, spawnCount: 25, spawnInterval: 0, continuous: false,
    areaX: 0, areaY: 0, areaW: 0, areaH: 0,
  },
  firework: {
    colors: [0xff0000, 0x00ff00, 0x0000ff, 0xffd700, 0xff69b4, 0x00ffff],
    minSize: 2, maxSize: 4, minLife: 500, maxLife: 1500,
    alpha: 0.9, spawnCount: 40, spawnInterval: 0, continuous: false,
    areaX: 0, areaY: 0, areaW: 0, areaH: 0,
  },
  confetti: {
    colors: [0xff0000, 0x00ff00, 0x0000ff, 0xffd700, 0xff69b4, 0x00ffff, 0xffa500],
    minSize: 3, maxSize: 6, minLife: 2000, maxLife: 4000,
    alpha: 0.8, spawnCount: 50, spawnInterval: 0, continuous: false,
    areaX: 0, areaY: -20, areaW: GAME_WIDTH, areaH: 20,
  },
  level_up: {
    colors: [0xffd700, 0xffffff, 0x4ecca3],
    minSize: 2, maxSize: 5, minLife: 800, maxLife: 1500,
    alpha: 0.9, spawnCount: 30, spawnInterval: 0, continuous: false,
    areaX: 0, areaY: 0, areaW: 0, areaH: 0,
  },
  crafting_spark: {
    colors: [0xffa500, 0xff6347, 0xffd700],
    minSize: 1, maxSize: 3, minLife: 300, maxLife: 700,
    alpha: 0.9, spawnCount: 15, spawnInterval: 0, continuous: false,
    areaX: 0, areaY: 0, areaW: 0, areaH: 0,
  },
  heal: {
    colors: [0x00ff7f, 0x4ecca3, 0x98fb98, 0xffffff],
    minSize: 2, maxSize: 4, minLife: 600, maxLife: 1200,
    alpha: 0.7, spawnCount: 15, spawnInterval: 0, continuous: false,
    areaX: 0, areaY: 0, areaW: 0, areaH: 0,
  },
  poison_cloud: {
    colors: [0x228b22, 0x006400, 0x32cd32],
    minSize: 5, maxSize: 12, minLife: 1000, maxLife: 2000,
    alpha: 0.4, spawnCount: 10, spawnInterval: 0, continuous: false,
    areaX: 0, areaY: 0, areaW: 0, areaH: 0,
  },
  shield_shimmer: {
    colors: [0x87ceeb, 0xadd8e6, 0xffffff],
    minSize: 1, maxSize: 3, minLife: 400, maxLife: 800,
    alpha: 0.6, spawnCount: 20, spawnInterval: 0, continuous: false,
    areaX: 0, areaY: 0, areaW: 0, areaH: 0,
  },
};
