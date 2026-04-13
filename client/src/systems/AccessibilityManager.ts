import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS, COLORS } from '../config';

// ============================================================================
// Epic 28: Accessibility (T-1981 – T-2000)
// ============================================================================

/** Color blind simulation modes */
export type ColorBlindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

/** High contrast theme variants */
export type ContrastMode = 'normal' | 'high';

/** Font size scale multiplier */
export type FontScale = 0.8 | 1.0 | 1.2 | 1.5 | 2.0;

export interface AccessibilitySettings {
  /** Screen reader announcements enabled */
  screenReaderEnabled: boolean;
  /** High contrast mode */
  contrastMode: ContrastMode;
  /** Color blind simulation mode */
  colorBlindMode: ColorBlindMode;
  /** Reduced motion (disables tweens/particles) */
  reducedMotion: boolean;
  /** Font scale multiplier */
  fontScale: FontScale;
  /** Keyboard navigation focus indicators visible */
  showFocusIndicators: boolean;
  /** Skip navigation link enabled */
  skipNavEnabled: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  screenReaderEnabled: false,
  contrastMode: 'normal',
  colorBlindMode: 'none',
  reducedMotion: false,
  fontScale: 1.0,
  showFocusIndicators: true,
  skipNavEnabled: true,
};

const STORAGE_KEY = 'guildtide_accessibility';

// ---------------------------------------------------------------------------
// T-1997: High contrast color palette overrides
// ---------------------------------------------------------------------------
const HIGH_CONTRAST_COLORS = {
  background: 0x000000,
  panelBg: 0x000000,
  panelBorder: 0xffffff,
  accent: 0xff0000,
  gold: 0xffff00,
  textPrimary: '#ffffff',
  textSecondary: '#ffffff',
  textAccent: '#ff0000',
  textGold: '#ffff00',
  success: 0x00ff00,
  danger: 0xff0000,
  warning: 0xffff00,
};

// ---------------------------------------------------------------------------
// T-1996: Color blind safe palette transforms
// ---------------------------------------------------------------------------
const COLOR_BLIND_MATRICES: Record<Exclude<ColorBlindMode, 'none'>, number[]> = {
  deuteranopia: [
    0.625, 0.375, 0.0,
    0.700, 0.300, 0.0,
    0.000, 0.300, 0.700,
  ],
  protanopia: [
    0.567, 0.433, 0.0,
    0.558, 0.442, 0.0,
    0.000, 0.242, 0.758,
  ],
  tritanopia: [
    0.950, 0.050, 0.0,
    0.000, 0.433, 0.567,
    0.000, 0.475, 0.525,
  ],
};

// ---------------------------------------------------------------------------
// T-1993: Focus indicator styles
// ---------------------------------------------------------------------------
const FOCUS_RING_COLOR = 0x00bfff;
const FOCUS_RING_WIDTH = 3;
const FOCUS_RING_PADDING = 4;

/**
 * Centralized accessibility manager.
 * Handles ARIA-like labeling (DOM data attributes on the game container),
 * screen reader announcements, keyboard focus tracking, color transforms,
 * reduced motion, and font scaling.
 *
 * Singleton — obtain via AccessibilityManager.getInstance().
 */
export class AccessibilityManager {
  private static instance: AccessibilityManager | null = null;

  private settings: AccessibilitySettings;
  private listeners: Array<(s: AccessibilitySettings) => void> = [];

  // T-1986: live region for screen reader announcements
  private liveRegion: HTMLElement | null = null;

  // T-1994: skip-to-main link
  private skipLink: HTMLElement | null = null;

  // T-1993: focus ring graphics per scene
  private focusRings: Map<string, Phaser.GameObjects.Graphics> = new Map();

  // T-1988–1992: keyboard nav focus tracking
  private focusableItems: Map<string, Phaser.GameObjects.GameObject[]> = new Map();
  private focusIndex: Map<string, number> = new Map();

  private constructor() {
    this.settings = this.loadSettings();
    this.initDomAccessibility();
    this.detectOsPreferences();
  }

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  // -----------------------------------------------------------------------
  // Settings persistence
  // -----------------------------------------------------------------------

