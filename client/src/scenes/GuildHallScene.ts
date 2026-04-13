import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import type { Guild, Resources } from '@shared/types';
import { ResourceType } from '@shared/enums';
import { ResourceBar } from '../ui/ResourceBar';
import { BuildingPanel } from '../ui/BuildingPanel';
import { OfflineGainsModal } from '../ui/OfflineGainsModal';
import { HeroRoster } from '../ui/HeroRoster';
import { WeatherPanel } from '../ui/WeatherPanel';
import { EventPanel } from '../ui/EventPanel';

export class GuildHallScene extends Phaser.Scene {
  private guild: Guild | null = null;
  private resourceBar: ResourceBar | null = null;
  private buildingPanel: BuildingPanel | null = null;
  private heroRoster: HeroRoster | null = null;
  private weatherPanel: WeatherPanel | null = null;
  private eventPanel: EventPanel | null = null;
  private activeEvents: any[] = [];
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

      // Fetch and display weather + events
      try {
        const worldState = await apiClient.getWorldState();
        this.weatherPanel?.setWeatherData(worldState.weather, worldState.modifiers);

        const events = await apiClient.getEvents();
        this.activeEvents = events;
        if (events.length > 0) {
          this.showEventNotification(events.length);
        }
      } catch {
        // Weather/events may not be available yet
      }

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

    // Heroes button
    const heroesBtn = this.add.text(GAME_WIDTH - 160, 20, 'Heroes', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    heroesBtn.on('pointerup', () => {
      this.heroRoster?.show();
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

    // Weather panel (right side)
    this.weatherPanel = new WeatherPanel(this, GAME_WIDTH - 240, 115);

    // Event panel (shown on demand)
    this.eventPanel = new EventPanel(this, () => this.refreshGuild());

    // Hero roster (hidden until opened)
    this.heroRoster = new HeroRoster(
      this,
      this.guild.heroes,
      this.guild.buildings,
      () => this.refreshGuild(),
    );

    // Bottom nav
    this.buildBottomNav();
  }

  private async handleUpgrade(buildingType: string): Promise<void> {
    try {
      const result = await apiClient.upgradeBuilding(buildingType);
      this.resourceBar?.setResources(result.resources as Resources);
      await this.refreshGuild();
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

  private showEventNotification(count: number): void {
    const eventBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 70,
      `${count} Event${count > 1 ? 's' : ''} Active — Click to view`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      backgroundColor: '#e94560',
      padding: { x: 20, y: 8 },
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    eventBtn.on('pointerup', () => {
      if (this.activeEvents.length > 0) {
        this.eventPanel?.show(this.activeEvents[0]);
      }
    });

    // Pulse animation
    this.tweens.add({
      targets: eventBtn,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  private async refreshGuild(): Promise<void> {
    try {
      const guildData = await apiClient.getGuild();
      this.guild = guildData;
      this.resourceBar?.setResources(guildData.resources);
      this.buildingPanel?.setBuildings(guildData.buildings);
      this.heroRoster?.setHeroes(guildData.heroes);
      this.heroRoster?.setBuildings(guildData.buildings);
      const rates = await apiClient.getRates();
      this.resourceBar?.setRates(rates);
    } catch {
      // Silently fail
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

      if (i === 1) {
        text.on('pointerup', () => {
          this.scene.start('ExpeditionScene');
        });
      }
      if (i === 2) {
        text.on('pointerup', () => {
          this.scene.start('MarketScene');
        });
      }
      if (i === 4) {
        text.on('pointerup', () => {
          this.scene.start('ResearchScene');
        });
      }
    });
  }
}
