import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import { UIProgressBar } from './components/UIProgressBar';
import { UIButton } from './components/UIButton';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import {
  GUILD_BASE_XP,
  GUILD_XP_MULTIPLIER,
  EMBLEM_COLORS,
  EMBLEM_SYMBOLS,
} from '@shared/constants';
import type { Guild } from '@shared/types';

export class GuildInfoPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private xpBar: UIProgressBar | null = null;
  private levelText: Phaser.GameObjects.Text | null = null;
  private xpText: Phaser.GameObjects.Text | null = null;
  private emblemGraphics: Phaser.GameObjects.Graphics | null = null;
  private emblemSymbolText: Phaser.GameObjects.Text | null = null;
  private guild: Guild;
  private onRefresh: () => void;

  constructor(scene: Phaser.Scene, y: number, guild: Guild, onRefresh: () => void) {
    this.scene = scene;
    this.guild = guild;
    this.onRefresh = onRefresh;
    this.container = scene.add.container(0, y);
    this.render();
  }

  private render(): void {
    const panelW = GAME_WIDTH - 260;
    const panelH = 65;
    const x = 10;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.9);
    bg.fillRoundedRect(x, 0, panelW, panelH, 8);
    bg.lineStyle(1, COLORS.panelBorder);
    bg.strokeRoundedRect(x, 0, panelW, panelH, 8);
    this.container.add(bg);

    // Emblem circle
    this.emblemGraphics = this.scene.add.graphics();
    this.drawEmblem(x + 32, 32);
    this.container.add(this.emblemGraphics);

    // Emblem symbol text
    const symbolMap: Record<string, string> = {
      sword: '\u2694', shield: '\u26E8', crown: '\u265B', star: '\u2605', dragon: '\u2726',
      tree: '\u2663', hammer: '\u2692', book: '\u2261', gem: '\u25C6', skull: '\u2620',
      moon: '\u263E', sun: '\u2600', tower: '\u265C', wolf: '\u29BB', eagle: '\u2708',
    };
    const sym = this.guild.emblem?.symbol ?? 'star';
    this.emblemSymbolText = this.scene.add.text(x + 32, 32, symbolMap[sym] ?? '\u2605', {
      fontFamily: FONTS.primary,
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.container.add(this.emblemSymbolText);

    // Make emblem clickable to edit
    const emblemZone = this.scene.add.zone(x + 32, 32, 50, 50).setInteractive({ useHandCursor: true });
    emblemZone.on('pointerup', () => this.showEmblemEditor());
    this.container.add(emblemZone);

    // Guild name
    this.container.add(
      this.scene.add.text(x + 65, 6, this.guild.name, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );

    // Level text
    this.levelText = this.scene.add.text(x + 65, 28, `Level ${this.guild.level}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    });
    this.container.add(this.levelText);

    // XP progress bar
    const xpToNext = Math.floor(GUILD_BASE_XP * Math.pow(GUILD_XP_MULTIPLIER, this.guild.level - 1 + 1));
    this.xpBar = new UIProgressBar(this.scene, {
      x: x + 65,
      y: 46,
      width: 200,
      height: 12,
      value: this.guild.xp,
      maxValue: xpToNext,
      fillColor: COLORS.gold,
      showPercent: false,
    });
    this.container.add(this.xpBar);

    // XP text
    this.xpText = this.scene.add.text(x + 270, 44, `${this.guild.xp} / ${xpToNext} XP`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    this.container.add(this.xpText);

    // Motto (if set)
    if (this.guild.motto) {
      this.container.add(
        this.scene.add.text(x + 400, 10, `"${this.guild.motto}"`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          fontStyle: 'italic',
        }),
      );
    }

    // Building slots indicator
    const slotsUsed = this.guild.buildings?.length ?? 0;
    const slotsTotal = this.guild.buildingSlots ?? 6;
    this.container.add(
      this.scene.add.text(x + 400, 32, `Slots: ${slotsUsed}/${slotsTotal}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: slotsUsed >= slotsTotal ? '#e94560' : COLORS.textSecondary,
      }),
    );

    // Daily reward button
    const dailyBtn = new UIButton(this.scene, {
      x: x + panelW - 150,
      y: 12,
      width: 120,
      height: 36,
      text: 'Daily Reward',
      variant: 'secondary',
      fontSize: FONTS.sizes.small,
      onClick: () => this.claimDailyReward(),
    });
    this.container.add(dailyBtn);

    // Login streak
    if (this.guild.loginStreak > 0) {
      this.container.add(
        this.scene.add.text(x + panelW - 90, 52, `Streak: ${this.guild.loginStreak}d`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textGold,
        }).setOrigin(0.5, 0),
      );
    }
  }

  private drawEmblem(cx: number, cy: number): void {
    if (!this.emblemGraphics) return;
    this.emblemGraphics.clear();
    const color = this.guild.emblem?.color ?? '#e94560';
    const colorNum = Phaser.Display.Color.HexStringToColor(color).color;
    this.emblemGraphics.fillStyle(colorNum, 1);
    this.emblemGraphics.fillCircle(cx, cy, 22);
    this.emblemGraphics.lineStyle(2, COLORS.gold);
    this.emblemGraphics.strokeCircle(cx, cy, 22);
  }

  private showEmblemEditor(): void {
    // Simple emblem selection via cycling - click changes color, shift+click changes symbol
    const currentColorIdx = EMBLEM_COLORS.indexOf(this.guild.emblem?.color ?? '#e94560');
    const currentSymIdx = EMBLEM_SYMBOLS.indexOf(this.guild.emblem?.symbol ?? 'star');
    const nextColor = EMBLEM_COLORS[(currentColorIdx + 1) % EMBLEM_COLORS.length];
    const nextSymbol = EMBLEM_SYMBOLS[(currentSymIdx + 1) % EMBLEM_SYMBOLS.length];

    apiClient.setGuildEmblem(nextColor, nextSymbol).then(() => {
      if (this.guild.emblem) {
        this.guild.emblem.color = nextColor;
        this.guild.emblem.symbol = nextSymbol;
      } else {
        this.guild.emblem = { color: nextColor, symbol: nextSymbol };
      }
      this.container.removeAll(true);
      this.render();
      NotificationSystem.show(this.scene, 'Emblem updated!', 'success');
    }).catch(() => {
      NotificationSystem.show(this.scene, 'Failed to update emblem', 'error');
    });
  }

  private async claimDailyReward(): Promise<void> {
    try {
      const result = await apiClient.claimDailyReward();
      const rewardDesc = Object.entries(result.resources)
        .map(([res, amt]) => `+${amt} ${res}`)
        .join(', ');
      NotificationSystem.show(this.scene, `${result.label}: ${rewardDesc} (+${result.xp} XP)`, 'success');
      this.onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to claim reward';
      NotificationSystem.show(this.scene, msg, 'warning');
    }
  }

  setGuild(guild: Guild): void {
    this.guild = guild;
    this.container.removeAll(true);
    this.render();
  }
}
