/**
 * Building achievement panel showing progress and earned achievements.
 *
 * T-0367: Building achievement system (max level all buildings, etc.)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIProgressBar } from './components/UIProgressBar';
import { apiClient } from '../api/client';

interface BuildingAchievement {
  id: string;
  name: string;
  description: string;
  condition: {
    type: string;
    buildingType?: string;
    threshold?: number;
  };
  reward: {
    resources?: Record<string, number>;
    xp?: number;
  };
}

export class BuildingAchievementPanel {
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
      title: 'Building Achievements',
      width: 520,
      height: 500,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();

    const loading = this.scene.add.text(210, 80, 'Loading...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);
    content.add(loading);

    this.modal.open();

    try {
      const result = await apiClient.checkBuildingAchievements();
      loading.destroy();
      this.renderAchievements(content, result.all, result.achievements);
    } catch {
      loading.setText('Failed to load achievements');
    }
  }

  private renderAchievements(
    container: Phaser.GameObjects.Container,
    all: BuildingAchievement[],
    newlyEarned: BuildingAchievement[],
  ): void {
    const earnedIds = new Set(newlyEarned.map(a => a.id));
    let y = 0;

    container.add(
      this.scene.add.text(210, y, `${earnedIds.size} / ${all.length} Achievements`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }).setOrigin(0.5),
    );
    y += 30;

    for (const achievement of all) {
      const earned = earnedIds.has(achievement.id);
      const cardH = 55;

      // Card background
      const bg = this.scene.add.rectangle(
        210, y + cardH / 2, 440, cardH,
        earned ? 0x1a3a1a : COLORS.panelBg, 0.8,
      );
      bg.setStrokeStyle(2, earned ? COLORS.success : COLORS.panelBorder);
      container.add(bg);

      // Achievement icon
      const icon = earned ? 'T' : 'O';
      const iconColor = earned ? '#ffd700' : '#666666';
      container.add(
        this.scene.add.text(15, y + cardH / 2, icon, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.heading}px`,
          color: iconColor,
        }).setOrigin(0, 0.5),
      );

      // Name
      container.add(
        this.scene.add.text(45, y + 8, achievement.name, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: earned ? COLORS.textGold : COLORS.textPrimary,
          fontStyle: 'bold',
        }),
      );

      // Description
      container.add(
        this.scene.add.text(45, y + 28, achievement.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: earned ? '#4ecca3' : COLORS.textSecondary,
          wordWrap: { width: 300 },
        }),
      );

      // Reward info
      const rewards: string[] = [];
      if (achievement.reward.xp) rewards.push(`${achievement.reward.xp} XP`);
      if (achievement.reward.resources) {
        for (const [r, a] of Object.entries(achievement.reward.resources)) {
          rewards.push(`${a} ${r}`);
        }
      }

      container.add(
        this.scene.add.text(410, y + cardH / 2, rewards.join(', '), {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: earned ? '#4ecca3' : '#666666',
        }).setOrigin(1, 0.5),
      );

      y += cardH + 6;
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
