/**
 * UITheme — Dynamic theme system that adjusts UI visuals based on
 * biome, season, weather, and time of day.
 *
 * T-1428: UI panel backgrounds with parchment/wood textures
 * T-1429: UI button sprite states (normal, hover, pressed, disabled)
 * T-1430: UI border and frame decorations
 * T-1460: Sprite atlas packing configuration for optimal loading
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import {
  BIOME_PALETTES,
  SEASON_PALETTES,
  WEATHER_PALETTES,
  UI_PALETTES,
  RARITY_COLORS,
  lerpColor,
  darkenColor,
  lightenColor,
  type UIPalette,
} from './ColorPalette';

export interface ThemeState {
  biome: string;
  season: string;
  weather: string;
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
}

interface ComputedTheme {
  panelBg: number;
  panelBorder: number;
  panelBgAlpha: number;
  accent: number;
  textPrimary: string;
  textSecondary: string;
  buttonColor: number;
  buttonHover: number;
  headerGradientTop: number;
  headerGradientBottom: number;
  overlayTint: number;
  overlayAlpha: number;
}

const TIME_TINTS: Record<string, { multiply: number; alpha: number }> = {
  dawn: { multiply: 0xffcc88, alpha: 0.08 },
  day: { multiply: 0xffffff, alpha: 0 },
  dusk: { multiply: 0xff8866, alpha: 0.1 },
  night: { multiply: 0x4466aa, alpha: 0.15 },
};

export class UITheme {
  private scene: Phaser.Scene;
  private currentState: ThemeState = {
    biome: 'plains',
    season: 'spring',
    weather: 'clear',
    timeOfDay: 'day',
  };
  private computed: ComputedTheme;
  private overlay: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.computed = this.computeTheme(this.currentState);
  }

  /**
   * Update the theme state. Recomputes derived colors.
   */
  setState(state: Partial<ThemeState>): void {
    const prev = { ...this.currentState };
    Object.assign(this.currentState, state);
    this.computed = this.computeTheme(this.currentState);

    // Animate overlay transition
    if (prev.weather !== this.currentState.weather ||
        prev.timeOfDay !== this.currentState.timeOfDay) {
      this.applyOverlay();
    }
  }

  /**
   * Get the current computed theme values.
   */
  getTheme(): ComputedTheme {
    return this.computed;
  }

  /**
   * Get the full theme state.
   */
  getState(): ThemeState {
    return { ...this.currentState };
  }

  /**
   * Apply a styled panel background using current theme.
   */
  drawThemedPanel(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    variant: 'default' | 'accent' | 'dark' = 'default',
  ): void {
    const theme = this.computed;

    const bgColors = {
      default: theme.panelBg,
      accent: lerpColor(theme.panelBg, theme.accent, 0.15),
      dark: darkenColor(theme.panelBg, 0.6),
    };

    // Shadow
    gfx.fillStyle(0x000000, 0.15);
    gfx.fillRoundedRect(x + 2, y + 2, w, h, 6);

    // Background
    gfx.fillStyle(bgColors[variant], theme.panelBgAlpha);
    gfx.fillRoundedRect(x, y, w, h, 6);

    // Border
    gfx.lineStyle(1, theme.panelBorder, 0.7);
    gfx.strokeRoundedRect(x, y, w, h, 6);

    // Top accent
    gfx.fillStyle(theme.accent, 0.4);
    gfx.fillRect(x + 8, y + 1, w - 16, 2);
  }

  /**
   * Draw a themed button.
   */
  drawThemedButton(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    state: 'normal' | 'hover' | 'pressed' | 'disabled',
  ): void {
    const theme = this.computed;
    const configs = {
      normal: { fill: theme.buttonColor, border: lightenColor(theme.buttonColor, 0.2), alpha: 1, offset: 0 },
      hover: { fill: theme.buttonHover, border: lightenColor(theme.buttonHover, 0.3), alpha: 1, offset: -1 },
      pressed: { fill: darkenColor(theme.buttonColor, 0.75), border: theme.buttonColor, alpha: 1, offset: 1 },
      disabled: { fill: 0x555566, border: 0x444455, alpha: 0.4, offset: 0 },
    };
    const cfg = configs[state];

    if (state !== 'pressed') {
      gfx.fillStyle(0x000000, 0.15);
      gfx.fillRoundedRect(x + 1, y + 3, w, h, 4);
    }

    gfx.fillStyle(cfg.fill, cfg.alpha);
    gfx.fillRoundedRect(x, y + cfg.offset, w, h, 4);

    if (state === 'normal' || state === 'hover') {
      gfx.fillStyle(0xffffff, 0.08);
      gfx.fillRoundedRect(x + 2, y + cfg.offset + 1, w - 4, h * 0.4, { tl: 3, tr: 3, bl: 0, br: 0 });
    }

    gfx.lineStyle(1, cfg.border, cfg.alpha);
    gfx.strokeRoundedRect(x, y + cfg.offset, w, h, 4);
  }

  /**
   * Draw a themed header gradient bar.
   */
  drawHeaderBar(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const theme = this.computed;
    const steps = 8;
    const stripH = h / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const color = lerpColor(theme.headerGradientTop, theme.headerGradientBottom, t);
      gfx.fillStyle(color, 0.95);
      gfx.fillRect(x, y + i * stripH, w, stripH + 1);
    }

    // Bottom border
    gfx.fillStyle(theme.accent, 0.6);
    gfx.fillRect(x, y + h - 2, w, 2);
  }

  private computeTheme(state: ThemeState): ComputedTheme {
    const uiPal = UI_PALETTES[state.biome] || UI_PALETTES.default;
    const weatherPal = WEATHER_PALETTES[state.weather] || WEATHER_PALETTES.clear;
    const timeTint = TIME_TINTS[state.timeOfDay] || TIME_TINTS.day;

    const panelBg = lerpColor(uiPal.panelBg, weatherPal.overlay, weatherPal.overlayAlpha * 0.3);
    const accent = uiPal.primary;

    return {
      panelBg,
      panelBorder: lerpColor(uiPal.panelBorder, weatherPal.overlay, 0.1),
      panelBgAlpha: 0.92,
      accent,
      textPrimary: uiPal.textPrimary,
      textSecondary: uiPal.textSecondary,
      buttonColor: accent,
      buttonHover: lightenColor(accent, 0.15),
      headerGradientTop: darkenColor(panelBg, 0.7),
      headerGradientBottom: panelBg,
      overlayTint: timeTint.multiply,
      overlayAlpha: timeTint.alpha + weatherPal.overlayAlpha * 0.3,
    };
  }

  private applyOverlay(): void {
    const theme = this.computed;
    if (!this.overlay || !this.overlay.scene) {
      this.overlay = this.scene.add.rectangle(
        GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT,
        theme.overlayTint, 0,
      ).setDepth(80);
    }

    this.scene.tweens.add({
      targets: this.overlay,
      alpha: theme.overlayAlpha,
      duration: 1500,
      ease: 'Sine.easeInOut',
    });
    (this.overlay as any).fillColor = theme.overlayTint;
  }

  destroy(): void {
    if (this.overlay?.scene) this.overlay.destroy();
  }
}

