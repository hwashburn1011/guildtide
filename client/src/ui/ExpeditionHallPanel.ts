/**
 * Expedition Hall building UI with expedition queue and party formation.
 *
 * T-0344: Expedition Hall building — launch and management
 * T-0346: Expedition Hall UI with expedition queue and party formation
 * T-0347: Expedition Hall simultaneous expedition cap per level
 * T-0348: Expedition Hall upgrade effects (more slots, longer range, faster return)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { UIProgressBar } from './components/UIProgressBar';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import type { Building, Expedition, Hero } from '@shared/types';

export class ExpeditionHallPanel {
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
      title: 'Expedition Hall',
      width: 560,
      height: 500,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const [detail, expeditions, heroes] = await Promise.all([
        apiClient.getExtendedBuildingDetail(building.type),
        apiClient.getExpeditions(),
        apiClient.getHeroes(),
      ]);
      this.renderHall(content, building, detail, expeditions, heroes);
    } catch {
      content.add(
        this.scene.add.text(230, 60, 'Failed to load expedition data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderHall(
    container: Phaser.GameObjects.Container,
    building: Building,
    detail: any,
    expeditions: Expedition[],
    heroes: Hero[],
  ): void {
    let y = 0;
    const level = building.level;
    const maxExpeditions = Math.min(1 + Math.floor(level / 3), 5);
    const rangeBonus = Math.round(level * 10);
    const speedBonus = Math.round(level * 5);

    container.add(
      this.scene.add.text(0, y, `Level ${level} Expedition Hall`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    container.add(
      this.scene.add.text(0, y, `Max Expeditions: ${maxExpeditions}  |  Range: +${rangeBonus}%  |  Speed: +${speedBonus}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 30;

    // Active expeditions
    const activeExps = expeditions.filter(e => e.status === 'active');

    container.add(
      this.scene.add.text(0, y, `Active Expeditions (${activeExps.length}/${maxExpeditions}):`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    if (activeExps.length === 0) {
      container.add(
        this.scene.add.text(15, y, 'No active expeditions. Launch one from the Expeditions panel!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
          fontStyle: 'italic',
        }),
      );
      y += 30;
    } else {
      for (const exp of activeExps) {
        const cardH = 55;
        const bg = this.scene.add.rectangle(230, y + cardH / 2, 460, cardH, COLORS.panelBg, 0.6);
        bg.setStrokeStyle(1, COLORS.panelBorder);
        container.add(bg);

        container.add(
          this.scene.add.text(15, y + 5, `${exp.type} — ${exp.destination}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textPrimary,
            fontStyle: 'bold',
          }),
        );

        // Progress
        const startMs = new Date(exp.startedAt).getTime();
        const elapsed = (Date.now() - startMs) / 1000;
        const progress = Math.min((elapsed / exp.duration) * 100, 100);

        container.add(
          this.scene.add.text(15, y + 25, `${exp.heroIds.length} heroes deployed`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          }),
        );

        const bar = new UIProgressBar(this.scene, {
          x: 280,
          y: y + 18,
          width: 160,
          height: 14,
          value: progress,
          maxValue: 100,
          fillColor: progress >= 100 ? COLORS.success : COLORS.warning,
          label: progress >= 100 ? 'Ready!' : `${Math.round(progress)}%`,
        });
        container.add(bar.getContainer());

        y += cardH + 6;
      }
    }

    y += 10;

    // Available heroes for expedition
    const idleHeroes = heroes.filter(h => h.status === 'idle');
    if (activeExps.length < maxExpeditions) {
      container.add(
        this.scene.add.text(0, y, `Available Heroes for Expedition: ${idleHeroes.length}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
        }),
      );
      y += 22;

      if (idleHeroes.length > 0) {
        const launchBtn = new UIButton(this.scene, {
          x: 230,
          y,
          width: 160,
          height: 36,
          text: 'Launch Expedition',
          style: 'primary',
          onClick: () => {
            NotificationSystem.getInstance(this.scene).showSuccess('Open the Expeditions panel to launch!');
          },
        });
        container.add(launchBtn.getContainer());
      }
    } else {
      container.add(
        this.scene.add.text(230, y, 'All expedition slots are in use.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#f5a623',
        }).setOrigin(0.5),
      );
      y += 20;

      container.add(
        this.scene.add.text(230, y, 'Upgrade the Expedition Hall for more slots!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          fontStyle: 'italic',
        }).setOrigin(0.5),
      );
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
