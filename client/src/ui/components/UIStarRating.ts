import * as Phaser from 'phaser';
import { FONTS } from '../../config';

export interface UIStarRatingConfig {
  x: number;
  y: number;
  rating: number;
  maxStars?: number;
  size?: number;
  filledColor?: string;
  emptyColor?: string;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

/**
 * 1-5 star display with filled/empty stars.
 * Optionally interactive for user input.
 */
export class UIStarRating extends Phaser.GameObjects.Container {
  private stars: Phaser.GameObjects.Text[] = [];
  private currentRating: number;
  private maxStars: number;
  private filledColor: string;
  private emptyColor: string;
  private isInteractive: boolean;
  private onChange?: (rating: number) => void;

  private static readonly FILLED = '\u2605';
  private static readonly EMPTY = '\u2606';

  constructor(scene: Phaser.Scene, config: UIStarRatingConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.currentRating = config.rating;
    this.maxStars = config.maxStars ?? 5;
    this.filledColor = config.filledColor ?? '#ffd700';
    this.emptyColor = config.emptyColor ?? '#555566';
    this.isInteractive = config.interactive ?? false;
    this.onChange = config.onChange;

    const size = config.size ?? FONTS.sizes.body;
    const spacing = size + 4;

    for (let i = 0; i < this.maxStars; i++) {
      const isFilled = i < this.currentRating;
      const star = scene.add.text(i * spacing, 0, isFilled ? UIStarRating.FILLED : UIStarRating.EMPTY, {
        fontFamily: FONTS.primary,
        fontSize: `${size}px`,
        color: isFilled ? this.filledColor : this.emptyColor,
      });
      star.setOrigin(0, 0.5);

      if (this.isInteractive) {
        star.setInteractive({ useHandCursor: true });
        const starIndex = i;
        star.on('pointerdown', () => {
          this.setRating(starIndex + 1);
          this.onChange?.(this.currentRating);
        });
        star.on('pointerover', () => {
          this.highlightStars(starIndex + 1);
        });
        star.on('pointerout', () => {
          this.drawStars();
        });
      }

      this.stars.push(star);
      this.add(star);
    }
  }

  private drawStars(): void {
    this.stars.forEach((star, i) => {
      const isFilled = i < this.currentRating;
      star.setText(isFilled ? UIStarRating.FILLED : UIStarRating.EMPTY);
      star.setColor(isFilled ? this.filledColor : this.emptyColor);
    });
  }

  private highlightStars(hoverRating: number): void {
    this.stars.forEach((star, i) => {
      const isFilled = i < hoverRating;
      star.setText(isFilled ? UIStarRating.FILLED : UIStarRating.EMPTY);
      star.setColor(isFilled ? this.filledColor : this.emptyColor);
    });
  }

  getRating(): number {
    return this.currentRating;
  }

  setRating(rating: number): void {
    this.currentRating = Phaser.Math.Clamp(rating, 0, this.maxStars);
    this.drawStars();
  }
}
