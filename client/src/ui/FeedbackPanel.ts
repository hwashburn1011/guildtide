import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { I18nManager } from '../i18n/I18nManager';
import { AnalyticsService } from '../systems/AnalyticsService';

// ============================================================================
// Epic 30: Analytics & Monetization — Feedback & NPS (T-2063 – T-2064)
// ============================================================================

export type FeedbackCategory = 'bug' | 'suggestion' | 'praise' | 'other';

const PANEL_W = 480;
const PANEL_H = 460;

/**
 * In-app feedback and NPS survey panel.
 *
 * T-2063: Feedback collection widget
 * T-2064: NPS (Net Promoter Score) survey
 */
export class FeedbackPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private i18n: I18nManager;
  private analytics: AnalyticsService;
  private visible = false;

  private selectedCategory: FeedbackCategory = 'suggestion';
  private feedbackText = '';
  private npsScore: number | null = null;

  private categoryButtons: Map<FeedbackCategory, Phaser.GameObjects.Text> = new Map();
  private npsButtons: Phaser.GameObjects.Text[] = [];
  private messageText: Phaser.GameObjects.Text | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.i18n = I18nManager.getInstance();
    this.analytics = AnalyticsService.getInstance();

    this.container = scene.add.container(
      (GAME_WIDTH - PANEL_W) / 2,
      (GAME_HEIGHT - PANEL_H) / 2,
    );
    this.container.setDepth(1100);
    this.container.setVisible(false);

    this.buildPanel();
  }

  private buildPanel(): void {
    // Backdrop
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.6);
    backdrop.fillRect(-(GAME_WIDTH - PANEL_W) / 2, -(GAME_HEIGHT - PANEL_H) / 2, GAME_WIDTH, GAME_HEIGHT);
    backdrop.setInteractive(
      new Phaser.Geom.Rectangle(-(GAME_WIDTH - PANEL_W) / 2, -(GAME_HEIGHT - PANEL_H) / 2, GAME_WIDTH, GAME_HEIGHT),
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
    const title = this.scene.add.text(PANEL_W / 2, 16, this.i18n.t('feedback.title'), {
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

    // Category selection
    const catLabel = this.scene.add.text(20, 56, this.i18n.t('feedback.category'), {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    });
    this.container.add(catLabel);

    const categories: FeedbackCategory[] = ['bug', 'suggestion', 'praise', 'other'];
    let catX = 20;
    const catY = 78;
    for (const cat of categories) {
      const btn = this.scene.add.text(catX, catY, this.i18n.t(`feedback.${cat}`), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: cat === this.selectedCategory ? COLORS.textGold : COLORS.textSecondary,
        backgroundColor: cat === this.selectedCategory ? '#1b3a5c' : '#0a0a1e',
        padding: { x: 8, y: 4 },
      }).setInteractive({ useHandCursor: true });

      btn.on('pointerup', () => {
        this.selectedCategory = cat;
        this.refreshCategoryButtons();
      });

      this.container.add(btn);
      this.categoryButtons.set(cat, btn);
      catX += btn.width + 8;
    }

    // Feedback text area (simplified — Phaser doesn't have native text input)
    const textBg = this.scene.add.graphics();
    textBg.fillStyle(0x0a0a1e, 0.8);
    textBg.fillRoundedRect(20, 112, PANEL_W - 40, 100, 6);
    textBg.lineStyle(1, COLORS.panelBorder);
    textBg.strokeRoundedRect(20, 112, PANEL_W - 40, 100, 6);
    this.container.add(textBg);

    this.messageText = this.scene.add.text(28, 120, this.i18n.t('feedback.placeholder'), {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
      wordWrap: { width: PANEL_W - 56 },
    });
    this.container.add(this.messageText);

    // Click to open browser prompt for text input
    const textZone = this.scene.add.zone(20 + (PANEL_W - 40) / 2, 112 + 50, PANEL_W - 40, 100).setInteractive({ useHandCursor: true });
    textZone.on('pointerup', () => {
      const input = prompt(this.i18n.t('feedback.placeholder'));
      if (input) {
        this.feedbackText = input;
        if (this.messageText) {
          this.messageText.setText(input);
          this.messageText.setColor(COLORS.textPrimary);
        }
      }
    });
    this.container.add(textZone);

    // ---------- NPS section (T-2064) ----------
    const npsLabel = this.scene.add.text(PANEL_W / 2, 228, this.i18n.t('feedback.nps'), {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      wordWrap: { width: PANEL_W - 40 },
      align: 'center',
    }).setOrigin(0.5, 0);
    this.container.add(npsLabel);

    // NPS scale labels
    const notLikely = this.scene.add.text(20, 262, this.i18n.t('feedback.notLikely'), {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    this.container.add(notLikely);

    const veryLikely = this.scene.add.text(PANEL_W - 20, 262, this.i18n.t('feedback.veryLikely'), {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0);
    this.container.add(veryLikely);

    // NPS 0-10 buttons
    const npsY = 282;
    const btnW = 36;
    const totalW = 11 * btnW;
    const startX = (PANEL_W - totalW) / 2;

    for (let i = 0; i <= 10; i++) {
      const x = startX + i * btnW;
      const btn = this.scene.add.text(x + btnW / 2, npsY, String(i), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#ffffff',
        backgroundColor: '#1b3a5c',
        padding: { x: 8, y: 6 },
        fixedWidth: 30,
        align: 'center',
      }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

      const score = i;
      btn.on('pointerup', () => {
        this.npsScore = score;
        this.refreshNPSButtons();
      });

      this.container.add(btn);
      this.npsButtons.push(btn);
    }

    // Submit button
    const submit = this.scene.add.text(PANEL_W / 2, 340, this.i18n.t('feedback.submit'), {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ffffff',
      backgroundColor: '#e94560',
      padding: { x: 24, y: 10 },
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    submit.on('pointerup', () => this.submit());
    this.container.add(submit);

    // Status text
    this.statusText = this.scene.add.text(PANEL_W / 2, 390, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3',
    }).setOrigin(0.5, 0);
    this.container.add(this.statusText);
  }

  private refreshCategoryButtons(): void {
    for (const [cat, btn] of this.categoryButtons) {
      btn.setColor(cat === this.selectedCategory ? COLORS.textGold : COLORS.textSecondary);
      btn.setBackgroundColor(cat === this.selectedCategory ? '#1b3a5c' : '#0a0a1e');
    }
  }

  private refreshNPSButtons(): void {
    this.npsButtons.forEach((btn, i) => {
      const selected = i === this.npsScore;
      btn.setBackgroundColor(selected ? '#e94560' : '#1b3a5c');
    });
  }

  private submit(): void {
    if (!this.feedbackText && this.npsScore === null) return;

    if (this.feedbackText) {
      this.analytics.submitFeedback(this.selectedCategory, this.feedbackText);
    }

    if (this.npsScore !== null) {
      this.analytics.submitNPS({
        score: this.npsScore,
        comment: this.feedbackText || undefined,
        timestamp: Date.now(),
      });
    }

    // Reset
    this.feedbackText = '';
    this.npsScore = null;
    if (this.messageText) {
      this.messageText.setText(this.i18n.t('feedback.placeholder'));
      this.messageText.setColor(COLORS.textSecondary);
    }
    this.refreshNPSButtons();

    if (this.statusText) {
      this.statusText.setText(this.i18n.t('feedback.thanks'));
      this.scene.time.delayedCall(3000, () => {
        if (this.statusText) this.statusText.setText('');
      });
    }
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.container.setVisible(true);
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
    this.container.destroy();
  }
}
