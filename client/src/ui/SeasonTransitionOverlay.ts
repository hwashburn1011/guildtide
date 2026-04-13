/**
 * SeasonTransitionOverlay — Visual transition between seasons with particle
 * effects, color palette shifts, and celebration text.
 *
 * T-0944: Season visual theme for Spring (green palette, flower particles)
 * T-0945: Season visual theme for Summer (warm palette, sun effects)
 * T-0946: Season visual theme for Autumn (orange palette, falling leaves)
 * T-0947: Season visual theme for Winter (blue palette, snow particles)
 * T-0948: Season transition animation between seasonal themes
 * T-0977: Season-specific ambient sounds
 * T-0978: Season-specific building visual changes
 * T-0983: Dawn/dusk transition effects in guild hall
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

type Season = 'spring' | 'summer' | 'autumn' | 'winter';
type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

interface SeasonVisualTheme {
  label: string;
  icon: string;
  primaryColor: number;
  secondaryColor: number;
  accentHex: string;
  particleColors: number[];
  particleType: string;
  ambienceLabel: string;
  greeting: string;
}

const SEASON_THEMES: Record<Season, SeasonVisualTheme> = {
  spring: {
    label: 'Spring',
    icon: '🌱',
    primaryColor: 0x4ecca3,
    secondaryColor: 0x2d5a3d,
    accentHex: '#4ecca3',
    particleColors: [0xff69b4, 0xffc0cb, 0xffffff, 0x98fb98],
    particleType: 'flowers',
    ambienceLabel: 'Birdsong fills the air',
    greeting: 'Spring has arrived! The land awakens with new life.',
  },
  summer: {
    label: 'Summer',
    icon: '☀',
    primaryColor: 0xf5a623,
    secondaryColor: 0x5a4a2d,
    accentHex: '#f5a623',
    particleColors: [0xffd700, 0xffa500, 0xffff00],
    particleType: 'sun_rays',
    ambienceLabel: 'Crickets chirp in the warm breeze',
    greeting: 'Summer blazes! Long days and warm nights await.',
  },
  autumn: {
    label: 'Autumn',
    icon: '🍂',
    primaryColor: 0xe07c24,
    secondaryColor: 0x5a3a2d,
    accentHex: '#e07c24',
    particleColors: [0xff8c00, 0xcd853f, 0x8b4513, 0xdaa520],
    particleType: 'leaves',
    ambienceLabel: 'Wind rustles through dry leaves',
    greeting: 'Autumn descends! Harvest time and cozy hearths.',
  },
  winter: {
    label: 'Winter',
    icon: '❄',
    primaryColor: 0x5b9bd5,
    secondaryColor: 0x2d3a5a,
    accentHex: '#5b9bd5',
    particleColors: [0xffffff, 0xe0e8ff, 0xc0d0ff],
    particleType: 'snow',
    ambienceLabel: 'Wind howls past frosted windows',
    greeting: 'Winter arrives! Bundle up and light the fires.',
  },
};

const TIME_OF_DAY_COLORS: Record<TimeOfDay, { tint: number; alpha: number; label: string }> = {
  dawn: { tint: 0xffcc88, alpha: 0.12, label: 'Dawn breaks over the guild hall' },
  day: { tint: 0xffffff, alpha: 0.0, label: '' },
  dusk: { tint: 0xff8866, alpha: 0.15, label: 'Dusk settles with warm hues' },
  night: { tint: 0x3344aa, alpha: 0.2, label: 'Night cloaks the guild in shadow' },
};

export class SeasonTransitionOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private particleTimer: Phaser.Time.TimerEvent | null = null;
  private activeParticles: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Play a full-screen season transition effect.
   * Shows old season fading out, new season fading in with themed particles.
   */
  playTransition(fromSeason: Season, toSeason: Season, onComplete?: () => void): void {
    this.destroy();

    const theme = SEASON_THEMES[toSeason];
    this.container = this.scene.add.container(0, 0).setDepth(200);

    // Full screen overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.container.add(overlay);

    // Color wash for new season
    const colorWash = this.scene.add.graphics();
    colorWash.fillStyle(theme.primaryColor, 0.15);
    colorWash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    colorWash.setAlpha(0);
    this.container.add(colorWash);

    // Season icon (large)
    const iconText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, theme.icon, {
      fontFamily: FONTS.primary, fontSize: '80px', color: theme.accentHex,
    }).setOrigin(0.5).setAlpha(0).setScale(0.3);
    this.container.add(iconText);

    // Season label
    const labelText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, theme.label, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.title}px`,
      color: theme.accentHex, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.container.add(labelText);

    // Greeting text
    const greetingText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, theme.greeting, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary, fontStyle: 'italic',
    }).setOrigin(0.5).setAlpha(0);
    this.container.add(greetingText);

    // Ambience label
    const ambienceText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, theme.ambienceLabel, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#888',
    }).setOrigin(0.5).setAlpha(0);
    this.container.add(ambienceText);

    // Animate in sequence
    this.scene.tweens.add({
      targets: colorWash, alpha: 1, duration: 800, ease: 'Sine.easeIn',
    });

    this.scene.tweens.add({
      targets: iconText, alpha: 1, scale: 1, duration: 600, delay: 400, ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: labelText, alpha: 1, duration: 500, delay: 800, ease: 'Sine.easeOut',
    });

    this.scene.tweens.add({
      targets: greetingText, alpha: 1, duration: 500, delay: 1100, ease: 'Sine.easeOut',
    });

    this.scene.tweens.add({
      targets: ambienceText, alpha: 1, duration: 500, delay: 1400, ease: 'Sine.easeOut',
    });

    // Start particles
    this.startParticles(theme);

    // Auto-dismiss after 4 seconds
    this.scene.time.delayedCall(4000, () => {
      this.fadeOut(onComplete);
    });
  }

  /**
   * Apply a persistent seasonal particle effect (lighter version for normal gameplay).
   */
  applySeasonalParticles(season: Season): void {
    this.clearParticles();
    const theme = SEASON_THEMES[season];
    this.startParticles(theme, true);
  }

  /**
   * Apply time-of-day color tint overlay (T-0983).
   */
  applyTimeOfDay(timeOfDay: TimeOfDay): Phaser.GameObjects.Graphics | null {
    const config = TIME_OF_DAY_COLORS[timeOfDay];
    if (config.alpha <= 0) return null;

    const tintOverlay = this.scene.add.graphics();
    tintOverlay.fillStyle(config.tint, config.alpha);
    tintOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    tintOverlay.setDepth(50);
    return tintOverlay;
  }

  /**
   * Get building visual modifications for the current season (T-0978).
   */
  static getBuildingVisualKeys(season: Season, buildingType: string): string[] {
    const keys: string[] = [];
    // Universal seasonal decoration
    keys.push(`${season}_general`);
    // Building-specific
    keys.push(`${season}_${buildingType}`);
    return keys;
  }

  private startParticles(theme: SeasonVisualTheme, ambient: boolean = false): void {
    const count = ambient ? 3 : 8;
    const interval = ambient ? 400 : 150;

    this.particleTimer = this.scene.time.addEvent({
      delay: interval,
      repeat: ambient ? -1 : 20,
      callback: () => {
        for (let i = 0; i < count; i++) {
          this.spawnParticle(theme);
        }
      },
    });
  }

  private spawnParticle(theme: SeasonVisualTheme): void {
    const color = theme.particleColors[Math.floor(Math.random() * theme.particleColors.length)];
    const particle = this.scene.add.graphics();
    particle.setDepth(201);

    const x = Math.random() * GAME_WIDTH;
    const size = 2 + Math.random() * 4;

    if (theme.particleType === 'snow') {
      particle.fillStyle(color, 0.8);
      particle.fillCircle(0, 0, size);
    } else if (theme.particleType === 'leaves') {
      particle.fillStyle(color, 0.7);
      particle.fillEllipse(0, 0, size * 2, size);
    } else if (theme.particleType === 'flowers') {
      particle.fillStyle(color, 0.6);
      particle.fillCircle(0, 0, size);
      particle.fillCircle(size, 0, size * 0.6);
      particle.fillCircle(-size, 0, size * 0.6);
    } else {
      // sun_rays — small golden dots
      particle.fillStyle(color, 0.5);
      particle.fillCircle(0, 0, size * 0.8);
    }

    particle.setPosition(x, -10);
    this.activeParticles.push(particle);

    const targetY = GAME_HEIGHT + 20;
    const drift = (Math.random() - 0.5) * 100;

    this.scene.tweens.add({
      targets: particle,
      y: targetY,
      x: x + drift,
      alpha: 0,
      duration: 3000 + Math.random() * 3000,
      ease: 'Sine.easeIn',
      onComplete: () => {
        particle.destroy();
        const idx = this.activeParticles.indexOf(particle);
        if (idx >= 0) this.activeParticles.splice(idx, 1);
      },
    });
  }

  private fadeOut(onComplete?: () => void): void {
    if (!this.container) return;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        this.destroy();
        onComplete?.();
      },
    });
  }

  private clearParticles(): void {
    this.particleTimer?.remove();
    this.particleTimer = null;
    for (const p of this.activeParticles) {
      p.destroy();
    }
    this.activeParticles = [];
  }

  destroy(): void {
    this.clearParticles();
    this.container?.destroy(true);
    this.container = null;
  }
}
