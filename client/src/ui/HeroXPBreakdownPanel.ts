import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

/**
 * Hero experience breakdown panel showing XP per source.
 * T-0435: Hero experience breakdown panel (XP per source)
 * T-0440: Hero activity log showing recent actions and XP gains
 */

const SOURCE_COLORS: Record<string, string> = {
  expedition: '#4dabf7',
  training: '#ffd700',
  building: '#4ecca3',
  quest: '#9775fa',
  event: '#e94560',
  manual: '#a0a0b0',
  mentor: '#f59f00',
};

export class HeroXPBreakdownPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private heroId: string;

  constructor(scene: Phaser.Scene, heroId: string) {
    this.scene = scene;
    this.heroId = heroId;
  }

  async show(): Promise<void> {
    const hero = await apiClient.getHeroDetail(this.heroId);
    if (!hero) return;

    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(300);

    this.container = this.scene.add.container(0, 0).setDepth(301);

    const panelW = 550;
    const panelH = 500;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    this.container.add(this.scene.add.text(px + 20, py + 15, `${hero.name} - XP Breakdown`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));

    const closeBtn = this.scene.add.text(px + panelW - 20, py + 15, 'X', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // XP summary
    let sy = py + 55;
    this.container.add(this.scene.add.text(px + 20, sy, `Level ${hero.level}  |  XP: ${hero.xp}/${hero.xpToNext}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
    }));
    sy += 25;

    // XP bar
    const barWidth = panelW - 40;
    const xpBg = this.scene.add.graphics();
    xpBg.fillStyle(0x333355, 0.8);
    xpBg.fillRect(px + 20, sy, barWidth, 14);
    this.container.add(xpBg);

    const xpFillWidth = hero.xpToNext > 0 ? (hero.xp / hero.xpToNext) * barWidth : 0;
    const xpFill = this.scene.add.graphics();
    xpFill.fillStyle(0xffd700, 1);
    xpFill.fillRect(px + 20, sy, Math.min(barWidth, xpFillWidth), 14);
    this.container.add(xpFill);
    sy += 30;

    // XP by source breakdown
    const xpLog = hero.xpLog || [];
    const sourceXP: Record<string, number> = {};
    let totalXP = 0;
    for (const entry of xpLog) {
      sourceXP[entry.source] = (sourceXP[entry.source] || 0) + entry.amount;
      totalXP += entry.amount;
    }

    this.container.add(this.scene.add.text(px + 20, sy, 'XP by Source (recent)', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    sy += 22;

    for (const [source, amount] of Object.entries(sourceXP).sort((a, b) => b[1] - a[1])) {
      const color = SOURCE_COLORS[source] || '#a0a0b0';
      const pct = totalXP > 0 ? Math.round((amount / totalXP) * 100) : 0;

      this.container.add(this.scene.add.text(px + 30, sy, `${source}: ${amount} XP (${pct}%)`, {
        fontFamily: FONTS.primary, fontSize: '12px', color,
      }));

      // Mini bar
      const miniBarW = 150;
      const miniBg = this.scene.add.graphics();
      miniBg.fillStyle(0x333355, 0.6);
      miniBg.fillRect(px + panelW - miniBarW - 30, sy + 2, miniBarW, 10);
      this.container.add(miniBg);

      const miniFill = this.scene.add.graphics();
      miniFill.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 0.8);
      miniFill.fillRect(px + panelW - miniBarW - 30, sy + 2, totalXP > 0 ? (amount / totalXP) * miniBarW : 0, 10);
      this.container.add(miniFill);

      sy += 22;
    }

    // Activity Log section
    sy += 15;
    this.container.add(this.scene.add.text(px + 20, sy, 'Activity Log', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    sy += 22;

    const activityLog = hero.activityLog || [];
    const recentActivity = activityLog.slice(-10).reverse();

    if (recentActivity.length === 0) {
      this.container.add(this.scene.add.text(px + 30, sy, 'No recent activity', {
        fontFamily: FONTS.primary, fontSize: '11px', color: '#6a6a7a',
      }));
    } else {
      for (const entry of recentActivity) {
        if (sy > py + panelH - 30) break;
        const timeStr = new Date(entry.timestamp).toLocaleDateString();
        this.container.add(this.scene.add.text(px + 30, sy, `${timeStr}: ${entry.action}`, {
          fontFamily: FONTS.primary, fontSize: '10px', color: '#9a9ab0',
        }));
        sy += 16;
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