/**
 * SpriteAtlasConfig — Configuration for sprite atlas packing.
 * Defines logical groups of procedural sprites for batch rendering.
 *
 * T-1460: Sprite atlas packing configuration
 */
export interface SpriteAtlasEntry {
  key: string;
  category: string;
  width: number;
  height: number;
  variants: number;
}

export const SPRITE_ATLAS_CONFIG: SpriteAtlasEntry[] = [
  // Resource icons
  { key: 'icon_gold', category: 'resource', width: 32, height: 32, variants: 1 },
  { key: 'icon_wood', category: 'resource', width: 32, height: 32, variants: 1 },
  { key: 'icon_stone', category: 'resource', width: 32, height: 32, variants: 1 },
  { key: 'icon_food', category: 'resource', width: 32, height: 32, variants: 1 },
  { key: 'icon_iron', category: 'resource', width: 32, height: 32, variants: 1 },
  { key: 'icon_herbs', category: 'resource', width: 32, height: 32, variants: 1 },
  { key: 'icon_essence', category: 'resource', width: 32, height: 32, variants: 1 },
  { key: 'icon_sapphire', category: 'resource', width: 32, height: 32, variants: 1 },
  // Building sprites (3 levels each)
  { key: 'building_tavern', category: 'building', width: 64, height: 64, variants: 3 },
  { key: 'building_workshop', category: 'building', width: 64, height: 64, variants: 3 },
  { key: 'building_farm', category: 'building', width: 64, height: 64, variants: 3 },
  { key: 'building_mine', category: 'building', width: 64, height: 64, variants: 3 },
  { key: 'building_marketplace', category: 'building', width: 64, height: 64, variants: 3 },
  { key: 'building_library', category: 'building', width: 64, height: 64, variants: 3 },
  { key: 'building_barracks', category: 'building', width: 64, height: 64, variants: 3 },
  { key: 'building_warehouse', category: 'building', width: 64, height: 64, variants: 3 },
  { key: 'building_temple', category: 'building', width: 64, height: 64, variants: 3 },
  { key: 'building_observatory', category: 'building', width: 64, height: 64, variants: 3 },
  { key: 'building_expedition_hall', category: 'building', width: 64, height: 64, variants: 3 },
  // Hero role badges
  { key: 'role_farmer', category: 'role', width: 32, height: 32, variants: 1 },
  { key: 'role_scout', category: 'role', width: 32, height: 32, variants: 1 },
  { key: 'role_merchant', category: 'role', width: 32, height: 32, variants: 1 },
  { key: 'role_blacksmith', category: 'role', width: 32, height: 32, variants: 1 },
  { key: 'role_alchemist', category: 'role', width: 32, height: 32, variants: 1 },
  { key: 'role_hunter', category: 'role', width: 32, height: 32, variants: 1 },
  { key: 'role_defender', category: 'role', width: 32, height: 32, variants: 1 },
  { key: 'role_mystic', category: 'role', width: 32, height: 32, variants: 1 },
  { key: 'role_caravan_master', category: 'role', width: 32, height: 32, variants: 1 },
  { key: 'role_archivist', category: 'role', width: 32, height: 32, variants: 1 },
  // Equipment (5 types x 5 rarities)
  { key: 'weapon_sword', category: 'equipment', width: 32, height: 32, variants: 5 },
  { key: 'weapon_axe', category: 'equipment', width: 32, height: 32, variants: 5 },
  { key: 'weapon_bow', category: 'equipment', width: 32, height: 32, variants: 5 },
  { key: 'weapon_staff', category: 'equipment', width: 32, height: 32, variants: 5 },
  { key: 'weapon_dagger', category: 'equipment', width: 32, height: 32, variants: 5 },
  { key: 'armor_plate', category: 'equipment', width: 32, height: 32, variants: 5 },
  { key: 'armor_leather', category: 'equipment', width: 32, height: 32, variants: 5 },
  { key: 'armor_robe', category: 'equipment', width: 32, height: 32, variants: 5 },
  { key: 'armor_chain', category: 'equipment', width: 32, height: 32, variants: 5 },
  { key: 'armor_shield', category: 'equipment', width: 32, height: 32, variants: 5 },
  // Enemy sprites
  { key: 'enemy_goblin', category: 'enemy', width: 48, height: 48, variants: 1 },
  { key: 'enemy_skeleton', category: 'enemy', width: 48, height: 48, variants: 1 },
  { key: 'enemy_wolf', category: 'enemy', width: 48, height: 48, variants: 1 },
  { key: 'boss_dragon', category: 'boss', width: 96, height: 96, variants: 1 },
  { key: 'boss_lich', category: 'boss', width: 96, height: 96, variants: 1 },
  // UI elements
  { key: 'button_normal', category: 'ui', width: 120, height: 36, variants: 4 },
  { key: 'panel_bg', category: 'ui', width: 256, height: 256, variants: 4 },
  { key: 'tooltip_frame', category: 'ui', width: 200, height: 100, variants: 1 },
  { key: 'scroll_bg', category: 'ui', width: 300, height: 200, variants: 1 },
];

/**
 * Get total sprite count for atlas packing report.
 */
export function getAtlasStats(): { totalSprites: number; categories: Record<string, number> } {
  const categories: Record<string, number> = {};
  let total = 0;
  for (const entry of SPRITE_ATLAS_CONFIG) {
    categories[entry.category] = (categories[entry.category] || 0) + entry.variants;
    total += entry.variants;
  }
  return { totalSprites: total, categories };
}
