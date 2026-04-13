import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'windy';

export interface UIWeatherWidgetConfig {
  x: number;
  y: number;
  condition?: WeatherCondition;
}

const WEATHER_ICONS: Record<WeatherCondition, string> = {
  sunny: '\u2600',
  cloudy: '\u2601',
  rainy: '\u2602',
  stormy: '\u26a1',
  snowy: '\u2744',
  foggy: '\u2588',
  windy: '\u2634',
};

const WEATHER_COLORS: Record<WeatherCondition, string> = {
  sunny: '#ffd700',
  cloudy: '#a0a0b0',
  rainy: '#6ea8d7',
  stormy: '#e94560',
  snowy: '#e0f0ff',
  foggy: '#888899',
  windy: '#a0d2db',
};

/**
 * Compact weather icon + condition text for header bar use.
 */
export class UIWeatherWidget extends Phaser.GameObjects.Container {
  private weatherIcon: Phaser.GameObjects.Text;
  private conditionText: Phaser.GameObjects.Text;
  private currentCondition: WeatherCondition;

  constructor(scene: Phaser.Scene, config: UIWeatherWidgetConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.currentCondition = config.condition ?? 'sunny';

    this.weatherIcon = scene.add.text(0, 0, WEATHER_ICONS[this.currentCondition], {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: WEATHER_COLORS[this.currentCondition],
    });
    this.weatherIcon.setOrigin(0, 0.5);
    this.add(this.weatherIcon);

    this.conditionText = scene.add.text(24, 0, this.capitalize(this.currentCondition), {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
    });
    this.conditionText.setOrigin(0, 0.5);
    this.add(this.conditionText);
  }

  setCondition(condition: WeatherCondition): void {
    this.currentCondition = condition;
    this.weatherIcon.setText(WEATHER_ICONS[condition]);
    this.weatherIcon.setColor(WEATHER_COLORS[condition]);
    this.conditionText.setText(this.capitalize(condition));
  }

  getCondition(): WeatherCondition {
    return this.currentCondition;
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
