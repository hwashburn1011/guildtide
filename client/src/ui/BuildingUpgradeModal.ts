import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { UIStatComparison } from './components/UIStatComparison';
import { UIProgressBar } from './components/UIProgressBar';
import type { StatComparisonEntry } from './components/UIStatComparison';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import { BUILDING_DEFINITIONS, BUILDING_COST_MULTIPLIER, BUILDING_LEVEL_BONUS } from '@shared/constants';
import { BuildingType, ResourceType } from '@shared/enums';
import type { Building, Resources } from '@shared/types';

export class BuildingUpgradeModal {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onRefresh: () => void;

  constructor(scene: Phaser.Scene, onRefresh: () => void) {
    this.scene = scene;
    this.onRefresh = onRefresh;
  }

  show(building: Building, currentResources: Resources): void {
    if (this.modal) {
      this.modal.destroy();
    }

    const def = BUILDING_DEFINITIONS[building.type as BuildingType];
    if (!def) return;

    const isMaxLevel = building.level >= def.maxLevel;

    this.modal = new UIModal(this.scene, {
      title: `Upgrade ${def.name}`,
      width: 480,
      height: 420,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    let y = 0;

    // Current level
    content.add(
      this.scene.add.text(0, y, `Current Level: ${building.level} / ${def.maxLevel}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 30;

    // Level progress bar
    const levelBar = new UIProgressBar(this.scene, {
      x: 0, y,
      width: 400,
      height: 14,
      value: building.level,
      maxValue: def.maxLevel,
      fillColor: COLORS.gold,
    });
    content.add(levelBar);
    y += 30;

    if (isMaxLevel) {
      content.add(
        this.scene.add.text(200, y, 'This building is at maximum level!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }).setOrigin(0.5, 0),
      );
      this.modal.open();
      return;
    }

    // Before/After comparison
    content.add(
      this.scene.add.text(0, y, 'Stat Comparison', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 22;

    const stats: StatComparisonEntry[] = Object.entries(def.baseOutput).map(([res, base]) => {
      const currentRate = (base as number) * (1 + building.level * BUILDING_LEVEL_BONUS);
      const nextRate = (base as number) * (1 + (building.level + 1) * BUILDING_LEVEL_BONUS);
      return {
        label: res.charAt(0).toUpperCase() + res.slice(1),
        before: parseFloat(currentRate.toFixed(3)),
        after: parseFloat(nextRate.toFixed(3)),
        suffix: '/s',
      };
    });

    if (stats.length > 0) {
      const comparison = new UIStatComparison(this.scene, {
        x: 0, y,
        stats,
        labelWidth: 80,
        valueWidth: 70,
      });
      content.add(comparison);
      y += comparison.getHeight() + 15;
    }

    // Upgrade cost
    content.add(
      this.scene.add.text(0, y, 'Upgrade Cost:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 20;

    let canAfford = true;
    for (const [resource, baseCost] of Object.entries(def.baseCost)) {
      const cost = Math.ceil((baseCost as number) * Math.pow(BUILDING_COST_MULTIPLIER, building.level));
      const have = currentResources[resource as ResourceType] ?? 0;
      const affordable = have >= cost;
      if (!affordable) canAfford = false;

      const costColor = affordable ? '#4ecca3' : '#e94560';
      content.add(
        this.scene.add.text(10, y, `${resource}: ${cost}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: costColor,
        }),
      );
      content.add(
        this.scene.add.text(200, y, `(have: ${Math.floor(have)})`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }),
      );
      y += 20;
    }
    y += 10;

    // Upgrade button
    const upgradeBtn = new UIButton(this.scene, {
      x: 100,
      y,
      width: 200,
      height: 40,
      text: canAfford ? 'Confirm Upgrade' : 'Insufficient Resources',
      variant: canAfford ? 'primary' : 'secondary',
      fontSize: FONTS.sizes.small,
      disabled: !canAfford,
      onClick: canAfford ? () => this.performUpgrade(building.type, def.name) : undefined,
    });
    content.add(upgradeBtn);

    this.modal.open();
  }

  private async performUpgrade(type: string, name: string): Promise<void> {
    try {
      const result = await apiClient.upgradeBuilding(type);
      NotificationSystem.show(this.scene, `${name} upgraded to level ${result.building.level}!`, 'success');
      this.modal?.close();
      this.onRefresh();
    } catch (err) {
      NotificationSystem.show(this.scene, err instanceof Error ? err.message : 'Upgrade failed', 'error');
    }
  }
}
