/**
 * Mine building UI showing vein depletion, extraction rate, and gem discovery.
 *
 * T-0309: Mine building — ore and gem resource production
 * T-0311: Mine UI showing vein depletion and extraction rate
 * T-0312: Mine rare gem discovery chance on production ticks
 * T-0313: Mine upgrade effects (deeper veins, better tools, gem chance)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIProgressBar } from './components/UIProgressBar';
import { apiClient } from '../api/client';
import type { Building } from '@shared/types';

export class MinePanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(building: Building): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Mine — Ore Extraction',
      width: 480,
      height: 400,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const detail = await apiClient.getExtendedBuildingDetail(building.type);
      this.renderMine(content, building, detail);
    } catch {
      content.add(
        this.scene.add.text(190, 60, 'Failed to load mine data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderMine(
    container: Phaser.GameObjects.Container,
    building: Building,
    detail: any,
  ): void {
    let y = 0;
    const level = building.level;

    container.add(
      this.scene.add.text(0, y, `Level ${level} Mine`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 30;

    // Mine stats
    const veinDepth = (1 + level * 0.12).toFixed(2);
    const toolQuality = (1 + level * 0.08).toFixed(2);
    const gemChance = Math.min(5 + level * 2, 35);

    container.add(
      this.scene.add.text(0, y, `Vein Depth: ${veinDepth}x  |  Tool Quality: ${toolQuality}x`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 25;

    // Production rate
    const oreOutput = detail.currentOutput?.ore ?? 0;
    container.add(
      this.scene.add.text(0, y, `Ore/hr: ${(oreOutput * 3600).toFixed(1)}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#4ecca3',
      }),
    );
    y += 30;

    // Vein depletion indicator (visual)
    container.add(
      this.scene.add.text(0, y, 'Vein Richness:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 20;

    // Veins don't actually deplete in this system, but show a visual indicator
    // based on level (higher level = deeper/richer veins)
    const veinRichness = Math.min(level * 5 + 20, 100);
    const veinBar = new UIProgressBar(this.scene, {
      x: 0,
      y,
      width: 380,
      height: 16,
      value: veinRichness,
      maxValue: 100,
      fillColor: veinRichness > 60 ? COLORS.success : veinRichness > 30 ? COLORS.warning : COLORS.danger,
      label: `${veinRichness}%`,
    });
    container.add(veinBar.getContainer());
    y += 35;

    // Gem discovery section
    container.add(
      this.scene.add.text(0, y, 'Gem Discovery', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: '#9b59b6',
        fontStyle: 'bold',
      }),
    );
    y += 22;

    container.add(
      this.scene.add.text(0, y, `Chance per tick: ${gemChance}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 18;

    container.add(
      this.scene.add.text(0, y, 'When gems are found, they grant bonus Essence!', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
      }),
    );
    y += 30;

    // Gem chance progress bar
    const gemBar = new UIProgressBar(this.scene, {
      x: 0,
      y,
      width: 380,
      height: 16,
      value: gemChance,
      maxValue: 35,
      fillColor: 0x9b59b6,
      label: `${gemChance}% discovery rate`,
    });
    container.add(gemBar.getContainer());
    y += 35;

    // Specialization info
    if (detail.specialization) {
      container.add(
        this.scene.add.text(0, y, `Specialization: ${detail.specialization.name}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#ffd700',
          fontStyle: 'italic',
        }),
      );
    } else if (detail.availableSpecializations) {
      container.add(
        this.scene.add.text(0, y, 'Specialization available! Choose Gemcutter or Industrial.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#ffd700',
          fontStyle: 'italic',
        }),
      );
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
