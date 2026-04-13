import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';

const WEATHER_EMOTES: Record<string, string> = {
  clear: '☀',
  rainy: '🌧',
  stormy: '⛈',
  snowy: '❄',
  hot: '🔥',
  foggy: '🌫',
  windy: '💨',
};

const SEASON_ICONS: Record<string, string> = {
  spring: '🌱',
  summer: '☀',
  autumn: '🍂',
  winter: '❄',
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

export class WeatherPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
  }

  setWeatherData(
    weather: {
      condition: string;
      temperature: number;
      humidity: number;
      windSpeed: number;
      rainMm: number;
    },
    modifiers: Record<string, number>,
    season?: string,
    festival?: FestivalData | null,
  ): void {
    this.container.removeAll(true);

    const panelW = 220;
    // Calculate dynamic height based on content
    let estimatedHeight = 100; // base: header + weather + separator
    // Count active modifiers
    for (const [key, value] of Object.entries(modifiers)) {
      if (key === 'floodRisk' && value <= 0) continue;
      if (Math.abs(value - 1.0) < 0.01 && key !== 'floodRisk') continue;
      estimatedHeight += 20;
    }
    if (festival) {
      estimatedHeight += 80; // separator + name + flavor + buff lines
      for (const value of Object.values(festival.buffs)) {
        if (value > 0) estimatedHeight += 18;
      }
    }
    const panelH = Math.max(240, estimatedHeight);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.92);
    bg.fillRoundedRect(0, 0, panelW, panelH, 8);
    bg.lineStyle(1, COLORS.panelBorder);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 8);
    this.container.add(bg);

    // Season + Weather icon + condition
    const seasonIcon = season ? (SEASON_ICONS[season] || '') : '';
    const emote = WEATHER_EMOTES[weather.condition] || '☀';
    const seasonLabel = season ? season.charAt(0).toUpperCase() + season.slice(1) : '';

    this.container.add(
      this.scene.add.text(12, 10, `${seasonIcon} ${seasonLabel}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#a0c4ff',
        fontStyle: 'bold',
      })
    );

    this.container.add(
      this.scene.add.text(12, 28, `${emote} ${weather.condition}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      })
    );

    // Temperature
    this.container.add(
      this.scene.add.text(12, 52, `${Math.round(weather.temperature)}°C · ${Math.round(weather.humidity)}% humidity`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      })
    );

    // Separator
    const sep = this.scene.add.graphics();
    sep.lineStyle(1, COLORS.panelBorder, 0.5);
    sep.lineBetween(10, 72, panelW - 10, 72);
    this.container.add(sep);

    // Active modifiers header
    this.container.add(
      this.scene.add.text(12, 78, 'Active Modifiers', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      })
    );

    let yOff = 96;
    for (const [key, value] of Object.entries(modifiers)) {
      if (key === 'floodRisk' && value <= 0) continue;
      if (Math.abs(value - 1.0) < 0.01 && key !== 'floodRisk') continue; // skip neutral

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

      this.container.add(
        this.scene.add.text(12, yOff, label, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        })
      );

      this.container.add(
        this.scene.add.text(panelW - 12, yOff, display, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color,
          fontStyle: 'bold',
        }).setOrigin(1, 0)
      );

      yOff += 20;
    }

    // Festival section (if active)
    if (festival) {
      yOff += 6;
      const festSep = this.scene.add.graphics();
      festSep.lineStyle(1, 0xffd700, 0.5);
      festSep.lineBetween(10, yOff, panelW - 10, yOff);
      this.container.add(festSep);
      yOff += 8;

      // Festival name in gold
      this.container.add(
        this.scene.add.text(12, yOff, `✦ ${festival.name}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#ffd700',
          fontStyle: 'bold',
        })
      );
      yOff += 20;

      // Flavor text
      const flavorText = this.scene.add.text(12, yOff, festival.flavorText, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny - 1}px`,
        color: '#c8a84e',
        wordWrap: { width: panelW - 24 },
      });
      this.container.add(flavorText);
      yOff += flavorText.height + 8;

      // Festival buffs
      for (const [key, value] of Object.entries(festival.buffs)) {
        if (value <= 0) continue;
        const buffLabel = FESTIVAL_BUFF_LABELS[key] || key;
        const pct = `+${Math.round(value * 100)}%`;

        this.container.add(
          this.scene.add.text(12, yOff, buffLabel, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#c8a84e',
          })
        );

        this.container.add(
          this.scene.add.text(panelW - 12, yOff, pct, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#ffd700',
            fontStyle: 'bold',
          }).setOrigin(1, 0)
        );

        yOff += 18;
      }
    }

    // Resize background to fit actual content
    const finalHeight = Math.max(panelH, yOff + 10);
    bg.clear();
    bg.fillStyle(COLORS.panelBg, 0.92);
    bg.fillRoundedRect(0, 0, panelW, finalHeight, 8);
    bg.lineStyle(1, festival ? 0xffd700 : COLORS.panelBorder);
    bg.strokeRoundedRect(0, 0, panelW, finalHeight, 8);
  }
}
