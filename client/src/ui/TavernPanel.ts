/**
 * Tavern building UI panel with recruit list, hire button, and refresh timer.
 *
 * T-0293: Tavern building — hero recruitment source
 * T-0295: Tavern recruitment pool refresh mechanic
 * T-0296: Tavern UI panel with available recruits list and hire button
 * T-0297: Tavern upgrade effects (more slots, higher quality)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { UICountdown } from './components/UICountdown';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import type { Building, Hero } from '@shared/types';

export class TavernPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onRefresh: () => void;

  constructor(scene: Phaser.Scene, onRefresh: () => void) {
    this.scene = scene;
    this.onRefresh = onRefresh;
  }

  async show(building: Building): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Tavern — Hero Recruitment',
      width: 540,
      height: 460,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const detail = await apiClient.getExtendedBuildingDetail(building.type);
      const heroes = await apiClient.getHeroes();
      this.renderTavern(content, building, detail, heroes);
    } catch {
      content.add(
        this.scene.add.text(220, 60, 'Failed to load tavern', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderTavern(
    container: Phaser.GameObjects.Container,
    building: Building,
    detail: any,
    existingHeroes: Hero[],
  ): void {
    let y = 0;

    // Building level and quality info
    const level = building.level;
    const recruitSlots = Math.min(2 + Math.floor(level / 3), 8);
    const qualityBonus = Math.round(level * 5);

    container.add(
      this.scene.add.text(0, y, `Level ${level} Tavern`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    container.add(
      this.scene.add.text(0, y, `Recruit Slots: ${recruitSlots}  |  Quality Bonus: +${qualityBonus}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 20;

    // Refresh timer
    const refreshMs = 4 * 60 * 60 * 1000 * Math.pow(0.9, level - 1);
    const refreshHours = Math.max(refreshMs / (60 * 60 * 1000), 1).toFixed(1);
    container.add(
      this.scene.add.text(0, y, `New recruits every ${refreshHours} hours`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
      }),
    );
    y += 30;

    // Available recruits
    container.add(
      this.scene.add.text(0, y, 'Available Recruits:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    // Show recruit cards (mock data based on available slots)
    const roles = ['farmer', 'scout', 'merchant', 'blacksmith', 'alchemist', 'hunter', 'defender', 'mystic'];
    for (let i = 0; i < Math.min(recruitSlots, 4); i++) {
      const role = roles[i % roles.length];
      const cardH = 50;

      const bg = this.scene.add.rectangle(220, y + cardH / 2, 440, cardH, COLORS.panelBg, 0.6);
      bg.setStrokeStyle(1, COLORS.panelBorder);
      container.add(bg);

      container.add(
        this.scene.add.text(15, y + 10, `${role.charAt(0).toUpperCase() + role.slice(1)}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
        }),
      );

      container.add(
        this.scene.add.text(15, y + 30, `Quality: ${qualityBonus > 20 ? 'Good' : 'Average'}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }),
      );

      // Hire button
      const hireBtn = new UIButton(this.scene, {
        x: 390,
        y: y + cardH / 2,
        width: 70,
        height: 28,
        text: 'Hire',
        style: 'primary',
        onClick: () => this.hireHero(role),
      });
      container.add(hireBtn.getContainer());

      y += cardH + 6;
    }

    // Upgrade tip
    if (level < 20) {
      y += 15;
      container.add(
        this.scene.add.text(220, y, `Upgrade to level ${level + 1} for ${level + 1 >= (Math.floor(level / 3) + 1) * 3 + 2 ? 'another recruit slot' : 'better quality heroes'}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#ffd700',
          fontStyle: 'italic',
        }).setOrigin(0.5),
      );
    }
  }

  private async hireHero(role: string): Promise<void> {
    try {
      await apiClient.recruitHero(role);
      NotificationSystem.getInstance(this.scene).showSuccess(`Recruited a ${role}!`);
      this.modal?.destroy();
      this.modal = null;
      this.onRefresh();
    } catch {
      NotificationSystem.getInstance(this.scene).showError('Failed to recruit hero');
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
