import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import { ResourceType, BuildingType } from '@shared/enums';
import { DEFAULT_STORAGE_CAPS, STORAGE_CAP_PER_BUILDING_LEVEL, BUILDING_DEFINITIONS } from '@shared/constants';

const RESOURCE_COLORS: Record<ResourceType, string> = {
  [ResourceType.Gold]: '#ffd700',
  [ResourceType.Wood]: '#8b6914',
  [ResourceType.Stone]: '#a0a0a0',
  [ResourceType.Herbs]: '#4ecca3',
  [ResourceType.Ore]: '#c87533',
  [ResourceType.Water]: '#4dabf7',
  [ResourceType.Food]: '#f59f00',
  [ResourceType.Essence]: '#be4bdb',
};

/** Maps each resource to the building that produces it (for cap increases) */
const RESOURCE_TO_BUILDING: Partial<Record<ResourceType, BuildingType>> = {
  [ResourceType.Food]: BuildingType.Farm,
  [ResourceType.Wood]: BuildingType.LumberMill,
  [ResourceType.Stone]: BuildingType.Quarry,
  [ResourceType.Herbs]: BuildingType.HerbGarden,
  [ResourceType.Ore]: BuildingType.Mine,
  [ResourceType.Water]: BuildingType.Well,
  [ResourceType.Gold]: BuildingType.Market,
  [ResourceType.Essence]: BuildingType.Laboratory,
};

interface StorageInfo {
  resource: ResourceType;
  currentCap: number;
  baseCap: number;
  buildingName: string;
  buildingLevel: number;
  nextLevelCap: number;
  percentUsed: number;
}

export class ResourceStorageUpgradePanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentElements: Phaser.GameObjects.GameObject[] = [];
  private visible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_WIDTH / 2 - 250, 80);
    this.container.setDepth(1000);
    this.container.setVisible(false);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(0, 0, 500, 450, 12);
    bg.lineStyle(2, 0x0f3460, 1);
    bg.strokeRoundedRect(0, 0, 500, 450, 12);
    this.container.add(bg);

    // Title
    const title = scene.add.text(20, 12, 'Storage Capacity', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.container.add(title);

    const subtitle = scene.add.text(20, 38, 'Upgrade buildings to increase storage caps', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    this.container.add(subtitle);

    // Close
    const closeBtn = scene.add.text(470, 10, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);
  }

  setData(
    resources: Record<ResourceType, number>,
    caps: Record<ResourceType, number>,
    buildings: Array<{ type: string; level: number }>,
  ): void {
    for (const el of this.contentElements) el.destroy();
    this.contentElements = [];

    let y = 60;

    // Headers
    const headers = ['Resource', 'Current', 'Cap', 'Building', 'Next Lv Cap'];
    const xs = [20, 110, 190, 270, 390];
    headers.forEach((h, i) => {
      const t = this.scene.add.text(xs[i], y, h, {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: '#8888aa',
        fontStyle: 'bold',
      });
      this.container.add(t);
      this.contentElements.push(t);
    });
    y += 22;

    for (const resType of Object.values(ResourceType)) {
      const color = RESOURCE_COLORS[resType];
      const current = resources[resType] || 0;
      const cap = caps[resType] || DEFAULT_STORAGE_CAPS[resType];
      const pct = Math.min(1, current / cap);

      const buildingType = RESOURCE_TO_BUILDING[resType];
      const building = buildings.find(b => b.type === buildingType);
      const buildingLevel = building?.level ?? 0;
      const buildingDef = buildingType ? BUILDING_DEFINITIONS[buildingType] : null;
      const buildingName = buildingDef?.name ?? 'None';

      // Next level cap
      const nextLevelCap = buildingType
        ? Math.floor(DEFAULT_STORAGE_CAPS[resType] * (1 + (buildingLevel + 1) * STORAGE_CAP_PER_BUILDING_LEVEL))
        : cap;

      // Resource name
      const nameText = this.scene.add.text(20, y, resType, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color,
      });
      this.container.add(nameText);
      this.contentElements.push(nameText);

      // Current amount
      const curText = this.scene.add.text(110, y, Math.floor(current).toString(), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#ffffff',
      });
      this.container.add(curText);
      this.contentElements.push(curText);

      // Cap
      const capText = this.scene.add.text(190, y, cap.toString(), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: pct >= 1 ? '#ffd700' : '#ffffff',
      });
      this.container.add(capText);
      this.contentElements.push(capText);

      // Building
      const bldText = this.scene.add.text(270, y, `${buildingName} Lv.${buildingLevel}`, {
        fontFamily: FONTS.primary,
        fontSize: '12px',
        color: COLORS.textSecondary,
      });
      this.container.add(bldText);
      this.contentElements.push(bldText);

      // Next level cap
      const nextCapText = this.scene.add.text(390, y, nextLevelCap.toString(), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#4ecca3',
      });
      this.container.add(nextCapText);
      this.contentElements.push(nextCapText);

      // Storage bar
      y += 18;
      const barWidth = 460;
      const barG = this.scene.add.graphics();
      barG.x = 20;
      barG.y = y;
      barG.fillStyle(0x333355, 0.5);
      barG.fillRect(0, 0, barWidth, 5);
      const fillColor = pct >= 1 ? 0xffd700 : pct < 0.2 ? 0xff4444 : 0x4ecca3;
      barG.fillStyle(fillColor, 0.7);
      barG.fillRect(0, 0, barWidth * pct, 5);
      this.container.add(barG);
      this.contentElements.push(barG as any);

      y += 14;
    }
  }

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }
}
