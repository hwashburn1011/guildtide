/**
 * Warehouse building UI showing storage allocation per resource.
 * (Uses Well building type as closest analog in the data model.)
 *
 * T-0329: Warehouse building — resource storage cap increase
 * T-0331: Warehouse UI showing storage allocation per resource
 * T-0332: Warehouse resource-specific storage boost configuration
 * T-0333: Warehouse upgrade effects (higher caps, reduced decay)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIProgressBar } from './components/UIProgressBar';
import { apiClient } from '../api/client';
import { ResourceType } from '@shared/enums';
import type { Building } from '@shared/types';

export class WarehousePanel {
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
      title: 'Storage — Resource Caps',
      width: 500,
      height: 480,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const [detail, balance] = await Promise.all([
        apiClient.getExtendedBuildingDetail(building.type),
        apiClient.getResources(),
      ]);
      this.renderWarehouse(content, building, detail, balance);
    } catch {
      content.add(
        this.scene.add.text(200, 60, 'Failed to load storage data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderWarehouse(
    container: Phaser.GameObjects.Container,
    building: Building,
    detail: any,
    balance: any,
  ): void {
    let y = 0;
    const level = building.level;
    const storageBoost = level * 15;
    const decayReduction = Math.min(level * 5, 50);

    container.add(
      this.scene.add.text(0, y, `Level ${level} Storage`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    container.add(
      this.scene.add.text(0, y, `Storage Boost: +${storageBoost}%  |  Decay Reduction: ${decayReduction}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 30;

    // Storage allocation per resource
    container.add(
      this.scene.add.text(0, y, 'Storage Allocation:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    const current = balance.current ?? {};
    const caps = balance.caps ?? {};

    for (const resType of Object.values(ResourceType)) {
      const cur = Math.floor(current[resType] ?? 0);
      const cap = caps[resType] ?? 1;
      const percent = (cur / cap) * 100;
      const statusColor = percent >= 95 ? COLORS.danger : percent >= 80 ? COLORS.warning : COLORS.success;

      // Resource name
      container.add(
        this.scene.add.text(0, y, resType, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
        }),
      );

      // Progress bar
      const bar = new UIProgressBar(this.scene, {
        x: 100,
        y,
        width: 250,
        height: 16,
        value: percent,
        maxValue: 100,
        fillColor: statusColor,
        label: `${cur}/${cap}`,
      });
      container.add(bar.getContainer());

      // Percentage
      container.add(
        this.scene.add.text(365, y, `${Math.round(percent)}%`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: percent >= 95 ? '#e94560' : COLORS.textSecondary,
        }),
      );

      y += 24;
    }

    y += 15;

    // Perishable warning
    container.add(
      this.scene.add.text(0, y, 'Perishable Resources:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#f5a623',
        fontStyle: 'bold',
      }),
    );
    y += 20;

    container.add(
      this.scene.add.text(0, y, `Food and Herbs decay over time. Current decay reduction: ${decayReduction}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: 400 },
      }),
    );
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
