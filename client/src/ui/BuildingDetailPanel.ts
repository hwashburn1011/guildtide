import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { UIProgressBar } from './components/UIProgressBar';
import { UIStatComparison } from './components/UIStatComparison';
import type { StatComparisonEntry } from './components/UIStatComparison';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import type { Building } from '@shared/types';

export class BuildingDetailPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onRefresh: () => void;

  constructor(scene: Phaser.Scene, onRefresh: () => void) {
    this.scene = scene;
    this.onRefresh = onRefresh;
  }

  async show(buildingType: string): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Building Details',
      width: 520,
      height: 480,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();

    const loading = this.scene.add.text(210, 100, 'Loading...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);
    content.add(loading);

    this.modal.open();

    try {
      const detail = await apiClient.getBuildingDetail(buildingType);
      loading.destroy();
      this.renderDetail(content, detail);
    } catch {
      loading.setText('Failed to load details');
    }
  }

  private renderDetail(
    container: Phaser.GameObjects.Container,
    detail: {
      type: string;
      name: string;
      description: string;
      level: number;
      maxLevel: number;
      currentOutput: Record<string, number>;
      nextOutput: Record<string, number>;
      upgradeCost: Record<string, number> | null;
      assignedHero: { id: string; name: string; role: string; level: number } | null;
    },
  ): void {
    let y = 0;

    // Building name and level
    container.add(
      this.scene.add.text(0, y, detail.name, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );

    container.add(
      this.scene.add.text(440, y + 4, `Level ${detail.level}/${detail.maxLevel}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }).setOrigin(1, 0),
    );

    y += 30;

    // Description
    container.add(
      this.scene.add.text(0, y, detail.description, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: 440 },
      }),
    );

    y += 30;

    // Level progress bar
    const levelBar = new UIProgressBar(this.scene, {
      x: 0,
      y,
      width: 440,
      height: 14,
      value: detail.level,
      maxValue: detail.maxLevel,
      fillColor: COLORS.accent,
      label: 'Level Progress',
    });
    container.add(levelBar);

    y += 40;

    // Production rates: before -> after comparison
    if (detail.upgradeCost && Object.keys(detail.currentOutput).length > 0) {
      container.add(
        this.scene.add.text(0, y, 'Production (current vs. next level):', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
        }),
      );
      y += 22;

      const stats: StatComparisonEntry[] = Object.keys(detail.nextOutput).map(res => ({
        label: res.charAt(0).toUpperCase() + res.slice(1),
        before: parseFloat((detail.currentOutput[res] ?? 0).toFixed(3)),
        after: parseFloat((detail.nextOutput[res] ?? 0).toFixed(3)),
        suffix: '/s',
      }));

      const comparison = new UIStatComparison(this.scene, {
        x: 0,
        y,
        stats,
        labelWidth: 80,
        valueWidth: 70,
      });
      container.add(comparison);

      y += comparison.getHeight() + 10;
    }

    // Upgrade cost
    if (detail.upgradeCost) {
      container.add(
        this.scene.add.text(0, y, 'Upgrade Cost:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
        }),
      );
      y += 20;

      const costStr = Object.entries(detail.upgradeCost)
        .map(([res, amt]) => `${amt} ${res}`)
        .join('  |  ');
      container.add(
        this.scene.add.text(0, y, costStr, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#f5a623',
        }),
      );
      y += 28;
    } else if (detail.level >= detail.maxLevel) {
      container.add(
        this.scene.add.text(0, y, 'MAX LEVEL', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }),
      );
      y += 28;
    }

    // Assigned hero
    container.add(
      this.scene.add.text(0, y, 'Assigned Worker:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 20;

    if (detail.assignedHero) {
      container.add(
        this.scene.add.text(0, y, `${detail.assignedHero.name} (${detail.assignedHero.role}, Lv${detail.assignedHero.level})`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#4ecca3',
        }),
      );
    } else {
      container.add(
        this.scene.add.text(0, y, 'None — assign a hero for +30% output', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
          fontStyle: 'italic',
        }),
      );
    }
    y += 30;

    // Action buttons
    const btnY = y;

    if (detail.upgradeCost) {
      const upgradeBtn = new UIButton(this.scene, {
        x: 0,
        y: btnY,
        width: 130,
        height: 36,
        text: 'Upgrade',
        variant: 'primary',
        fontSize: FONTS.sizes.small,
        onClick: () => this.handleUpgrade(detail.type),
      });
      container.add(upgradeBtn);
    }

    if (detail.level > 0) {
      const demolishBtn = new UIButton(this.scene, {
        x: 150,
        y: btnY,
        width: 130,
        height: 36,
        text: 'Demolish',
        variant: 'danger',
        fontSize: FONTS.sizes.small,
        onClick: () => this.handleDemolish(detail.type, detail.name),
      });
      container.add(demolishBtn);
    }
  }

  private async handleUpgrade(type: string): Promise<void> {
    try {
      const result = await apiClient.upgradeBuilding(type);
      NotificationSystem.show(this.scene, `${result.building.type} upgraded to level ${result.building.level}!`, 'success');
      this.modal?.close();
      this.onRefresh();
    } catch (err) {
      NotificationSystem.show(this.scene, err instanceof Error ? err.message : 'Upgrade failed', 'error');
    }
  }

  private async handleDemolish(type: string, name: string): Promise<void> {
    try {
      const result = await apiClient.demolishBuilding(type);
      const refundStr = Object.entries(result.refund)
        .filter(([, v]) => v > 0)
        .map(([r, v]) => `+${v} ${r}`)
        .join(', ');
      NotificationSystem.show(this.scene, `Demolished ${name}. Refund: ${refundStr}`, 'warning');
      this.modal?.close();
      this.onRefresh();
    } catch (err) {
      NotificationSystem.show(this.scene, err instanceof Error ? err.message : 'Demolish failed', 'error');
    }
  }
}
