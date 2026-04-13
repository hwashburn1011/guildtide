import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';
import { BUILDING_SYNERGIES } from '@shared/constants';

interface Synergy {
  buildingA: string;
  buildingB: string;
  bonusPercent: number;
  description: string;
}

export class BuildingSynergyPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Building Synergies',
      width: 500,
      height: 420,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();

    try {
      const activeSynergies = await apiClient.getBuildingSynergies();
      this.renderSynergies(content, activeSynergies);
    } catch {
      this.renderSynergies(content, []);
    }

    this.modal.open();
  }

  private renderSynergies(
    container: Phaser.GameObjects.Container,
    activeSynergies: Synergy[],
  ): void {
    const activeSet = new Set(activeSynergies.map(s => `${s.buildingA}|${s.buildingB}`));

    container.add(
      this.scene.add.text(0, 0, 'Build matching pairs to unlock production bonuses:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: 440 },
      }),
    );

    let y = 28;
    BUILDING_SYNERGIES.forEach((synergy) => {
      const isActive = activeSet.has(`${synergy.buildingA}|${synergy.buildingB}`);

      // Row background
      const bg = this.scene.add.graphics();
      bg.fillStyle(isActive ? 0x1a3a2e : COLORS.panelBg, 0.8);
      bg.fillRoundedRect(0, y, 440, 46, 4);
      bg.lineStyle(1, isActive ? 0x4ecca3 : COLORS.panelBorder, 0.5);
      bg.strokeRoundedRect(0, y, 440, 46, 4);
      container.add(bg);

      // Description
      container.add(
        this.scene.add.text(12, y + 6, synergy.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: isActive ? '#4ecca3' : COLORS.textPrimary,
          fontStyle: isActive ? 'bold' : 'normal',
        }),
      );

      // Buildings needed
      const pairStr = `${synergy.buildingA.replace('_', ' ')} + ${synergy.buildingB.replace('_', ' ')}`;
      container.add(
        this.scene.add.text(12, y + 26, pairStr, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }),
      );

      // Bonus
      container.add(
        this.scene.add.text(430, y + 14, `+${synergy.bonusPercent}%`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: isActive ? '#4ecca3' : COLORS.textSecondary,
          fontStyle: 'bold',
        }).setOrigin(1, 0.5),
      );

      // Status indicator
      container.add(
        this.scene.add.text(430, y + 34, isActive ? 'Active' : 'Inactive', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: isActive ? '#4ecca3' : '#e94560',
        }).setOrigin(1, 0),
      );

      y += 54;
    });
  }
}
