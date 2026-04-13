import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { ResourceType } from '@shared/enums';
import { RESOURCE_DESCRIPTIONS } from '@shared/constants';

const RESOURCE_COLORS: Record<ResourceType, string> = {
  [ResourceType.Gold]: '#ffd700',
  [ResourceType.Wood]: '#8b6914',
  [ResourceType.Stone]: '#a0a0a0',
  [ResourceType.Herbs]: '#4ecca3',
  [ResourceType.Ore]: '#c87533',
  [ResourceType.Water]: '#4dabf7',
  [ResourceType.Food]: '#f59f00',
  [ResourceType.Essence]: '#be4bdb',
};

/**
 * Tutorial panel explaining each resource type and its uses.
 * Shows resource icon, name, description, and tips based on current state.
 */
export class ResourceTutorialPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentElements: Phaser.GameObjects.GameObject[] = [];
  private visible: boolean = false;
  private currentPage: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_WIDTH / 2 - 250, 80);
    this.container.setDepth(1100);
    this.container.setVisible(false);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(0, 0, 500, 480, 12);
    bg.lineStyle(2, 0x0f3460, 1);
    bg.strokeRoundedRect(0, 0, 500, 480, 12);
    this.container.add(bg);

    // Title
    const title = scene.add.text(20, 12, 'Resource Guide', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: '#ffd700',
      fontStyle: 'bold',
    });
    this.container.add(title);

    // Close
    const closeBtn = scene.add.text(470, 10, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);
  }

  show(resources?: Record<ResourceType, number>, caps?: Record<ResourceType, number>): void {
    this.visible = true;
    this.container.setVisible(true);
    this.render(resources, caps);
  }

  private render(
    resources?: Record<ResourceType, number>,
    caps?: Record<ResourceType, number>,
  ): void {
    for (const el of this.contentElements) el.destroy();
    this.contentElements = [];

    let y = 50;

    const types = Object.values(ResourceType);

    for (const resType of types) {
      const color = RESOURCE_COLORS[resType];
      const desc = RESOURCE_DESCRIPTIONS[resType];
      const current = resources?.[resType] ?? 0;
      const cap = caps?.[resType] ?? 0;

      // Card background
      const card = this.scene.add.graphics();
      card.fillStyle(0x1a2a4e, 0.6);
      card.fillRoundedRect(15, y, 470, 46, 6);
      card.lineStyle(1, 0x333366, 0.3);
      card.strokeRoundedRect(15, y, 470, 46, 6);
      this.container.add(card);
      this.contentElements.push(card);

      // Icon dot
      const dot = this.scene.add.graphics();
      const dotColor = parseInt(color.replace('#', '0x'));
      dot.fillStyle(dotColor, 0.9);
      dot.fillCircle(35, y + 15, 8);
      this.container.add(dot);
      this.contentElements.push(dot);

      // Resource name
      const nameText = this.scene.add.text(50, y + 5, resType.charAt(0).toUpperCase() + resType.slice(1), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color,
        fontStyle: 'bold',
      });
      this.container.add(nameText);
      this.contentElements.push(nameText);

      // Description
      const descText = this.scene.add.text(50, y + 22, desc.description, {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: COLORS.textSecondary,
        wordWrap: { width: 320 },
      });
      this.container.add(descText);
      this.contentElements.push(descText);

      // Current state tip
      if (resources && caps) {
        const pct = cap > 0 ? (current / cap) * 100 : 0;
        let tip = '';
        let tipColor = '#8888aa';

        if (pct >= 95) {
          tip = 'Storage full! Upgrade or convert.';
          tipColor = '#ffd700';
        } else if (pct < 10 && current < 50) {
          tip = 'Running low. Build producers!';
          tipColor = '#ff4444';
        } else if (pct >= 50) {
          tip = 'Healthy supply.';
          tipColor = '#4ecca3';
        }

        if (tip) {
          const tipText = this.scene.add.text(380, y + 8, tip, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: tipColor,
            wordWrap: { width: 100 },
          });
          this.container.add(tipText);
          this.contentElements.push(tipText);
        }
      }

      y += 52;
    }

    // General tips section
    y += 10;
    const tipsTitle = this.scene.add.text(20, y, 'Tips:', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ffd700',
      fontStyle: 'bold',
    });
    this.container.add(tipsTitle);
    this.contentElements.push(tipsTitle);
    y += 20;

    const tips = [
      'Build a Workshop to unlock resource conversion recipes.',
      'Food and Herbs decay over time -- build cold storage (Workshop) to slow it.',
      'Each building level increases storage capacity for its resource.',
      'Watch for milestones to earn bonus rewards!',
    ];

    for (const tip of tips) {
      const tipText = this.scene.add.text(30, y, `- ${tip}`, {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: COLORS.textSecondary,
        wordWrap: { width: 440 },
      });
      this.container.add(tipText);
      this.contentElements.push(tipText);
      y += 18;
    }
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
    for (const el of this.contentElements) el.destroy();
    this.contentElements = [];
  }

  isVisible(): boolean {
    return this.visible;
  }
}
