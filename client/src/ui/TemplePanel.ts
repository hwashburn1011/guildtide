/**
 * Temple building UI showing active blessings and prayer schedule.
 *
 * T-0334: Temple building — morale and blessing effects
 * T-0336: Temple UI showing active blessings and prayer schedule
 * T-0337: Temple blessing system with timed buffs for guild
 * T-0338: Temple upgrade effects (stronger blessings, more slots)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import type { Building } from '@shared/types';

interface Blessing {
  name: string;
  description: string;
  effect: string;
  duration: string;
  available: boolean;
}

export class TemplePanel {
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
      title: 'Temple — Blessings',
      width: 500,
      height: 440,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.renderTemple(content, building);
    this.modal.open();
  }

  private renderTemple(
    container: Phaser.GameObjects.Container,
    building: Building,
  ): void {
    let y = 0;
    const level = building.level;
    const blessingSlots = Math.min(1 + Math.floor(level / 4), 4);
    const strength = (1 + level * 0.08).toFixed(2);

    container.add(
      this.scene.add.text(0, y, `Level ${level} Temple`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    container.add(
      this.scene.add.text(0, y, `Blessing Slots: ${blessingSlots}  |  Strength: ${strength}x`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 30;

    // Available blessings
    const blessings: Blessing[] = [
      { name: 'Blessing of Harvest', description: 'Boost food production for all farms.', effect: '+20% food', duration: '2 hours', available: level >= 1 },
      { name: 'Blessing of Fortune', description: 'Increase gold generation from all sources.', effect: '+15% gold', duration: '2 hours', available: level >= 3 },
      { name: 'Blessing of Endurance', description: 'Reduce resource decay rates.', effect: '-30% decay', duration: '3 hours', available: level >= 5 },
      { name: 'Blessing of Insight', description: 'Boost research speed.', effect: '+25% research', duration: '2 hours', available: level >= 8 },
      { name: 'Blessing of the Mountain', description: 'Increase mining and quarry output.', effect: '+20% ore/stone', duration: '2 hours', available: level >= 10 },
      { name: 'Grand Blessing', description: 'Boost all production slightly.', effect: '+10% all', duration: '4 hours', available: level >= 15 },
    ];

    container.add(
      this.scene.add.text(0, y, 'Available Blessings:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    for (const blessing of blessings) {
      const cardH = 50;
      const bg = this.scene.add.rectangle(
        200, y + cardH / 2, 400, cardH,
        blessing.available ? COLORS.panelBg : 0x111122, 0.7,
      );
      bg.setStrokeStyle(1, blessing.available ? COLORS.panelBorder : 0x333344);
      container.add(bg);

      container.add(
        this.scene.add.text(15, y + 5, blessing.name, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: blessing.available ? '#ffd700' : '#666666',
          fontStyle: 'bold',
        }),
      );

      container.add(
        this.scene.add.text(15, y + 23, `${blessing.effect}  (${blessing.duration})`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: blessing.available ? '#4ecca3' : '#444444',
        }),
      );

      if (!blessing.available) {
        container.add(
          this.scene.add.text(370, y + cardH / 2, 'Locked', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#e94560',
          }).setOrigin(1, 0.5),
        );
      }

      y += cardH + 4;
    }

    // Prayer schedule info
    y += 15;
    container.add(
      this.scene.add.text(200, y, 'Blessings refresh every 6 hours', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
      }).setOrigin(0.5),
    );
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
