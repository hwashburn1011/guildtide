/**
 * Worker efficiency panel showing hero assignment effects on building production.
 *
 * T-0352: Worker assignment effects on production rate
 * T-0353: Hero skill bonus when assigned to matching building
 * T-0354: Worker happiness affecting efficiency
 * T-0355: Worker rotation schedule for fatigue prevention
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIProgressBar } from './components/UIProgressBar';
import { apiClient } from '../api/client';

interface WorkerEff {
  heroId: string;
  heroName: string;
  heroRole: string;
  baseEfficiency: number;
  roleMatchBonus: number;
  skillBonus: number;
  happinessModifier: number;
  totalEfficiency: number;
}

export class WorkerEfficiencyPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(buildingType: string, buildingName: string): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: `${buildingName} Workers`,
      width: 480,
      height: 400,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();

    const loading = this.scene.add.text(190, 60, 'Loading...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);
    content.add(loading);

    this.modal.open();

    try {
      const workers = await apiClient.getWorkerEfficiency(buildingType);
      loading.destroy();
      this.renderWorkers(content, workers, buildingName);
    } catch {
      loading.setText('Failed to load worker data');
    }
  }

  private renderWorkers(
    container: Phaser.GameObjects.Container,
    workers: WorkerEff[],
    buildingName: string,
  ): void {
    let y = 0;

    if (workers.length === 0) {
      container.add(
        this.scene.add.text(190, 60, 'No heroes assigned to this building.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5),
      );

      container.add(
        this.scene.add.text(190, 90, 'Assign a hero to boost production!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5),
      );
      return;
    }

    for (const worker of workers) {
      const cardH = 90;
      const bg = this.scene.add.rectangle(
        190, y + cardH / 2, 380, cardH, COLORS.panelBg, 0.7,
      );
      bg.setStrokeStyle(1, COLORS.panelBorder);
      container.add(bg);

      // Hero name and role
      container.add(
        this.scene.add.text(15, y + 8, `${worker.heroName}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
        }),
      );

      container.add(
        this.scene.add.text(15, y + 28, `Role: ${worker.heroRole}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }),
      );

      // Efficiency breakdown
      const breakdownItems = [
        { label: 'Base', value: worker.baseEfficiency, color: COLORS.textSecondary },
        { label: 'Role Match', value: worker.roleMatchBonus, color: worker.roleMatchBonus > 0 ? '#4ecca3' : COLORS.textSecondary },
        { label: 'Skill', value: worker.skillBonus, color: '#3498db' },
        { label: 'Morale', value: worker.happinessModifier - 1, color: worker.happinessModifier >= 1 ? '#4ecca3' : '#e94560' },
      ];

      let bx = 15;
      for (const item of breakdownItems) {
        const sign = item.value > 0 ? '+' : '';
        container.add(
          this.scene.add.text(bx, y + 48, `${item.label}: ${sign}${(item.value * 100).toFixed(0)}%`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: item.color,
          }),
        );
        bx += 90;
      }

      // Total efficiency bar
      const effPercent = Math.min(worker.totalEfficiency * 100, 200);
      const effColor = effPercent >= 120 ? COLORS.success : effPercent >= 100 ? COLORS.warning : COLORS.danger;

      container.add(
        this.scene.add.text(15, y + 68, `Total: ${(worker.totalEfficiency * 100).toFixed(0)}%`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#ffd700',
          fontStyle: 'bold',
        }),
      );

      const bar = new UIProgressBar(this.scene, {
        x: 150,
        y: y + 68,
        width: 200,
        height: 12,
        value: effPercent,
        maxValue: 200,
        fillColor: effColor,
      });
      container.add(bar);

      y += cardH + 8;
    }

    // Rotation tip
    y += 10;
    container.add(
      this.scene.add.text(190, y, 'Tip: Rotate workers periodically to prevent fatigue.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
      }).setOrigin(0.5),
    );
    y += 16;
    container.add(
      this.scene.add.text(190, y, 'Matching hero roles to buildings gives bonus efficiency!', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#ffd700',
        fontStyle: 'italic',
      }).setOrigin(0.5),
    );
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
