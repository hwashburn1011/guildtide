import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

/**
 * Retirement ceremony UI with hero achievement summary.
 * Also displays the retired hero hall of fame.
 * T-0420: Retirement system at max level with legacy bonus
 * T-0421: Retirement ceremony UI with hero achievement summary
 * T-0422: Retired hero hall of fame display
 * T-0423: Retirement legacy bonuses (permanent guild stat boosts)
 */
export class HeroRetirementPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private heroId: string | null;
  private onChanged: () => void;

  constructor(scene: Phaser.Scene, heroId: string | null, onChanged: () => void) {
    this.scene = scene;
    this.heroId = heroId;
    this.onChanged = onChanged;
  }

  async showCeremony(): Promise<void> {
    if (!this.heroId) return;

    // Get hero detail first
    const hero = await apiClient.getHeroDetail(this.heroId);
    if (!hero) return;

    this.createOverlay();
    this.container = this.scene.add.container(0, 0).setDepth(301);

    const panelW = 600;
    const panelH = 480;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a3e, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(3, 0xffd700);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    // Golden banner
    const bannerGfx = this.scene.add.graphics();
    bannerGfx.fillStyle(0xffd700, 0.15);
    bannerGfx.fillRect(px, py, panelW, 60);
    this.container.add(bannerGfx);

    // Title
    this.container.add(this.scene.add.text(px + panelW / 2, py + 20, 'Retirement Ceremony', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5));

    // Hero name
    this.container.add(this.scene.add.text(px + panelW / 2, py + 75, hero.name, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textPrimary, fontStyle: 'bold',
    }).setOrigin(0.5));

    // Role + Level
    this.container.add(this.scene.add.text(px + panelW / 2, py + 100, `${hero.role.replace(/_/g, ' ')} - Level ${hero.level}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#ffd700',
    }).setOrigin(0.5));

    // Achievement summary
    let sy = py + 135;
    this.container.add(this.scene.add.text(px + panelW / 2, sy, 'Achievement Summary', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5));
    sy += 25;

    const achievements = [
      `Level Reached: ${hero.level}`,
      `Skills Unlocked: ${(hero.unlockedSkills || []).length}`,
      `Power Score: ${hero.powerScore}`,
      `Days Served: ${hero.daysSinceHired || 0}`,
    ];

    for (const ach of achievements) {
      this.container.add(this.scene.add.text(px + panelW / 2, sy, ach, {
        fontFamily: FONTS.primary, fontSize: '13px', color: COLORS.textSecondary,
      }).setOrigin(0.5));
      sy += 20;
    }

    // Stories
    if (hero.stories?.length > 0) {
      sy += 10;
      this.container.add(this.scene.add.text(px + panelW / 2, sy, 'Journal Highlights', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textGold, fontStyle: 'bold',
      }).setOrigin(0.5));
      sy += 22;

      for (const story of hero.stories.slice(-2)) {
        this.container.add(this.scene.add.text(px + panelW / 2, sy, `"${story.text}"`, {
          fontFamily: FONTS.primary, fontSize: '11px', color: '#9a9ab0', fontStyle: 'italic',
          wordWrap: { width: panelW - 60 },
        }).setOrigin(0.5));
        sy += 30;
      }
    }

    // Confirm/Cancel buttons
    const confirmBtn = this.scene.add.text(px + panelW / 2 - 60, py + panelH - 50, 'Confirm Retirement', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#ffd700', fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    confirmBtn.on('pointerup', async () => {
      try {
        const result = await apiClient.retireHero(this.heroId!);
        this.hide();
        this.showBonusesDisplay(result.bonuses, result.hallOfFameEntry);
      } catch (err) {
        alert((err as Error).message);
      }
    });
    this.container.add(confirmBtn);

    const cancelBtn = this.scene.add.text(px + panelW - 30, py + panelH - 50, 'Cancel', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerup', () => this.hide());
    this.container.add(cancelBtn);
  }

  private showBonusesDisplay(bonuses: any[], hallOfFameEntry: any): void {
    this.createOverlay();
    this.container = this.scene.add.container(0, 0).setDepth(301);

    const panelW = 500;
    const panelH = 350;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a3e, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(3, 0xffd700);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    this.container.add(this.scene.add.text(px + panelW / 2, py + 25, 'Legacy Bonuses Earned!', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5));

    this.container.add(this.scene.add.text(px + panelW / 2, py + 55,
      `${hallOfFameEntry.name} has entered the Hall of Fame`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
    }).setOrigin(0.5));

    let by = py + 90;
    for (const bonus of bonuses) {
      this.container.add(this.scene.add.text(px + panelW / 2, by, bonus.description, {
        fontFamily: FONTS.primary, fontSize: '14px', color: '#4ecca3',
      }).setOrigin(0.5));
      by += 28;
    }

    const okBtn = this.scene.add.text(px + panelW / 2, py + panelH - 40, 'Continue', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    okBtn.on('pointerup', () => {
      this.onChanged();
      this.hide();
    });
    this.container.add(okBtn);
  }

  private createOverlay(): void {
    this.overlay?.destroy();
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.8);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(300);
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
