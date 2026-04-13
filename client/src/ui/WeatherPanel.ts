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

export class WeatherPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
  }

  setWeatherData(weather: {
    condition: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    rainMm: number;
  }, modifiers: Record<string, number>): void {
    this.container.removeAll(true);

    const panelW = 220;
    const panelH = 240;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.92);
    bg.fillRoundedRect(0, 0, panelW, panelH, 8);
    bg.lineStyle(1, COLORS.panelBorder);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 8);
    this.container.add(bg);

    // Weather icon + condition
    const emote = WEATHER_EMOTES[weather.condition] || '☀';
    this.container.add(
      this.scene.add.text(12, 10, `${emote} ${weather.condition}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      })
    );

    // Temperature
    this.container.add(
      this.scene.add.text(12, 34, `${Math.round(weather.temperature)}°C · ${Math.round(weather.humidity)}% humidity`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      })
    );

    // Separator
    const sep = this.scene.add.graphics();
    sep.lineStyle(1, COLORS.panelBorder, 0.5);
    sep.lineBetween(10, 55, panelW - 10, 55);
    this.container.add(sep);

    // Active modifiers
    this.container.add(
      this.scene.add.text(12, 62, 'Active Modifiers', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      })
    );

    let yOff = 82;
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
  }
}
