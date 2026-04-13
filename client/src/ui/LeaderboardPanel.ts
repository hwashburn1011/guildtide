import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { apiClient } from '../api/client';

const CATEGORIES = [
  { key: 'guild_level', label: 'Guild Level' },
  { key: 'wealth', label: 'Wealth' },
  { key: 'expedition_count', label: 'Expeditions' },
  { key: 'trade_volume', label: 'Trade Volume' },
  { key: 'hero_power', label: 'Hero Power' },
  { key: 'alliance_rank', label: 'Alliance' },
];

export class LeaderboardPanel {
  public container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private contentItems: Phaser.GameObjects.Container[] = [];
  private currentCategory: string = 'guild_level';
  private currentPeriod: 'weekly' | 'alltime' = 'alltime';
  private catButtons: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.container = scene.add.container(x, y);
    this.buildUI();
  }

  private buildUI(): void {
    // Background
    const bg = this.scene.add.rectangle(0, 0, this.width, this.height, COLORS.panelBg, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.panelBorder);
    this.container.add(bg);

    // Category tabs
    CATEGORIES.forEach((cat, i) => {
      const btn = this.scene.add.text(15 + i * 105, 10, cat.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: this.currentCategory === cat.key ? COLORS.textGold : COLORS.textSecondary,
      })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectCategory(cat.key));
      this.catButtons.push(btn);
      this.container.add(btn);
    });

    // Period toggle
    const periodBtn = this.scene.add.text(this.width - 80, 10, 'All Time', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: '#4ecca3',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.currentPeriod = this.currentPeriod === 'alltime' ? 'weekly' : 'alltime';
        periodBtn.setText(this.currentPeriod === 'alltime' ? 'All Time' : 'Weekly');
        this.refresh();
      });
    this.container.add(periodBtn);

    // Separator
    const sep = this.scene.add.rectangle(this.width / 2, 30, this.width - 20, 1, COLORS.panelBorder)
      .setOrigin(0.5, 0);
    this.container.add(sep);

    // Column headers
    const headers = [
      { text: '#', x: 15 },
      { text: 'Player', x: 50 },
      { text: 'Guild', x: 250 },
      { text: 'Score', x: 450 },
      { text: 'Change', x: 550 },
    ];
    headers.forEach((h) => {
      const text = this.scene.add.text(h.x, 38, h.text, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      });
      this.container.add(text);
    });
  }

  private selectCategory(category: string): void {
    this.currentCategory = category;
    this.catButtons.forEach((btn, i) => {
      btn.setColor(CATEGORIES[i].key === category ? COLORS.textGold : COLORS.textSecondary);
    });
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.clearContent();

    try {
      const board = await apiClient.getLeaderboard(this.currentCategory, this.currentPeriod);
      const entries = board.entries || [];
      let y = 58;

      for (const entry of entries.slice(0, 20)) {
        const row = this.createRow(entry, y);
        this.contentItems.push(row);
        this.container.add(row);
        y += 25;
      }

      // Show player's own rank if not in top 20
      if (board.playerRank && board.playerRank.rank > 20) {
        y += 10;
        const sep = this.scene.add.rectangle(this.width / 2, y, this.width - 30, 1, COLORS.panelBorder)
          .setOrigin(0.5, 0);
        const sepC = this.scene.add.container(0, 0, [sep]);
        this.contentItems.push(sepC);
        this.container.add(sepC);
        y += 8;

        const myRow = this.createRow(board.playerRank, y, true);
        this.contentItems.push(myRow);
        this.container.add(myRow);
      }

      if (entries.length === 0) {
        const noData = this.scene.add.text(15, 60, 'No leaderboard data available yet.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        });
        const c = this.scene.add.container(0, 0, [noData]);
        this.contentItems.push(c);
        this.container.add(c);
      }
    } catch (err) {
      console.error('Load leaderboard error:', err);
    }
  }

  private createRow(entry: any, y: number, highlight: boolean = false): Phaser.GameObjects.Container {
    const c = this.scene.add.container(0, y);

    const textColor = highlight ? COLORS.textGold : COLORS.textPrimary;

    // Rank - color top 3
    const rankColor = entry.rank === 1 ? '#ffd700'
      : entry.rank === 2 ? '#c0c0c0'
      : entry.rank === 3 ? '#cd7f32'
      : textColor;

    const rank = this.scene.add.text(15, 0, `${entry.rank}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: rankColor,
    });
    c.add(rank);

    // Player name
    const name = this.scene.add.text(50, 0, entry.username, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: textColor,
    });
    c.add(name);

    // Guild name
    const guild = this.scene.add.text(250, 0, entry.guildName, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    });
    c.add(guild);

    // Score
    const score = this.scene.add.text(450, 0, `${entry.score.toLocaleString()}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: textColor,
    });
    c.add(score);

    // Rank change
    if (entry.previousRank !== null && entry.previousRank !== undefined) {
      const diff = entry.previousRank - entry.rank;
      const changeText = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '--';
      const changeColor = diff > 0 ? '#4ecca3' : diff < 0 ? '#e94560' : COLORS.textSecondary;
      const change = this.scene.add.text(550, 0, changeText, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: changeColor,
      });
      c.add(change);
    }

    return c;
  }

  private clearContent(): void {
    for (const item of this.contentItems) {
      item.destroy();
    }
    this.contentItems = [];
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
