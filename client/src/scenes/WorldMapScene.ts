/**
 * WorldMapScene — Rebuilt with interactive map, region details, travel, comparison.
 *
 * T-1071–T-1140: World map and region system.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import { InteractiveWorldMap } from '../ui/InteractiveWorldMap';
import { RegionDetailPanel } from '../ui/RegionDetailPanel';
import { RegionComparisonPanel } from '../ui/RegionComparisonPanel';
import { TravelPanel } from '../ui/TravelPanel';

const WEATHER_EMOTES: Record<string, string> = {
  clear: '\u2600',
  rainy: '\uD83C\uDF27',
  stormy: '\u26C8',
  snowy: '\u2744',
  hot: '\uD83D\uDD25',
  foggy: '\uD83C\uDF2B',
  windy: '\uD83D\uDCA8',
};

const SEASON_ICONS: Record<string, string> = {
  spring: '\uD83C\uDF31',
  summer: '\u2600',
  autumn: '\uD83C\uDF42',
  winter: '\u2744',
};

export class WorldMapScene extends Phaser.Scene {
  private worldMap: InteractiveWorldMap | null = null;
  private detailPanel: RegionDetailPanel | null = null;
  private comparisonPanel: RegionComparisonPanel | null = null;
  private travelPanel: TravelPanel | null = null;
  private currentSeason: string = '';
  private currentRegionId: string = '';
  private selectedRegions: string[] = [];

  constructor() {
    super({ key: 'WorldMapScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor(COLORS.background);

    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading world map...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);

    try {
      const [mapData, worldState] = await Promise.all([
        apiClient.getMapOverview(),
        apiClient.getWorldState(),
      ]);

      this.currentSeason = worldState.season;
      this.currentRegionId = worldState.regionId;

      loadingText.destroy();
      this.buildUI(mapData, worldState);
    } catch (err) {
      loadingText.setText('Failed to load world map');
      if (err instanceof Error && err.message.includes('401')) {
        localStorage.removeItem('guildtide_token');
        this.scene.start('LoginScene');
      }
    }
  }

  private buildUI(mapData: Awaited<ReturnType<typeof apiClient.getMapOverview>>, worldState: Awaited<ReturnType<typeof apiClient.getWorldState>>): void {
    // ── Header ──
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.panelBg, 0.9);
    headerBg.fillRect(0, 0, GAME_WIDTH, 50);
    headerBg.lineStyle(2, COLORS.panelBorder);
    headerBg.strokeRect(0, 0, GAME_WIDTH, 50);

    this.add.text(16, 8, 'World Map', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });

    // Season & weather
    const seasonIcon = SEASON_ICONS[this.currentSeason] || '';
    const weatherEmote = WEATHER_EMOTES[worldState.weather.condition] || '\u2600';
    this.add.text(16, 32, `${seasonIcon} ${this.currentSeason.charAt(0).toUpperCase() + this.currentSeason.slice(1)} | ${weatherEmote} ${Math.round(worldState.weather.temperature)}\u00B0C`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });

    // Date
    this.add.text(GAME_WIDTH - 16, 14, `Date: ${worldState.date}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0);

    // Header buttons
    this.buildHeaderButtons();

    // ── Interactive Map ──
    const mapY = 52;
    const mapH = GAME_HEIGHT - 52 - 50;
    this.worldMap = new InteractiveWorldMap(this, 0, mapY, GAME_WIDTH, mapH);
    this.worldMap.render(mapData.regions, this.currentSeason);

    // Apply day/night overlay
    this.worldMap.applyDayNightOverlay(mapData.dayNight.overlayOpacity);

    // Click handler
    this.worldMap.setOnRegionClick((regionId) => {
      this.onRegionClick(regionId);
    });

    // Load travel status and caravan routes in parallel
    this.loadTravelAndCaravans();
    this.loadPins();

    // ── Side Panels ──
    this.detailPanel = new RegionDetailPanel(this);
    this.detailPanel.setOnAction((action, regionId) => {
      this.handleRegionAction(action, regionId);
    });

    this.comparisonPanel = new RegionComparisonPanel(this);

    this.travelPanel = new TravelPanel(this);
    this.travelPanel.setOnTravel((toRegionId) => {
      this.startTravel(toRegionId);
    });

    // ── Bottom Nav ──
    this.buildBottomNav();
  }

  private buildHeaderButtons(): void {
    const btnStyle = {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
      backgroundColor: '#0f3460',
      padding: { x: 8, y: 4 },
    };

    // T-1105: Search button
    const searchBtn = this.add.text(GAME_WIDTH - 280, 30, '\u{1F50D} Search', btnStyle)
      .setInteractive({ useHandCursor: true });
    searchBtn.on('pointerup', () => this.showSearch());

    // T-1107: Compare button
    const compareBtn = this.add.text(GAME_WIDTH - 210, 30, '\u{2696} Compare', btnStyle)
      .setInteractive({ useHandCursor: true });
    compareBtn.on('pointerup', () => this.showComparison());

    // T-1098: Achievements button
    const achieveBtn = this.add.text(GAME_WIDTH - 135, 30, '\u{1F3C6} Achievements', btnStyle)
      .setInteractive({ useHandCursor: true });
    achieveBtn.on('pointerup', () => this.showAchievements());
  }

  private async onRegionClick(regionId: string): Promise<void> {
    try {
      const detail = await apiClient.getRegionDetail(regionId);
      if (detail.discovered === false) {
        // Try to discover
        const result = await apiClient.discoverRegion(regionId);
        if (result.success) {
          this.worldMap?.playDiscoveryAnimation(regionId);
          // Refresh map
          const mapData = await apiClient.getMapOverview();
          this.worldMap?.render(mapData.regions, this.currentSeason);
          // Re-fetch detail
          const newDetail = await apiClient.getRegionDetail(regionId);
          this.detailPanel?.show(newDetail as any);
        }
        return;
      }

      this.detailPanel?.show(detail as any);
      this.worldMap?.zoomToRegion(regionId);
    } catch (err) {
      console.error('Region click error:', err);
    }
  }

  private async handleRegionAction(action: string, regionId: string): Promise<void> {
    try {
      switch (action) {
        case 'travel':
          await this.showTravelOptions(regionId);
          break;
        case 'explore': {
          const result = await apiClient.exploreRegion(regionId, 10);
          // Refresh detail
          const detail = await apiClient.getRegionDetail(regionId);
          this.detailPanel?.show(detail as any);
          break;
        }
        case 'claim': {
          const claimResult = await apiClient.claimRegion(regionId);
          if (claimResult.success) {
            const detail = await apiClient.getRegionDetail(regionId);
            this.detailPanel?.show(detail as any);
            const mapData = await apiClient.getMapOverview();
            this.worldMap?.render(mapData.regions, this.currentSeason);
          }
          break;
        }
        case 'buildOutpost': {
          const outResult = await apiClient.buildOutpost(regionId, 'resource_camp');
          if (outResult.success) {
            const detail = await apiClient.getRegionDetail(regionId);
            this.detailPanel?.show(detail as any);
          }
          break;
        }
      }
    } catch (err) {
      console.error('Region action error:', err);
    }
  }

  private async showTravelOptions(toRegionId: string): Promise<void> {
    try {
      // Get distance info and map overview for connected regions
      const mapData = await apiClient.getMapOverview();
      const detail = await apiClient.getRegionDetail(toRegionId) as any;

      if (!detail.connections) return;

      const options = [];
      // Show travel TO this region from current
      const dist = await apiClient.getRegionDistance(this.currentRegionId, toRegionId);
      options.push({
        regionId: toRegionId,
        regionName: detail.name || toRegionId,
        distance: dist.distance,
        travelDays: dist.travelDays,
        hasOutpost: detail.hasOutpost || false,
        embargoActive: detail.embargoActive || false,
      });

      this.travelPanel?.showPlanTravel(
        this.currentRegionId.replace(/[-_]/g, ' '),
        options,
      );
    } catch (err) {
      console.error('Travel options error:', err);
    }
  }

  private async startTravel(toRegionId: string): Promise<void> {
    try {
      const result = await apiClient.startRegionTravel(this.currentRegionId, toRegionId);
      if (result.success) {
        this.loadTravelAndCaravans();
      }
    } catch (err) {
      console.error('Start travel error:', err);
    }
  }

  private async loadTravelAndCaravans(): Promise<void> {
    try {
      const [travelStatus, caravans] = await Promise.all([
        apiClient.getTravelStatus(),
        apiClient.getCaravanRoutes(),
      ]);

      if (travelStatus.travel && !('arrived' in travelStatus.travel && travelStatus.travel.arrived)) {
        this.worldMap?.drawTravelRoute(travelStatus.travel as any);
        this.travelPanel?.showActiveTravel(travelStatus.travel as any);
      }

      if (caravans.routes.length > 0) {
        this.worldMap?.drawCaravanRoutes(caravans.routes as any);
      }
    } catch {
      // Non-critical failure
    }
  }

  private async loadPins(): Promise<void> {
    try {
      const pinData = await apiClient.getMapPins();
      this.worldMap?.drawPins(pinData.pins);
    } catch {
      // Non-critical failure
    }
  }

  private async showSearch(): Promise<void> {
    // Simple search prompt using DOM
    const query = prompt('Search regions by name, biome, or climate:');
    if (!query) return;

    try {
      const results = await apiClient.searchRegions(query);
      if (results.results.length > 0) {
        const first = results.results[0] as any;
        this.onRegionClick(first.id);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }

  private async showComparison(): Promise<void> {
    try {
      // Compare first 4 discovered regions
      const mapData = await apiClient.getMapOverview();
      const discovered = mapData.regions.filter(r => r.discovered).slice(0, 4);
      if (discovered.length < 2) return;

      const ids = discovered.map(r => r.id);
      const result = await apiClient.compareRegions(ids);
      this.comparisonPanel?.show(result.comparison as any);
    } catch (err) {
      console.error('Comparison error:', err);
    }
  }

  private async showAchievements(): Promise<void> {
    try {
      const data = await apiClient.getRegionAchievements();
      const achievements = (data as any).achievements || [];

      // Simple modal
      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.6);
      bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      bg.setDepth(120);

      const panel = this.add.graphics();
      const pw = 400;
      const ph = 300;
      const px = (GAME_WIDTH - pw) / 2;
      const py = (GAME_HEIGHT - ph) / 2;
      panel.fillStyle(COLORS.panelBg, 0.98);
      panel.fillRoundedRect(px, py, pw, ph, 10);
      panel.lineStyle(2, COLORS.panelBorder);
      panel.strokeRoundedRect(px, py, pw, ph, 10);
      panel.setDepth(121);

      const title = this.add.text(GAME_WIDTH / 2, py + 16, '\u{1F3C6} Region Achievements', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }).setOrigin(0.5, 0).setDepth(122);

      let ay = py + 50;
      const texts: Phaser.GameObjects.Text[] = [title];
      for (const ach of achievements) {
        const icon = ach.earned ? '\u{2705}' : '\u{2B1C}';
        const t = this.add.text(px + 20, ay, `${icon} ${ach.name} — ${ach.description}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: ach.earned ? '#4ecca3' : COLORS.textSecondary,
        }).setDepth(122);
        texts.push(t);
        ay += 22;
      }

      // Stats
      const stats = `Discovered: ${(data as any).regionsDiscovered}/${(data as any).totalRegions} | Explored: ${(data as any).fullyExplored} | Landmarks: ${(data as any).landmarksFound}/${(data as any).totalLandmarks}`;
      const statText = this.add.text(GAME_WIDTH / 2, py + ph - 30, stats, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      }).setOrigin(0.5).setDepth(122);
      texts.push(statText);

      // Close on click
      const closeZone = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)
        .setInteractive().setDepth(119);
      closeZone.on('pointerup', () => {
        bg.destroy();
        panel.destroy();
        texts.forEach(t => t.destroy());
        closeZone.destroy();
      });
    } catch (err) {
      console.error('Achievements error:', err);
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
    ];
    const tabWidth = GAME_WIDTH / tabs.length;

    tabs.forEach((tab, i) => {
      const x = tabWidth * i + tabWidth / 2;
      const isActive = i === 3;
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
        text.on('pointerup', () => this.scene.start(tab.scene));
      }
    });
  }

  shutdown(): void {
    this.worldMap?.destroy();
    this.detailPanel?.destroy();
    this.comparisonPanel?.destroy();
    this.travelPanel?.destroy();
  }
}
