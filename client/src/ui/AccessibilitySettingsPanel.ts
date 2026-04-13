import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import {
  AccessibilityManager,
  type AccessibilitySettings,
  type ColorBlindMode,
  type ContrastMode,
  type FontScale,
} from '../systems/AccessibilityManager';

// ============================================================================
// Epic 28: Accessibility — T-2000: Accessibility settings page
// ============================================================================

const PANEL_W = 500;
const PANEL_H = 520;
const ROW_H = 44;
const LEFT_X = 24;
const TOGGLE_X = 380;

/**
 * Full accessibility settings panel rendered as an overlay in any scene.
 * Controls: screen reader, high contrast, color blind mode, reduced motion,
 * focus indicators, font size scale, skip nav.
 */
export class AccessibilitySettingsPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private a11y: AccessibilityManager;
  private visible = false;
  private unsubscribe: (() => void) | null = null;
  private toggles: Map<string, Phaser.GameObjects.Text> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.a11y = AccessibilityManager.getInstance();

    this.container = scene.add.container(
      (GAME_WIDTH - PANEL_W) / 2,
      (GAME_HEIGHT - PANEL_H) / 2,
    );
    this.container.setDepth(1100);
    this.container.setVisible(false);

    this.buildPanel();

    this.unsubscribe = this.a11y.onSettingsChange(() => this.refreshToggles());
  }

  // -----------------------------------------------------------------------
  // Panel building
  // -----------------------------------------------------------------------

  private buildPanel(): void {
    const colors = this.a11y.getColors();

    // Backdrop
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.6);
    backdrop.fillRect(
      -(GAME_WIDTH - PANEL_W) / 2,
      -(GAME_HEIGHT - PANEL_H) / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
    );
    backdrop.setInteractive(
      new Phaser.Geom.Rectangle(
        -(GAME_WIDTH - PANEL_W) / 2,
        -(GAME_HEIGHT - PANEL_H) / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    backdrop.on('pointerup', () => this.hide());
    this.container.add(backdrop);

    // Panel BG
    const bg = this.scene.add.graphics();
    bg.fillStyle(colors.panelBg, 0.95);
    bg.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 12);
    bg.lineStyle(2, colors.panelBorder);
    bg.strokeRoundedRect(0, 0, PANEL_W, PANEL_H, 12);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(PANEL_W / 2, 18, 'Accessibility Settings', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Close button
    const close = this.scene.add.text(PANEL_W - 16, 12, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.hide());
    this.container.add(close);

    let y = 60;

    // --- Boolean toggles ---
    const boolOptions: Array<{ key: keyof AccessibilitySettings; label: string }> = [
      { key: 'screenReaderEnabled', label: 'Screen Reader Announcements' },
      { key: 'reducedMotion', label: 'Reduced Motion' },
      { key: 'showFocusIndicators', label: 'Focus Indicators' },
      { key: 'skipNavEnabled', label: 'Skip Navigation Link' },
    ];

    for (const opt of boolOptions) {
      this.addToggleRow(opt.label, opt.key, y);
      y += ROW_H;
    }

    y += 8;

    // --- High contrast ---
    this.addCycleRow('Contrast Mode', 'contrastMode', ['normal', 'high'] as ContrastMode[], y);
    y += ROW_H;

    // --- Color blind mode ---
    this.addCycleRow(
      'Color Blind Mode',
      'colorBlindMode',
      ['none', 'deuteranopia', 'protanopia', 'tritanopia'] as ColorBlindMode[],
      y,
    );
    y += ROW_H;

    // --- Font scale ---
    this.addCycleRow(
      'Font Size Scale',
      'fontScale',
      [0.8, 1.0, 1.2, 1.5, 2.0] as FontScale[],
      y,
    );
    y += ROW_H;

    this.refreshToggles();
  }

  private addToggleRow(label: string, key: keyof AccessibilitySettings, y: number): void {
    const lbl = this.scene.add.text(LEFT_X, y, label, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
    });
    this.container.add(lbl);

    const val = this.scene.add.text(TOGGLE_X, y, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    val.on('pointerup', () => {
      const current = this.a11y.getSettings()[key];
      this.a11y.updateSettings({ [key]: !current } as Partial<AccessibilitySettings>);
    });
    this.container.add(val);
    this.toggles.set(key, val);
  }

  private addCycleRow<T extends string | number>(
    label: string,
    key: keyof AccessibilitySettings,
    options: T[],
    y: number,
  ): void {
    const lbl = this.scene.add.text(LEFT_X, y, label, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
    });
    this.container.add(lbl);

    const val = this.scene.add.text(TOGGLE_X, y, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    val.on('pointerup', () => {
      const current = this.a11y.getSettings()[key] as T;
      const idx = options.indexOf(current);
      const next = options[(idx + 1) % options.length];
      this.a11y.updateSettings({ [key]: next } as Partial<AccessibilitySettings>);
    });
    this.container.add(val);
    this.toggles.set(key, val);
  }

  private refreshToggles(): void {
    const s = this.a11y.getSettings();
    for (const [key, text] of this.toggles) {
      const value = (s as Record<string, unknown>)[key];
      if (typeof value === 'boolean') {
        text.setText(value ? 'ON' : 'OFF');
        text.setColor(value ? '#4ecca3' : '#e94560');
      } else {
        text.setText(String(value));
      }
    }
  }

  // -----------------------------------------------------------------------
  // Visibility
  // -----------------------------------------------------------------------

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.container.setVisible(true);
    this.refreshToggles();
    this.a11y.announce('Accessibility settings panel opened');
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.setVisible(false);
    this.a11y.announce('Accessibility settings panel closed');
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    if (this.unsubscribe) this.unsubscribe();
    this.container.destroy();
  }
}
