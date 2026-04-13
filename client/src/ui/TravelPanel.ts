/**
 * TravelPanel — Travel/caravan planning between regions.
 *
 * T-1089: Travel system with movement time
 * T-1090: Travel route visualization
 * T-1091: Travel time reduction
 * T-1115: Trade route visualization
 * T-1127: Fast-travel between outposts
 * T-1128: Expedition party travel animation
 * T-1134: Distance calculator
 * T-1135: Trade embargo indicator
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

interface TravelOption {
  regionId: string;
  regionName: string;
  distance: number;
  travelDays: number;
  hasOutpost: boolean;
  embargoActive: boolean;
}

interface ActiveTravel {
  fromRegion: string;
  toRegion: string;
  progress: number;
  arriveAt: string;
}

type TravelCallback = (toRegionId: string) => void;

export class TravelPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible = false;
  private onTravel: TravelCallback | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(105);
    this.container.setVisible(false);
  }

  setOnTravel(cb: TravelCallback): void {
    this.onTravel = cb;
  }

  /**
   * Show travel planning panel with available destinations.
   */
  showPlanTravel(fromRegionName: string, options: TravelOption[], speedBonus: number = 0): void {
    this.container.removeAll(true);
    this.visible = true;
    this.container.setVisible(true);

    const panelW = 420;
    const panelH = Math.min(GAME_HEIGHT - 60, 80 + options.length * 60);
    const startX = (GAME_WIDTH - panelW) / 2;
    const startY = (GAME_HEIGHT - panelH) / 2;

    // Backdrop
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.4);
    backdrop.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const zone = this.scene.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)
      .setInteractive();
    zone.on('pointerup', () => this.hide());
    this.container.add([backdrop, zone]);

    // Panel
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(startX, startY, panelW, panelH, 10);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(startX, startY, panelW, panelH, 10);
    this.container.add(bg);

    // Title
    this.container.add(this.scene.add.text(startX + panelW / 2, startY + 14, `Travel from ${fromRegionName}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0));

    if (speedBonus > 0) {
      this.container.add(this.scene.add.text(startX + panelW / 2, startY + 38, `Speed bonus: ${Math.round(speedBonus * 100)}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#4ecca3',
      }).setOrigin(0.5, 0));
    }

    // Close button
    const close = this.scene.add.text(startX + panelW - 16, startY + 10, '\u{2715}', {
      fontSize: '14px',
      color: COLORS.textSecondary,
    }).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.hide());
    this.container.add(close);

    // Destination list
    let y = startY + 58;
    for (const opt of options) {
      const rowBg = this.scene.add.graphics();
      rowBg.fillStyle(COLORS.background, 0.6);
      rowBg.fillRoundedRect(startX + 12, y, panelW - 24, 48, 6);
      this.container.add(rowBg);

      // Region name
      this.container.add(this.scene.add.text(startX + 20, y + 6, opt.regionName, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: opt.embargoActive ? '#e94560' : COLORS.textPrimary,
        fontStyle: 'bold',
      }));

      // Details
      const fastTravel = opt.hasOutpost ? ' \u{26A1} Fast Travel' : '';
      const embargoLabel = opt.embargoActive ? ' \u{1F6AB} EMBARGO' : '';
      const adjustedDays = speedBonus > 0
        ? Math.max(1, Math.round(opt.travelDays * (1 - Math.min(speedBonus, 0.5))))
        : opt.travelDays;

      this.container.add(this.scene.add.text(startX + 20, y + 24, `${adjustedDays} day(s) | Dist: ${opt.distance.toFixed(1)}${fastTravel}${embargoLabel}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      }));

      // Travel button (disabled if embargo)
      if (!opt.embargoActive) {
        const btn = this.scene.add.text(startX + panelW - 80, y + 14, 'Go \u{27A1}', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
          backgroundColor: '#0f3460',
          padding: { x: 8, y: 4 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerup', () => {
          this.onTravel?.(opt.regionId);
          this.hide();
        });

        btn.on('pointerover', () => btn.setColor('#ffffff'));
        btn.on('pointerout', () => btn.setColor(COLORS.textGold));

        this.container.add(btn);
      }

      y += 56;
    }
  }

  /**
   * Show active travel progress.
   */
  showActiveTravel(travel: ActiveTravel): void {
    this.container.removeAll(true);
    this.visible = true;
    this.container.setVisible(true);

    const panelW = 350;
    const panelH = 160;
    const startX = (GAME_WIDTH - panelW) / 2;
    const startY = GAME_HEIGHT - panelH - 70;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.95);
    bg.fillRoundedRect(startX, startY, panelW, panelH, 10);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(startX, startY, panelW, panelH, 10);
    this.container.add(bg);

    this.container.add(this.scene.add.text(startX + panelW / 2, startY + 14, 'Travelling...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0));

    this.container.add(this.scene.add.text(startX + panelW / 2, startY + 40, `${travel.fromRegion} \u{27A1} ${travel.toRegion}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
    }).setOrigin(0.5, 0));

    // Progress bar
    const barX = startX + 20;
    const barY = startY + 70;
    const barW = panelW - 40;

    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x111122, 1);
    barBg.fillRoundedRect(barX, barY, barW, 16, 8);
    const barFill = this.scene.add.graphics();
    barFill.fillStyle(0xffd700, 1);
    barFill.fillRoundedRect(barX, barY, barW * (travel.progress / 100), 16, 8);
    this.container.add([barBg, barFill]);

    this.container.add(this.scene.add.text(startX + panelW / 2, barY + 8, `${travel.progress}%`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // ETA
    const eta = new Date(travel.arriveAt);
    this.container.add(this.scene.add.text(startX + panelW / 2, startY + 100, `Arrives: ${eta.toLocaleString()}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5, 0));

    // T-1128: Animated expedition marker
    const marker = this.scene.add.text(barX + barW * (travel.progress / 100), barY - 10, '\u{1F6B6}', {
      fontSize: '14px',
    }).setOrigin(0.5);
    this.container.add(marker);

    // Bounce animation
    this.scene.tweens.add({
      targets: marker,
      y: barY - 14,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
    this.container.removeAll(true);
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.container.destroy();
  }
}
