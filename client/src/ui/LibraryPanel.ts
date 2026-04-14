/**
 * Library building UI showing current research boost and book collection.
 * (Uses Laboratory building type in the data model.)
 *
 * T-0319: Library building — research speed bonus
 * T-0321: Library UI showing current research boost and book collection
 * T-0322: Library research speed multiplier per level
 * T-0323: Library upgrade effects (faster research, unlock branches)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIProgressBar } from './components/UIProgressBar';
import { apiClient } from '../api/client';
import type { Building } from '@shared/types';

export class LibraryPanel {
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
      title: 'Library — Research',
      width: 480,
      height: 380,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const [detail, research] = await Promise.all([
        apiClient.getExtendedBuildingDetail(building.type),
        apiClient.getResearchState(),
      ]);
      this.renderLibrary(content, building, detail, research);
    } catch {
      content.add(
        this.scene.add.text(190, 60, 'Failed to load library data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderLibrary(
    container: Phaser.GameObjects.Container,
    building: Building,
    detail: any,
    research: any,
  ): void {
    let y = 0;
    const level = building.level;
    const speedMult = (1 + level * 0.08).toFixed(2);

    container.add(
      this.scene.add.text(0, y, `Level ${level} Library`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 30;

    container.add(
      this.scene.add.text(0, y, `Research Speed: ${speedMult}x`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: '#4ecca3',
        fontStyle: 'bold',
      }),
    );
    y += 25;

    // Essence production
    const essenceOutput = detail.currentOutput?.essence ?? 0;
    container.add(
      this.scene.add.text(0, y, `Essence/hr: ${(essenceOutput * 3600).toFixed(1)}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 30;

    // Research status
    container.add(
      this.scene.add.text(0, y, 'Research Status:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 22;

    const completed = research?.completed?.length ?? 0;
    const active = research?.active;

    container.add(
      this.scene.add.text(0, y, `Completed: ${completed} researches`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 20;

    if (active) {
      container.add(
        this.scene.add.text(0, y, `Active: ${active.researchId}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#ffd700',
        }),
      );
      y += 20;

      // Progress bar
      const elapsed = (Date.now() - new Date(active.startedAt).getTime()) / 1000;
      const progress = Math.min((elapsed / active.duration) * 100, 100);
      const bar = new UIProgressBar(this.scene, {
        x: 0,
        y,
        width: 380,
        height: 16,
        value: progress,
        maxValue: 100,
        fillColor: COLORS.success,
        label: `${Math.round(progress)}%`,
      });
      container.add(bar);
      y += 35;
    } else {
      container.add(
        this.scene.add.text(0, y, 'No active research. Start one from the Research panel!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
          fontStyle: 'italic',
        }),
      );
      y += 30;
    }

    // Book collection (based on level)
    container.add(
      this.scene.add.text(0, y, 'Book Collection:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 20;

    const bookCount = level * 5 + completed * 2;
    container.add(
      this.scene.add.text(0, y, `${bookCount} tomes collected`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#9b59b6',
      }),
    );
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
