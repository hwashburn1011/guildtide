import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

const RELATIONSHIP_COLORS: Record<string, string> = {
  friendship: '#4ecca3',
  rivalry: '#e94560',
  neutral: '#a0a0b0',
};

const RELATIONSHIP_ICONS: Record<string, string> = {
  friendship: '💚',
  rivalry: '⚔',
  neutral: '🤝',
};

/**
 * Displays hero relationships (friendship/rivalry) and their effects.
 * T-0425: Hero relationship system
 * T-0426: Relationship indicator on hero interaction screens
 * T-0427: Relationship effects on expedition performance
 */
export class HeroRelationshipPanel {
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

    const panelW = 500;
    const panelH = 400;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    this.container.add(this.scene.add.text(px + 20, py + 15, `${hero.name}'s Relationships`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));

    const closeBtn = this.scene.add.text(px + panelW - 20, py + 15, 'X', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    const relationships = hero.relationships || [];

    if (relationships.length === 0) {
      this.container.add(this.scene.add.text(px + panelW / 2, py + panelH / 2,
        'No relationships yet.\nRelationships form through shared expeditions and assignments.', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary, align: 'center',
      }).setOrigin(0.5));
      return;
    }

    let ry = py + 55;

    for (const rel of relationships) {
      const relColor = RELATIONSHIP_COLORS[rel.type] || '#a0a0b0';
      const relIcon = RELATIONSHIP_ICONS[rel.type] || '';

      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(COLORS.background, 0.7);
      cardBg.fillRoundedRect(px + 15, ry, panelW - 30, 50, 6);
      this.container.add(cardBg);

      // Icon + hero name
      this.container.add(this.scene.add.text(px + 25, ry + 8,
        `${relIcon} ${rel.heroId}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textPrimary,
      }));

      // Relationship type
      this.container.add(this.scene.add.text(px + 25, ry + 28,
        `${rel.type} (Strength: ${rel.strength}/100)`, {
        fontFamily: FONTS.primary, fontSize: '11px', color: relColor,
      }));

      // Strength bar
      const barWidth = 100;
      const barBg2 = this.scene.add.graphics();
      barBg2.fillStyle(0x333355, 0.8);
      barBg2.fillRect(px + panelW - 135, ry + 18, barWidth, 10);
      this.container.add(barBg2);

      const fillWidth = (rel.strength / 100) * barWidth;
      const barFill = this.scene.add.graphics();
      barFill.fillStyle(Phaser.Display.Color.HexStringToColor(relColor).color, 1);
      barFill.fillRect(px + panelW - 135, ry + 18, fillWidth, 10);
      this.container.add(barFill);

      // Effect description
      const effectText = rel.type === 'friendship'
        ? `+${(rel.strength / 10).toFixed(1)}% expedition bonus`
        : rel.type === 'rivalry'
          ? `-${(rel.strength / 20).toFixed(1)}% when paired`
          : 'No effect';
      this.container.add(this.scene.add.text(px + panelW - 30, ry + 35, effectText, {
        fontFamily: FONTS.primary, fontSize: '9px', color: relColor,
      }).setOrigin(1, 0));

      ry += 58;
      if (ry > py + panelH - 30) break;
    }
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
