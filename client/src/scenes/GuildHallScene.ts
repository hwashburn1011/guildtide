import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import type { Guild, Resources } from '@shared/types';
import { ResourceType, BuildingType } from '@shared/enums';
import { BUILDING_DEFINITIONS, BUILDING_LEVEL_BONUS } from '@shared/constants';
import { ResourceBar } from '../ui/ResourceBar';
import { BuildingPanel } from '../ui/BuildingPanel';
import { OfflineGainsModal } from '../ui/OfflineGainsModal';
import { HeroRoster } from '../ui/HeroRoster';
import { WeatherPanel } from '../ui/WeatherPanel';
import { EventPanel } from '../ui/EventPanel';
import { InventoryPanel } from '../ui/InventoryPanel';
import { EventLogPanel } from '../ui/EventLogPanel';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { NotificationSystem } from '../systems/NotificationSystem';
import { GuildInfoPanel } from '../ui/GuildInfoPanel';
import { GuildStatsPanel } from '../ui/GuildStatsPanel';
import { GuildActivityPanel } from '../ui/GuildActivityPanel';
import { BuildingDetailPanel } from '../ui/BuildingDetailPanel';
import { BuildMenuPanel } from '../ui/BuildMenuPanel';
import { BuildingSynergyPanel } from '../ui/BuildingSynergyPanel';
import { UIResourceDelta } from '../ui/components/UIResourceDelta';

export class GuildHallScene extends Phaser.Scene {
  private guild: Guild | null = null;
  private resourceBar: ResourceBar | null = null;
  private buildingPanel: BuildingPanel | null = null;
  private heroRoster: HeroRoster | null = null;
  private weatherPanel: WeatherPanel | null = null;
  private eventPanel: EventPanel | null = null;
  private inventoryPanel: InventoryPanel | null = null;
  private eventLogPanel: EventLogPanel | null = null;
  private guildInfoPanel: GuildInfoPanel | null = null;
  private guildStatsPanel: GuildStatsPanel | null = null;
  private guildActivityPanel: GuildActivityPanel | null = null;
  private buildingDetailPanel: BuildingDetailPanel | null = null;
  private buildMenuPanel: BuildMenuPanel | null = null;
  private buildingSynergyPanel: BuildingSynergyPanel | null = null;
  private activeEvents: any[] = [];
  private syncTimer: Phaser.Time.TimerEvent | null = null;
  private seasonalContainer: Phaser.GameObjects.Container | null = null;
  private productionTickTimer: Phaser.Time.TimerEvent | null = null;

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
        this.weatherPanel?.setWeatherData(worldState.weather, worldState.modifiers, worldState.season, worldState.festival);

