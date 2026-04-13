import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import type { Guild, Resources } from '@shared/types';
import { ResourceType } from '@shared/enums';
import { ResourceBar } from '../ui/ResourceBar';
import { BuildingPanel } from '../ui/BuildingPanel';
import { OfflineGainsModal } from '../ui/OfflineGainsModal';

export class GuildHallScene extends Phaser.Scene {
  private guild: Guild | null = null;
  private resourceBar: ResourceBar | null = null;
  private buildingPanel: BuildingPanel | null = null;
  private syncTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'GuildHallScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor(COLORS.background);

    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading guild...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);

    try {
      const guildData = await apiClient.getGuild();
      this.guild = guildData;
      loadingText.destroy();

      // Check for offline gains stored from login
      const offlineGains = sessionStorage.getItem('guildtide_offline_gains');
      const elapsedSeconds = sessionStorage.getItem('guildtide_elapsed_seconds');
      if (offlineGains && elapsedSeconds) {
        const gains = JSON.parse(offlineGains);
        const elapsed = parseInt(elapsedSeconds);
        if (elapsed > 60) {
          OfflineGainsModal.show(this, gains, elapsed / 60);
        }
        sessionStorage.removeItem('guildtide_offline_gains');
        sessionStorage.removeItem('guildtide_elapsed_seconds');
      }

      this.buildUI();

      // Fetch rates and set them
      const rates = await apiClient.getRates();
      this.resourceBar?.setRates(rates);

      // Periodic server sync every 30 seconds
      this.syncTimer = this.time.addEvent({
        delay: 30000,
        callback: () => this.syncWithServer(),
        loop: true,
      });
    } catch (err) {
      loadingText.setText('Failed to load guild data');
      if (err instanceof Error && err.message.includes('401')) {
        localStorage.removeItem('guildtide_token');
        this.scene.start('LoginScene');
      }
    }
  }

  update(_time: number, delta: number): void {
    this.resourceBar?.update(delta);
  }

  private buildUI(): void {
    if (!this.guild) return;

    // Header bar
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.panelBg, 0.9);
    headerBg.fillRect(0, 0, GAME_WIDTH, 55);
    headerBg.lineStyle(2, COLORS.panelBorder);
    headerBg.strokeRect(0, 0, GAME_WIDTH, 55);

    // Guild name & level
    this.add.text(20, 10, this.guild.name, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });

    this.add.text(20, 36, `Level ${this.guild.level}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });

    // Logout button
    const logoutText = this.add.text(GAME_WIDTH - 20, 20, 'Logout', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    logoutText.on('pointerup', () => {
      localStorage.removeItem('guildtide_token');
      this.scene.start('LoginScene');
    });

    // Resource bar
    this.resourceBar = new ResourceBar(this, 55, this.guild.resources);

    // Building panel
    this.buildingPanel = new BuildingPanel(
      this,
      115,
      this.guild.buildings,
      (building) => this.handleUpgrade(building.type),
    );

    // Bottom nav
    this.buildBottomNav();
  }

  private async handleUpgrade(buildingType: string): Promise<void> {
    try {
      const result = await apiClient.upgradeBuilding(buildingType);
      // Update local state
      this.resourceBar?.setResources(result.resources as Resources);

      // Refresh guild data
      const guildData = await apiClient.getGuild();
      this.guild = guildData;
      this.buildingPanel?.setBuildings(guildData.buildings);

      // Refresh rates
      const rates = await apiClient.getRates();
      this.resourceBar?.setRates(rates);
    } catch (err) {
      // Show error briefly
      const errorText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80,
        err instanceof Error ? err.message : 'Upgrade failed', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#ff4444',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: { x: 12, y: 6 },
      }).setOrigin(0.5);

      this.time.delayedCall(3000, () => errorText.destroy());
    }
  }

  private async syncWithServer(): Promise<void> {
    try {
      const result = await apiClient.collect();
      this.resourceBar?.setResources(result.resources as Resources);
      this.resourceBar?.setRates(result.rates);
    } catch {
      // Silently fail sync — will retry next cycle
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

      text.on('pointerover', () => text.setColor(COLORS.textGold));
      text.on('pointerout', () => {
        if (i !== 0) text.setColor(COLORS.textSecondary);
      });
    });
  }
}
