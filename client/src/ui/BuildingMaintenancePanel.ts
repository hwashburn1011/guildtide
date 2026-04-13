/**
 * Building maintenance panel showing costs, overdue warnings, and pay button.
 *
 * T-0359: Building maintenance cost system
 * T-0360: Building maintenance overdue warning and efficiency penalty
 * T-0361: Auto-collect toggle
 * T-0362: Production notification when storage is full
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { UIToggle } from './components/UIToggle';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import type { Building } from '@shared/types';

export class BuildingMaintenancePanel {
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
      title: 'Building Maintenance',
      width: 440,
      height: 380,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const detail = await apiClient.getExtendedBuildingDetail(building.type);
      this.renderMaintenance(content, building, detail);
    } catch {
      content.add(
        this.scene.add.text(180, 60, 'Failed to load maintenance info', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderMaintenance(
    container: Phaser.GameObjects.Container,
    building: Building,
    detail: any,
  ): void {
    let y = 0;

    // Building name
    container.add(
      this.scene.add.text(0, y, detail.name, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 30;

    // Maintenance status
    const overdue = detail.maintenanceDue;
    const statusText = overdue ? 'MAINTENANCE OVERDUE' : 'Maintenance up to date';
    const statusColor = overdue ? '#e94560' : '#4ecca3';

    container.add(
      this.scene.add.text(0, y, statusText, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: statusColor,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    if (overdue) {
      container.add(
        this.scene.add.text(0, y, 'Production efficiency is reduced while maintenance is overdue.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 380 },
        }),
      );
      y += 35;
    } else {
      y += 10;
    }

    // Maintenance costs
    container.add(
      this.scene.add.text(0, y, 'Maintenance Costs (per cycle):', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 22;

    if (detail.behavior?.maintenanceCost) {
      for (const [res, cost] of Object.entries(detail.behavior.maintenanceCost)) {
        container.add(
          this.scene.add.text(15, y, `${res}: ${cost}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textSecondary,
          }),
        );
        y += 18;
      }
    }
    y += 15;

    // Pay maintenance button
    if (overdue) {
      const payBtn = new UIButton(this.scene, {
        x: 180,
        y,
        width: 160,
        height: 36,
        text: 'Pay Maintenance',
        style: 'primary',
        onClick: () => this.payMaintenance(building.type),
      });
      container.add(payBtn.getContainer());
      y += 50;
    }

    // Auto-collect toggle (T-0361)
    container.add(
      this.scene.add.text(0, y, 'Auto-Collect Production:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
      }),
    );

    const meta = building.metadata as Record<string, unknown> | null;
    const autoCollect = !!(meta?.autoCollect);

    const toggle = new UIToggle(this.scene, {
      x: 220,
      y: y - 2,
      width: 50,
      height: 24,
      value: autoCollect,
      onChange: (val) => this.toggleAutoCollect(building.type, val),
    });
    container.add(toggle.getContainer());
    y += 35;

    // Storage warning (T-0362)
    this.checkStorageWarning(container, building.type, y);
  }

  private async checkStorageWarning(
    container: Phaser.GameObjects.Container,
    buildingType: string,
    y: number,
  ): Promise<void> {
    try {
      const result = await apiClient.checkBuildingStorage(buildingType);
      if (result.full.length > 0) {
        container.add(
          this.scene.add.text(0, y, 'Storage Warning:', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: '#f5a623',
            fontStyle: 'bold',
          }),
        );
        y += 20;

        for (const item of result.full) {
          container.add(
            this.scene.add.text(15, y, `${item.resource}: ${Math.floor(item.current)}/${item.cap} (nearly full!)`, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: '#f5a623',
            }),
          );
          y += 16;
        }
      }
    } catch {
      // Silently ignore
    }
  }

  private async payMaintenance(buildingType: string): Promise<void> {
    try {
      await apiClient.payBuildingMaintenance(buildingType);
      NotificationSystem.getInstance(this.scene).showSuccess('Maintenance paid!');
      this.modal?.destroy();
      this.modal = null;
      this.onRefresh();
    } catch {
      NotificationSystem.getInstance(this.scene).showError('Failed to pay maintenance');
    }
  }

  private async toggleAutoCollect(buildingType: string, enabled: boolean): Promise<void> {
    try {
      await apiClient.toggleBuildingAutoCollect(buildingType, enabled);
      const msg = enabled ? 'Auto-collect enabled' : 'Auto-collect disabled';
      NotificationSystem.getInstance(this.scene).showSuccess(msg);
    } catch {
      NotificationSystem.getInstance(this.scene).showError('Failed to toggle auto-collect');
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
