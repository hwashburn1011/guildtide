/**
 * Equipment loadout save/swap system for quick gear changes.
 * T-0752: Build equipment loadout save/swap system.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import type { Hero } from '@shared/types';

export class EquipmentLoadoutPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private heroes: Hero[];
  private onChanged: () => void;
  private selectedHeroId: string | null = null;

  constructor(scene: Phaser.Scene, heroes: Hero[], onChanged: () => void) {
    this.scene = scene;
    this.heroes = heroes;
    this.onChanged = onChanged;
  }

  async show(): Promise<void> {
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(100);

    this.container = this.scene.add.container(0, 0).setDepth(101);

    const panelW = 700;
    const panelH = 500;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    this.container.add(
      this.scene.add.text(px + 20, py + 15, 'Equipment Loadouts', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      })
    );

    const closeBtn = this.scene.add.text(px + panelW - 20, py + 15, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // Hero selection
    this.container.add(
      this.scene.add.text(px + 20, py + 50, 'Select Hero:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      })
    );

    let heroY = py + 70;
    for (const hero of this.heroes) {
      const isSelected = this.selectedHeroId === hero.id;
      const heroBtn = this.scene.add.text(px + 30, heroY, `${hero.name} (${hero.role}) Lv.${hero.level}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: isSelected ? COLORS.textGold : COLORS.textPrimary,
        fontStyle: isSelected ? 'bold' : 'normal',
      }).setInteractive({ useHandCursor: true });
      heroBtn.on('pointerup', () => {
        this.selectedHeroId = hero.id;
        this.hide();
        this.show();
      });
      this.container.add(heroBtn);
      heroY += 20;
    }

    if (this.selectedHeroId) {
      const hero = this.heroes.find(h => h.id === this.selectedHeroId);
      if (hero) {
        await this.renderLoadoutOptions(px + 20, heroY + 20, panelW - 40, py + panelH - heroY - 40, hero);
      }
    }
  }

  private async renderLoadoutOptions(x: number, y: number, w: number, h: number, hero: Hero): Promise<void> {
    if (!this.container) return;

    // Current equipment display
    this.container!.add(
      this.scene.add.text(x, y, `Current Equipment for ${hero.name}:`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      })
    );

    const equipment = hero.equipment || {};
    let curY = y + 22;
    for (const [slot, templateId] of Object.entries(equipment)) {
      this.container!.add(
        this.scene.add.text(x + 10, curY, `${slot}: ${templateId || 'empty'}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: templateId ? COLORS.textPrimary : '#6a6a7a',
        })
      );
      curY += 16;
    }

    // Gear score
    try {
      const gearScore = await apiClient.getGearScore(hero.id);
      this.container!.add(
        this.scene.add.text(x + w - 10, y, `Gear Score: ${gearScore.totalScore}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }).setOrigin(1, 0)
      );
    } catch { /* skip */ }

    // Action buttons
    curY += 15;

    // Save loadout
    const saveBtn = this.scene.add.text(x, curY, 'Save Current as Loadout', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
      fontStyle: 'bold',
      backgroundColor: 'rgba(233,69,96,0.15)',
      padding: { x: 12, y: 6 },
    }).setInteractive({ useHandCursor: true });
    saveBtn.on('pointerup', () => this.doSaveLoadout(hero.id));
    this.container!.add(saveBtn);

    // Auto-equip best
    const autoBtn = this.scene.add.text(x + 250, curY, 'Auto-Equip Best Gear', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3',
      fontStyle: 'bold',
      backgroundColor: 'rgba(78,204,163,0.15)',
      padding: { x: 12, y: 6 },
    }).setInteractive({ useHandCursor: true });
    autoBtn.on('pointerup', () => this.doAutoEquip(hero.id));
    this.container!.add(autoBtn);

    // Recommended gear
    curY += 40;
    try {
      const recommendations = await apiClient.getRecommendedGear(hero.id);
      if (recommendations.length > 0) {
        this.container!.add(
          this.scene.add.text(x, curY, 'Recommended Upgrades:', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textGold,
            fontStyle: 'bold',
          })
        );
        curY += 20;

        for (const rec of recommendations.slice(0, 5)) {
          this.container!.add(
            this.scene.add.text(x + 10, curY, `${rec.slot}: ${rec.recommendedTemplateId} - ${rec.reason}`, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: '#4dabf7',
            })
          );
          curY += 16;
        }
      }
    } catch { /* skip */ }
  }

  private async doSaveLoadout(heroId: string): Promise<void> {
    try {
      const loadoutName = `Loadout ${Date.now() % 1000}`;
      await apiClient.saveEquipmentLoadout(heroId, loadoutName);
      this.showToast(`Loadout "${loadoutName}" saved!`);
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Save failed');
    }
  }

  private async doAutoEquip(heroId: string): Promise<void> {
    try {
      await apiClient.autoEquipBest(heroId);
      this.showToast('Best gear equipped!');
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Auto-equip failed');
    }
  }

  private showToast(message: string): void {
    const toast = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, message, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(200);
    this.scene.time.delayedCall(3000, () => toast.destroy());
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }

  setHeroes(heroes: Hero[]): void {
    this.heroes = heroes;
  }
}
