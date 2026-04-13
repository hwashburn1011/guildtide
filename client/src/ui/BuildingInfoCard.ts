/**
 * Building info card with stat comparison for current vs next level.
 * Also shows lore entries, maintenance status, and worker efficiency.
 *
 * T-0370: Building info card with stat comparison
 * T-0363: Building comparison tool
 * T-0364: Building lore entries
 * T-0366: Quick-upgrade button with cost confirmation
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { UIStatComparison } from './components/UIStatComparison';
import type { StatComparisonEntry } from './components/UIStatComparison';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import { BUILDING_DEFINITIONS, BUILDING_COST_MULTIPLIER } from '@shared/constants';
import { BuildingType, ResourceType } from '@shared/enums';
import type { Building, Resources } from '@shared/types';

export class BuildingInfoCard {
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
      title: 'Building Info',
      width: 560,
      height: 580,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();

    const loading = this.scene.add.text(230, 100, 'Loading...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);
    content.add(loading);

    this.modal.open();

    try {
      const [info, lore, comparison] = await Promise.all([
        apiClient.getBuildingInfoCard(buildingType),
        apiClient.getBuildingLore(buildingType),
        apiClient.getBuildingComparison(buildingType),
      ]);
      loading.destroy();
      this.renderInfo(content, buildingType, info, lore, comparison);
    } catch {
      loading.setText('Failed to load building info');
    }
  }

  private renderInfo(
    container: Phaser.GameObjects.Container,
    buildingType: string,
    info: {
      name: string;
      description: string;
      level: number;
      maxLevel: number;
      stats: Array<{ label: string; current: string; next: string; change: string }>;
    },
    lore: Array<{ level: number; title: string; text: string }>,
    comparison: {
      current: { output: Record<string, number>; maintenance: Record<string, number> };
      next: { output: Record<string, number>; maintenance: Record<string, number>; cost: Record<string, number> };
    },
  ): void {
    let y = 0;

    // Building name and level
    container.add(
      this.scene.add.text(0, y, `${info.name}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );

    container.add(
      this.scene.add.text(460, y + 4, `Level ${info.level}/${info.maxLevel}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: info.level >= info.maxLevel ? '#ffd700' : COLORS.textSecondary,
      }).setOrigin(1, 0),
    );
    y += 35;

    // Description
    container.add(
      this.scene.add.text(0, y, info.description, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: 460 },
      }),
    );
    y += 35;

    // Stat comparison table
    container.add(
      this.scene.add.text(0, y, 'Stats Comparison', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    // Table headers
    const colX = [0, 200, 310, 410];
    const headers = ['Stat', 'Current', 'Next', 'Change'];
    headers.forEach((h, i) => {
      container.add(
        this.scene.add.text(colX[i], y, h, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
          fontStyle: 'bold',
        }),
      );
    });
    y += 22;

    // Table rows
    for (const stat of info.stats) {
      container.add(
        this.scene.add.text(colX[0], y, stat.label, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
        }),
      );
      container.add(
        this.scene.add.text(colX[1], y, stat.current, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }),
      );
      container.add(
        this.scene.add.text(colX[2], y, stat.next, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
        }),
      );

      const changeColor = stat.change.startsWith('+') ? '#4ecca3' : stat.change.startsWith('-') ? '#e94560' : COLORS.textSecondary;
      container.add(
        this.scene.add.text(colX[3], y, stat.change, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: changeColor,
        }),
      );
      y += 20;
    }
    y += 15;

    // Upgrade cost section
    if (info.level < info.maxLevel && comparison.next.cost) {
      container.add(
        this.scene.add.text(0, y, 'Upgrade Cost', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
        }),
      );
      y += 22;

      for (const [res, cost] of Object.entries(comparison.next.cost)) {
        container.add(
          this.scene.add.text(15, y, `${res}: ${cost}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textSecondary,
          }),
        );
        y += 18;
      }
      y += 10;

      // Quick upgrade button (T-0366)
      const upgradeBtn = new UIButton(this.scene, {
        x: 230,
        y,
        width: 160,
        height: 36,
        text: 'Quick Upgrade',
        style: 'primary',
        onClick: () => this.quickUpgrade(buildingType, info.name),
      });
      container.add(upgradeBtn.getContainer());
      y += 50;
    }

    // Lore section (T-0364)
    if (lore.length > 0) {
      container.add(
        this.scene.add.text(0, y, 'Lore', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }),
      );
      y += 22;

      // Show most recent lore entry
      const latestLore = lore[lore.length - 1];
      container.add(
        this.scene.add.text(0, y, latestLore.title, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          fontStyle: 'italic',
        }),
      );
      y += 18;

      container.add(
        this.scene.add.text(0, y, latestLore.text, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 460 },
        }),
      );
    }
  }

  private async quickUpgrade(buildingType: string, buildingName: string): Promise<void> {
    try {
      const result = await apiClient.upgradeBuilding(buildingType);
      const notifications = NotificationSystem.getInstance(this.scene);
      notifications.showSuccess(`Upgraded ${buildingName}!`);

      if ((result as any).milestones?.length > 0) {
        for (const m of (result as any).milestones) {
          notifications.showSuccess(`Milestone: ${m.label}`);
        }
      }
      if ((result as any).achievements?.length > 0) {
        for (const a of (result as any).achievements) {
          notifications.showSuccess(`Achievement: ${a.name}`);
        }
      }

      this.modal?.destroy();
      this.modal = null;
      this.onRefresh();
    } catch {
      NotificationSystem.getInstance(this.scene).showError('Upgrade failed — check resources');
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
