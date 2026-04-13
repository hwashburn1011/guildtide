/**
 * Art module index — procedural art generation system.
 *
 * All visuals are generated from code (no image files required).
 * Provides sprite generation, color palettes, particle effects,
 * icon generation, animations, backgrounds, visual feedback, and UI theming.
 */
export {
  BIOME_PALETTES,
  SEASON_PALETTES,
  WEATHER_PALETTES,
  UI_PALETTES,
  RARITY_COLORS,
  getCompositePalette,
  lerpColor,
  darkenColor,
  lightenColor,
} from './ColorPalette';
export type { BiomePalette, SeasonPalette, WeatherPalette, UIPalette } from './ColorPalette';

export { SpriteGenerator } from './SpriteGenerator';
export { IconGenerator } from './IconGenerator';
export { ParticleEffects } from './ParticleEffects';
export { AnimationLibrary } from './AnimationLibrary';
export type { AnimationPreset } from './AnimationLibrary';
export { BackgroundRenderer } from './BackgroundRenderer';
export { VisualFeedback } from './VisualFeedback';
export { UITheme, SPRITE_ATLAS_CONFIG, getAtlasStats } from './UITheme';
export type { ThemeState } from './UITheme';