  private loadSettings(): AccessibilitySettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch { /* ignore parse errors */ }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
  }

  getSettings(): Readonly<AccessibilitySettings> {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    this.applyDomSettings();
    this.listeners.forEach((fn) => fn(this.settings));
  }

  onSettingsChange(fn: (s: AccessibilitySettings) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  // -----------------------------------------------------------------------
  // T-1998: OS preference detection (reduced motion, high contrast)
  // -----------------------------------------------------------------------

  private detectOsPreferences(): void {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches && !localStorage.getItem(STORAGE_KEY)) {
      this.settings.reducedMotion = true;
    }
    mql.addEventListener('change', (e) => {
      this.updateSettings({ reducedMotion: e.matches });
    });

    const hcMql = window.matchMedia('(prefers-contrast: more)');
    if (hcMql.matches && !localStorage.getItem(STORAGE_KEY)) {
      this.settings.contrastMode = 'high';
    }
    hcMql.addEventListener('change', (e) => {
      this.updateSettings({ contrastMode: e.matches ? 'high' : 'normal' });
    });
  }

  // -----------------------------------------------------------------------
  // T-1981–1985: DOM-level ARIA labeling / landmarks
  // -----------------------------------------------------------------------

  private initDomAccessibility(): void {
    if (typeof document === 'undefined') return;

    const container = document.getElementById('game-container') ?? document.body;

    // T-1983: ARIA landmarks on the game container
    container.setAttribute('role', 'application');
    container.setAttribute('aria-label', 'Guildtide game');

    // T-1986: ARIA live region for announcements
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
    container.appendChild(this.liveRegion);

    // T-1994: skip-to-main link
    this.skipLink = document.createElement('a');
    this.skipLink.href = '#game-main';
    this.skipLink.textContent = 'Skip to main content';
    this.skipLink.className = 'skip-link';
    this.skipLink.style.cssText =
      'position:absolute;top:-40px;left:0;background:#000;color:#fff;padding:8px;z-index:10000;transition:top 0.2s;';
    this.skipLink.addEventListener('focus', () => {
      if (this.skipLink) this.skipLink.style.top = '0';
    });
    this.skipLink.addEventListener('blur', () => {
      if (this.skipLink) this.skipLink.style.top = '-40px';
    });
    container.prepend(this.skipLink);

    // Inject SR-only CSS class if not present
    if (!document.getElementById('a11y-styles')) {
      const style = document.createElement('style');
      style.id = 'a11y-styles';
      style.textContent = `
        .sr-only { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0; }
        .skip-link:focus { top:0 !important; }
      `;
      document.head.appendChild(style);
    }

    this.applyDomSettings();
  }

  private applyDomSettings(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.setAttribute('data-contrast', this.settings.contrastMode);
    root.setAttribute('data-colorblind', this.settings.colorBlindMode);
    root.setAttribute('data-reduced-motion', String(this.settings.reducedMotion));
    root.setAttribute('data-font-scale', String(this.settings.fontScale));
  }

  // -----------------------------------------------------------------------
  // T-1986: Screen reader announcements
  // -----------------------------------------------------------------------

  /** Announce text to screen readers via ARIA live region. */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.settings.screenReaderEnabled || !this.liveRegion) return;
    this.liveRegion.setAttribute('aria-live', priority);
    // Clear then set to force re-announcement of identical messages
    this.liveRegion.textContent = '';
    requestAnimationFrame(() => {
      if (this.liveRegion) this.liveRegion.textContent = message;
    });
  }

  // -----------------------------------------------------------------------
  // T-1982/T-1985: ARIA label helpers for Phaser game objects
  // -----------------------------------------------------------------------

  /** Attach an ARIA-like label to a game object (stored in data). */
  setLabel(obj: Phaser.GameObjects.GameObject, label: string, description?: string): void {
    obj.setData('aria-label', label);
    if (description) {
      obj.setData('aria-description', description);
    }
  }

  /** Retrieve the ARIA label from a game object. */
  getLabel(obj: Phaser.GameObjects.GameObject): string {
    return obj.getData('aria-label') ?? '';
  }

  // -----------------------------------------------------------------------
  // T-1987: Text alternatives for icon-only buttons
  // -----------------------------------------------------------------------

  /** Create an alt-text tagged interactive zone. */
  createAltTextZone(
    scene: Phaser.Scene,
    x: number, y: number, w: number, h: number,
    altText: string,
  ): Phaser.GameObjects.Zone {
    const zone = scene.add.zone(x, y, w, h).setInteractive();
    this.setLabel(zone, altText);
    return zone;
  }

  // -----------------------------------------------------------------------
  // T-1988–1992: Keyboard navigation
  // -----------------------------------------------------------------------

  /**
   * Register a set of focusable game objects for a given context/panel.
   * Arrow keys and Tab move focus; Enter/Space activates.
   */
  registerFocusables(contextId: string, items: Phaser.GameObjects.GameObject[]): void {
    this.focusableItems.set(contextId, items);
    this.focusIndex.set(contextId, -1);
  }

  unregisterFocusables(contextId: string): void {
    this.focusableItems.delete(contextId);
    this.focusIndex.delete(contextId);
    const ring = this.focusRings.get(contextId);
    if (ring) {
      ring.destroy();
      this.focusRings.delete(contextId);
    }
  }

  /**
   * Move focus within a context. Returns the newly-focused object or null.
   * direction: 1 = next, -1 = previous
   */
  moveFocus(contextId: string, direction: 1 | -1): Phaser.GameObjects.GameObject | null {
    const items = this.focusableItems.get(contextId);
    if (!items || items.length === 0) return null;

    let idx = (this.focusIndex.get(contextId) ?? -1) + direction;
    if (idx < 0) idx = items.length - 1;
    if (idx >= items.length) idx = 0;
    this.focusIndex.set(contextId, idx);

    const obj = items[idx];
    this.announce(this.getLabel(obj) || `Item ${idx + 1} of ${items.length}`);
    return obj;
  }

  /** Get currently focused object in a context. */
  getFocused(contextId: string): Phaser.GameObjects.GameObject | null {
    const items = this.focusableItems.get(contextId);
    const idx = this.focusIndex.get(contextId) ?? -1;
    if (!items || idx < 0 || idx >= items.length) return null;
    return items[idx];
  }

  // -----------------------------------------------------------------------
  // T-1993: Focus ring drawing
  // -----------------------------------------------------------------------

  drawFocusRing(scene: Phaser.Scene, contextId: string, target: Phaser.GameObjects.GameObject): void {
    if (!this.settings.showFocusIndicators) return;

    let ring = this.focusRings.get(contextId);
    if (!ring) {
      ring = scene.add.graphics();
      ring.setDepth(999);
      this.focusRings.set(contextId, ring);
    }

    ring.clear();
    const bounds = (target as any).getBounds?.();
    if (!bounds) return;

    ring.lineStyle(FOCUS_RING_WIDTH, FOCUS_RING_COLOR, 1);
    ring.strokeRoundedRect(
      bounds.x - FOCUS_RING_PADDING,
      bounds.y - FOCUS_RING_PADDING,
      bounds.width + FOCUS_RING_PADDING * 2,
      bounds.height + FOCUS_RING_PADDING * 2,
      6,
    );
  }

  clearFocusRing(contextId: string): void {
    const ring = this.focusRings.get(contextId);
    if (ring) ring.clear();
  }

  // -----------------------------------------------------------------------
  // T-1997: High contrast color palette
  // -----------------------------------------------------------------------

  getColors(): typeof COLORS {
    if (this.settings.contrastMode === 'high') {
      return HIGH_CONTRAST_COLORS as typeof COLORS;
    }
    return COLORS;
  }

  // -----------------------------------------------------------------------
  // T-1996: Color blind simulation helpers
  // -----------------------------------------------------------------------

  /**
   * Transform a color integer through the active color blind matrix.
   * Returns original color if mode is 'none'.
   */
  transformColor(color: number): number {
    if (this.settings.colorBlindMode === 'none') return color;

    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    const matrix = COLOR_BLIND_MATRICES[this.settings.colorBlindMode];
    const nr = Math.min(255, Math.round(matrix[0] * r + matrix[1] * g + matrix[2] * b));
    const ng = Math.min(255, Math.round(matrix[3] * r + matrix[4] * g + matrix[5] * b));
    const nb = Math.min(255, Math.round(matrix[6] * r + matrix[7] * g + matrix[8] * b));

    return (nr << 16) | (ng << 8) | nb;
  }

  // -----------------------------------------------------------------------
  // T-1998: Reduced motion helpers
  // -----------------------------------------------------------------------

  /** Whether animations should play. Returns false if reduced motion is on. */
  get animationsEnabled(): boolean {
    return !this.settings.reducedMotion;
  }

  /**
   * Wrap a tween config: if reduced motion is on, set duration to 0.
   */
  tweenConfig(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Types.Tweens.TweenBuilderConfig {
    if (this.settings.reducedMotion) {
      return { ...config, duration: 0 };
    }
    return config;
  }

  // -----------------------------------------------------------------------
  // T-2000 / font scaling
  // -----------------------------------------------------------------------

  /** Get a font size adjusted for the current scale. */
  scaledFontSize(base: number): number {
    return Math.round(base * this.settings.fontScale);
  }

  /** Get all font sizes, scaled. */
  getScaledFonts(): typeof FONTS['sizes'] {
    const s = this.settings.fontScale;
    return {
      title: Math.round(FONTS.sizes.title * s),
      heading: Math.round(FONTS.sizes.heading * s),
      body: Math.round(FONTS.sizes.body * s),
      small: Math.round(FONTS.sizes.small * s),
      tiny: Math.round(FONTS.sizes.tiny * s),
    };
  }

  // -----------------------------------------------------------------------
  // T-1999: Alt text for procedural sprites
  // -----------------------------------------------------------------------

  /** Generate descriptive alt text for a procedurally generated sprite. */
  describeSprite(kind: string, traits: Record<string, string | number>): string {
    const parts = Object.entries(traits).map(([k, v]) => `${k}: ${v}`);
    return `${kind} — ${parts.join(', ')}`;
  }

  // -----------------------------------------------------------------------
  // T-1995: Contrast ratio utility
  // -----------------------------------------------------------------------

  /** Calculate WCAG luminance contrast ratio between two hex colors. */
  static contrastRatio(c1: number, c2: number): number {
    const lum = (c: number): number => {
      const r = ((c >> 16) & 0xff) / 255;
      const g = ((c >> 8) & 0xff) / 255;
      const b = (c & 0xff) / 255;
      const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const l1 = lum(c1);
    const l2 = lum(c2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /** Check if two colors pass WCAG AA (4.5:1 for normal text). */
  static passesAA(fg: number, bg: number): boolean {
    return AccessibilityManager.contrastRatio(fg, bg) >= 4.5;
  }

  // -----------------------------------------------------------------------
  // Keyboard handler helper — call from a scene's create()
  // -----------------------------------------------------------------------

  /**
   * Bind arrow/tab navigation for a given context in a scene.
   * Returns a cleanup function.
   */
  bindKeyboardNav(scene: Phaser.Scene, contextId: string, onActivate?: (obj: Phaser.GameObjects.GameObject) => void): () => void {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' || event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        const obj = this.moveFocus(contextId, 1);
        if (obj) this.drawFocusRing(scene, contextId, obj);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const obj = this.moveFocus(contextId, -1);
        if (obj) this.drawFocusRing(scene, contextId, obj);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const focused = this.getFocused(contextId);
        if (focused && onActivate) onActivate(focused);
      }
    };

    scene.input.keyboard?.on('keydown', onKeyDown);
    return () => {
      scene.input.keyboard?.off('keydown', onKeyDown);
      this.unregisterFocusables(contextId);
    };
  }

  /** Clean up all resources. */
  destroy(): void {
    this.focusRings.forEach((g) => g.destroy());
    this.focusRings.clear();
    this.focusableItems.clear();
    this.focusIndex.clear();
    this.listeners = [];
    if (this.liveRegion?.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
    }
    if (this.skipLink?.parentNode) {
      this.skipLink.parentNode.removeChild(this.skipLink);
    }
    AccessibilityManager.instance = null;
  }
}