        const events = await apiClient.getEvents();
        this.activeEvents = events;
        if (events.length > 0) {
          this.showEventNotification(events.length);
        }
      } catch {
        // Weather/events may not be available yet
      }

      // Fetch seasonal decoration
      this.loadSeasonalDecoration();

      // Periodic server sync every 30 seconds
      this.syncTimer = this.time.addEvent({
        delay: 30000,
        callback: () => this.syncWithServer(),
        loop: true,
      });

      // Production tick display every 5 seconds
      this.productionTickTimer = this.time.addEvent({
        delay: 5000,
        callback: () => this.showProductionTicks(),
        loop: true,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        localStorage.removeItem('guildtide_token');
        this.scene.start('LoginScene');
        return;
      }
      loadingText.setText('Failed to load guild data. Click to retry.');
      loadingText.setInteractive({ useHandCursor: true });
      loadingText.on('pointerup', () => {
        this.scene.restart();
      });
      }
    }
  }

  update(time: number, delta: number): void {
    this.resourceBar?.update(delta);
  }

  private buildUI(): void {
    if (!this.guild) return;

    // Header bar with navigation buttons
    this.buildHeader();

    // Resource bar
    this.resourceBar = new ResourceBar(this, 55, this.guild.resources);

    // Guild info panel (name, level, XP bar, emblem, daily reward)
    this.guildInfoPanel = new GuildInfoPanel(this, 85, this.guild, () => this.refreshGuild());

    // Building panel using grid layout
    this.buildingPanel = new BuildingPanel(
      this,
      155,
      this.guild.buildings,
      (building) => this.handleUpgrade(building.type),
      (building) => this.buildingDetailPanel?.show(building.type),
    );

    // Weather panel (right side)
    this.weatherPanel = new WeatherPanel(this, GAME_WIDTH - 240, 155);

    // Event panel (shown on demand)
    this.eventPanel = new EventPanel(this, () => this.refreshGuild());

    // Hero roster (hidden until opened)
    this.heroRoster = new HeroRoster(
      this,
      this.guild.heroes,
      this.guild.buildings,
      () => this.refreshGuild(),
    );

    // Inventory panel (hidden until opened)
    this.inventoryPanel = new InventoryPanel(
      this,
      this.guild.heroes,
      () => this.refreshGuild(),
    );

    // Event log panel
    this.eventLogPanel = new EventLogPanel(this);

    // Modal panels (lazy-created)
    this.guildStatsPanel = new GuildStatsPanel(this);
    this.guildActivityPanel = new GuildActivityPanel(this);
    this.buildingDetailPanel = new BuildingDetailPanel(this, () => this.refreshGuild());
    this.buildMenuPanel = new BuildMenuPanel(this, this.guild, () => this.refreshGuild());
    this.buildingSynergyPanel = new BuildingSynergyPanel(this);

    // Seasonal decoration container
    this.seasonalContainer = this.add.container(0, 0);

    // Bottom nav
    this.buildBottomNav();

    // Tutorial overlay for new players
    if (TutorialOverlay.shouldShow(this.guild.level, this.guild.buildings?.length ?? 0)) {
      new TutorialOverlay(this);
    }
  }

  private buildHeader(): void {
    if (!this.guild) return;

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

    // Header buttons (right side)
    const buttonDefs = [
      { label: 'Build', x: GAME_WIDTH - 480, action: () => this.buildMenuPanel?.show() },
      { label: 'Synergies', x: GAME_WIDTH - 410, action: () => this.buildingSynergyPanel?.show() },
      { label: 'Activity', x: GAME_WIDTH - 330, action: () => this.guildActivityPanel?.show() },
      { label: 'Stats', x: GAME_WIDTH - 260, action: () => this.guildStatsPanel?.show() },
      { label: 'Event Log', x: GAME_WIDTH - 200, action: () => this.eventLogPanel?.show() },
      { label: 'Inventory', x: GAME_WIDTH - 120, action: () => this.inventoryPanel?.show() },
    ];

    buttonDefs.forEach(({ label, x, action }) => {
      const btn = this.add.text(x, 8, label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textAccent,
        fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setAlpha(0.7));
      btn.on('pointerout', () => btn.setAlpha(1));
      btn.on('pointerup', action);
    });

    // Heroes button
    const heroesBtn = this.add.text(GAME_WIDTH - 55, 8, 'Heroes', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textAccent,
      fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    heroesBtn.on('pointerup', () => this.heroRoster?.show());

    // Settings (second row)
    const settingsBtn = this.add.text(GAME_WIDTH - 120, 32, 'Settings', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    }).setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerup', () => this.scene.start('AccountSettingsScene'));

    // Logout
    const logoutText = this.add.text(GAME_WIDTH - 55, 32, 'Logout', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    }).setInteractive({ useHandCursor: true });
    logoutText.on('pointerup', () => {
      localStorage.removeItem('guildtide_token');
      localStorage.removeItem('guildtide_remember');
      localStorage.removeItem('guildtide_is_guest');
      this.scene.start('LoginScene');
    });
  }

  private async handleUpgrade(buildingType: string): Promise<void> {
    try {
      const result = await apiClient.upgradeBuilding(buildingType);
      this.resourceBar?.setResources(result.resources as Resources);
      NotificationSystem.show(this, `${result.building.type} upgraded to level ${result.building.level}!`, 'success');
      await this.refreshGuild();
    } catch (err) {
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
      `${count} Event${count > 1 ? 's' : ''} Active -- Click to view`, {
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

    this.tweens.add({
      targets: eventBtn,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  private showProductionTicks(): void {
    if (!this.guild || !this.guild.buildings) return;

    const buildings = this.guild.buildings.filter(b => b.level > 0);
    if (buildings.length === 0) return;

    // Pick a random building to show a tick for
    const idx = Math.floor(Math.random() * buildings.length);
    const building = buildings[idx];
    const def = BUILDING_DEFINITIONS[building.type as BuildingType];
    if (!def) return;

    const entries = Object.entries(def.baseOutput);
    if (entries.length === 0) return;

    const [, base] = entries[0];
    const rate = (base as number) * (1 + building.level * BUILDING_LEVEL_BONUS);
    const tickAmount = Math.round(rate * 5 * 100) / 100; // 5 seconds of production

    // Position relative to building panel
    const col = building.slot % 3;
    const row = Math.floor(building.slot / 3);
    const startX = (GAME_WIDTH - (3 * 380 + 2 * 20)) / 2;
    const x = startX + col * 400 + 190;
    const y = 155 + row * 145 + 50;

    UIResourceDelta.show(this, x, y, tickAmount);
  }

  private async loadSeasonalDecoration(): Promise<void> {
    try {
      const seasonal = await apiClient.getSeasonalDecoration();
      this.renderSeasonalDecoration(seasonal.season, seasonal.description);
    } catch {
      // Silently fail
    }
  }

  private renderSeasonalDecoration(season: string, description: string): void {
    if (!this.seasonalContainer) return;

    // Small seasonal indicator in corner
    const colors: Record<string, number> = {
      spring: 0x4ecca3,
      summer: 0xffd700,
      autumn: 0xe67e22,
      winter: 0x3498db,
    };

    const icons: Record<string, string> = {
      spring: '\u2741', // flower
      summer: '\u2600', // sun
      autumn: '\u2741', // leaf stand-in
      winter: '\u2744', // snowflake
    };

    const color = colors[season] ?? 0xffffff;
    const icon = icons[season] ?? '';

    const bg = this.add.graphics();
    bg.fillStyle(color, 0.15);
    bg.fillRoundedRect(GAME_WIDTH - 240, GAME_HEIGHT - 60, 230, 18, 4);
    this.seasonalContainer.add(bg);

    this.seasonalContainer.add(
      this.add.text(GAME_WIDTH - 235, GAME_HEIGHT - 59, `${icon} ${description}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: 220 },
      }),
    );
  }

  private async refreshGuild(): Promise<void> {
    try {
      const guildData = await apiClient.getGuild();
      this.guild = guildData;
      this.resourceBar?.setResources(guildData.resources);
      this.buildingPanel?.setBuildings(guildData.buildings);
      this.heroRoster?.setHeroes(guildData.heroes);
      this.heroRoster?.setBuildings(guildData.buildings);
      this.inventoryPanel?.setHeroes(guildData.heroes);
      this.guildInfoPanel?.setGuild(guildData);
      this.buildMenuPanel?.setGuild(guildData);
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
      // Silently fail sync
    }
  }

  private buildBottomNav(): void {
    const navY = GAME_HEIGHT - 50;
    const navBg = this.add.graphics();
    navBg.fillStyle(COLORS.panelBg, 0.9);
    navBg.fillRect(0, navY, GAME_WIDTH, 50);
    navBg.lineStyle(2, COLORS.panelBorder);
    navBg.strokeRect(0, navY, GAME_WIDTH, 50);

    const tabs = [
      { label: 'Guild Hall', scene: 'GuildHallScene' },
      { label: 'Expeditions', scene: 'ExpeditionScene' },
      { label: 'Market', scene: 'MarketScene' },
      { label: 'World Map', scene: 'WorldMapScene' },
      { label: 'Research', scene: 'ResearchScene' },
      { label: 'Social', scene: 'SocialScene' },
    ];
    const tabWidth = GAME_WIDTH / tabs.length;

    tabs.forEach((tab, i) => {
      const x = tabWidth * i + tabWidth / 2;
      const isActive = i === 0;
      const text = this.add.text(x, navY + 25, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: isActive ? COLORS.textGold : COLORS.textSecondary,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      text.on('pointerover', () => text.setColor(COLORS.textGold));
      text.on('pointerout', () => {
        if (!isActive) text.setColor(COLORS.textSecondary);
      });

      if (!isActive) {
        text.on('pointerup', () => {
          this.scene.start(tab.scene);
        });
      }
    });
  }
}
