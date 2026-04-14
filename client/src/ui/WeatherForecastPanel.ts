/**
 * WeatherForecastPanel — 5-day forecast display.
 *
 * T-0777: Weather forecast display showing next days of conditions
 * T-0778: Weather history log showing past 7 days
 * T-0779: Weather-based visual changes (rain particles, sun glow)
 * T-0780: Weather-based ambient sound changes
 * T-0790: Weather pattern analysis for prediction accuracy
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';

const WEATHER_EMOTES: Record<string, string> = {
  clear: '☀',
  rainy: '🌧',
  stormy: '⛈',
  snowy: '❄',
  hot: '🔥',
  foggy: '🌫',
  windy: '💨',
};

interface ForecastDay {
  date: string;
  highTemp: number;
  lowTemp: number;
  dominantCondition: string;
  avgHumidity: number;
  avgWindSpeed: number;
  totalRainMm: number;
}

interface WeatherPattern {
  consecutiveDays: number;
  condition: string;
  trend: 'warming' | 'cooling' | 'stable';
  predictionBonus: number;
}

interface HistoryEntry {
  date: string;
  condition: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainMm: number;
}

export class WeatherForecastPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  // T-0779: Weather visual effects
  private rainEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sunGlow: Phaser.GameObjects.Graphics | null = null;
  private snowEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private fogOverlay: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Weather Forecast & History',
      width: 560,
      height: 500,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const [forecastData, historyData] = await Promise.all([
        apiClient.getWeatherForecast(),
        apiClient.getWeatherHistory(7),
      ]);

      this.renderForecast(content, forecastData.forecast, forecastData.pattern as WeatherPattern | null);
      this.renderHistory(content, historyData.history);
    } catch {
      content.add(
        this.scene.add.text(250, 60, 'Failed to load weather data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderForecast(
    container: Phaser.GameObjects.Container,
    forecast: ForecastDay[],
    pattern: WeatherPattern | null,
  ): void {
    let y = 0;

    // Forecast header
    container.add(
      this.scene.add.text(0, y, '5-Day Forecast', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 28;

    // Forecast cards
    const cardWidth = 95;
    const cardSpacing = 8;

    for (let i = 0; i < Math.min(5, forecast.length); i++) {
      const day = forecast[i];
      const x = i * (cardWidth + cardSpacing);
      const emote = WEATHER_EMOTES[day.dominantCondition] || '☀';
      const dateLabel = i === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });

      // Card background
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(COLORS.panelBg, 0.8);
      cardBg.fillRoundedRect(x, y, cardWidth, 90, 6);
      cardBg.lineStyle(1, COLORS.panelBorder, 0.5);
      cardBg.strokeRoundedRect(x, y, cardWidth, 90, 6);
      container.add(cardBg);

      // Day label
      container.add(
        this.scene.add.text(x + cardWidth / 2, y + 8, dateLabel, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5, 0),
      );

      // Weather icon
      container.add(
        this.scene.add.text(x + cardWidth / 2, y + 30, emote, {
          fontFamily: FONTS.primary,
          fontSize: '24px',
        }).setOrigin(0.5, 0),
      );

      // Temperature range
      container.add(
        this.scene.add.text(x + cardWidth / 2, y + 60, `${Math.round(day.highTemp)}° / ${Math.round(day.lowTemp)}°`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textPrimary,
        }).setOrigin(0.5, 0),
      );

      // Rain indicator
      if (day.totalRainMm > 0) {
        container.add(
          this.scene.add.text(x + cardWidth / 2, y + 76, `${day.totalRainMm}mm`, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: '#4fc3f7',
          }).setOrigin(0.5, 0),
        );
      }
    }

    y += 100;

    // T-0790: Pattern analysis
    if (pattern) {
      y += 10;
      const trendIcon = pattern.trend === 'warming' ? '↗' : pattern.trend === 'cooling' ? '↘' : '→';
      const trendColor = pattern.trend === 'warming' ? '#e94560' : pattern.trend === 'cooling' ? '#4fc3f7' : COLORS.textSecondary;

      container.add(
        this.scene.add.text(0, y, `Pattern: ${pattern.consecutiveDays} days of ${pattern.condition} ${trendIcon}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: trendColor,
        }),
      );
      y += 18;

      if (pattern.predictionBonus > 0) {
        container.add(
          this.scene.add.text(0, y, `Prediction bonus: +${Math.round(pattern.predictionBonus * 100)}%`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#4ecca3',
          }),
        );
        y += 18;
      }
    }
  }

  private renderHistory(
    container: Phaser.GameObjects.Container,
    history: HistoryEntry[],
  ): void {
    let y = 220;

    // Separator
    const sep = this.scene.add.graphics();
    sep.lineStyle(1, COLORS.panelBorder, 0.5);
    sep.lineBetween(0, y, 520, y);
    container.add(sep);
    y += 12;

    // History header
    container.add(
      this.scene.add.text(0, y, 'Past 7 Days', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    if (history.length === 0) {
      container.add(
        this.scene.add.text(0, y, 'No weather history yet. Play for a few days to see trends.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 480 },
        }),
      );
      return;
    }

    // History table
    for (const entry of history) {
      const emote = WEATHER_EMOTES[entry.condition] || '☀';
      const dateLabel = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      container.add(
        this.scene.add.text(0, y, dateLabel, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }),
      );

      container.add(
        this.scene.add.text(120, y, `${emote} ${entry.condition}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textPrimary,
        }),
      );

      container.add(
        this.scene.add.text(250, y, `${Math.round(entry.temperature)}°C`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }),
      );

      container.add(
        this.scene.add.text(310, y, `${entry.humidity}%`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }),
      );

      if (entry.rainMm > 0) {
        container.add(
          this.scene.add.text(370, y, `${entry.rainMm}mm`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#4fc3f7',
          }),
        );
      }

      y += 20;
    }
  }

  // ---- T-0779: Weather visual effects ----

  /** Apply weather visual effects to the scene */
  applyWeatherVisuals(condition: string): void {
    this.clearWeatherVisuals();

    switch (condition) {
      case 'rainy':
        this.createRainEffect();
        break;
      case 'snowy':
        this.createSnowEffect();
        break;
      case 'clear':
      case 'hot':
        this.createSunGlow();
        break;
      case 'foggy':
        this.createFogOverlay();
        break;
      case 'stormy':
        this.createRainEffect();
        this.createStormFlash();
        break;
    }
  }

  private createRainEffect(): void {
    // Create rain particle texture
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x4fc3f7, 0.6);
    gfx.fillRect(0, 0, 2, 8);
    gfx.generateTexture('rain_drop', 2, 8);
    gfx.destroy();

    this.rainEmitter = this.scene.add.particles(0, -20, 'rain_drop', {
      x: { min: 0, max: 1280 },
      y: -20,
      lifespan: 1500,
      speedY: { min: 300, max: 500 },
      speedX: { min: -30, max: -60 },
      quantity: 3,
      alpha: { start: 0.6, end: 0.1 },
      scale: { start: 1, end: 0.5 },
    });
  }

  private createSnowEffect(): void {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillCircle(3, 3, 3);
    gfx.generateTexture('snow_flake', 6, 6);
    gfx.destroy();

    this.snowEmitter = this.scene.add.particles(0, -20, 'snow_flake', {
      x: { min: 0, max: 1280 },
      y: -20,
      lifespan: 4000,
      speedY: { min: 50, max: 120 },
      speedX: { min: -20, max: 20 },
      quantity: 1,
      alpha: { start: 0.8, end: 0.2 },
      scale: { start: 1, end: 0.3 },
    });
  }

  private createSunGlow(): void {
    this.sunGlow = this.scene.add.graphics();
    this.sunGlow.fillStyle(0xffd700, 0.05);
    this.sunGlow.fillCircle(1000, 50, 200);
    this.sunGlow.setDepth(-1);
  }

  private createFogOverlay(): void {
    this.fogOverlay = this.scene.add.graphics();
    this.fogOverlay.fillStyle(0xcccccc, 0.08);
    this.fogOverlay.fillRect(0, 0, 1280, 720);
    this.fogOverlay.setDepth(100);
  }

  private createStormFlash(): void {
    // Periodic lightning flash
    this.scene.time.addEvent({
      delay: 5000 + Math.random() * 10000,
      callback: () => {
        const flash = this.scene.add.graphics();
        flash.fillStyle(0xffffff, 0.3);
        flash.fillRect(0, 0, 1280, 720);
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 200,
          onComplete: () => flash.destroy(),
        });
      },
      loop: true,
    });
  }

  clearWeatherVisuals(): void {
    this.rainEmitter?.destroy();
    this.rainEmitter = null;
    this.snowEmitter?.destroy();
    this.snowEmitter = null;
    this.sunGlow?.destroy();
    this.sunGlow = null;
    this.fogOverlay?.destroy();
    this.fogOverlay = null;
  }

  // ---- T-0780: Weather ambient sounds ----

  /** Apply ambient sounds based on weather (expects sound keys loaded in scene) */
  applyWeatherAmbience(condition: string): void {
    // Stop all weather sounds first
    const soundKeys = ['rain_ambient', 'wind_ambient', 'storm_ambient', 'snow_ambient', 'birds_ambient'];
    for (const key of soundKeys) {
      if (this.scene.sound.get(key)) {
        this.scene.sound.stopByKey(key);
      }
    }

    // Play appropriate ambient sound if the asset exists
    const soundMap: Record<string, string> = {
      rainy: 'rain_ambient',
      stormy: 'storm_ambient',
      windy: 'wind_ambient',
      snowy: 'snow_ambient',
      clear: 'birds_ambient',
    };

    const soundKey = soundMap[condition];
    if (soundKey && this.scene.cache.audio.exists(soundKey)) {
      this.scene.sound.play(soundKey, { loop: true, volume: 0.3 });
    }
  }

  destroy(): void {
    this.clearWeatherVisuals();
    this.modal?.destroy();
    this.modal = null;
  }
}
