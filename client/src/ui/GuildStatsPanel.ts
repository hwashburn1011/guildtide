import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIModal } from './components/UIModal';
import { UIScrollableList } from './components/UIScrollableList';
import { apiClient } from '../api/client';

interface GuildStats {
  totalBuildingsConstructed: number;
  totalExpeditionsCompleted: number;
  totalResourcesEarned: number;
  totalHeroesRecruited: number;
  totalResearchCompleted: number;
  totalMarketTrades: number;
  guildAgeDays: number;
  loginStreak: number;
}

export class GuildStatsPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Guild Statistics',
      width: 500,
      height: 450,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();

    // Loading text
    const loading = this.scene.add.text(200, 80, 'Loading...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);
    content.add(loading);

    this.modal.open();

    try {
      const stats = await apiClient.getGuildStats();
      loading.destroy();
      this.renderStats(content, stats);
    } catch {
      loading.setText('Failed to load stats');
    }
  }

  private renderStats(
    container: Phaser.GameObjects.Container,
    stats: GuildStats,
  ): void {
    const rows: Array<[string, string]> = [
      ['Guild Age', `${stats.guildAgeDays} day${stats.guildAgeDays !== 1 ? 's' : ''}`],
      ['Login Streak', `${stats.loginStreak} day${stats.loginStreak !== 1 ? 's' : ''}`],
      ['Buildings', `${stats.totalBuildingsConstructed}`],
      ['Heroes Recruited', `${stats.totalHeroesRecruited}`],
      ['Expeditions Completed', `${stats.totalExpeditionsCompleted}`],
      ['Research Completed', `${stats.totalResearchCompleted}`],
      ['Market Trades', `${stats.totalMarketTrades}`],
      ['Total Resources', `${stats.totalResourcesEarned.toLocaleString()}`],
    ];

    rows.forEach(([label, value], i) => {
      const y = i * 36;

      // Label
      container.add(
        this.scene.add.text(0, y, label, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textSecondary,
        }),
      );

      // Value (right-aligned)
      container.add(
        this.scene.add.text(420, y, value, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
        }).setOrigin(1, 0),
      );

      // Separator line
      if (i < rows.length - 1) {
        const line = this.scene.add.graphics();
        line.lineStyle(1, COLORS.panelBorder, 0.3);
        line.lineBetween(0, y + 28, 420, y + 28);
        container.add(line);
      }
    });
  }
}
