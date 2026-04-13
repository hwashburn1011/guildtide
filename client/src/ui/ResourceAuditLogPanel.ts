import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import { ResourceType } from '@shared/enums';
import type { ResourceAuditEntry } from '@shared/types';

const RESOURCE_COLORS: Record<string, string> = {
  gold: '#ffd700',
  wood: '#8b6914',
  stone: '#a0a0a0',
  herbs: '#4ecca3',
  ore: '#c87533',
  water: '#4dabf7',
  food: '#f59f00',
  essence: '#be4bdb',
};

export class ResourceAuditLogPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentElements: Phaser.GameObjects.GameObject[] = [];
  private visible: boolean = false;
  private scrollOffset: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_WIDTH / 2 - 280, 60);
    this.container.setDepth(1000);
    this.container.setVisible(false);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(0, 0, 560, 500, 12);
    bg.lineStyle(2, 0x0f3460, 1);
    bg.strokeRoundedRect(0, 0, 560, 500, 12);
    this.container.add(bg);

    // Title
    const title = scene.add.text(20, 12, 'Resource Audit Log', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.container.add(title);

    const subtitle = scene.add.text(20, 38, 'Complete transaction history for all resources', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    this.container.add(subtitle);

    // Close
    const closeBtn = scene.add.text(530, 10, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);
  }

  setEntries(entries: ResourceAuditEntry[]): void {
    for (const el of this.contentElements) el.destroy();
    this.contentElements = [];

    let y = 58;

    // Header row
    const headers = ['Time', 'Resource', 'Change', 'Balance', 'Action'];
    const xs = [15, 95, 170, 260, 340];
    headers.forEach((h, i) => {
      const t = this.scene.add.text(xs[i], y, h, {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: '#8888aa',
        fontStyle: 'bold',
      });
      this.container.add(t);
      this.contentElements.push(t);
    });
    y += 18;

    // Separator
    const sep = this.scene.add.graphics();
    sep.lineStyle(1, 0x333355, 0.5);
    sep.moveTo(15, y);
    sep.lineTo(545, y);
    sep.strokePath();
    this.container.add(sep);
    this.contentElements.push(sep);
    y += 5;

    // Entries (max visible ~25)
    const maxVisible = 25;
    const visibleEntries = entries.slice(this.scrollOffset, this.scrollOffset + maxVisible);

    for (const entry of visibleEntries) {
      const color = RESOURCE_COLORS[entry.resource] || '#aaaaaa';

      // Timestamp
      const time = new Date(entry.timestamp);
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      const timeText = this.scene.add.text(15, y, timeStr, {
        fontFamily: FONTS.primary,
        fontSize: '12px',
        color: '#666688',
      });
      this.container.add(timeText);
      this.contentElements.push(timeText);

      // Resource
      const resText = this.scene.add.text(95, y, entry.resource, {
        fontFamily: FONTS.primary,
        fontSize: '12px',
        color,
      });
      this.container.add(resText);
      this.contentElements.push(resText);

      // Change
      const changeStr = entry.amount >= 0
        ? `+${entry.amount.toFixed(1)}`
        : entry.amount.toFixed(1);
      const changeColor = entry.amount >= 0 ? '#4ecca3' : '#ff6b6b';
      const changeText = this.scene.add.text(170, y, changeStr, {
        fontFamily: FONTS.primary,
        fontSize: '12px',
        color: changeColor,
        fontStyle: 'bold',
      });
      this.container.add(changeText);
      this.contentElements.push(changeText);

      // Balance after
      const balText = this.scene.add.text(260, y, Math.floor(entry.balanceAfter).toString(), {
        fontFamily: FONTS.primary,
        fontSize: '12px',
        color: '#ffffff',
      });
      this.container.add(balText);
      this.contentElements.push(balText);

      // Action
      const actionText = this.scene.add.text(340, y, entry.action, {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: COLORS.textSecondary,
        wordWrap: { width: 200 },
      });
      this.container.add(actionText);
      this.contentElements.push(actionText);

      y += 17;
    }

    // Scroll info
    if (entries.length > maxVisible) {
      const scrollInfo = this.scene.add.text(
        200, 475,
        `Showing ${this.scrollOffset + 1}-${Math.min(this.scrollOffset + maxVisible, entries.length)} of ${entries.length}`,
        {
          fontFamily: FONTS.primary,
          fontSize: '11px',
          color: '#666688',
        },
      );
      this.container.add(scrollInfo);
      this.contentElements.push(scrollInfo);
    }
  }

  show(): void {
    this.visible = true;
    this.scrollOffset = 0;
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
