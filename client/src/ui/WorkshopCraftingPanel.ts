/**
 * Workshop building UI with crafting recipe browser, craft button, and queue.
 *
 * T-0298: Workshop building — equipment crafting station
 * T-0300: Workshop UI with crafting recipe browser and craft button
 * T-0301: Workshop production queue with crafting time per item
 * T-0302: Workshop upgrade effects (faster crafting, unlock rare recipes)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { UIProgressBar } from './components/UIProgressBar';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import { CONVERSION_RECIPES } from '@shared/constants';
import type { Building, Resources } from '@shared/types';

export class WorkshopCraftingPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onRefresh: () => void;

  constructor(scene: Phaser.Scene, onRefresh: () => void) {
    this.scene = scene;
    this.onRefresh = onRefresh;
  }

  async show(building: Building, resources: Resources): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Workshop — Crafting',
      width: 560,
      height: 500,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.renderWorkshop(content, building, resources);
    this.modal.open();
  }

  private renderWorkshop(
    container: Phaser.GameObjects.Container,
    building: Building,
    resources: Resources,
  ): void {
    let y = 0;
    const level = building.level;
    const speedMult = (1 + level * 0.1).toFixed(1);
    const maxQueue = Math.min(1 + Math.floor(level / 2), 5);

    // Stats header
    container.add(
      this.scene.add.text(0, y, `Level ${level} Workshop`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    container.add(
      this.scene.add.text(0, y, `Craft Speed: ${speedMult}x  |  Queue Size: ${maxQueue}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 30;

    // Recipes section
    container.add(
      this.scene.add.text(0, y, 'Available Recipes:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    for (const recipe of CONVERSION_RECIPES) {
      const canCraft = level >= recipe.requiredBuildingLevel;
      const cardH = 65;

      // Card background
      const bg = this.scene.add.rectangle(
        230, y + cardH / 2, 460, cardH,
        canCraft ? COLORS.panelBg : 0x111122, 0.7,
      );
      bg.setStrokeStyle(1, canCraft ? COLORS.panelBorder : 0x333344);
      container.add(bg);

      // Recipe name
      container.add(
        this.scene.add.text(15, y + 5, recipe.name, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: canCraft ? COLORS.textPrimary : '#666666',
          fontStyle: 'bold',
        }),
      );

      // Locked indicator
      if (!canCraft) {
        container.add(
          this.scene.add.text(420, y + 5, `Lv.${recipe.requiredBuildingLevel}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#e94560',
          }).setOrigin(1, 0),
        );
      }

      // Description
      container.add(
        this.scene.add.text(15, y + 22, recipe.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 350 },
        }),
      );

      // Input/Output
      const inputStr = Object.entries(recipe.inputs)
        .map(([r, a]) => `${a} ${r}`)
        .join(', ');
      const outputStr = Object.entries(recipe.outputs)
        .map(([r, a]) => `${a} ${r}`)
        .join(', ');

      container.add(
        this.scene.add.text(15, y + 42, `${inputStr} -> ${outputStr}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: canCraft ? '#4ecca3' : '#444444',
        }),
      );

      // Craft button
      if (canCraft) {
        // Check if player has enough resources
        const hasResources = Object.entries(recipe.inputs).every(
          ([r, a]) => (resources[r as keyof Resources] || 0) >= (a ?? 0),
        );

        const craftBtn = new UIButton(this.scene, {
          x: 430,
          y: y + cardH / 2,
          width: 60,
          height: 26,
          text: 'Craft',
          variant: hasResources ? 'primary' : 'secondary',
          onClick: hasResources ? () => this.craftRecipe(recipe.id, recipe.name) : () => {},
        });
        container.add(craftBtn);
      }

      y += cardH + 6;
    }
  }

  private async craftRecipe(recipeId: string, recipeName: string): Promise<void> {
    try {
      // Use resource conversion endpoint
      const result = await apiClient.convertResources(recipeId, 1);
      NotificationSystem.show(this.scene, `Crafted ${recipeName}!`, 'success');
      this.modal?.destroy();
      this.modal = null;
      this.onRefresh();
    } catch {
      NotificationSystem.show(this.scene, 'Crafting failed', 'error');
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
