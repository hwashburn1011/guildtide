import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import { ResourceType } from '@shared/enums';
import { RESOURCE_MILESTONES } from '@shared/constants';

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

interface MilestoneDisplay {
  id: string;
  resource: ResourceType;
  threshold: number;
  label: string;
  reward: Partial<Record<ResourceType, number>>;
  xp: number;
  completed: boolean;
  progress: number;
  currentAmount: number;
}

export class ResourceMilestonePanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentElements: Phaser.GameObjects.GameObject[] = [];
  private visible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_WIDTH / 2 - 250, 60);
    this.container.setDepth(1000);
    this.container.setVisible(false);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(0, 0, 500, 520, 12);
    bg.lineStyle(2, 0x0f3460, 1);
    bg.strokeRoundedRect(0, 0, 500, 520, 12);
    this.container.add(bg);

    // Title
    const title = scene.add.text(20, 12, 'Resource Milestones', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: '#ffd700',
      fontStyle: 'bold',
    });
    this.container.add(title);

    const subtitle = scene.add.text(20, 38, 'Earn rewards by reaching resource thresholds', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    this.container.add(subtitle);

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

  setMilestones(milestones: MilestoneDisplay[]): void {
    for (const el of this.contentElements) el.destroy();
    this.contentElements = [];

    let y = 60;

    // Sort: incomplete first, then by resource
    const sorted = [...milestones].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.resource.localeCompare(b.resource);
    });

    for (const ms of sorted) {
      const color = RESOURCE_COLORS[ms.resource];
      const alpha = ms.completed ? 0.5 : 1;

      // Card background
      const card = this.scene.add.graphics();
      card.fillStyle(ms.completed ? 0x1a3a2e : 0x1a2a4e, 0.7);
      card.fillRoundedRect(15, y, 470, 42, 6);
      if (ms.completed) {
        card.lineStyle(1, 0x4ecca3, 0.3);
      } else {
        card.lineStyle(1, 0x333355, 0.3);
      }
      card.strokeRoundedRect(15, y, 470, 42, 6);
      this.container.add(card);
      this.contentElements.push(card);

      // Status icon
      const statusText = this.scene.add.text(22, y + 8, ms.completed ? '[*]' : '[ ]', {
        fontFamily: FONTS.primary,
        fontSize: '13px',
        color: ms.completed ? '#4ecca3' : '#555577',
        fontStyle: 'bold',
      });
      this.container.add(statusText);
      this.contentElements.push(statusText);

      // Label
      const labelText = this.scene.add.text(52, y + 5, ms.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: ms.completed ? '#4ecca3' : '#ffffff',
        fontStyle: ms.completed ? 'normal' : 'bold',
      });
      this.container.add(labelText);
      this.contentElements.push(labelText);

      // Threshold info
      const threshStr = `${Math.floor(ms.currentAmount)} / ${ms.threshold} ${ms.resource}`;
      const threshText = this.scene.add.text(52, y + 22, threshStr, {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color,
      });
      this.container.add(threshText);
      this.contentElements.push(threshText);

      // Progress bar
      const barX = 280;
      const barWidth = 120;
      const barG = this.scene.add.graphics();
      barG.x = barX;
      barG.y = y + 26;
      barG.fillStyle(0x333355, 0.5);
      barG.fillRect(0, 0, barWidth, 6);
      const fillColor = ms.completed ? 0x4ecca3 : 0xffd700;
      barG.fillStyle(fillColor, 0.8);
      barG.fillRect(0, 0, barWidth * ms.progress, 6);
      this.container.add(barG);
      this.contentElements.push(barG as any);

      // Reward info
      const rewardParts: string[] = [];
      for (const [res, amt] of Object.entries(ms.reward)) {
        rewardParts.push(`+${amt} ${res}`);
      }
      if (ms.xp > 0) rewardParts.push(`+${ms.xp} XP`);
      const rewardStr = rewardParts.join(', ');
      const rewardText = this.scene.add.text(410, y + 8, rewardStr, {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: '#8888aa',
        wordWrap: { width: 80 },
      });
      this.container.add(rewardText);
      this.contentElements.push(rewardText);

      y += 48;
    }
  }

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }
}
