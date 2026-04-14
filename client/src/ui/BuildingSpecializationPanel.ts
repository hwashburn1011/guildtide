/**
 * UI panel for choosing a building specialization path.
 * Shows two paths side-by-side with bonuses comparison.
 *
 * Covers T-0291 specialization UI, plus building specialization selection.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';

interface Specialization {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  bonuses: {
    productionMultiplier?: Record<string, number>;
    storageBonusPercent?: number;
    workerEfficiencyBonus?: number;
    specialAbility?: string;
    maintenanceReduction?: number;
  };
}

export class BuildingSpecializationPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onRefresh: () => void;

  constructor(scene: Phaser.Scene, onRefresh: () => void) {
    this.scene = scene;
    this.onRefresh = onRefresh;
  }

  show(
    buildingType: string,
    buildingName: string,
    specializations: Specialization[],
  ): void {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: `Specialize ${buildingName}`,
      width: 620,
      height: 480,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.renderPaths(content, buildingType, specializations);
    this.modal.open();
  }

  private renderPaths(
    container: Phaser.GameObjects.Container,
    buildingType: string,
    specs: Specialization[],
  ): void {
    // Header
    container.add(
      this.scene.add.text(260, 0, 'Choose a Specialization Path', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textSecondary,
      }).setOrigin(0.5),
    );

    container.add(
      this.scene.add.text(260, 24, 'This choice is permanent!', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textAccent,
        fontStyle: 'italic',
      }).setOrigin(0.5),
    );

    // Render two paths side by side
    const pathWidth = 270;
    const gap = 20;
    const startX = (520 - (pathWidth * 2 + gap)) / 2;

    specs.forEach((spec, i) => {
      const x = startX + i * (pathWidth + gap);
      const y = 55;

      // Path card background
      const bg = this.scene.add.rectangle(x + pathWidth / 2, y + 140, pathWidth, 300, COLORS.panelBg, 0.8);
      bg.setStrokeStyle(2, COLORS.panelBorder);
      container.add(bg);

      // Path name
      container.add(
        this.scene.add.text(x + pathWidth / 2, y + 10, spec.name, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.heading}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }).setOrigin(0.5),
      );

      // Description
      container.add(
        this.scene.add.text(x + 10, y + 40, spec.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          wordWrap: { width: pathWidth - 20 },
        }),
      );

      // Bonuses list
      let bonusY = y + 110;
      const bonuses = spec.bonuses;

      if (bonuses.productionMultiplier) {
        for (const [res, mult] of Object.entries(bonuses.productionMultiplier)) {
          const sign = mult > 0 ? '+' : '';
          container.add(
            this.scene.add.text(x + 15, bonusY, `${res}: ${sign}${Math.round(mult * 100)}%`, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.small}px`,
              color: mult > 0 ? '#4ecca3' : '#e94560',
            }),
          );
          bonusY += 18;
        }
      }

      if (bonuses.storageBonusPercent) {
        container.add(
          this.scene.add.text(x + 15, bonusY, `Storage: +${bonuses.storageBonusPercent}%`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: '#4ecca3',
          }),
        );
        bonusY += 18;
      }

      if (bonuses.workerEfficiencyBonus) {
        container.add(
          this.scene.add.text(x + 15, bonusY, `Worker Eff: +${Math.round(bonuses.workerEfficiencyBonus * 100)}%`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: '#4ecca3',
          }),
        );
        bonusY += 18;
      }

      if (bonuses.maintenanceReduction) {
        const sign = bonuses.maintenanceReduction > 0 ? '-' : '+';
        const color = bonuses.maintenanceReduction > 0 ? '#4ecca3' : '#e94560';
        container.add(
          this.scene.add.text(x + 15, bonusY, `Maintenance: ${sign}${Math.abs(Math.round(bonuses.maintenanceReduction * 100))}%`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color,
          }),
        );
        bonusY += 18;
      }

      if (bonuses.specialAbility) {
        container.add(
          this.scene.add.text(x + 15, bonusY, `Ability: ${bonuses.specialAbility.replace(/_/g, ' ')}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: '#ffd700',
            fontStyle: 'italic',
          }),
        );
        bonusY += 18;
      }

      // Choose button
      const btn = new UIButton(this.scene, {
        x: x + pathWidth / 2,
        y: y + 260,
        width: 120,
        height: 36,
        text: 'Choose',
        variant: i === 0 ? 'primary' : 'secondary',
        onClick: () => this.selectSpecialization(buildingType, spec.id, spec.name),
      });
      container.add(btn);
    });
  }

  private async selectSpecialization(
    buildingType: string,
    specId: string,
    specName: string,
  ): Promise<void> {
    try {
      await apiClient.specializeBuilding(buildingType, specId);
      NotificationSystem.show(this.scene, `Specialized as ${specName}!`, 'success');
      this.modal?.destroy();
      this.modal = null;
      this.onRefresh();
    } catch (err) {
      NotificationSystem.show(this.scene, 'Failed to specialize building', 'error');
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
