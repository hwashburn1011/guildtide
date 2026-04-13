import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import { BuildingType, ResourceType } from '@shared/enums';
import { BUILDING_DEFINITIONS, BUILDING_COST_MULTIPLIER, BUILDING_LEVEL_BONUS } from '@shared/constants';
import type { Building, Resources } from '@shared/types';
import { apiClient } from '../api/client';

export class BuildingPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private buildings: Building[];
  private onUpgrade: (building: Building) => void;
  private onDetail?: (building: Building) => void;
  private buildingCards: Map<string, {
    levelText: Phaser.GameObjects.Text;
    outputText: Phaser.GameObjects.Text;
    costText: Phaser.GameObjects.Text;
    upgradeBtn: Phaser.GameObjects.Text;
  }> = new Map();

  constructor(
    scene: Phaser.Scene,
    y: number,
    buildings: Building[],
    onUpgrade: (building: Building) => void,
    onDetail?: (building: Building) => void,
  ) {
    this.scene = scene;
    this.buildings = buildings;
    this.onUpgrade = onUpgrade;
    this.onDetail = onDetail;
    this.container = scene.add.container(0, y);
    this.render();
  }

  private render(): void {
    const cols = 3;
    const cardW = 380;
    const cardH = 130;
    const gapX = 20;
    const gapY = 15;
    const startX = (GAME_WIDTH - (cols * cardW + (cols - 1) * gapX)) / 2;

    // If no buildings yet, show starter buildings available to build
    const buildingTypes = this.buildings.length > 0
      ? this.buildings
      : this.getStarterBuildings();

    buildingTypes.forEach((building, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = row * (cardH + gapY);

      this.renderBuildingCard(x, y, cardW, cardH, building);
    });
  }

  private getStarterBuildings(): Building[] {
    const starterTypes = [
      BuildingType.Farm,
      BuildingType.LumberMill,
      BuildingType.Quarry,
      BuildingType.HerbGarden,
      BuildingType.Mine,
      BuildingType.Well,
    ];
    return starterTypes.map((type, i) => ({
      id: `starter-${type}`,
      guildId: '',
      type,
      level: 0,
      slot: i,
      metadata: null,
    }));
  }

  private renderBuildingCard(
    x: number, y: number, w: number, h: number,
    building: Building,
  ): void {
    const def = BUILDING_DEFINITIONS[building.type as BuildingType];
    if (!def) return;

    // Card background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.9);
    bg.fillRoundedRect(x, y, w, h, 8);
    bg.lineStyle(1, COLORS.panelBorder);
    bg.strokeRoundedRect(x, y, w, h, 8);
    this.container.add(bg);

    // Building name
    this.container.add(
      this.scene.add.text(x + 12, y + 10, def.name, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      })
    );

    // Level
    const levelText = this.scene.add.text(x + w - 12, y + 10, `Lv ${building.level}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0);
    this.container.add(levelText);

    // Description
    this.container.add(
      this.scene.add.text(x + 12, y + 34, def.description, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: w - 24 },
      })
    );

    // Output
    const outputStr = this.getOutputString(building, def);
    const outputText = this.scene.add.text(x + 12, y + 58, outputStr, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: '#4ecca3',
    });
    this.container.add(outputText);

    // Upgrade cost
    const costStr = this.getCostString(building, def);
    const costText = this.scene.add.text(x + 12, y + 78, costStr, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    this.container.add(costText);

    // Upgrade button
    const btnLabel = building.level === 0 ? 'Build' : 'Upgrade';
    const upgradeBtn = this.scene.add.text(x + w - 12, y + h - 15, btnLabel, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
      fontStyle: 'bold',
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    this.container.add(upgradeBtn);

    upgradeBtn.on('pointerover', () => upgradeBtn.setAlpha(0.7));
    upgradeBtn.on('pointerout', () => upgradeBtn.setAlpha(1));
    upgradeBtn.on('pointerup', () => this.onUpgrade(building));

    // Details button
    if (this.onDetail && building.level > 0) {
      const detailBtn = this.scene.add.text(x + w - 12, y + h - 35, 'Details', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
      this.container.add(detailBtn);

      detailBtn.on('pointerover', () => detailBtn.setColor(COLORS.textAccent));
      detailBtn.on('pointerout', () => detailBtn.setColor(COLORS.textSecondary));
      detailBtn.on('pointerup', () => this.onDetail?.(building));
    }

    // Worker indicator (if building has metadata about construction)
    if (building.metadata && (building.metadata as any).constructing) {
      const constructLabel = this.scene.add.text(x + w / 2, y + h - 10, 'Under Construction...', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#f5a623',
        fontStyle: 'italic',
      }).setOrigin(0.5, 1);
      this.container.add(constructLabel);
    }

    this.buildingCards.set(building.id, { levelText, outputText, costText, upgradeBtn });
  }

  private getOutputString(building: Building, def: typeof BUILDING_DEFINITIONS[BuildingType]): string {
    if (building.level === 0) return 'Output: (build first)';
    const entries = Object.entries(def.baseOutput);
    if (entries.length === 0) return 'Output: special';
    return entries.map(([res, base]) => {
      const rate = (base as number) * (1 + building.level * BUILDING_LEVEL_BONUS);
      return `${res}: +${rate.toFixed(2)}/s`;
    }).join(', ');
  }

  private getCostString(building: Building, def: typeof BUILDING_DEFINITIONS[BuildingType]): string {
    const level = building.level;
    const entries = Object.entries(def.baseCost);
    return 'Cost: ' + entries.map(([res, base]) => {
      const cost = Math.ceil((base as number) * Math.pow(BUILDING_COST_MULTIPLIER, level));
      return `${cost} ${res}`;
    }).join(', ');
  }

  updateBuilding(building: Building): void {
    // Full re-render for simplicity
    this.container.removeAll(true);
    const idx = this.buildings.findIndex(b => b.id === building.id);
    if (idx >= 0) {
      this.buildings[idx] = building;
    } else {
      this.buildings.push(building);
    }
    this.render();
  }

  setBuildings(buildings: Building[]): void {
    this.buildings = buildings;
    this.container.removeAll(true);
    this.render();
  }
}
