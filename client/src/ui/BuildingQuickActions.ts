import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIButton } from './components/UIButton';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import type { Building } from '@shared/types';

/**
 * Quick-action button bar that appears when a building card is selected.
 * Shows: Upgrade, Details, Assign Worker, Demolish
 */
export class BuildingQuickActions {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible: boolean = false;
  private onRefresh: () => void;
  private onShowDetail: (type: string) => void;
  private onShowUpgrade: (building: Building) => void;

  constructor(
    scene: Phaser.Scene,
    onRefresh: () => void,
    onShowDetail: (type: string) => void,
    onShowUpgrade: (building: Building) => void,
  ) {
    this.scene = scene;
    this.onRefresh = onRefresh;
    this.onShowDetail = onShowDetail;
    this.onShowUpgrade = onShowUpgrade;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(200);
    this.container.setVisible(false);
  }

  show(building: Building, x: number, y: number): void {
    this.container.removeAll(true);
    this.container.setPosition(x, y);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.95);
    bg.fillRoundedRect(0, 0, 320, 44, 6);
    bg.lineStyle(1, COLORS.panelBorder);
    bg.strokeRoundedRect(0, 0, 320, 44, 6);
    this.container.add(bg);

    // Buttons
    const actions = [
      { label: 'Upgrade', variant: 'primary' as const, onClick: () => this.onShowUpgrade(building) },
      { label: 'Details', variant: 'secondary' as const, onClick: () => this.onShowDetail(building.type) },
      { label: 'Demolish', variant: 'danger' as const, onClick: () => this.demolish(building) },
    ];

    actions.forEach((action, i) => {
      const btn = new UIButton(this.scene, {
        x: 6 + i * 105,
        y: 6,
        width: 98,
        height: 32,
        text: action.label,
        variant: action.variant,
        fontSize: FONTS.sizes.tiny,
        onClick: action.onClick,
      });
      this.container.add(btn);
    });

    this.container.setVisible(true);
    this.visible = true;

    // Close when clicking elsewhere
    this.scene.input.once('pointerdown', () => {
      this.hide();
    });
  }

  hide(): void {
    this.container.setVisible(false);
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  private async demolish(building: Building): Promise<void> {
    try {
      const result = await apiClient.demolishBuilding(building.type);
      const refundStr = Object.entries(result.refund)
        .filter(([, v]) => v > 0)
        .map(([r, v]) => `+${v} ${r}`)
        .join(', ');
      NotificationSystem.show(this.scene, `Demolished! Refund: ${refundStr}`, 'warning');
      this.hide();
      this.onRefresh();
    } catch (err) {
      NotificationSystem.show(this.scene, err instanceof Error ? err.message : 'Demolish failed', 'error');
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
