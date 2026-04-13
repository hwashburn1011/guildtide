import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

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

const MODIFIER_LABELS: Record<string, string> = {
  cropGrowth: 'Crop Growth',
  floodRisk: 'Flood Risk',
  travelSpeed: 'Travel Speed',
  huntBonus: 'Hunt Bonus',
  alchemyOutput: 'Alchemy',
  essenceDrops: 'Essence',
  morale: 'Morale',
  marketConfidence: 'Market',
};

const CLIMATE_FLAVOR: Record<string, string> = {
  tropical: 'Lush jungles and warm rains fuel abundant growth. The air hums with life.',
  temperate: 'Rolling hills and mild seasons make this a balanced land for all trades.',
  arid: 'Sun-scorched plains demand resilience, but rare minerals hide beneath the dust.',
  cold: 'Frost-bound tundra where only the hardiest guilds survive — and thrive.',
  mediterranean: 'Sun-drenched coasts and olive groves. Trade winds carry fortune to the bold.',
  continental: 'Vast steppes with extreme seasons. Preparation separates the strong from the fallen.',
};

const FESTIVAL_BUFF_LABELS: Record<string, string> = {
  morale: 'Morale',
  goldIncome: 'Gold Income',
  marketDiscount: 'Market Discount',
  xpBonus: 'XP Bonus',
};

interface FestivalData {
  name: string;
  flavorText: string;
  buffs: Record<string, number>;
  duration: number;
}

export class WorldMapScene extends Phaser.Scene {
  private worldState: {
    regionId: string;
    date: string;
    weather: {
      condition: string;
      temperature: number;
      humidity: number;
      windSpeed: number;
      rainMm: number;
    };
    modifiers: Record<string, number>;
    activeEvents: unknown[];
    marketState: unknown;
    season: string;
    festival: FestivalData | null;
  } | null = null;

  private activeEvents: any[] = [];
  private regionName: string = '';
  private climate: string = '';

  constructor() {
    super({ key: 'WorldMapScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor(COLORS.background);

    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading world...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);

    try {
      const [worldState, events] = await Promise.all([
        apiClient.getWorldState(),
        apiClient.getEvents(),
      ]);

      this.worldState = worldState;
      this.activeEvents = events;

      // Derive region name and climate from regionId
      // regionId format is like "tropical_coast" or "temperate_valley"
      this.regionName = this.formatRegionName(worldState.regionId);
      this.climate = this.deriveClimate(worldState.regionId);

      loadingText.destroy();
      this.buildUI();
    } catch (err) {
      loadingText.setText('Failed to load world data');
      if (err instanceof Error && err.message.includes('401')) {
        localStorage.removeItem('guildtide_token');
        this.scene.start('LoginScene');
      }
    }
  }

  private formatRegionName(regionId: string): string {
    return regionId
      .split(/[_-]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private deriveClimate(regionId: string): string {
    const id = regionId.toLowerCase();
    const climates = ['tropical', 'temperate', 'arid', 'cold', 'mediterranean', 'continental'];
    for (const c of climates) {
      if (id.includes(c)) return c;
    }
    return 'temperate';
  }

  private buildUI(): void {
    if (!this.worldState) return;

    const ws = this.worldState;

    // --- Header ---
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.panelBg, 0.9);
    headerBg.fillRect(0, 0, GAME_WIDTH, 55);
    headerBg.lineStyle(2, COLORS.panelBorder);
    headerBg.strokeRect(0, 0, GAME_WIDTH, 55);

    this.add.text(20, 10, 'World Map', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });

    this.add.text(20, 36, `${this.regionName} - ${this.climate.charAt(0).toUpperCase() + this.climate.slice(1)} Region`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });

    // Date display
    this.add.text(GAME_WIDTH - 20, 20, `Date: ${ws.date}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0);

    // --- Left column: Weather + Modifiers ---
    this.buildWeatherSection(20, 65);

    // --- Right column: Events ---
    this.buildEventsSection(GAME_WIDTH / 2 + 20, 65);

    // --- Climate flavor text at bottom ---
    const flavorText = CLIMATE_FLAVOR[this.climate] || CLIMATE_FLAVOR.temperate;
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 70, flavorText, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#6a7a8a',
      fontStyle: 'italic',
      wordWrap: { width: GAME_WIDTH - 60 },
      align: 'center',
    }).setOrigin(0.5);

    // --- Bottom nav ---
    this.buildBottomNav();
  }

  private buildWeatherSection(x: number, startY: number): void {
    if (!this.worldState) return;
    const ws = this.worldState;
    const panelW = GAME_WIDTH / 2 - 40;

    // Panel background
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.85);
    bg.fillRoundedRect(x, startY, panelW, 260, 8);
    bg.lineStyle(1, COLORS.panelBorder);
    bg.strokeRoundedRect(x, startY, panelW, 260, 8);

    let y = startY + 12;

    // Season display
    const seasonIcon = SEASON_ICONS[ws.season] || '';
    const seasonLabel = ws.season ? ws.season.charAt(0).toUpperCase() + ws.season.slice(1) : '';
    this.add.text(x + 14, y, `${seasonIcon} ${seasonLabel}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#a0c4ff',
      fontStyle: 'bold',
    });
    y += 26;

