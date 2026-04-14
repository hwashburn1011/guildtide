/**
 * Observatory building UI showing real-world data readings and prediction accuracy.
 *
 * T-0339: Observatory building — real-world data insight bonuses
 * T-0341: Observatory UI showing current real-world data readings
 * T-0342: Observatory prediction accuracy bonus per level
 * T-0343: Observatory upgrade effects (more data sources, better predictions)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIProgressBar } from './components/UIProgressBar';
import { apiClient } from '../api/client';
import type { Building } from '@shared/types';

export class ObservatoryPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(building: Building): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Observatory — Insights',
      width: 500,
      height: 420,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const worldState = await apiClient.getWorldState();
      this.renderObservatory(content, building, worldState);
    } catch {
      content.add(
        this.scene.add.text(200, 60, 'Failed to load observatory data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderObservatory(
    container: Phaser.GameObjects.Container,
    building: Building,
    worldState: any,
  ): void {
    let y = 0;
    const level = building.level;
    const accuracy = Math.min(50 + level * 3, 95);
    const dataSources = Math.min(1 + Math.floor(level / 2), 8);

    container.add(
      this.scene.add.text(0, y, `Level ${level} Observatory`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    container.add(
      this.scene.add.text(0, y, `Prediction Accuracy: ${accuracy}%  |  Data Sources: ${dataSources}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 30;

    // Accuracy bar
    const accBar = new UIProgressBar(this.scene, {
      x: 0,
      y,
      width: 400,
      height: 18,
      value: accuracy,
      maxValue: 100,
      fillColor: accuracy > 75 ? COLORS.success : accuracy > 50 ? COLORS.warning : COLORS.danger,
      label: `${accuracy}% accuracy`,
    });
    container.add(accBar);
    y += 35;

    // World data readings
    container.add(
      this.scene.add.text(0, y, 'Current World Readings:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    const weather = worldState?.weather;
    const season = worldState?.season ?? 'unknown';

    const readings = [
      { label: 'Season', value: season, color: COLORS.textPrimary },
      { label: 'Weather', value: weather?.condition ?? 'unknown', color: COLORS.textSecondary },
      { label: 'Temperature', value: `${weather?.temperature ?? '--'}C`, color: COLORS.textSecondary },
      { label: 'Humidity', value: `${weather?.humidity ?? '--'}%`, color: COLORS.textSecondary },
      { label: 'Wind Speed', value: `${weather?.windSpeed ?? '--'} km/h`, color: COLORS.textSecondary },
      { label: 'Rain', value: `${weather?.rainMm ?? 0} mm`, color: COLORS.textSecondary },
    ];

    for (const reading of readings) {
      container.add(
        this.scene.add.text(15, y, `${reading.label}:`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }),
      );

      container.add(
        this.scene.add.text(170, y, reading.value, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: reading.color,
        }),
      );

      y += 22;
    }

    y += 15;

    // Prediction info
    container.add(
      this.scene.add.text(0, y, 'Predictions:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: '#9b59b6',
        fontStyle: 'bold',
      }),
    );
    y += 22;

    const predictions = [
      'Weather patterns are analyzed to predict future modifiers.',
      `At ${accuracy}% accuracy, predictions are ${accuracy > 75 ? 'highly reliable' : accuracy > 50 ? 'moderately useful' : 'still unreliable'}.`,
      'Higher observatory levels reveal more data sources and improve forecasting.',
    ];

    for (const pred of predictions) {
      container.add(
        this.scene.add.text(15, y, pred, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 380 },
        }),
      );
      y += 20;
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
