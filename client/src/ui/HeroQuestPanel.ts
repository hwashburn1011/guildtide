import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

const QUEST_TYPE_COLORS: Record<string, string> = {
  fetch: '#4dabf7',
  rescue: '#e94560',
  discover: '#9775fa',
  defeat: '#c87533',
  negotiate: '#ffd700',
};

const QUEST_TYPE_ICONS: Record<string, string> = {
  fetch: '📦', rescue: '🆘', discover: '🔍', defeat: '⚔', negotiate: '🤝',
};

/**
 * Hero quest UI with objective display and progress.
 * T-0415: Personal quest system based on backstory
 * T-0416: Quest generation templates with 5 quest types
 * T-0417: Quest dialog UI with objective display and progress
 * T-0418: Quest reward system
 * T-0419: Quest chain system (multi-part storylines)
 */
export class HeroQuestPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private heroId: string;
  private onChanged: () => void;

  constructor(scene: Phaser.Scene, heroId: string, onChanged: () => void) {
    this.scene = scene;
    this.heroId = heroId;
    this.onChanged = onChanged;
  }

  async show(): Promise<void> {
    const hero = await apiClient.getHeroDetail(this.heroId);
    if (!hero) return;

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
    const panelH = 520;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    // Title
    this.container.add(this.scene.add.text(px + 20, py + 15, `${hero.name}'s Quests`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));

    // Close
    const closeBtn = this.scene.add.text(px + panelW - 20, py + 15, 'X', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    const quests = hero.availableQuests || [];

    if (quests.length === 0) {
      this.container.add(this.scene.add.text(px + panelW / 2, py + panelH / 2,
        'No quests available at this level.\nGain more levels to unlock new quests!', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary, align: 'center',
      }).setOrigin(0.5));
      return;
    }

    let qy = py + 55;

    for (const quest of quests) {
      const questH = 80;
      const typeColor = QUEST_TYPE_COLORS[quest.type] || '#a0a0b0';
      const typeIcon = QUEST_TYPE_ICONS[quest.type] || '?';

      // Quest card bg
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(COLORS.background, 0.7);
      cardBg.fillRoundedRect(px + 15, qy, panelW - 30, questH, 6);
      cardBg.lineStyle(1, Phaser.Display.Color.HexStringToColor(typeColor).color, 0.5);
      cardBg.strokeRoundedRect(px + 15, qy, panelW - 30, questH, 6);
      this.container.add(cardBg);

      // Type icon + title
      this.container.add(this.scene.add.text(px + 25, qy + 8, `${typeIcon} ${quest.title}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: typeColor, fontStyle: 'bold',
      }));

      // Quest type badge
      this.container.add(this.scene.add.text(px + panelW - 30, qy + 8, quest.type.toUpperCase(), {
        fontFamily: FONTS.primary, fontSize: '10px', color: typeColor,
        backgroundColor: '#1a1a3e', padding: { x: 4, y: 2 },
      }).setOrigin(1, 0));

      // Description
      this.container.add(this.scene.add.text(px + 25, qy + 30, quest.description, {
        fontFamily: FONTS.primary, fontSize: '11px', color: '#9a9ab0',
        wordWrap: { width: panelW - 80 },
      }));

      // Rewards preview
      const rewards = quest.rewards || {};
      const rewardParts: string[] = [];
      if (rewards.xp) rewardParts.push(`${rewards.xp} XP`);
      if (rewards.gold) rewardParts.push(`${rewards.gold} Gold`);
      if (rewards.skillPoints) rewardParts.push(`${rewards.skillPoints} Skill Pts`);
      if (rewards.moraleBoost) rewardParts.push(`+${rewards.moraleBoost} Morale`);
      if (rewards.lore) rewardParts.push('📖 Lore');

      this.container.add(this.scene.add.text(px + 25, qy + 55, `Rewards: ${rewardParts.join(' · ')}`, {
        fontFamily: FONTS.primary, fontSize: '10px', color: '#4ecca3',
      }));

      // Min level
      this.container.add(this.scene.add.text(px + panelW - 30, qy + 55, `Min Lv ${quest.minLevel}`, {
        fontFamily: FONTS.primary, fontSize: '10px',
        color: hero.level >= quest.minLevel ? '#4ecca3' : '#e94560',
      }).setOrigin(1, 0));

      // Chain indicator
      if (quest.chainId) {
        this.container.add(this.scene.add.text(px + panelW - 30, qy + 30,
          `Chain ${quest.chainStep}/${quest.chainTotal}`, {
          fontFamily: FONTS.primary, fontSize: '9px', color: '#ffd700',
        }).setOrigin(1, 0));
      }

      qy += questH + 8;

      if (qy > py + panelH - 40) break;
    }
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
