import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIModal } from './components/UIModal';
import { UIScrollableList } from './components/UIScrollableList';
import { apiClient } from '../api/client';

interface ActivityEntry {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

const TYPE_COLORS: Record<string, string> = {
  level_up: '#ffd700',
  building_construct: '#4ecca3',
  building_upgrade: '#4ecca3',
  building_demolish: '#e94560',
  building_queued: '#2980b9',
  daily_reward: '#f5a623',
  hero_recruit: '#8e44ad',
  expedition_complete: '#1abc9c',
  market_trade: '#e67e22',
  research_complete: '#3498db',
};

export class GuildActivityPanel {
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
      title: 'Guild Activity',
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
      const feed = await apiClient.getGuildActivity(30);
      loading.destroy();
      this.renderFeed(content, feed);
    } catch {
      loading.setText('Failed to load activity');
    }
  }

  private renderFeed(
    container: Phaser.GameObjects.Container,
    feed: ActivityEntry[],
  ): void {
    if (feed.length === 0) {
      container.add(
        this.scene.add.text(220, 100, 'No activity yet', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5),
      );
      return;
    }

    const scrollList = new UIScrollableList(this.scene, {
      x: 0,
      y: 0,
      width: 490,
      height: 380,
    });

    const listContent = scrollList.getContentContainer();
    const rowHeight = 44;

    feed.forEach((entry, i) => {
      const y = i * rowHeight;
      const color = TYPE_COLORS[entry.type] ?? COLORS.textSecondary;

      // Type indicator dot
      const dot = this.scene.add.graphics();
      dot.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
      dot.fillCircle(8, y + 14, 5);
      listContent.add(dot);

      // Message
      listContent.add(
        this.scene.add.text(22, y + 2, entry.message, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          wordWrap: { width: 370 },
        }),
      );

      // Time
      const timeAgo = this.formatTimeAgo(entry.timestamp);
      listContent.add(
        this.scene.add.text(480, y + 4, timeAgo, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }).setOrigin(1, 0),
      );

      // Separator
      if (i < feed.length - 1) {
        const line = this.scene.add.graphics();
        line.lineStyle(1, COLORS.panelBorder, 0.2);
        line.lineBetween(0, y + rowHeight - 2, 480, y + rowHeight - 2);
        listContent.add(line);
      }
    });

    scrollList.refreshScroll(feed.length * rowHeight);
    container.add(scrollList);
  }

  private formatTimeAgo(timestamp: string): string {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