    // Weather condition
    const emote = WEATHER_EMOTES[ws.weather.condition] || '\u2600';
    this.add.text(x + 14, y, `${emote} ${ws.weather.condition.charAt(0).toUpperCase() + ws.weather.condition.slice(1)}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });
    y += 32;

    // Weather details
    this.add.text(x + 14, y, `${Math.round(ws.weather.temperature)}\u00B0C  |  ${Math.round(ws.weather.humidity)}% humidity  |  Wind: ${Math.round(ws.weather.windSpeed)} km/h`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    y += 20;

    if (ws.weather.rainMm > 0) {
      this.add.text(x + 14, y, `Rain: ${ws.weather.rainMm.toFixed(1)} mm`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#5dade2',
      });
      y += 18;
    }

    // Separator
    const sep = this.add.graphics();
    sep.lineStyle(1, COLORS.panelBorder, 0.5);
    sep.lineBetween(x + 10, y + 4, x + panelW - 10, y + 4);
    y += 12;

    // Active modifiers
    this.add.text(x + 14, y, 'Active Modifiers', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
      fontStyle: 'bold',
    });
    y += 20;

    for (const [key, value] of Object.entries(ws.modifiers)) {
      if (key === 'floodRisk' && value <= 0) continue;
      if (Math.abs(value - 1.0) < 0.01 && key !== 'floodRisk') continue;

      const label = MODIFIER_LABELS[key] || key;
      let display: string;
      let color: string;

      if (key === 'floodRisk') {
        display = `${Math.round(value * 100)}%`;
        color = value > 0.1 ? '#e94560' : '#f59f00';
      } else {
        const pct = Math.round((value - 1) * 100);
        display = pct >= 0 ? `+${pct}%` : `${pct}%`;
        color = pct >= 0 ? '#4ecca3' : '#e94560';
      }

      this.add.text(x + 14, y, label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      });

      this.add.text(x + panelW - 14, y, display, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color,
        fontStyle: 'bold',
      }).setOrigin(1, 0);

      y += 18;
    }

    // Festival section
    if (ws.festival) {
      this.buildFestivalSection(x, startY + 270, panelW, ws.festival);
    }
  }

  private buildFestivalSection(x: number, startY: number, panelW: number, festival: FestivalData): void {
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.85);
    bg.fillRoundedRect(x, startY, panelW, 140, 8);
    bg.lineStyle(1, 0xffd700, 0.6);
    bg.strokeRoundedRect(x, startY, panelW, 140, 8);

    let y = startY + 12;

    this.add.text(x + 14, y, `\u2726 ${festival.name}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ffd700',
      fontStyle: 'bold',
    });
    y += 24;

    this.add.text(x + 14, y, festival.flavorText, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: '#c8a84e',
      wordWrap: { width: panelW - 28 },
    });
    y += 30;

    for (const [key, value] of Object.entries(festival.buffs)) {
      if (value <= 0) continue;
      const buffLabel = FESTIVAL_BUFF_LABELS[key] || key;
      const pct = `+${Math.round(value * 100)}%`;

      this.add.text(x + 14, y, buffLabel, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#c8a84e',
      });

      this.add.text(x + panelW - 14, y, pct, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(1, 0);

      y += 18;
    }
  }

  private buildEventsSection(x: number, startY: number): void {
    const panelW = GAME_WIDTH / 2 - 40;

    // Panel background
    const bg = this.add.graphics();
    const panelH = Math.max(260, 40 + this.activeEvents.length * 100);
    bg.fillStyle(COLORS.panelBg, 0.85);
    bg.fillRoundedRect(x, startY, panelW, Math.min(panelH, GAME_HEIGHT - startY - 120), 8);
    bg.lineStyle(1, COLORS.panelBorder);
    bg.strokeRoundedRect(x, startY, panelW, Math.min(panelH, GAME_HEIGHT - startY - 120), 8);

    let y = startY + 12;

    this.add.text(x + 14, y, `Active Events (${this.activeEvents.length})`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    y += 28;

    if (this.activeEvents.length === 0) {
      this.add.text(x + 14, y, 'No active events at this time.\nCheck back as the world evolves.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
        lineSpacing: 4,
      });
      return;
    }

    this.activeEvents.forEach((event) => {
      if (y + 85 > GAME_HEIGHT - 120) return;

      // Event card
      const cardW = panelW - 28;
      const cardH = 80;
      const cardBg = this.add.graphics();
      cardBg.fillStyle(COLORS.background, 0.8);
      cardBg.fillRoundedRect(x + 14, y, cardW, cardH, 6);
      cardBg.lineStyle(1, COLORS.panelBorder, 0.5);
      cardBg.strokeRoundedRect(x + 14, y, cardW, cardH, 6);

      // Title
      this.add.text(x + 24, y + 8, event.title, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      });

      // Expiry
      const expiresIn = Math.max(0, Math.floor((new Date(event.expiresAt).getTime() - Date.now()) / 3600000));
      this.add.text(x + cardW, y + 10, `${expiresIn}h left`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: expiresIn < 3 ? '#e94560' : COLORS.textSecondary,
      }).setOrigin(1, 0);

      // Description (truncated)
      const desc = event.description.length > 80
        ? event.description.substring(0, 77) + '...'
        : event.description;
      this.add.text(x + 24, y + 28, desc, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: cardW - 20 },
      });

      // Choices count
      const choiceCount = event.choices?.length || 0;
      this.add.text(x + 24, y + 58, `${choiceCount} choice${choiceCount !== 1 ? 's' : ''} available`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textAccent,
      });

      // Clickable zone - navigate to GuildHallScene to interact
      const hitZone = this.add.zone(x + 14 + cardW / 2, y + cardH / 2, cardW, cardH)
        .setInteractive({ useHandCursor: true });

      hitZone.on('pointerover', () => {
        cardBg.clear();
        cardBg.fillStyle(0x0f3460, 0.9);
        cardBg.fillRoundedRect(x + 14, y, cardW, cardH, 6);
        cardBg.lineStyle(1, COLORS.gold, 0.8);
        cardBg.strokeRoundedRect(x + 14, y, cardW, cardH, 6);
      });

      hitZone.on('pointerout', () => {
        cardBg.clear();
        cardBg.fillStyle(COLORS.background, 0.8);
        cardBg.fillRoundedRect(x + 14, y, cardW, cardH, 6);
        cardBg.lineStyle(1, COLORS.panelBorder, 0.5);
        cardBg.strokeRoundedRect(x + 14, y, cardW, cardH, 6);
      });

      hitZone.on('pointerup', () => {
        // Go to Guild Hall where events can be interacted with
        this.scene.start('GuildHallScene');
      });

      y += cardH + 10;
    });
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
      const isActive = i === 3; // World Map is active
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
