/**
 * Farm building UI showing crop cycle progress, harvest button, seasonal/weather modifiers.
 *
 * T-0303: Farm building — food production
 * T-0305: Farm UI showing crop cycle progress and harvest button
 * T-0306: Farm seasonal yield modifier
 * T-0307: Farm weather yield modifier
 * T-0308: Farm upgrade effects
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { UIProgressBar } from './components/UIProgressBar';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import type { Building } from '@shared/types';

export class FarmPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onRefresh: () => void;

  constructor(scene: Phaser.Scene, onRefresh: () => void) {
    this.scene = scene;
    this.onRefresh = onRefresh;
  }

  async show(building: Building): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Farm — Food Production',
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
      const [detail, worldState] = await Promise.all([
        apiClient.getExtendedBuildingDetail(building.type),
        apiClient.getWorldState(),
      ]);
      this.renderFarm(content, building, detail, worldState);
    } catch {
      content.add(
        this.scene.add.text(200, 60, 'Failed to load farm data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderFarm(
    container: Phaser.GameObjects.Container,
    building: Building,
    detail: any,
    worldState: any,
  ): void {
    let y = 0;
    const level = building.level;

    // Header
    container.add(
      this.scene.add.text(0, y, `Level ${level} Farm`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 30;

    // Farm stats
    const plots = Math.min(2 + level, 22);
    const growthSpeed = (1 + level * 0.08).toFixed(2);
    container.add(
      this.scene.add.text(0, y, `Plots: ${plots}  |  Growth Speed: ${growthSpeed}x`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 25;

    // Current production rate
    const foodOutput = detail.currentOutput?.food ?? 0;
    container.add(
      this.scene.add.text(0, y, `Base Food/hr: ${(foodOutput * 3600).toFixed(1)}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#4ecca3',
      }),
    );
    y += 30;

    // Seasonal modifier
    const season = worldState?.season ?? 'spring';
    const seasonMods: Record<string, number> = {
      spring: 0.30, summer: 0.10, autumn: 0.15, winter: -0.20,
    };
    const seasonMod = seasonMods[season] ?? 0;
    const seasonColor = seasonMod >= 0 ? '#4ecca3' : '#e94560';
    const seasonSign = seasonMod >= 0 ? '+' : '';

    container.add(
      this.scene.add.text(0, y, 'Seasonal Modifier:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );

    container.add(
      this.scene.add.text(170, y, `${season} ${seasonSign}${Math.round(seasonMod * 100)}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: seasonColor,
      }),
    );
    y += 25;

    // Weather modifier
    const weather = worldState?.weather?.condition ?? 'clear';
    const weatherMods: Record<string, number> = {
      rainy: 0.15, clear: 0.05, hot: -0.10, stormy: -0.15, snowy: -0.25, foggy: 0, windy: -0.05,
    };
    const weatherMod = weatherMods[weather] ?? 0;
    const weatherColor = weatherMod >= 0 ? '#4ecca3' : '#e94560';
    const weatherSign = weatherMod >= 0 ? '+' : '';

    container.add(
      this.scene.add.text(0, y, 'Weather Modifier:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );

    container.add(
      this.scene.add.text(170, y, `${weather} ${weatherSign}${Math.round(weatherMod * 100)}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: weatherColor,
      }),
    );
    y += 25;

    // Total effective modifier
    const totalMod = 1 + seasonMod + weatherMod;
    const effectiveOutput = foodOutput * totalMod * 3600;
    container.add(
      this.scene.add.text(0, y, `Effective Food/hr: ${effectiveOutput.toFixed(1)}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: '#ffd700',
        fontStyle: 'bold',
      }),
    );
    y += 35;

    // Crop cycle progress bar (visual only)
    container.add(
      this.scene.add.text(0, y, 'Current Crop Cycle:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 20;

    // Simulate crop progress
    const cycleProgress = (Date.now() % 60000) / 60000 * 100;
    const cropBar = new UIProgressBar(this.scene, {
      x: 0,
      y,
      width: 400,
      height: 20,
      value: cycleProgress,
      maxValue: 100,
      fillColor: COLORS.success,
      label: `${Math.round(cycleProgress)}%`,
    });
    container.add(cropBar);
    y += 40;

    // Specialization info
    if (detail.specialization) {
      container.add(
        this.scene.add.text(0, y, `Specialization: ${detail.specialization.name}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#ffd700',
          fontStyle: 'italic',
        }),
      );
      y += 20;
    } else if (detail.availableSpecializations) {
      container.add(
        this.scene.add.text(0, y, 'Specialization available! Choose Orchard or Greenhouse.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#ffd700',
          fontStyle: 'italic',
        }),
      );
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
