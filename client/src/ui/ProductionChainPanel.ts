/**
 * Visual panel showing production chains across buildings.
 * Displays input -> output flows with arrows and efficiency ratings.
 *
 * Covers T-0349, T-0350, T-0351: Production chain visualization and optimizer.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import { UIModal } from './components/UIModal';
import { UIProgressBar } from './components/UIProgressBar';
import { apiClient } from '../api/client';
import type { Building } from '@shared/types';

interface ProductionChainStep {
  building: string;
  input: Record<string, number>;
  output: Record<string, number>;
}

interface ProductionChain {
  id: string;
  name: string;
  description: string;
  steps: ProductionChainStep[];
  efficiency?: number;
  active?: boolean;
}

export class ProductionChainPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(buildings: Building[]): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Production Chains',
      width: 680,
      height: 520,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();

    // Loading state
    const loading = this.scene.add.text(290, 100, 'Loading chains...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);
    content.add(loading);

    this.modal.open();

    try {
      const chains = await apiClient.getProductionChains();
      loading.destroy();
      this.renderChains(content, chains, buildings);
    } catch {
      loading.setText('Failed to load production chains');
    }
  }

  private renderChains(
    container: Phaser.GameObjects.Container,
    chains: ProductionChain[],
    buildings: Building[],
  ): void {
    let y = 0;

    // Header description
    container.add(
      this.scene.add.text(290, y, 'Buildings work together in production chains for bonus efficiency.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: 600 },
      }).setOrigin(0.5),
    );
    y += 30;

    const builtTypes = new Set(buildings.filter(b => b.level > 0).map(b => b.type));

    for (const chain of chains) {
      const isActive = chain.steps.every(step => builtTypes.has(step.building));
      const efficiency = chain.efficiency ?? 0;

      // Chain card background
      const cardH = 100;
      const bg = this.scene.add.rectangle(290, y + cardH / 2, 600, cardH, COLORS.panelBg, 0.7);
      bg.setStrokeStyle(2, isActive ? COLORS.success : COLORS.panelBorder);
      container.add(bg);

      // Chain name with active indicator
      const statusIcon = isActive ? '[ACTIVE] ' : '[INACTIVE] ';
      const statusColor = isActive ? '#4ecca3' : '#a0a0b0';
      container.add(
        this.scene.add.text(20, y + 8, `${statusIcon}${chain.name}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: isActive ? COLORS.textGold : COLORS.textSecondary,
          fontStyle: 'bold',
        }),
      );

      // Description
      container.add(
        this.scene.add.text(20, y + 30, chain.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          wordWrap: { width: 560 },
        }),
      );

      // Flow visualization: Building -> Resource -> Building -> Resource -> Building
      let flowX = 20;
      const flowY = y + 60;

      for (let i = 0; i < chain.steps.length; i++) {
        const step = chain.steps[i];
        const isBuilt = builtTypes.has(step.building);
        const bldgName = step.building.replace(/_/g, ' ');

        // Building name
        container.add(
          this.scene.add.text(flowX, flowY, bldgName, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: isBuilt ? '#4ecca3' : '#666666',
            fontStyle: 'bold',
          }),
        );

        flowX += bldgName.length * 7 + 5;

        // Output arrow and resources
        if (Object.keys(step.output).length > 0) {
          const outputStr = Object.entries(step.output)
            .map(([r, a]) => `${r}`)
            .join('+');
          container.add(
            this.scene.add.text(flowX, flowY, ` -> ${outputStr}`, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: COLORS.textSecondary,
            }),
          );
          flowX += (outputStr.length + 4) * 6 + 10;
        }

        if (i < chain.steps.length - 1) {
          container.add(
            this.scene.add.text(flowX, flowY, ' -> ', {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: '#ffd700',
            }),
          );
          flowX += 30;
        }
      }

      // Efficiency bar (if active)
      if (isActive) {
        const effBar = new UIProgressBar(this.scene, {
          x: 460,
          y: y + 8,
          width: 120,
          height: 14,
          value: efficiency,
          maxValue: 100,
          fillColor: efficiency > 70 ? COLORS.success : efficiency > 40 ? COLORS.warning : COLORS.danger,
          label: `${Math.round(efficiency)}%`,
        });
        container.add(effBar.getContainer());
      }

      y += cardH + 10;
    }

    // Optimizer suggestions
    y += 10;
    container.add(
      this.scene.add.text(290, y, 'Optimization Tips', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }).setOrigin(0.5),
    );
    y += 25;

    const inactiveChains = chains.filter(c => !c.steps.every(s => builtTypes.has(s.building)));
    if (inactiveChains.length > 0) {
      for (const chain of inactiveChains.slice(0, 3)) {
        const missing = chain.steps
          .filter(s => !builtTypes.has(s.building))
          .map(s => s.building.replace(/_/g, ' '));

        container.add(
          this.scene.add.text(20, y, `Build ${missing.join(', ')} to activate "${chain.name}"`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textSecondary,
          }),
        );
        y += 20;
      }
    } else {
      container.add(
        this.scene.add.text(20, y, 'All production chains are active! Focus on upgrading buildings to increase efficiency.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#4ecca3',
          wordWrap: { width: 560 },
        }),
      );
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
