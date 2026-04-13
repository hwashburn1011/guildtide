/**
 * EventHistoryPanel — Past events browser with filters.
 *
 * T-0870: Event log page showing all past events and outcomes
 * T-0935: Event statistics page (most common event, best outcomes)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

interface EventLogEntry {
  id: string;
  message: string;
  createdAt: string;
  data: {
    templateId: string;
    category: string;
    rarity: string;
    choiceIndex: number;
    success: boolean;
    rewards: Record<string, number> | null;
    chainId?: string;
  } | null;
}

interface EventStats {
  totalEvents: number;
  successRate: number;
  mostCommonCategory: string;
  bestOutcome: string | null;
  totalRewardsEarned: Record<string, number>;
  eventsByCategory: Record<string, number>;
  eventsByRarity: Record<string, number>;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#4ecca3',
  rare: '#5b9bd5',
  legendary: '#ffd700',
};

const CATEGORY_LABELS: Record<string, string> = {
  weather: 'Weather',
  economy: 'Economy',
  military: 'Military',
  exploration: 'Exploration',
  social: 'Social',
  magical: 'Magical',
  seasonal: 'Seasonal',
  crisis: 'Crisis',
  opportunity: 'Opportunity',
};

export class EventHistoryPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private currentFilter: string = 'all';
  private currentTab: 'log' | 'stats' = 'log';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(): Promise<void> {
    this.hide();
    await this.render();
  }

  private async render(): Promise<void> {
    this.overlay?.destroy();
    this.container?.destroy(true);

    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(100);

    this.container = this.scene.add.container(0, 0).setDepth(101);

    const panelW = 700;
    const panelH = 520;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    // Close button
    const closeBtn = this.scene.add
      .text(px + panelW - 20, py + 15, 'X', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textSecondary,
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // Title
    this.container.add(
      this.scene.add.text(px + 25, py + 20, 'Event History', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );

    // Tab buttons
    const logTabBtn = this.scene.add
      .text(px + 25, py + 55, 'Log', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: this.currentTab === 'log' ? COLORS.textAccent : COLORS.textSecondary,
        fontStyle: this.currentTab === 'log' ? 'bold' : 'normal',
      })
      .setInteractive({ useHandCursor: true });
    logTabBtn.on('pointerup', async () => {
      this.currentTab = 'log';
      await this.render();
    });
    this.container.add(logTabBtn);

    const statsTabBtn = this.scene.add
      .text(px + 80, py + 55, 'Statistics', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: this.currentTab === 'stats' ? COLORS.textAccent : COLORS.textSecondary,
        fontStyle: this.currentTab === 'stats' ? 'bold' : 'normal',
      })
      .setInteractive({ useHandCursor: true });
    statsTabBtn.on('pointerup', async () => {
      this.currentTab = 'stats';
      await this.render();
    });
    this.container.add(statsTabBtn);

    if (this.currentTab === 'log') {
      await this.renderLog(px, py, panelW, panelH);
    } else {
      await this.renderStats(px, py, panelW, panelH);
    }
  }

  private async renderLog(px: number, py: number, panelW: number, panelH: number): Promise<void> {
    let logs: EventLogEntry[];
    try {
      const opts = this.currentFilter !== 'all' ? { category: this.currentFilter } : undefined;
      logs = await apiClient.getEventLog(opts);
    } catch {
      logs = [];
    }

    // Filter buttons
    const filters = ['all', ...Object.keys(CATEGORY_LABELS)];
    let filterX = px + 25;
    const filterY = py + 82;

    for (const filter of filters) {
      const label = filter === 'all' ? 'All' : (CATEGORY_LABELS[filter] || filter);
      const isActive = this.currentFilter === filter;

      const btn = this.scene.add
        .text(filterX, filterY, label, {
          fontFamily: FONTS.primary,
          fontSize: '11px',
          color: isActive ? COLORS.textAccent : COLORS.textSecondary,
          backgroundColor: isActive ? 'rgba(233,69,96,0.2)' : 'rgba(0,0,0,0.3)',
          padding: { x: 6, y: 3 },
        })
        .setInteractive({ useHandCursor: true });

      btn.on('pointerup', async () => {
        this.currentFilter = filter;
        await this.render();
      });

      this.container!.add(btn);
      filterX += btn.width + 6;
    }

    // Event entries
    let yOffset = py + 110;
    if (logs.length === 0) {
      this.container!.add(
        this.scene.add.text(px + 25, yOffset, 'No events recorded yet.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }),
      );
      return;
    }

    for (const log of logs.slice(0, 8)) {
      const entryBg = this.scene.add.graphics();
      entryBg.fillStyle(COLORS.background, 0.6);
      entryBg.fillRoundedRect(px + 15, yOffset, panelW - 30, 45, 4);
      this.container!.add(entryBg);

      // Success/failure indicator
      const indicatorColor = log.data?.success ? 0x4ecca3 : 0xe94560;
      const indicator = this.scene.add.graphics();
      indicator.fillStyle(indicatorColor);
      indicator.fillCircle(px + 30, yOffset + 22, 5);
      this.container!.add(indicator);

      // Rarity badge
      if (log.data?.rarity) {
        this.container!.add(
          this.scene.add.text(px + 45, yOffset + 5, log.data.rarity.toUpperCase(), {
            fontFamily: FONTS.primary,
            fontSize: '9px',
            color: RARITY_COLORS[log.data.rarity] || '#aaa',
            fontStyle: 'bold',
          }),
        );
      }

      // Category
      if (log.data?.category) {
        this.container!.add(
          this.scene.add.text(px + 130, yOffset + 5, CATEGORY_LABELS[log.data.category] || log.data.category, {
            fontFamily: FONTS.primary,
            fontSize: '9px',
            color: COLORS.textSecondary,
          }),
        );
      }

      // Narrative
      const narrative = log.message.length > 80 ? log.message.substring(0, 77) + '...' : log.message;
      this.container!.add(
        this.scene.add.text(px + 45, yOffset + 22, narrative, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textPrimary,
          wordWrap: { width: panelW - 100 },
        }),
      );

      // Date
      const date = new Date(log.createdAt).toLocaleDateString();
      this.container!.add(
        this.scene.add
          .text(px + panelW - 25, yOffset + 8, date, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: '#666',
          })
          .setOrigin(1, 0),
      );

      yOffset += 50;
    }
  }

  private async renderStats(px: number, py: number, panelW: number, panelH: number): Promise<void> {
    let stats: EventStats;
    try {
      stats = await apiClient.getEventStats();
    } catch {
      stats = {
        totalEvents: 0,
        successRate: 0,
        mostCommonCategory: 'none',
        bestOutcome: null,
        totalRewardsEarned: {},
        eventsByCategory: {},
        eventsByRarity: {},
      };
    }

    let yOffset = py + 85;

    // Overview stats
    const statItems = [
      { label: 'Total Events', value: String(stats.totalEvents) },
      { label: 'Success Rate', value: `${Math.round(stats.successRate * 100)}%` },
      { label: 'Most Common', value: CATEGORY_LABELS[stats.mostCommonCategory] || stats.mostCommonCategory },
    ];

    for (const item of statItems) {
      this.container!.add(
        this.scene.add.text(px + 30, yOffset, item.label, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }),
      );
      this.container!.add(
        this.scene.add
          .text(px + 220, yOffset, item.value, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textPrimary,
            fontStyle: 'bold',
          }),
      );
      yOffset += 24;
    }

    // Events by category
    yOffset += 10;
    this.container!.add(
      this.scene.add.text(px + 30, yOffset, 'Events by Category', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    yOffset += 28;

    for (const [cat, count] of Object.entries(stats.eventsByCategory)) {
      const label = CATEGORY_LABELS[cat] || cat;
      const barWidth = Math.min((count / Math.max(stats.totalEvents, 1)) * 300, 300);

      this.container!.add(
        this.scene.add.text(px + 30, yOffset, `${label}: ${count}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }),
      );

      const bar = this.scene.add.graphics();
      bar.fillStyle(COLORS.accent, 0.6);
      bar.fillRoundedRect(px + 180, yOffset + 2, barWidth, 12, 3);
      this.container!.add(bar);

      yOffset += 20;
    }

    // Events by rarity
    yOffset += 10;
    this.container!.add(
      this.scene.add.text(px + 30, yOffset, 'Events by Rarity', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    yOffset += 28;

    for (const [rar, count] of Object.entries(stats.eventsByRarity)) {
      this.container!.add(
        this.scene.add.text(px + 30, yOffset, `${rar}: ${count}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: RARITY_COLORS[rar] || '#aaa',
        }),
      );
      yOffset += 18;
    }

    // Total rewards earned
    yOffset += 10;
    this.container!.add(
      this.scene.add.text(px + 30, yOffset, 'Total Rewards Earned', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    yOffset += 28;

    let rewardX = px + 30;
    for (const [res, amount] of Object.entries(stats.totalRewardsEarned)) {
      this.container!.add(
        this.scene.add.text(rewardX, yOffset, `${res}: ${amount}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#4ecca3',
        }),
      );
      rewardX += 100;
      if (rewardX > px + panelW - 100) {
        rewardX = px + 30;
        yOffset += 18;
      }
    }
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
