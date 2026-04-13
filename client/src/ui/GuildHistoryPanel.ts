import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIScrollableList } from './components/UIScrollableList';
import { apiClient } from '../api/client';

/**
 * Guild hall changelog/history showing all player actions.
 * Fetches from the activity feed with a larger limit.
 */
export class GuildHistoryPanel {
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
      title: 'Guild History',
      width: 550,
      height: 500,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    const loading = this.scene.add.text(220, 100, 'Loading...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);
    content.add(loading);
    this.modal.open();

    try {
      const feed = await apiClient.getGuildActivity(50);
      loading.destroy();

      if (feed.length === 0) {
        content.add(
          this.scene.add.text(220, 100, 'No history yet', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.body}px`,
            color: COLORS.textSecondary,
          }).setOrigin(0.5),
        );
        return;
      }

      const scrollList = new UIScrollableList(this.scene, {
        x: 0, y: 0,
        width: 490,
        height: 380,
      });
      const listContent = scrollList.getContentContainer();
      const rowH = 32;

      feed.forEach((entry, i) => {
        const y = i * rowH;
        const date = new Date(entry.timestamp);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

        listContent.add(
          this.scene.add.text(0, y + 4, dateStr, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          }),
        );

        listContent.add(
          this.scene.add.text(85, y + 4, entry.message, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textPrimary,
            wordWrap: { width: 380 },
          }),
        );

        if (i < feed.length - 1) {
          const line = this.scene.add.graphics();
          line.lineStyle(1, COLORS.panelBorder, 0.15);
          line.lineBetween(0, y + rowH - 1, 480, y + rowH - 1);
          listContent.add(line);
        }
      });

      scrollList.refreshScroll(feed.length * rowH);
      content.add(scrollList);
    } catch {
      loading.setText('Failed to load history');
    }
  }
}
