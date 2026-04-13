import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { I18nManager, type Locale } from '../i18n/I18nManager';

// ============================================================================
// Epic 29: Localization — T-2004: Language selector UI
// ============================================================================

const PANEL_W = 420;
const PANEL_H = 400;
const ROW_H = 48;
const LEFT_X = 24;

/**
 * Language settings panel overlay.
 * Lists all supported locales with completion percentage,
 * allows switching locale and previewing the change.
 */
export class LanguageSettingsPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private i18n: I18nManager;
  private visible = false;
  private unsubscribe: (() => void) | null = null;
  private rows: Map<Locale, Phaser.GameObjects.Text> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.i18n = I18nManager.getInstance();

    this.container = scene.add.container(
      (GAME_WIDTH - PANEL_W) / 2,
      (GAME_HEIGHT - PANEL_H) / 2,
    );
    this.container.setDepth(1100);
    this.container.setVisible(false);

    this.buildPanel();

    this.unsubscribe = this.i18n.onLocaleChange(() => this.refreshRows());
  }

  private buildPanel(): void {
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
    bg.fillStyle(COLORS.panelBg, 0.95);
    bg.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(0, 0, PANEL_W, PANEL_H, 12);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(PANEL_W / 2, 18, 'Language / Idioma / Langue', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Close
    const close = this.scene.add.text(PANEL_W - 16, 12, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.hide());
    this.container.add(close);

    // Locale rows
    let y = 64;
    for (const loc of this.i18n.getSupportedLocales()) {
      const label = this.scene.add.text(LEFT_X, y, loc.name, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
      }).setInteractive({ useHandCursor: true });

      label.on('pointerup', () => {
        this.i18n.setLocale(loc.code);
      });

      const status = this.scene.add.text(PANEL_W - 24, y, '', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }).setOrigin(1, 0);

      this.container.add(label);
      this.container.add(status);
      this.rows.set(loc.code, status);

      y += ROW_H;
    }

    this.refreshRows();
  }

  private refreshRows(): void {
    const current = this.i18n.getLocale();
    for (const [code, text] of this.rows) {
      const pct = this.i18n.getCompletionPercentage(code);
      const active = code === current ? ' [active]' : '';
      text.setText(`${pct}%${active}`);
      text.setColor(code === current ? '#4ecca3' : COLORS.textSecondary);
    }
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.container.setVisible(true);
    this.refreshRows();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.setVisible(false);
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
