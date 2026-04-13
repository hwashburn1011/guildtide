/**
 * Arena matchmaking and history panel.
 *
 * PvP arena system: challenge other players' defense teams.
 * Shows leaderboard, match history, defense team setup, and opponent search.
 */

import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { apiClient } from '../api/client';

type ArenaTab = 'leaderboard' | 'opponents' | 'history' | 'defense';

export class ArenaPanel {
  public container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private contentItems: Phaser.GameObjects.GameObject[] = [];
  private currentTab: ArenaTab = 'leaderboard';
  private tabButtons: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.container = scene.add.container(x, y);
    this.buildUI();
    this.loadTab('leaderboard');
  }

  private buildUI(): void {
    const bg = this.scene.add.rectangle(0, 0, this.width, this.height, COLORS.panelBg, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.panelBorder);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(this.width / 2, 12, 'ARENA', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Tabs
    const tabs: { key: ArenaTab; label: string }[] = [
      { key: 'leaderboard', label: 'Leaderboard' },
      { key: 'opponents', label: 'Find Match' },
      { key: 'history', label: 'History' },
      { key: 'defense', label: 'Defense Team' },
    ];

    tabs.forEach((tab, i) => {
      const btn = this.scene.add.text(15 + i * 110, 42, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: this.currentTab === tab.key ? COLORS.textGold : COLORS.textSecondary,
      })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.loadTab(tab.key));
      this.tabButtons.push(btn);
      this.container.add(btn);
    });

    const sep = this.scene.add.rectangle(this.width / 2, 62, this.width - 20, 1, COLORS.panelBorder).setOrigin(0.5, 0);
    this.container.add(sep);
  }

  private async loadTab(tab: ArenaTab): Promise<void> {
    this.currentTab = tab;
    this.tabButtons.forEach((btn, i) => {
      const keys: ArenaTab[] = ['leaderboard', 'opponents', 'history', 'defense'];
      btn.setColor(keys[i] === tab ? COLORS.textGold : COLORS.textSecondary);
    });

    this.contentItems.forEach(item => item.destroy());
    this.contentItems = [];

    const startY = 75;

    switch (tab) {
      case 'leaderboard':
        await this.renderLeaderboard(startY);
        break;
      case 'opponents':
        await this.renderOpponents(startY);
        break;
      case 'history':
        await this.renderHistory(startY);
        break;
      case 'defense':
        this.renderDefenseTeam(startY);
        break;
    }
  }

  private async renderLeaderboard(startY: number): Promise<void> {
    try {
      const res = await apiClient.getArenaLeaderboard();
      const entries = res.leaderboard ?? [];
      let y = startY;

      // Header
      this.addText(20, y, 'Rank', COLORS.textGold, FONTS.sizes.small);
      this.addText(70, y, 'Guild', COLORS.textGold, FONTS.sizes.small);
      this.addText(this.width - 200, y, 'Rating', COLORS.textGold, FONTS.sizes.small);
      this.addText(this.width - 120, y, 'W/L', COLORS.textGold, FONTS.sizes.small);
      this.addText(this.width - 50, y, 'WR%', COLORS.textGold, FONTS.sizes.small);
      y += 22;

      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const color = i < 3 ? COLORS.textGold : COLORS.textPrimary;
        this.addText(20, y, `${i + 1}`, color, FONTS.sizes.small);
        this.addText(70, y, e.guildName, color, FONTS.sizes.small);
        this.addText(this.width - 200, y, `${e.rating}`, COLORS.textSecondary, FONTS.sizes.small);
        this.addText(this.width - 120, y, `${e.wins}/${e.losses}`, COLORS.textSecondary, FONTS.sizes.small);
        this.addText(this.width - 50, y, `${e.winRate}%`, COLORS.textSecondary, FONTS.sizes.small);
        y += 20;
      }

      if (entries.length === 0) {
        this.addText(this.width / 2, startY + 40, 'No arena rankings yet.', COLORS.textSecondary, FONTS.sizes.body, 0.5);
      }
    } catch {
      this.addText(20, startY, 'Failed to load leaderboard.', COLORS.textAccent, FONTS.sizes.small);
    }
  }

  private async renderOpponents(startY: number): Promise<void> {
    try {
      const res = await apiClient.getArenaOpponents();
      const opponents = res.opponents ?? [];
      let y = startY;

      this.addText(20, y, 'Available Opponents:', COLORS.textPrimary, FONTS.sizes.body);
      y += 28;

      for (const opp of opponents) {
        const card = this.scene.add.rectangle(20, y, this.width - 40, 50, 0x0a0a1a, 0.6)
          .setOrigin(0, 0)
          .setStrokeStyle(1, COLORS.panelBorder);
        this.container.add(card);
        this.contentItems.push(card);

        this.addText(30, y + 5, opp.guildName, COLORS.textPrimary, FONTS.sizes.small);
        this.addText(30, y + 22, `Rating: ${opp.rating} | ${opp.heroes?.length ?? 0} heroes`, COLORS.textSecondary, FONTS.sizes.tiny);

        const fightBtn = this.scene.add.text(this.width - 80, y + 15, '[ Fight ]', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textAccent,
        })
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.initiateArenaFight(opp.guildId));
        this.container.add(fightBtn);
        this.contentItems.push(fightBtn);

        y += 58;
      }

      if (opponents.length === 0) {
        this.addText(this.width / 2, startY + 40, 'No opponents found. Set a defense team first.', COLORS.textSecondary, FONTS.sizes.body, 0.5);
      }
    } catch {
      this.addText(20, startY, 'Failed to load opponents.', COLORS.textAccent, FONTS.sizes.small);
    }
  }

  private async renderHistory(startY: number): Promise<void> {
    try {
      const res = await apiClient.getArenaHistory();
      const history = res.history ?? [];
      let y = startY;

      for (const match of history.slice(-15).reverse()) {
        const won = match.combatResult?.outcome === 'victory';
        const label = `${won ? 'W' : 'L'} vs ${match.defenderGuildName} | Rating ${match.ratingChange >= 0 ? '+' : ''}${match.ratingChange}`;
        this.addText(20, y, label, won ? '#4ecca3' : COLORS.textAccent, FONTS.sizes.small);
        y += 20;
      }

      if (history.length === 0) {
        this.addText(this.width / 2, startY + 40, 'No matches played yet.', COLORS.textSecondary, FONTS.sizes.body, 0.5);
      }
    } catch {
      this.addText(20, startY, 'Failed to load history.', COLORS.textAccent, FONTS.sizes.small);
    }
  }

  private renderDefenseTeam(startY: number): void {
    let y = startY;
    this.addText(20, y, 'Set your defense team for other guilds to challenge.', COLORS.textSecondary, FONTS.sizes.small);
    y += 25;
    this.addText(20, y, 'Select heroes from your roster and assign front/back rows.', COLORS.textSecondary, FONTS.sizes.small);
    y += 30;

    // Placeholder — in production this would link to the hero roster
    const setBtn = this.scene.add.text(this.width / 2, y, '[ Set Defense Team ]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
    })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        // Would open SquadBuilderPanel for defense team
      });
    this.container.add(setBtn);
    this.contentItems.push(setBtn);
  }

  private async initiateArenaFight(defenderGuildId: string): Promise<void> {
    try {
      // In production, user would select heroes; simplified here
      await apiClient.fightArenaOpponent(defenderGuildId, []);
      this.loadTab('history');
    } catch {
      // Error handling
    }
  }

  private addText(x: number, y: number, text: string, color: string | number, fontSize: number, originX: number = 0): void {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: FONTS.primary,
      fontSize: `${fontSize}px`,
      color: typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color,
    }).setOrigin(originX, 0);
    this.container.add(t);
    this.contentItems.push(t);
  }

  destroy(): void {
    this.container.destroy();
  }
}
