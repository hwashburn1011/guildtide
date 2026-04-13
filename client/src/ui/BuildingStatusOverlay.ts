/**
 * Building status icon overlay showing current state
 * (producing, idle, broken, upgrading, boosted, max_level).
 *
 * T-0369: Building status icon overlay
 * T-0294/T-0299/T-0304/T-0310/T-0315/T-0320/T-0325/T-0330/T-0335/T-0340/T-0345:
 *   Visual variations per building upgrade level.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import type { Building } from '@shared/types';
import { BUILDING_DEFINITIONS } from '@shared/constants';
import { BuildingType } from '@shared/enums';

interface VisualConfig {
  state: string;
  tint: number;
  overlayIcon: string;
  animationSpeed: number;
}

const VISUAL_STATES: Record<string, VisualConfig> = {
  constructing: { state: 'constructing', tint: 0x888888, overlayIcon: 'H', animationSpeed: 0.5 },
  idle: { state: 'idle', tint: 0xffffff, overlayIcon: 'z', animationSpeed: 0 },
  producing: { state: 'producing', tint: 0xffffff, overlayIcon: 'G', animationSpeed: 1.0 },
  damaged: { state: 'damaged', tint: 0xff6666, overlayIcon: '!', animationSpeed: 0.3 },
  boosted: { state: 'boosted', tint: 0xffff88, overlayIcon: '*', animationSpeed: 1.5 },
  upgrading: { state: 'upgrading', tint: 0x88ccff, overlayIcon: '^', animationSpeed: 0.8 },
  max_level: { state: 'max_level', tint: 0xffd700, overlayIcon: 'C', animationSpeed: 0.7 },
};

/** Level tier visual colors for building cards */
const LEVEL_TIER_COLORS: Array<{ minLevel: number; color: number; label: string }> = [
  { minLevel: 15, color: 0xffd700, label: 'Legendary' },
  { minLevel: 10, color: 0x9b59b6, label: 'Epic' },
  { minLevel: 5, color: 0x3498db, label: 'Rare' },
  { minLevel: 1, color: 0x4ecca3, label: 'Common' },
  { minLevel: 0, color: 0x666666, label: 'Unbuilt' },
];

export class BuildingStatusOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private icons: Map<string, {
    icon: Phaser.GameObjects.Text;
    bg: Phaser.GameObjects.Arc;
    tween?: Phaser.Tweens.Tween;
  }> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
  }

  /**
   * Render status overlay icons for all buildings at specified positions.
   */
  render(
    buildings: Building[],
    positions: Map<string, { x: number; y: number }>,
  ): void {
    this.clear();

    for (const building of buildings) {
      const pos = positions.get(building.type);
      if (!pos) continue;

      const meta = building.metadata as Record<string, unknown> | null;
      const state = this.resolveState(building, meta);
      const visual = VISUAL_STATES[state] ?? VISUAL_STATES.idle;
      const tier = this.getLevelTier(building.level);

      // Tier border glow
      const tierGlow = this.scene.add.arc(pos.x, pos.y, 24, 0, 360, false, tier.color, 0.3);
      this.container.add(tierGlow);

      // Status icon background
      const bg = this.scene.add.arc(
        pos.x + 18, pos.y - 18,
        10, 0, 360, false,
        visual.tint, 0.9,
      );
      bg.setStrokeStyle(1, 0x000000);
      this.container.add(bg);

      // Status icon character
      const icon = this.scene.add.text(pos.x + 18, pos.y - 18, visual.overlayIcon, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#000000',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.container.add(icon);

      // Animate if needed
      let tween: Phaser.Tweens.Tween | undefined;
      if (visual.animationSpeed > 0) {
        tween = this.scene.tweens.add({
          targets: [icon, bg],
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 800 / visual.animationSpeed,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      this.icons.set(building.type, { icon, bg, tween });
    }
  }

  private resolveState(building: Building, meta: Record<string, unknown> | null): string {
    if (building.level === 0) {
      if (meta?.constructing) return 'constructing';
      return 'idle';
    }

    const def = BUILDING_DEFINITIONS[building.type as BuildingType];
    if (def && building.level >= def.maxLevel) return 'max_level';
    if (meta?.upgrading) return 'upgrading';
    if (meta?.damaged) return 'damaged';
    if (meta?.boosted) return 'boosted';
    if (meta?.activeEvent) {
      const event = meta.activeEvent as { boost?: number; penalty?: number };
      if (event.boost && event.boost > 0) return 'boosted';
      if (event.penalty && event.penalty > 0) return 'damaged';
    }

    return building.level > 0 ? 'producing' : 'idle';
  }

  private getLevelTier(level: number): { color: number; label: string } {
    for (const tier of LEVEL_TIER_COLORS) {
      if (level >= tier.minLevel) return tier;
    }
    return LEVEL_TIER_COLORS[LEVEL_TIER_COLORS.length - 1];
  }

  /**
   * Get the visual variation description for a building level (3 tiers per building).
   */
  static getLevelVariation(level: number): { tier: number; label: string; description: string } {
    if (level >= 15) {
      return { tier: 3, label: 'Grand', description: 'Magnificent structure with ornate decorations and magical aura.' };
    }
    if (level >= 8) {
      return { tier: 2, label: 'Improved', description: 'Reinforced structure with expanded capacity and finer materials.' };
    }
    if (level >= 1) {
      return { tier: 1, label: 'Basic', description: 'Simple functional structure of wood and stone.' };
    }
    return { tier: 0, label: 'Blueprint', description: 'A planned building site awaiting construction.' };
  }

  clear(): void {
    for (const entry of this.icons.values()) {
      entry.tween?.destroy();
    }
    this.icons.clear();
    this.container.removeAll(true);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    this.clear();
    this.container.destroy();
  }
}
