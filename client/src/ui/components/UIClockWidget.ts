import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface UIClockWidgetConfig {
  x: number;
  y: number;
  season?: Season;
  dateText?: string;
}

const SEASON_ICONS: Record<Season, string> = {
  spring: '\u2741',  // flower
  summer: '\u2600',  // sun
  autumn: '\u2618',  // leaf
  winter: '\u2744',  // snowflake
};

const SEASON_COLORS: Record<Season, string> = {
  spring: '#4ecca3',
  summer: '#ffd700',
  autumn: '#f5a623',
  winter: '#a0d2db',
};

/**
 * Small display showing current season icon + name, real date.
 * Suitable for header bar use.
 */
export class UIClockWidget extends Phaser.GameObjects.Container {
  private seasonIcon: Phaser.GameObjects.Text;
  private seasonText: Phaser.GameObjects.Text;
  private dateDisplay: Phaser.GameObjects.Text;
  private currentSeason: Season;

  constructor(scene: Phaser.Scene, config: UIClockWidgetConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.currentSeason = config.season ?? 'spring';

    // Season icon
    this.seasonIcon = scene.add.text(0, 0, SEASON_ICONS[this.currentSeason], {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: SEASON_COLORS[this.currentSeason],
    });
    this.seasonIcon.setOrigin(0, 0.5);
    this.add(this.seasonIcon);

    // Season name
    this.seasonText = scene.add.text(24, 0, this.capitalize(this.currentSeason), {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.seasonText.setOrigin(0, 0.5);
    this.add(this.seasonText);

    // Date display
    const dateStr = config.dateText ?? this.getFormattedDate();
    this.dateDisplay = scene.add.text(24, 14, dateStr, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    this.dateDisplay.setOrigin(0, 0.5);
    this.add(this.dateDisplay);
  }

  setSeason(season: Season): void {
    this.currentSeason = season;
    this.seasonIcon.setText(SEASON_ICONS[season]);
    this.seasonIcon.setColor(SEASON_COLORS[season]);
    this.seasonText.setText(this.capitalize(season));
  }

  setDate(dateText: string): void {
    this.dateDisplay.setText(dateText);
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private getFormattedDate(): string {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
