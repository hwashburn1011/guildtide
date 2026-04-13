import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

const STAT_INFO: Record<string, { label: string; description: string; color: string }> = {
  strength: { label: 'Strength', description: 'Physical power, melee combat, building construction', color: '#e94560' },
  agility: { label: 'Agility', description: 'Speed, evasion, travel time, ranged combat', color: '#4dabf7' },
  intellect: { label: 'Intellect', description: 'Research, alchemy, magic, negotiations', color: '#9775fa' },
  endurance: { label: 'Endurance', description: 'Stamina, health, carry capacity, farming', color: '#4ecca3' },
  luck: { label: 'Luck', description: 'Critical chance, loot quality, rare finds', color: '#ffd700' },
};

export class HeroTrainingPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private heroId: string;
  private hero: any;
  private onChanged: () => void;

  constructor(scene: Phaser.Scene, heroId: string, hero: any, onChanged: () => void) {
    this.scene = scene;
    this.heroId = heroId;
    this.hero = hero;
    this.onChanged = onChanged;
  }

  show(): void {
    // Overlay
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.75);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(300);

    this.container = this.scene.add.container(0, 0).setDepth(301);

    const panelW = 500;
    const panelH = 420;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    // Title
    this.container.add(this.scene.add.text(px + 20, py + 15, `Train ${this.hero.name}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));

    // Subtitle
    this.container.add(this.scene.add.text(px + 20, py + 42, 'Choose a stat to train at the Barracks', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
    }));

    // Close button
    const closeBtn = this.scene.add.text(px + panelW - 20, py + 15, 'X', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // Check if already training
    if (this.hero.training) {
      this.container.add(this.scene.add.text(px + panelW / 2, py + panelH / 2, `Currently training ${this.hero.training.stat}\nStarted: ${new Date(this.hero.training.startedAt).toLocaleString()}\nDuration: ${this.hero.training.duration}h`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#ffd700', align: 'center',
      }).setOrigin(0.5));
      return;
    }

    // Stat training options
    const stats = this.hero.stats || {};
    let yOffset = py + 75;

    for (const [stat, info] of Object.entries(STAT_INFO)) {
      const currentVal = stats[stat] || 0;
      const cardY = yOffset;

      // Card background
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(COLORS.background, 0.7);
      cardBg.fillRoundedRect(px + 15, cardY, panelW - 30, 55, 6);
      this.container.add(cardBg);

      // Stat name and current value
      this.container.add(this.scene.add.text(px + 25, cardY + 8, `${info.label}: ${currentVal}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: info.color, fontStyle: 'bold',
      }));

      // Description
      this.container.add(this.scene.add.text(px + 25, cardY + 28, info.description, {
        fontFamily: FONTS.primary, fontSize: '10px', color: '#6a6a7a',
      }));

      // Stat bar
      const barWidth = 120;
      const barX = px + panelW - barWidth - 100;
      const barBg2 = this.scene.add.graphics();
      barBg2.fillStyle(0x333355, 0.8);
      barBg2.fillRect(barX, cardY + 12, barWidth, 10);
      this.container.add(barBg2);

      const fillWidth = Math.min(barWidth, (currentVal / 30) * barWidth);
      const barFill = this.scene.add.graphics();
      barFill.fillStyle(Phaser.Display.Color.HexStringToColor(info.color).color, 1);
      barFill.fillRect(barX, cardY + 12, fillWidth, 10);
      this.container.add(barFill);

      // Train button
      const trainBtn = this.scene.add.text(px + panelW - 30, cardY + 20, 'Train', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textAccent, fontStyle: 'bold',
      }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

      trainBtn.on('pointerover', () => trainBtn.setColor('#ff6b8a'));
      trainBtn.on('pointerout', () => trainBtn.setColor(COLORS.textAccent));
      trainBtn.on('pointerup', async () => {
        try {
          const result = await apiClient.trainHero(this.heroId, stat);
          alert(`Training started!\nStat: ${info.label}\nXP gain: +${result.xpGain}\nStat gain: +${result.statGain}`);
          this.onChanged();
          this.hide();
        } catch (err) {
          alert((err as Error).message);
        }
      });
      this.container.add(trainBtn);

      yOffset += 62;
    }

    // Montage flavor text
    this.container.add(this.scene.add.text(px + panelW / 2, py + panelH - 25,
      '~ Training takes 1 hour and grants XP ~', {
        fontFamily: FONTS.primary, fontSize: '11px', color: '#6a6a7a', fontStyle: 'italic',
      }).setOrigin(0.5));
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
