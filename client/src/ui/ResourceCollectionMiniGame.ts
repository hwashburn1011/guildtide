import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { ResourceType } from '@shared/enums';

const RESOURCE_COLORS: Record<ResourceType, number> = {
  [ResourceType.Gold]: 0xffd700,
  [ResourceType.Wood]: 0x8b6914,
  [ResourceType.Stone]: 0xa0a0a0,
  [ResourceType.Herbs]: 0x4ecca3,
  [ResourceType.Ore]: 0xc87533,
  [ResourceType.Water]: 0x4dabf7,
  [ResourceType.Food]: 0xf59f00,
  [ResourceType.Essence]: 0xbe4bdb,
};

interface FallingOrb {
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  speed: number;
  resource: ResourceType;
  collected: boolean;
}

/**
 * A simple mini-game where resource orbs fall and the player clicks them
 * for an active play bonus. Score multiplies idle gain for a short burst.
 */
export class ResourceCollectionMiniGame {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible: boolean = false;
  private orbs: FallingOrb[] = [];
  private score: number = 0;
  private timeLeft: number = 15000; // 15 seconds
  private running: boolean = false;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private spawnTimer: number = 0;
  private onComplete: ((score: number, multiplier: number) => void) | null = null;

  private gameAreaX: number = 40;
  private gameAreaY: number = 60;
  private gameAreaW: number = 320;
  private gameAreaH: number = 350;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 - 230);
    this.container.setDepth(1100);
    this.container.setVisible(false);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x0a0a1e, 0.95);
    bg.fillRoundedRect(0, 0, 400, 460, 12);
    bg.lineStyle(2, 0xe94560, 0.8);
    bg.strokeRoundedRect(0, 0, 400, 460, 12);
    this.container.add(bg);

    // Title
    const title = scene.add.text(110, 10, 'Collect Resources!', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ffd700',
      fontStyle: 'bold',
    });
    this.container.add(title);

    // Game area border
    const areaBorder = scene.add.graphics();
    areaBorder.lineStyle(1, 0x333366, 0.8);
    areaBorder.strokeRect(this.gameAreaX, this.gameAreaY, this.gameAreaW, this.gameAreaH);
    this.container.add(areaBorder);

    // Score
    this.scoreText = scene.add.text(20, 420, 'Score: 0', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#4ecca3',
      fontStyle: 'bold',
    });
    this.container.add(this.scoreText);

    // Timer
    this.timerText = scene.add.text(280, 420, 'Time: 15s', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ff8c00',
      fontStyle: 'bold',
    });
    this.container.add(this.timerText);

    // Instructions
    const instructions = scene.add.text(60, 38, 'Click falling orbs to collect bonus resources', {
      fontFamily: FONTS.primary,
      fontSize: '11px',
      color: '#8888aa',
    });
    this.container.add(instructions);
  }

  setOnComplete(callback: (score: number, multiplier: number) => void): void {
    this.onComplete = callback;
  }

  start(): void {
    this.score = 0;
    this.timeLeft = 15000;
    this.running = true;
    this.orbs = [];
    this.spawnTimer = 0;
    this.visible = true;
    this.container.setVisible(true);
    this.scoreText.setText('Score: 0');
    this.timerText.setText('Time: 15s');
  }

  update(delta: number): void {
    if (!this.running) return;

    this.timeLeft -= delta;
    this.timerText.setText(`Time: ${Math.max(0, Math.ceil(this.timeLeft / 1000))}s`);

    if (this.timeLeft <= 0) {
      this.end();
      return;
    }

    // Spawn orbs
    this.spawnTimer += delta;
    const spawnInterval = Math.max(200, 600 - this.score * 10); // gets harder
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnOrb();
    }

    // Move orbs
    for (const orb of this.orbs) {
      if (orb.collected) continue;
      orb.y += orb.speed * (delta / 1000);
      orb.graphics.setPosition(orb.x, orb.y);

      // Remove if past bottom
      if (orb.y > this.gameAreaY + this.gameAreaH) {
        orb.graphics.destroy();
        orb.collected = true;
      }
    }

    // Clean up collected orbs
    this.orbs = this.orbs.filter(o => !o.collected || o.y <= this.gameAreaY + this.gameAreaH + 50);
  }

  private spawnOrb(): void {
    const types = Object.values(ResourceType);
    const resource = types[Math.floor(Math.random() * types.length)];
    const color = RESOURCE_COLORS[resource];

    const x = this.gameAreaX + 15 + Math.random() * (this.gameAreaW - 30);
    const y = this.gameAreaY;
    const speed = 80 + Math.random() * 60;
    const radius = resource === ResourceType.Essence ? 12 : 10;

    const gfx = this.scene.add.graphics();
    gfx.fillStyle(color, 0.9);
    gfx.fillCircle(0, 0, radius);
    gfx.lineStyle(1, 0xffffff, 0.3);
    gfx.strokeCircle(0, 0, radius);
    gfx.setPosition(x, y);

    // Make interactive
    const hitArea = new Phaser.Geom.Circle(0, 0, radius + 5);
    gfx.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
    gfx.on('pointerdown', () => {
      if (!orb.collected) {
        orb.collected = true;
        this.score++;
        this.scoreText.setText(`Score: ${this.score}`);

        // Burst effect
        const burst = this.scene.add.graphics();
        burst.fillStyle(color, 0.5);
        burst.fillCircle(orb.x, orb.y, 20);
        this.container.add(burst);
        this.scene.time.delayedCall(200, () => burst.destroy());

        gfx.destroy();
      }
    });

    this.container.add(gfx);

    const orb: FallingOrb = { graphics: gfx, x, y, speed, resource, collected: false };
    this.orbs.push(orb);
  }

  private end(): void {
    this.running = false;

    // Clean up remaining orbs
    for (const orb of this.orbs) {
      if (!orb.collected) orb.graphics.destroy();
    }
    this.orbs = [];

    // Calculate multiplier (1.0 base + 0.05 per point, max 3.0)
    const multiplier = Math.min(3.0, 1.0 + this.score * 0.05);

    // Show result
    const resultText = this.scene.add.text(
      80, 200,
      `Score: ${this.score}\nBonus: x${multiplier.toFixed(2)} for 60s`,
      {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: '#ffd700',
        fontStyle: 'bold',
        align: 'center',
      },
    );
    this.container.add(resultText);

    this.scene.time.delayedCall(2500, () => {
      resultText.destroy();
      this.hide();
      if (this.onComplete) {
        this.onComplete(this.score, multiplier);
      }
    });
  }

  hide(): void {
    this.visible = false;
    this.running = false;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }

  isRunning(): boolean {
    return this.running;
  }
}
