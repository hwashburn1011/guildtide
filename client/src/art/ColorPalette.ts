/**
 * ColorPalette — Themed color palette definitions per biome, season, and weather.
 *
 * T-1381: Art style guide / visual language definition
 * T-1382: Color palette for each biome
 * T-1383: UI color palette for interface elements
 */
import * as Phaser from 'phaser';

export interface BiomePalette {
  primary: number;
  secondary: number;
  accent: number;
  ground: number;
  sky: number;
  foliage: number;
  water: number;
  highlight: number;
}

export interface SeasonPalette {
  tint: number;
  skyGradientTop: number;
  skyGradientBottom: number;
  ambientLight: number;
  particleColors: number[];
}

export interface WeatherPalette {
  overlay: number;
  overlayAlpha: number;
  particleColor: number;
  lightingTint: number;
}

export interface UIPalette {
  primary: number;
  secondary: number;
  accent: number;
  success: number;
  danger: number;
  warning: number;
  info: number;
  panelBg: number;
  panelBorder: number;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

export const BIOME_PALETTES: Record<string, BiomePalette> = {
  forest: {
    primary: 0x2d6a4f,
    secondary: 0x40916c,
    accent: 0x95d5b2,
    ground: 0x3a5a40,
    sky: 0x87ceeb,
    foliage: 0x52b788,
    water: 0x4ea8de,
    highlight: 0xb7e4c7,
  },
  desert: {
    primary: 0xc2956a,
    secondary: 0xe9c46a,
    accent: 0xf4a261,
    ground: 0xd4a373,
    sky: 0xf0e68c,
    foliage: 0x8b8000,
    water: 0x48bfe3,
    highlight: 0xffd166,
  },
  tundra: {
    primary: 0x5b9bd5,
    secondary: 0xa8d8ea,
    accent: 0xe0e8ff,
    ground: 0xc0d6e4,
    sky: 0xb0c4de,
    foliage: 0x6b8e73,
    water: 0x4682b4,
    highlight: 0xffffff,
  },
  volcanic: {
    primary: 0x8b0000,
    secondary: 0xcc4400,
    accent: 0xff6b35,
    ground: 0x3d2b1f,
    sky: 0x4a3728,
    foliage: 0x556b2f,
    water: 0xff4500,
    highlight: 0xff8c00,
  },
  coastal: {
    primary: 0x0077b6,
    secondary: 0x00b4d8,
    accent: 0x90e0ef,
    ground: 0xf5deb3,
    sky: 0x87ceeb,
    foliage: 0x2e8b57,
    water: 0x023e8a,
    highlight: 0xcaf0f8,
  },
  mountain: {
    primary: 0x6c757d,
    secondary: 0x8d99ae,
    accent: 0xadb5bd,
    ground: 0x495057,
    sky: 0x89a4c7,
    foliage: 0x588157,
    water: 0x457b9d,
    highlight: 0xdee2e6,
  },
  swamp: {
    primary: 0x3a5a40,
    secondary: 0x606c38,
    accent: 0xa3b18a,
    ground: 0x4a5a3a,
    sky: 0x6b705c,
    foliage: 0x588157,
    water: 0x4a6741,
    highlight: 0xdad7cd,
  },
  plains: {
    primary: 0x9b8e4e,
    secondary: 0xc9b458,
    accent: 0xe9d66b,
    ground: 0xa68b5b,
    sky: 0x87ceeb,
    foliage: 0x6a994e,
    water: 0x56a3a6,
    highlight: 0xf0e68c,
  },
};

export const SEASON_PALETTES: Record<string, SeasonPalette> = {
  spring: {
    tint: 0x88ff88,
    skyGradientTop: 0x87ceeb,
    skyGradientBottom: 0xb0e0e6,
    ambientLight: 0xfff8dc,
    particleColors: [0xff69b4, 0xffc0cb, 0xffffff, 0x98fb98],
  },
  summer: {
    tint: 0xffdd44,
    skyGradientTop: 0x4682b4,
    skyGradientBottom: 0x87ceeb,
    ambientLight: 0xffd700,
    particleColors: [0xffd700, 0xffa500, 0xffff00],
  },
  autumn: {
    tint: 0xff8844,
    skyGradientTop: 0x708090,
    skyGradientBottom: 0xdeb887,
    ambientLight: 0xffa07a,
    particleColors: [0xff8c00, 0xcd853f, 0x8b4513, 0xdaa520],
  },
  winter: {
    tint: 0x88bbff,
    skyGradientTop: 0x4a5568,
    skyGradientBottom: 0x718096,
    ambientLight: 0xb0c4de,
    particleColors: [0xffffff, 0xe0e8ff, 0xc0d0ff],
  },
};

export const WEATHER_PALETTES: Record<string, WeatherPalette> = {
  clear: { overlay: 0xffd700, overlayAlpha: 0.03, particleColor: 0xffd700, lightingTint: 0xffffff },
  rainy: { overlay: 0x4682b4, overlayAlpha: 0.15, particleColor: 0x87ceeb, lightingTint: 0x8899aa },
  stormy: { overlay: 0x2f4f4f, overlayAlpha: 0.25, particleColor: 0x778899, lightingTint: 0x667788 },
  snowy: { overlay: 0xffffff, overlayAlpha: 0.1, particleColor: 0xffffff, lightingTint: 0xccddee },
  foggy: { overlay: 0xd3d3d3, overlayAlpha: 0.3, particleColor: 0xc0c0c0, lightingTint: 0xaabbcc },
  hot: { overlay: 0xff4500, overlayAlpha: 0.08, particleColor: 0xff6347, lightingTint: 0xffddaa },
  windy: { overlay: 0x87ceeb, overlayAlpha: 0.05, particleColor: 0xdeb887, lightingTint: 0xeeeeff },
};

export const UI_PALETTES: Record<string, UIPalette> = {
  default: {
    primary: 0xe94560,
    secondary: 0x0f3460,
    accent: 0xffd700,
    success: 0x4ecca3,
    danger: 0xe94560,
    warning: 0xf5a623,
    info: 0x4dabf7,
    panelBg: 0x16213e,
    panelBorder: 0x0f3460,
    textPrimary: '#ffffff',
    textSecondary: '#a0a0b0',
    textMuted: '#666677',
  },
  forest: {
    primary: 0x52b788,
    secondary: 0x2d6a4f,
    accent: 0x95d5b2,
    success: 0x4ecca3,
    danger: 0xe94560,
    warning: 0xf5a623,
    info: 0x4dabf7,
    panelBg: 0x1b3a2a,
    panelBorder: 0x2d6a4f,
    textPrimary: '#e0ffe0',
    textSecondary: '#a0c0a0',
    textMuted: '#607060',
  },
  desert: {
    primary: 0xf4a261,
    secondary: 0xc2956a,
    accent: 0xe9c46a,
    success: 0x4ecca3,
    danger: 0xe94560,
    warning: 0xf5a623,
    info: 0x4dabf7,
    panelBg: 0x3a2a1b,
    panelBorder: 0x6a4a2d,
    textPrimary: '#fff0d0',
    textSecondary: '#c0a080',
    textMuted: '#806040',
  },
  volcanic: {
    primary: 0xff6b35,
    secondary: 0x8b0000,
    accent: 0xff8c00,
    success: 0x4ecca3,
    danger: 0xff4444,
    warning: 0xf5a623,
    info: 0x4dabf7,
    panelBg: 0x2a1010,
    panelBorder: 0x5a2020,
    textPrimary: '#ffe0d0',
    textSecondary: '#c09080',
    textMuted: '#804030',
  },
};

export const RARITY_COLORS: Record<string, { fill: number; glow: number; border: number; label: string }> = {
  common: { fill: 0x9e9e9e, glow: 0xbdbdbd, border: 0x757575, label: '#9e9e9e' },
  uncommon: { fill: 0x4caf50, glow: 0x66bb6a, border: 0x388e3c, label: '#4caf50' },
  rare: { fill: 0x2196f3, glow: 0x42a5f5, border: 0x1976d2, label: '#2196f3' },
  epic: { fill: 0x9c27b0, glow: 0xba68c8, border: 0x7b1fa2, label: '#9c27b0' },
  legendary: { fill: 0xff9800, glow: 0xffb74d, border: 0xf57c00, label: '#ff9800' },
};

/**
 * Get a blended palette for a biome + season + weather combination.
 */
export function getCompositePalette(
  biome: string,
  season: string,
  weather: string,
): { biome: BiomePalette; season: SeasonPalette; weather: WeatherPalette; ui: UIPalette } {
  const biomePal = BIOME_PALETTES[biome] || BIOME_PALETTES.plains;
  const seasonPal = SEASON_PALETTES[season] || SEASON_PALETTES.spring;
  const weatherPal = WEATHER_PALETTES[weather] || WEATHER_PALETTES.clear;
  const uiPal = UI_PALETTES[biome] || UI_PALETTES.default;
  return { biome: biomePal, season: seasonPal, weather: weatherPal, ui: uiPal };
}

/**
 * Linearly interpolate two hex colors.
 */
export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return (rr << 16) | (rg << 8) | rb;
}

/**
 * Darken a hex color by a factor (0 = black, 1 = original).
 */
export function darkenColor(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

/**
 * Lighten a hex color by a factor (0 = original, 1 = white).
 */
export function lightenColor(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) + (255 - ((color >> 16) & 0xff)) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) + (255 - ((color >> 8) & 0xff)) * factor));
  const b = Math.min(255, Math.round((color & 0xff) + (255 - (color & 0xff)) * factor));
  return (r << 16) | (g << 8) | b;
}
