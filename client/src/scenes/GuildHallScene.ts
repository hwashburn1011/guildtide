import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import type { Guild, Resources } from '@shared/types';
import { ResourceType } from '@shared/enums';

const RESOURCE_LABELS: Record<ResourceType, string> = {
  [ResourceType.Gold]: 'Gold',
  [ResourceType.Wood]: 'Wood',
  [ResourceType.Stone]: 'Stone',
  [ResourceType.Herbs]: 'Herbs',
  [ResourceType.Ore]: 'Ore',
  [ResourceType.Water]: 'Water',
  [ResourceType.Food]: 'Food',
  [ResourceType.Essence]: 'Essence',
};

export class GuildHallScene extends Phaser.Scene {
  private guild: Guild | null = null;
  private resourceTexts: Map<ResourceType, Phaser.GameObjects.Text> = new Map();

  constructor() {
    super({ key: 'GuildHallScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor(COLORS.background);

    // Loading state
    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading guild...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);

    try {
      const guildData = await apiClient.getGuild();
      this.guild = guildData;
      loadingText.destroy();
      this.buildUI();
    } catch (err) {
      loadingText.setText('Failed to load guild data');
      // If auth fails, go back to login
      if (err instanceof Error && err.message.includes('401')) {
        localStorage.removeItem('guildtide_token');
        this.scene.start('LoginScene');
      }
    }
  }

  private buildUI(): void {
    if (!this.guild) return;

    // Header bar
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.panelBg, 0.9);
    headerBg.fillRect(0, 0, GAME_WIDTH, 60);
    headerBg.lineStyle(2, COLORS.panelBorder);
    headerBg.strokeRect(0, 0, GAME_WIDTH, 60);

    // Guild name & level
    this.add.text(20, 15, this.guild.name, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });

    this.add.text(20, 42, `Level ${this.guild.level}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });

    // Resource bar
    this.buildResourceBar();

    // Main content area — placeholder panels
    this.buildBuildingGrid();

    // Bottom nav
    this.buildBottomNav();
  }

  private buildResourceBar(): void {
    if (!this.guild) return;

    const barY = 70;
    const barBg = this.add.graphics();
    barBg.fillStyle(COLORS.panelBg, 0.7);
    barBg.fillRect(0, barY, GAME_WIDTH, 35);

    const resources = this.guild.resources;
    const types = Object.values(ResourceType);
    const spacing = GAME_WIDTH / types.length;

    types.forEach((type, i) => {
      const x = spacing * i + 10;
      const value = resources[type] ?? 0;

      this.add.text(x, barY + 5, RESOURCE_LABELS[type], {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      });

      const valueText = this.add.text(x, barY + 18, Math.floor(value).toString(), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      });

      this.resourceTexts.set(type, valueText);
    });
  }

  private buildBuildingGrid(): void {
    const startY = 130;
    const centerX = GAME_WIDTH / 2;

    // Placeholder message
    this.add.text(centerX, startY + 200, 'Your guild hall awaits construction.\nBuildings will appear here.', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    // Building slot placeholders (2 rows of 3)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const x = centerX - 300 + col * 300;
        const y = startY + 60 + row * 180;

        const slotBg = this.add.graphics();
        slotBg.lineStyle(1, COLORS.panelBorder, 0.5);
        slotBg.strokeRect(x - 120, y - 60, 240, 140);

        this.add.text(x, y, `Slot ${row * 3 + col + 1}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5).setAlpha(0.3);
      }
    }
  }

  private buildBottomNav(): void {
    const navY = GAME_HEIGHT - 50;
    const navBg = this.add.graphics();
    navBg.fillStyle(COLORS.panelBg, 0.9);
    navBg.fillRect(0, navY, GAME_WIDTH, 50);
    navBg.lineStyle(2, COLORS.panelBorder);
    navBg.strokeRect(0, navY, GAME_WIDTH, 50);

    const tabs = ['Guild Hall', 'Expeditions', 'Market', 'World Map', 'Research'];
    const tabWidth = GAME_WIDTH / tabs.length;

    tabs.forEach((tab, i) => {
      const x = tabWidth * i + tabWidth / 2;
      const text = this.add.text(x, navY + 25, tab, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: i === 0 ? COLORS.textGold : COLORS.textSecondary,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      text.on('pointerover', () => {
        text.setColor(COLORS.textGold);
      });
      text.on('pointerout', () => {
        if (i !== 0) text.setColor(COLORS.textSecondary);
      });
    });

    // Logout button
    const logoutText = this.add.text(GAME_WIDTH - 80, 20, 'Logout', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    logoutText.on('pointerup', () => {
      localStorage.removeItem('guildtide_token');
      this.scene.start('LoginScene');
    });
  }
}
