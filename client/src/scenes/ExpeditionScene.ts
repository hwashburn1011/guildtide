/**
 * Expedition Scene — full expedition planning, launch, and management.
 *
 * T-0473: Party formation UI with hero slot selection
 * T-0476: Destination selector with region list and difficulty
 * T-0477: Destination info panel with environment, enemies, reward preview
 * T-0478: Duration calculator based on distance and party speed
 * T-0479: Launch confirmation with cost and time summary
 * T-0480: Launch animation showing party departing
 * T-0481: Progress tracker showing elapsed/remaining time
 * T-0482: Progress bar on main UI header
 * T-0503: Route progress animation
 * T-0507: Return event with reward distribution
 * T-0508: Return celebration animation
 * T-0512: Retreat option before boss
 * T-0515: Difficulty rating (1-5 stars)
 * T-0517: Recommendation engine
 * T-0518: Scout speed boost
 * T-0519: Scouting pre-check
 * T-0520: Hero quick-filter by available/rested
 * T-0521: Party template save/load
 * T-0522: Expedition chain system
 * T-0528: Completion notification
 * T-0529: Auto-repeat toggle
 * T-0530: Leaderboard
 * T-0531: Companion NPC hire
 * T-0540: Quick-launch from destination list
 * T-0543: Weather forecast display
 * T-0544: Danger zone warnings
 * T-0546: Observatory reward multiplier
 * T-0547: Tutorial for first-time launch
 * T-0549: Timed challenge mode
 * T-0550: Fleet system
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import { ExpeditionLogPanel } from '../ui/ExpeditionLogPanel';
import { ExpeditionRouteMap } from '../ui/ExpeditionRouteMap';
import { ExpeditionEncounterPanel } from '../ui/ExpeditionEncounterPanel';
import { NotificationSystem } from '../systems/NotificationSystem';
import type { Expedition, Hero } from '@shared/types';

interface Destination {
  id: string;
  name: string;
  description: string;
  type: string;
  difficulty: number;
  durationMinutes: number;
  lootTable: { resource: string; min: number; max: number; chance: number }[];
  requiredPartySize: number;
  difficultyRating?: number;
}

type TabMode = 'destinations' | 'active' | 'bosses' | 'diary' | 'stats';
type HeroFilter = 'all' | 'idle' | 'assigned';

export class ExpeditionScene extends Phaser.Scene {
  private destinations: Destination[] = [];
  private expeditions: Expedition[] = [];
  private heroes: Hero[] = [];
  private selectedHeroIds: Set<string> = new Set();
  private selectedDestination: Destination | null = null;
  private tabMode: TabMode = 'destinations';
  private heroFilter: HeroFilter = 'all';
  private contentContainer: Phaser.GameObjects.Container | null = null;
  private refreshTimer: Phaser.Time.TimerEvent | null = null;
  private logPanel: ExpeditionLogPanel | null = null;
  private routeMap: ExpeditionRouteMap | null = null;
  private encounterPanel: ExpeditionEncounterPanel | null = null;
  private bosses: any[] = [];
  private weatherForecast: any = null;
  private fogOfWar: Record<string, boolean> = {};
  private isTimedChallenge: boolean = false;
  private hasShownTutorial: boolean = false;

  constructor() {
    super({ key: 'ExpeditionScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.selectedHeroIds.clear();
    this.selectedDestination = null;
    this.tabMode = 'destinations';
    this.heroFilter = 'all';
    this.isTimedChallenge = false;

    // Header
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.panelBg, 0.9);
    headerBg.fillRect(0, 0, GAME_WIDTH, 55);
    headerBg.lineStyle(2, COLORS.panelBorder);
    headerBg.strokeRect(0, 0, GAME_WIDTH, 55);

    this.add.text(20, 15, 'Expeditions', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });

    const backBtn = this.add.text(GAME_WIDTH - 20, 15, 'Back to Guild', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    backBtn.on('pointerup', () => {
      this.cleanup();
      this.scene.start('GuildHallScene');
    });

    // Tab buttons
    this.buildTabs();

    // Bottom nav
    this.buildBottomNav();

    // Content container
    this.contentContainer = this.add.container(0, 0);

    // Initialize panels
    this.logPanel = new ExpeditionLogPanel(this);
    this.encounterPanel = new ExpeditionEncounterPanel(this);

    // Load data
    await this.loadData();
    this.renderContent();

    // T-0547: Show tutorial on first visit
    if (!this.hasShownTutorial) {
      this.hasShownTutorial = true;
      // Show tutorial if no expeditions ever launched
      if (this.expeditions.length === 0) {
        this.encounterPanel?.showTutorial();
      }
    }

    // Periodic refresh for countdown timers
    this.refreshTimer = this.time.addEvent({
      delay: 5000,
      callback: () => this.renderContent(),
      loop: true,
    });
  }

  private buildTabs(): void {
    const tabY = 60;
    const tabBg = this.add.graphics();
    tabBg.fillStyle(COLORS.panelBg, 0.7);
    tabBg.fillRect(0, tabY, GAME_WIDTH, 35);

    const tabs: { label: string; mode: TabMode }[] = [
      { label: 'Destinations', mode: 'destinations' },
      { label: 'Active', mode: 'active' },
      { label: 'Bosses', mode: 'bosses' },
      { label: 'Diary', mode: 'diary' },
      { label: 'Stats', mode: 'stats' },
    ];

    const tabWidth = GAME_WIDTH / tabs.length;
    const tabTexts: Phaser.GameObjects.Text[] = [];

    tabs.forEach((tab, i) => {
      const x = tabWidth * i + tabWidth / 2;
      const text = this.add.text(x, tabY + 17, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: this.tabMode === tab.mode ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: 'bold',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      text.on('pointerup', () => {
        this.tabMode = tab.mode;
        tabTexts.forEach((t, j) => {
          t.setColor(j === i ? COLORS.textGold : COLORS.textSecondary);
        });
        this.renderContent();
      });

      tabTexts.push(text);
    });
  }

  private async loadData(): Promise<void> {
    try {
      const [destinations, expeditions, heroes, bosses, forecast, fog] = await Promise.all([
        apiClient.getDestinations(),
        apiClient.getExpeditions(),
        apiClient.getHeroes(),
        apiClient.getExpeditionBosses().catch(() => []),
        apiClient.getExpeditionWeatherForecast().catch(() => null),
        apiClient.getExpeditionFogOfWar().catch(() => ({})),
      ]);
      this.destinations = destinations;
      this.expeditions = expeditions;
      this.heroes = heroes;
      this.bosses = bosses;
      this.weatherForecast = forecast;
      this.fogOfWar = fog;
    } catch (err) {
      console.error('Failed to load expedition data:', err);
    }
  }

  private renderContent(): void {
    if (!this.contentContainer) return;
    this.contentContainer.removeAll(true);

    // Destroy previous route map
    if (this.routeMap) {
      this.routeMap.destroy();
      this.routeMap = null;
    }

    switch (this.tabMode) {
      case 'destinations':
        this.renderDestinations();
        break;
      case 'active':
        this.renderActiveExpeditions();
        break;
      case 'bosses':
        this.renderBossExpeditions();
        break;
      case 'diary':
        this.renderDiaryTab();
        break;
      case 'stats':
        this.renderStatsTab();
        break;
    }
  }

  private renderDestinations(): void {
    if (!this.contentContainer) return;

    const startY = 100;
    const cardWidth = 380;
    const cardHeight = 140;
    const padding = 10;

    // T-0543: Weather forecast banner
    if (this.weatherForecast && this.weatherForecast.condition !== 'unknown') {
      const weatherColor = this.weatherForecast.modifier >= 0 ? '#4ecca3' : '#f5a623';
      this.contentContainer.add(
        this.add.text(15, startY - 5, `Weather: ${this.weatherForecast.condition} | ${this.weatherForecast.impact}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: weatherColor,
          fontStyle: 'italic',
        }),
      );
    }

    // Left side: destination list
    const leftTitle = this.add.text(15, startY + 15, 'Choose a Destination:', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.contentContainer.add(leftTitle);

    this.destinations.forEach((dest, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 15 + col * (cardWidth + padding);
      const y = startY + 40 + row * (cardHeight + padding);

      if (y + cardHeight > GAME_HEIGHT - 100) return;

      const isSelected = this.selectedDestination?.id === dest.id;
      const isExplored = this.fogOfWar[dest.id] ?? false;

      const g = this.add.graphics();
      g.fillStyle(isSelected ? 0x0f3460 : COLORS.panelBg, 0.9);
      g.fillRoundedRect(x, y, cardWidth, cardHeight, 6);
      g.lineStyle(2, isSelected ? COLORS.gold : COLORS.panelBorder);
      g.strokeRoundedRect(x, y, cardWidth, cardHeight, 6);
      this.contentContainer!.add(g);

      // Name & type
      this.contentContainer!.add(
        this.add.text(x + 10, y + 8, dest.name, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }),
      );

      this.contentContainer!.add(
        this.add.text(x + cardWidth - 10, y + 8,
          dest.type.replace('_', ' ').toUpperCase(), {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textAccent,
        }).setOrigin(1, 0),
      );

      // T-0515: Difficulty stars
      const stars = dest.difficultyRating ?? Math.ceil(dest.difficulty / 2);
      const starStr = '\u2605'.repeat(stars) + '\u2606'.repeat(5 - stars);
      this.contentContainer!.add(
        this.add.text(x + 10, y + 25, starStr, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textGold,
        }),
      );

      // Explored badge
      if (isExplored) {
        this.contentContainer!.add(
          this.add.text(x + cardWidth - 10, y + 25, 'EXPLORED', {
            fontFamily: FONTS.primary,
            fontSize: '9px',
            color: '#4ecca3',
          }).setOrigin(1, 0),
        );
      }

      // Description
      this.contentContainer!.add(
        this.add.text(x + 10, y + 42, dest.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: cardWidth - 20 },
        }),
      );

      // Stats row
      const statsY = y + 82;
      const diffColor = dest.difficulty <= 3 ? '#4ecca3' : dest.difficulty <= 6 ? '#f5a623' : '#e94560';
      this.contentContainer!.add(
        this.add.text(x + 10, statsY, `Diff: ${dest.difficulty}/10  |  ${dest.durationMinutes}min  |  Party: ${dest.requiredPartySize}+`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: diffColor,
        }),
      );

      // Loot preview
      const lootStr = dest.lootTable.map(l => `${l.resource}: ${l.min}-${l.max}`).join(', ');
      this.contentContainer!.add(
        this.add.text(x + 10, statsY + 16, `Loot: ${lootStr}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: cardWidth - 20 },
        }),
      );

      // T-0540: Quick-launch button for explored destinations
      if (isExplored && !isSelected) {
        const qlBtn = this.add.text(x + cardWidth - 10, statsY + 16, 'Quick Launch', {
          fontFamily: FONTS.primary,
          fontSize: '9px',
          color: '#4ecca3',
          fontStyle: 'bold',
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        this.contentContainer!.add(qlBtn);
        qlBtn.on('pointerup', () => {
          this.selectedDestination = dest;
          this.selectedHeroIds.clear();
          this.renderContent();
        });
      }

      // Click zone
      const hitZone = this.add.zone(x + cardWidth / 2, y + cardHeight / 2, cardWidth, cardHeight)
        .setInteractive({ useHandCursor: true });
      this.contentContainer!.add(hitZone);

      hitZone.on('pointerup', () => {
        this.selectedDestination = dest;
        this.selectedHeroIds.clear();
        this.renderContent();
      });
    });

    // Right side: party selection (if destination selected)
    if (this.selectedDestination) {
      this.renderPartySelection();
    }
  }

  private renderPartySelection(): void {
    if (!this.contentContainer || !this.selectedDestination) return;

    const dest = this.selectedDestination;
    const panelX = GAME_WIDTH - 400;
    const panelY = 100;
    const panelW = 385;
    const panelH = GAME_HEIGHT - 170;

    const g = this.add.graphics();
    g.fillStyle(COLORS.panelBg, 0.95);
    g.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    g.lineStyle(2, COLORS.panelBorder);
    g.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);
    this.contentContainer.add(g);

    const title = this.add.text(panelX + 10, panelY + 10,
      `Select Party for ${dest.name}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });
    this.contentContainer.add(title);

    this.contentContainer.add(
      this.add.text(panelX + 10, panelY + 32,
        `Min: ${dest.requiredPartySize}  |  Selected: ${this.selectedHeroIds.size}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      }),
    );

    // T-0520: Hero filter buttons
    const filterY = panelY + 48;
    const filters: { label: string; filter: HeroFilter }[] = [
      { label: 'All', filter: 'all' },
      { label: 'Idle', filter: 'idle' },
      { label: 'Assigned', filter: 'assigned' },
    ];
    filters.forEach((f, i) => {
      const fx = panelX + 10 + i * 65;
      const isActive = this.heroFilter === f.filter;
      const filterBtn = this.add.text(fx, filterY, f.label, {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: isActive ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: isActive ? 'bold' : 'normal',
      }).setInteractive({ useHandCursor: true });
      this.contentContainer!.add(filterBtn);
      filterBtn.on('pointerup', () => {
        this.heroFilter = f.filter;
        this.renderContent();
      });
    });

    // T-0549: Timed challenge toggle
    const timedToggle = this.add.text(panelX + panelW - 10, filterY, `Timed: ${this.isTimedChallenge ? 'ON' : 'OFF'}`, {
      fontFamily: FONTS.primary,
      fontSize: '10px',
      color: this.isTimedChallenge ? '#e94560' : COLORS.textSecondary,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.contentContainer.add(timedToggle);
    timedToggle.on('pointerup', () => {
      this.isTimedChallenge = !this.isTimedChallenge;
      this.renderContent();
    });

    // Available heroes
    let availableHeroes = this.heroes.filter(
      h => h.status === 'idle' || h.status === 'assigned',
    );
    if (this.heroFilter === 'idle') {
      availableHeroes = availableHeroes.filter(h => h.status === 'idle');
    } else if (this.heroFilter === 'assigned') {
      availableHeroes = availableHeroes.filter(h => h.status === 'assigned');
    }

    let heroY = panelY + 68;
    availableHeroes.forEach(hero => {
      if (heroY + 30 > panelY + panelH - 90) return;

      const isSelected = this.selectedHeroIds.has(hero.id);

      const heroBg = this.add.graphics();
      heroBg.fillStyle(isSelected ? 0x0f3460 : 0x1a1a2e, 0.8);
      heroBg.fillRoundedRect(panelX + 10, heroY, panelW - 20, 26, 4);
      if (isSelected) {
        heroBg.lineStyle(1, COLORS.gold);
        heroBg.strokeRoundedRect(panelX + 10, heroY, panelW - 20, 26, 4);
      }
      this.contentContainer!.add(heroBg);

      this.contentContainer!.add(
        this.add.text(panelX + 18, heroY + 4,
          isSelected ? '[x]' : '[ ]', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: isSelected ? COLORS.textGold : COLORS.textSecondary,
        }),
      );

      this.contentContainer!.add(
        this.add.text(panelX + 48, heroY + 4,
          `${hero.name} (${hero.role} Lv${hero.level})`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textPrimary,
        }),
      );

      this.contentContainer!.add(
        this.add.text(panelX + panelW - 18, heroY + 4, hero.status, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }).setOrigin(1, 0),
      );

      const hitZone = this.add.zone(
        panelX + panelW / 2, heroY + 13, panelW - 20, 26,
      ).setInteractive({ useHandCursor: true });
      this.contentContainer!.add(hitZone);

      hitZone.on('pointerup', () => {
        if (this.selectedHeroIds.has(hero.id)) {
          this.selectedHeroIds.delete(hero.id);
        } else if (this.selectedHeroIds.size < 5) {
          this.selectedHeroIds.add(hero.id);
        }
        this.renderContent();
      });

      heroY += 30;
    });

    if (availableHeroes.length === 0) {
      this.contentContainer.add(
        this.add.text(panelX + 10, heroY + 5, 'No heroes available.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          fontStyle: 'italic',
        }),
      );
    }

    // Action buttons at bottom
    const canLaunch = this.selectedHeroIds.size >= dest.requiredPartySize;
    const btnY = panelY + panelH - 80;

    // T-0519: Scout button
    const scoutBtn = this.add.text(panelX + 20, btnY, 'Scout', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: '#6eb5ff',
      fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    this.contentContainer.add(scoutBtn);
    scoutBtn.on('pointerup', () => this.handleScout());

    // T-0521: Save template button
    if (this.selectedHeroIds.size > 0) {
      const saveBtn = this.add.text(panelX + 80, btnY, 'Save Template', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });
      this.contentContainer.add(saveBtn);
      saveBtn.on('pointerup', () => this.handleSaveTemplate());
    }

    // T-0517: Recommendation
    const recBtn = this.add.text(panelX + panelW - 20, btnY, 'Tips', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.contentContainer.add(recBtn);
    recBtn.on('pointerup', () => this.handleRecommendation());

    // Launch button
    const launchY = panelY + panelH - 45;
    const btnG = this.add.graphics();
    btnG.fillStyle(canLaunch ? COLORS.success : 0x555555, 1);
    btnG.fillRoundedRect(panelX + 20, launchY, panelW - 40, 35, 6);
    this.contentContainer.add(btnG);

    const launchLabel = this.isTimedChallenge ? 'Launch (Timed Challenge!)' : 'Launch Expedition';
    const launchText = this.add.text(panelX + panelW / 2, launchY + 17, launchLabel, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: canLaunch ? '#000000' : '#888888',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.contentContainer.add(launchText);

    if (canLaunch) {
      const launchZone = this.add.zone(
        panelX + panelW / 2, launchY + 17, panelW - 40, 35,
      ).setInteractive({ useHandCursor: true });
      this.contentContainer.add(launchZone);
      launchZone.on('pointerup', () => this.handleLaunch());
    }
  }

  private async handleLaunch(): Promise<void> {
    if (!this.selectedDestination) return;

    try {
      // T-0480: Launch animation
      const notification = NotificationSystem.getInstance(this);
      notification.showSuccess('Expedition launched! Heroes are departing...');

      await apiClient.launchExpedition(
        this.selectedDestination.type,
        Array.from(this.selectedHeroIds),
        this.selectedDestination.id,
        {
          isTimedChallenge: this.isTimedChallenge,
        },
      );

      this.selectedDestination = null;
      this.selectedHeroIds.clear();
      this.isTimedChallenge = false;
      this.tabMode = 'active';
      await this.loadData();
      this.renderContent();
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Launch failed');
    }
  }

  private async handleScout(): Promise<void> {
    if (!this.selectedDestination) return;
    try {
      const scoutLevel = Math.max(
        ...Array.from(this.selectedHeroIds)
          .map(id => this.heroes.find(h => h.id === id))
          .filter(h => h?.role === 'scout')
          .map(h => h?.level ?? 1),
        1,
      );
      const result = await apiClient.scoutDestination(this.selectedDestination.id, scoutLevel);
      this.encounterPanel?.showScoutingResults(
        this.selectedDestination.name,
        result.revealedEncounters,
        result.estimatedDanger,
      );
    } catch {
      this.showError('Scouting failed');
    }
  }

  private async handleSaveTemplate(): Promise<void> {
    if (!this.selectedDestination || this.selectedHeroIds.size === 0) return;
    try {
      await apiClient.saveExpeditionTemplate(
        `${this.selectedDestination.name} Team`,
        Array.from(this.selectedHeroIds),
        this.selectedDestination.id,
      );
      NotificationSystem.getInstance(this).showSuccess('Party template saved!');
    } catch {
      this.showError('Failed to save template');
    }
  }

  private async handleRecommendation(): Promise<void> {
    if (!this.selectedDestination) return;
    try {
      const rec = await apiClient.getExpeditionRecommendation(this.selectedDestination.id);
      const tips = rec.tips?.join('\n') ?? 'No tips available.';
      const roles = rec.recommendedRoles?.join(', ') ?? 'Any';
      this.showInfo(`Recommended roles: ${roles}\nMin power: ${rec.minimumPower}\n${tips}`);
    } catch {
      this.showError('Failed to get recommendations');
    }
  }

  private renderActiveExpeditions(): void {
    if (!this.contentContainer) return;

    const startY = 105;
    const cardWidth = GAME_WIDTH - 30;
    const cardHeight = 130;
    const padding = 8;

    const active = this.expeditions.filter(e => e.status === 'active');
    const completed = this.expeditions.filter(e => e.status !== 'active');

    let y = startY;

    // T-0482: Active expedition count in header area
    this.contentContainer.add(
      this.add.text(15, y, `Active Expeditions (${active.length})`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    if (active.length === 0) {
      this.contentContainer.add(
        this.add.text(15, y, 'No active expeditions. Launch one from the Destinations tab.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }),
      );
      y += 25;
    }

    active.forEach(exp => {
      if (y + cardHeight > GAME_HEIGHT - 100) return;
      this.renderExpeditionCard(exp, 15, y, cardWidth, cardHeight, true);
      y += cardHeight + padding;
    });

    // Completed expeditions
    y += 10;
    this.contentContainer.add(
      this.add.text(15, y, `Completed (${completed.length})`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    completed.slice(0, 5).forEach(exp => {
      if (y + cardHeight > GAME_HEIGHT - 60) return;
      this.renderExpeditionCard(exp, 15, y, cardWidth, cardHeight, false);
      y += cardHeight + padding;
    });
  }

  private renderExpeditionCard(
    exp: Expedition,
    x: number,
    y: number,
    w: number,
    h: number,
    showActions: boolean,
  ): void {
    if (!this.contentContainer) return;

    const isActive = exp.status === 'active';
    const isSuccess = exp.status === 'resolved';

    const g = this.add.graphics();
    g.fillStyle(COLORS.panelBg, 0.9);
    g.fillRoundedRect(x, y, w, h, 6);
    const borderColor = isActive ? COLORS.panelBorder : isSuccess ? COLORS.success : COLORS.danger;
    g.lineStyle(2, borderColor);
    g.strokeRoundedRect(x, y, w, h, 6);
    this.contentContainer.add(g);

    // Destination name
    const dest = this.destinations.find(d => d.id === exp.destination);
    const destName = dest?.name || exp.destination;

    this.contentContainer.add(
      this.add.text(x + 10, y + 8, destName, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );

    // T-0515: Difficulty stars
    if (exp.difficultyRating) {
      const stars = '\u2605'.repeat(exp.difficultyRating) + '\u2606'.repeat(5 - exp.difficultyRating);
      this.contentContainer.add(
        this.add.text(x + 200, y + 8, stars, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textGold,
        }),
      );
    }

    // Type badge
    this.contentContainer.add(
      this.add.text(x + w - 10, y + 8,
        exp.type.replace('_', ' ').toUpperCase(), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textAccent,
      }).setOrigin(1, 0),
    );

    // Heroes
    const heroNames = exp.heroIds
      .map(id => this.heroes.find(h => h.id === id)?.name || 'Unknown')
      .join(', ');
    this.contentContainer.add(
      this.add.text(x + 10, y + 28, `Party: ${heroNames}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: w - 20 },
      }),
    );

    if (isActive) {
      const startMs = new Date(exp.startedAt).getTime();
      const endMs = startMs + exp.duration * 60 * 1000;
      const remainMs = endMs - Date.now();

      if (remainMs > 0) {
        const remainMin = Math.floor(remainMs / 60000);
        const remainSec = Math.floor((remainMs % 60000) / 1000);
        this.contentContainer.add(
          this.add.text(x + 10, y + 50, `Time remaining: ${remainMin}m ${remainSec}s`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textPrimary,
          }),
        );

        // Progress bar
        const barX = x + 10;
        const barY = y + 75;
        const barW = w - 200;
        const barH = 12;
        const progress = 1 - remainMs / (exp.duration * 60 * 1000);

        const barBg = this.add.graphics();
        barBg.fillStyle(0x333333, 1);
        barBg.fillRoundedRect(barX, barY, barW, barH, 4);
        barBg.fillStyle(COLORS.success, 1);
        barBg.fillRoundedRect(barX, barY, barW * progress, barH, 4);
        this.contentContainer.add(barBg);

        // T-0512: Retreat button
        if (showActions) {
          const retreatBtn = this.add.text(x + w - 90, y + 72, 'Retreat', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#f5a623',
            fontStyle: 'bold',
          }).setInteractive({ useHandCursor: true });
          this.contentContainer.add(retreatBtn);
          retreatBtn.on('pointerup', () => this.handleRetreat(exp.id));
        }

        // T-0503: Mini route map
        if (exp.routeWaypoints && exp.routeWaypoints.length > 0) {
          this.routeMap = new ExpeditionRouteMap(this, x + 10, y + 95);
          this.routeMap.render(exp.routeWaypoints, progress);
          this.contentContainer.add(this.routeMap.getContainer());
        }
      } else {
        // T-0528: Ready notification
        this.contentContainer.add(
          this.add.text(x + 10, y + 50, 'Expedition complete!', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: '#4ecca3',
            fontStyle: 'bold',
          }),
        );

        const collectBg = this.add.graphics();
        collectBg.fillStyle(COLORS.success, 1);
        collectBg.fillRoundedRect(x + w - 150, y + 65, 140, 30, 6);
        this.contentContainer.add(collectBg);

        const collectText = this.add.text(x + w - 80, y + 80, 'Collect', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#000000',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        this.contentContainer.add(collectText);

        const collectZone = this.add.zone(x + w - 80, y + 80, 140, 30)
          .setInteractive({ useHandCursor: true });
        this.contentContainer.add(collectZone);
        collectZone.on('pointerup', () => this.handleCollect(exp.id));
      }
    } else {
      // Show result
      const result = exp.result;
      if (result) {
        const statusText = result.success ? 'SUCCESS' : 'FAILED';
        const statusColor = result.success ? '#4ecca3' : '#e94560';
        this.contentContainer.add(
          this.add.text(x + 10, y + 50, statusText, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: statusColor,
            fontStyle: 'bold',
          }),
        );

        if (result.success && result.loot) {
          const lootStr = Object.entries(result.loot)
            .map(([k, v]) => `${k}: +${v}`)
            .join('  ');
          this.contentContainer.add(
            this.add.text(x + 100, y + 52, lootStr, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: COLORS.textGold,
            }),
          );
        }

        this.contentContainer.add(
          this.add.text(x + 10, y + 72, `XP: ${result.xpGained}  |  ${result.narrative}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
            wordWrap: { width: w - 120 },
          }),
        );

        // View log button
        const viewBtn = this.add.text(x + w - 10, y + 72, 'View Log', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#6eb5ff',
          fontStyle: 'bold',
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        this.contentContainer.add(viewBtn);
        viewBtn.on('pointerup', () => {
          this.logPanel?.showExpeditionLog(exp);
        });

        // Milestone notification
        if (result.milestoneUnlocked) {
          this.contentContainer.add(
            this.add.text(x + 10, y + 95, `Milestone: ${result.milestoneUnlocked}!`, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: COLORS.textGold,
              fontStyle: 'bold',
            }),
          );
        }
      }
    }
  }

  private renderBossExpeditions(): void {
    if (!this.contentContainer) return;

    let y = 105;

    this.contentContainer.add(
      this.add.text(15, y, 'Boss Expeditions', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 30;

    if (this.bosses.length === 0) {
      this.contentContainer.add(
        this.add.text(15, y, 'No boss expeditions unlocked yet. Keep exploring and leveling up!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
          fontStyle: 'italic',
        }),
      );
      return;
    }

    for (const boss of this.bosses) {
      const cardH = 100;
      const g = this.add.graphics();
      g.fillStyle(COLORS.panelBg, 0.9);
      g.fillRoundedRect(15, y, GAME_WIDTH - 30, cardH, 6);
      g.lineStyle(2, COLORS.danger);
      g.strokeRoundedRect(15, y, GAME_WIDTH - 30, cardH, 6);
      this.contentContainer.add(g);

      this.contentContainer.add(
        this.add.text(25, y + 8, `${boss.name} — ${boss.title}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#e94560',
          fontStyle: 'bold',
        }),
      );

      this.contentContainer.add(
        this.add.text(25, y + 28, boss.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: GAME_WIDTH - 60 },
        }),
      );

      const statsStr = `Diff: ${boss.difficulty}/10  |  ${boss.phases.length} phases  |  ${boss.durationMinutes}min  |  Party: ${boss.requiredPartySize}+`;
      this.contentContainer.add(
        this.add.text(25, y + 55, statsStr, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#f5a623',
        }),
      );

      const rewardsStr = `Rewards: ${boss.exclusiveRewards.join(', ')}  |  XP: ${boss.xpReward}`;
      this.contentContainer.add(
        this.add.text(25, y + 72, rewardsStr, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textGold,
        }),
      );

      y += cardH + 10;
    }
  }

  private async renderDiaryTab(): Promise<void> {
    if (!this.contentContainer) return;
    this.logPanel?.showDiary();
  }

  private async renderStatsTab(): Promise<void> {
    if (!this.contentContainer) return;
    this.logPanel?.showStatistics();
  }

  private async handleCollect(expeditionId: string): Promise<void> {
    try {
      const result = await apiClient.collectExpedition(expeditionId);

      // T-0508: Celebration animation
      const notification = NotificationSystem.getInstance(this);
      if (result.result?.success) {
        notification.showSuccess('Expedition successful! Heroes return with spoils!');
      } else {
        notification.showWarning('Expedition failed. Heroes return battered.');
      }

      // Show detailed log
      this.logPanel?.showExpeditionLog(result);

      await this.loadData();
      this.renderContent();
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Collection failed');
    }
  }

  private async handleRetreat(expeditionId: string): Promise<void> {
    try {
      await apiClient.retreatExpedition(expeditionId);
      NotificationSystem.getInstance(this).showWarning('Party retreated from expedition.');
      await this.loadData();
      this.renderContent();
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Retreat failed');
    }
  }

  private showError(message: string): void {
    const errorText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, message, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ff4444',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(100);
    this.time.delayedCall(3000, () => errorText.destroy());
  }

  private showInfo(message: string): void {
    const infoText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, message, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      backgroundColor: 'rgba(0,0,0,0.85)',
      padding: { x: 16, y: 10 },
      wordWrap: { width: 400 },
      align: 'center',
    }).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });
    infoText.on('pointerup', () => infoText.destroy());
    this.time.delayedCall(8000, () => { if (infoText.active) infoText.destroy(); });
  }

  private cleanup(): void {
    if (this.refreshTimer) this.refreshTimer.destroy();
    this.logPanel?.destroy();
    this.routeMap?.destroy();
    this.encounterPanel?.destroy();
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
      const isActive = i === 1;
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
          this.cleanup();
          this.scene.start(tab.scene);
        });
      }
    });
  }
}
