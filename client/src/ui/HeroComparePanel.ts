import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

const STAT_LABELS: Record<string, string> = {
  strength: 'STR', agility: 'AGI', intellect: 'INT', endurance: 'END', luck: 'LCK',
};

const ROLE_COLORS: Record<string, string> = {
  farmer: '#4ecca3', scout: '#4dabf7', merchant: '#ffd700', blacksmith: '#c87533',
  alchemist: '#be4bdb', hunter: '#e94560', defender: '#a0a0a0', mystic: '#9775fa',
  caravan_master: '#f59f00', archivist: '#74c0fc',
};

/**
 * Side-by-side hero comparison panel.
 * T-0437: Hero comparison tool for side-by-side stat evaluation
 */
export class HeroComparePanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private heroAId: string;
  private heroBId: string;

  constructor(scene: Phaser.Scene, heroAId: string, heroBId: string) {
    this.scene = scene;
    this.heroAId = heroAId;
    this.heroBId = heroBId;
  }

  async show(): Promise<void> {
    const { heroA, heroB } = await apiClient.compareHeroes(this.heroAId, this.heroBId);
    if (!heroA || !heroB) return;

    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.75);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(300);

    this.container = this.scene.add.container(0, 0).setDepth(301);

    const panelW = 700;
    const panelH = 450;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    // Title
    this.container.add(this.scene.add.text(px + panelW / 2, py + 15, 'Hero Comparison', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5, 0));

    // Close
    const closeBtn = this.scene.add.text(px + panelW - 20, py + 12, 'X', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    const colWidth = (panelW - 80) / 2;
    const leftX = px + 30;
    const rightX = px + panelW / 2 + 10;
    const centerX = px + panelW / 2;

    // Draw hero columns
    this.drawHeroColumn(leftX, py + 50, colWidth, heroA);
    this.drawHeroColumn(rightX, py + 50, colWidth, heroB);

    // Center divider
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x4a4a6a);
    divider.beginPath();
    divider.moveTo(centerX, py + 50);
    divider.lineTo(centerX, py + panelH - 20);
    divider.strokePath();
    this.container.add(divider);

    // Stat comparison bars
    let barY = py + 170;
    const statsA = heroA.stats || {};
    const statsB = heroB.stats || {};

    for (const stat of ['strength', 'agility', 'intellect', 'endurance', 'luck']) {
      const valA = (statsA[stat] || 0) as number;
      const valB = (statsB[stat] || 0) as number;
      const maxVal = Math.max(valA, valB, 1);

      // Label
      this.container.add(this.scene.add.text(centerX, barY, STAT_LABELS[stat], {
        fontFamily: FONTS.primary, fontSize: '11px', color: COLORS.textSecondary,
      }).setOrigin(0.5));

      // Left bar (grows right-to-left from center)
      const barWidth = 120;
      const leftBarW = (valA / maxVal) * barWidth;
      const leftBarGfx = this.scene.add.graphics();
      leftBarGfx.fillStyle(valA >= valB ? 0x4ecca3 : 0x666680, 0.8);
      leftBarGfx.fillRect(centerX - 30 - leftBarW, barY - 2, leftBarW, 12);
      this.container.add(leftBarGfx);

      this.container.add(this.scene.add.text(centerX - 35, barY, `${valA}`, {
        fontFamily: FONTS.primary, fontSize: '10px', color: valA >= valB ? '#4ecca3' : '#a0a0b0',
      }).setOrigin(1, 0));

      // Right bar (grows left-to-right from center)
      const rightBarW = (valB / maxVal) * barWidth;
      const rightBarGfx = this.scene.add.graphics();
      rightBarGfx.fillStyle(valB >= valA ? 0x4ecca3 : 0x666680, 0.8);
      rightBarGfx.fillRect(centerX + 30, barY - 2, rightBarW, 12);
      this.container.add(rightBarGfx);

      this.container.add(this.scene.add.text(centerX + 35, barY, `${valB}`, {
        fontFamily: FONTS.primary, fontSize: '10px', color: valB >= valA ? '#4ecca3' : '#a0a0b0',
      }));

      barY += 22;
    }

    // Summary comparison
    barY += 10;
    const comparisons = [
      { label: 'Power Score', a: heroA.powerScore || 0, b: heroB.powerScore || 0 },
      { label: 'Morale', a: heroA.morale || 70, b: heroB.morale || 70 },
      { label: 'Level', a: heroA.level || 1, b: heroB.level || 1 },
      { label: 'Skills', a: (heroA.unlockedSkills || []).length, b: (heroB.unlockedSkills || []).length },
    ];

    for (const comp of comparisons) {
      this.container.add(this.scene.add.text(centerX, barY, comp.label, {
        fontFamily: FONTS.primary, fontSize: '11px', color: COLORS.textSecondary,
      }).setOrigin(0.5));

      this.container.add(this.scene.add.text(centerX - 50, barY, `${comp.a}`, {
        fontFamily: FONTS.primary, fontSize: '11px', color: comp.a >= comp.b ? '#ffd700' : '#a0a0b0',
      }).setOrigin(1, 0));

      this.container.add(this.scene.add.text(centerX + 50, barY, `${comp.b}`, {
        fontFamily: FONTS.primary, fontSize: '11px', color: comp.b >= comp.a ? '#ffd700' : '#a0a0b0',
      }));

      barY += 20;
    }
  }

  private drawHeroColumn(x: number, y: number, width: number, hero: any): void {
    if (!this.container) return;

    // Name
    this.container.add(this.scene.add.text(x + width / 2, y, hero.name, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textPrimary, fontStyle: 'bold',
    }).setOrigin(0.5));

    // Role + Level
    const roleColor = ROLE_COLORS[hero.role] || COLORS.textSecondary;
    this.container.add(this.scene.add.text(x + width / 2, y + 24, `${hero.role.replace(/_/g, ' ')} · Lv ${hero.level}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: roleColor,
    }).setOrigin(0.5));

    // Traits
    const traits = (hero.traits || []).join(', ');
    this.container.add(this.scene.add.text(x + width / 2, y + 44, traits, {
      fontFamily: FONTS.primary, fontSize: '10px', color: '#6a6a7a',
    }).setOrigin(0.5));

    // Status
    this.container.add(this.scene.add.text(x + width / 2, y + 62, `Status: ${hero.status}`, {
      fontFamily: FONTS.primary, fontSize: '10px', color: '#a0a0b0',
    }).setOrigin(0.5));

    // Assignment
    if (hero.assignment) {
      this.container.add(this.scene.add.text(x + width / 2, y + 78, `Assigned: ${hero.assignment}`, {
        fontFamily: FONTS.primary, fontSize: '10px', color: '#4ecca3',
      }).setOrigin(0.5));
    }
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
