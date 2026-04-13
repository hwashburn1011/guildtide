import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { UIScrollableList } from './components/UIScrollableList';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import { BUILDING_DEFINITIONS, BUILDING_COST_MULTIPLIER } from '@shared/constants';
import { BuildingType } from '@shared/enums';
import type { Building, Guild } from '@shared/types';

export class BuildMenuPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private guild: Guild;
  private onRefresh: () => void;
  private filterType: 'all' | 'available' | 'locked' = 'all';

  constructor(scene: Phaser.Scene, guild: Guild, onRefresh: () => void) {
    this.scene = scene;
    this.guild = guild;
    this.onRefresh = onRefresh;
  }

  async show(): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Build Menu',
      width: 600,
      height: 520,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();

    // Fetch unlocked buildings from server
    try {
      const xpInfo = await apiClient.getGuildXP();
      this.renderMenu(content, xpInfo.unlockedBuildings);
    } catch {
      this.renderMenu(content, Object.values(BuildingType));
    }

    this.modal.open();
  }

  private renderMenu(
    container: Phaser.GameObjects.Container,
    unlockedBuildings: string[],
  ): void {
    // Filter buttons
    const filters: Array<{ label: string; value: 'all' | 'available' | 'locked' }> = [
      { label: 'All', value: 'all' },
      { label: 'Available', value: 'available' },
      { label: 'Locked', value: 'locked' },
    ];

    filters.forEach((f, i) => {
      const isActive = this.filterType === f.value;
      const filterText = this.scene.add.text(i * 100, 0, f.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: isActive ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: isActive ? 'bold' : 'normal',
      }).setInteractive({ useHandCursor: true });

      filterText.on('pointerup', () => {
        this.filterType = f.value;
        container.removeAll(true);
        this.renderMenu(container, unlockedBuildings);
      });

      container.add(filterText);
    });

    // Building list
    const scrollList = new UIScrollableList(this.scene, {
      x: 0,
      y: 30,
      width: 540,
      height: 400,
    });

    const listContent = scrollList.getContentContainer();
    const existingTypes = new Set(this.guild.buildings.map(b => b.type));
    const allTypes = Object.values(BuildingType);
    const cardH = 90;
    let visibleCount = 0;

    allTypes.forEach((type) => {
      const def = BUILDING_DEFINITIONS[type];
      if (!def) return;

      const isUnlocked = unlockedBuildings.includes(type);
      const isBuilt = existingTypes.has(type);

      // Apply filter
      if (this.filterType === 'available' && (!isUnlocked || isBuilt)) return;
      if (this.filterType === 'locked' && isUnlocked) return;

      const y = visibleCount * (cardH + 8);
      visibleCount++;

      // Card background
      const bg = this.scene.add.graphics();
      bg.fillStyle(isUnlocked ? COLORS.panelBg : 0x0d1520, 0.95);
      bg.fillRoundedRect(0, y, 530, cardH, 6);
      bg.lineStyle(1, isUnlocked ? COLORS.panelBorder : 0x333355);
      bg.strokeRoundedRect(0, y, 530, cardH, 6);
      listContent.add(bg);

      // Name
      listContent.add(
        this.scene.add.text(12, y + 8, def.name, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: isUnlocked ? COLORS.textGold : COLORS.textSecondary,
          fontStyle: 'bold',
        }),
      );

      // Status badge
      const statusText = isBuilt ? 'Built' : isUnlocked ? 'Available' : 'Locked';
      const statusColor = isBuilt ? '#4ecca3' : isUnlocked ? '#f5a623' : '#e94560';
      listContent.add(
        this.scene.add.text(520, y + 10, statusText, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: statusColor,
          fontStyle: 'bold',
        }).setOrigin(1, 0),
      );

      // Description
      listContent.add(
        this.scene.add.text(12, y + 30, def.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 350 },
        }),
      );

      // Cost
      const costStr = Object.entries(def.baseCost)
        .map(([res, base]) => `${base} ${res}`)
        .join(', ');
      listContent.add(
        this.scene.add.text(12, y + 52, `Cost: ${costStr}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#f5a623',
        }),
      );

      // Output
      const outputEntries = Object.entries(def.baseOutput);
      if (outputEntries.length > 0) {
        const outputStr = outputEntries
          .map(([res, base]) => `+${(base as number).toFixed(2)} ${res}/s`)
          .join(', ');
        listContent.add(
          this.scene.add.text(12, y + 68, `Produces: ${outputStr}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#4ecca3',
          }),
        );
      } else {
        listContent.add(
          this.scene.add.text(12, y + 68, 'Special building', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#4ecca3',
          }),
        );
      }

      // Build button
      if (isUnlocked && !isBuilt) {
        const buildBtn = new UIButton(this.scene, {
          x: 420,
          y: y + 45,
          width: 100,
          height: 32,
          text: 'Build',
          variant: 'primary',
          fontSize: FONTS.sizes.small,
          onClick: () => this.handleBuild(type, def.name),
        });
        listContent.add(buildBtn);
      }
    });

    scrollList.refreshScroll(visibleCount * (cardH + 8));
    container.add(scrollList);

    // Slots info
    const slotsUsed = this.guild.buildings.length;
    const slotsTotal = this.guild.buildingSlots ?? 6;
    container.add(
      this.scene.add.text(540, -2, `Slots: ${slotsUsed}/${slotsTotal}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: slotsUsed >= slotsTotal ? '#e94560' : COLORS.textSecondary,
      }).setOrigin(1, 0),
    );
  }

  private async handleBuild(type: string, name: string): Promise<void> {
    try {
      await apiClient.upgradeBuilding(type);
      NotificationSystem.show(this.scene, `${name} built!`, 'success');
      this.modal?.close();
      this.onRefresh();
    } catch (err) {
      NotificationSystem.show(this.scene, err instanceof Error ? err.message : 'Build failed', 'error');
    }
  }

  setGuild(guild: Guild): void {
    this.guild = guild;
  }
}
