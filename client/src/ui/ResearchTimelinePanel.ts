import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

/**
 * ResearchTimelinePanel — Historical research timeline.
 * T-0662: Tree legend explaining node types and symbols
 * T-0673: Tutorial walkthrough for new players
 * T-0675: Progress persistence across sessions
 */

export interface TimelineEntry {
  researchId: string;
  name: string;
  branch: string;
  completedAt: number;
}

const BRANCH_COLORS_HEX: Record<string, string> = {
  agriculture: '#4ecca3',
  logistics: '#3498db',
  knowledge: '#9b59b6',
  military: '#e74c3c',
  mastery: '#ffd700',
  combat: '#ff6347',
  economic: '#2ecc71',
  exploration: '#1abc9c',
  arcane: '#8e44ad',
  civic: '#f39c12',
};

export class ResearchTimelinePanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private visible = false;
  private scrollOffset = 0;
  private onClose: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(190).setVisible(false);
    this.bg = scene.add.graphics();
    this.container.add(this.bg);
  }

  setCallbacks(opts: { onClose?: () => void }): void {
    this.onClose = opts.onClose ?? null;
  }

  show(entries: TimelineEntry[], showTutorial: boolean = false): void {
    this.clear();

    const panelW = 500;
    const panelH = 520;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    // Backdrop
    this.bg.fillStyle(0x000000, 0.5);
    this.bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Panel
    this.bg.fillStyle(COLORS.panelBg, 0.95);
    this.bg.fillRoundedRect(px, py, panelW, panelH, 10);
    this.bg.lineStyle(2, COLORS.panelBorder);
    this.bg.strokeRoundedRect(px, py, panelW, panelH, 10);

    // Title
    const title = this.scene.add.text(px + 20, py + 15, 'Research Timeline', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold, fontStyle: 'bold',
    });
    this.container.add(title);

    // Close
    const closeBtn = this.scene.add.text(px + panelW - 30, py + 15, 'X', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textAccent, fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    let yOff = py + 55;

    // Tutorial walkthrough (T-0673)
    if (showTutorial && entries.length === 0) {
      const tutLines = [
        'Welcome to the Research Tree!',
        '',
        'How it works:',
        '1. Click an available node to view details',
        '2. Start research to begin the timer',
        '3. Once complete, effects apply globally',
        '4. Unlock new nodes by completing prerequisites',
        '',
        'Node statuses:',
        '  LOCKED (gray) - Prerequisites not met',
        '  AVAILABLE (blue) - Ready to research',
        '  IN PROGRESS (orange) - Currently researching',
        '  COMPLETED (gold) - Effects active',
        '',
        'Tips:',
        '- Queue up to 5 nodes for auto-progression',
        '- Complete a full branch for bonus effects',
        '- Seasonal modifiers affect research speed',
        '- The Research Advisor suggests optimal paths',
      ];
      for (const line of tutLines) {
        const t = this.scene.add.text(px + 25, yOff, line, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
          color: line.startsWith('  ') ? '#88bbff' : COLORS.textPrimary,
        });
        this.container.add(t);
        yOff += 18;
      }

      this.container.setVisible(true);
      this.visible = true;
      return;
    }

    // Legend (T-0662)
    const legendTitle = this.scene.add.text(px + 20, yOff, 'Legend:', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary, fontStyle: 'bold',
    });
    this.container.add(legendTitle);
    yOff += 18;

    const legendItems = [
      { color: '#555555', label: 'Locked' },
      { color: '#3498db', label: 'Available' },
      { color: '#f5a623', label: 'In Progress' },
      { color: '#ffd700', label: 'Completed' },
    ];
    const legendX = px + 30;
    legendItems.forEach((item, i) => {
      const lx = legendX + i * 110;
      this.bg.fillStyle(parseInt(item.color.replace('#', ''), 16), 1);
      this.bg.fillCircle(lx, yOff + 6, 5);
      const lt = this.scene.add.text(lx + 10, yOff, item.label, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: item.color,
      });
      this.container.add(lt);
    });
    yOff += 25;

    // Divider
    this.bg.lineStyle(1, COLORS.panelBorder);
    this.bg.lineBetween(px + 15, yOff, px + panelW - 15, yOff);
    yOff += 10;

    // Timeline heading
    const timelineTitle = this.scene.add.text(px + 20, yOff, 'History (newest first):', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary, fontStyle: 'bold',
    });
    this.container.add(timelineTitle);
    yOff += 22;

    if (entries.length === 0) {
      const emptyText = this.scene.add.text(px + 30, yOff, 'No research completed yet.', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary, fontStyle: 'italic',
      });
      this.container.add(emptyText);
    } else {
      // Reverse for newest first
      const sorted = [...entries].sort((a, b) => b.completedAt - a.completedAt);
      const maxVisible = 15;
      const visible = sorted.slice(0, maxVisible);

      // Timeline line
      const lineX = px + 35;
      if (visible.length > 1) {
        this.bg.lineStyle(2, 0x333355);
        this.bg.lineBetween(lineX, yOff, lineX, yOff + visible.length * 28 - 10);
      }

      visible.forEach((entry) => {
        const branchColor = BRANCH_COLORS_HEX[entry.branch] || '#cccccc';
        const colorNum = parseInt(branchColor.replace('#', ''), 16);

        // Timeline dot
        this.bg.fillStyle(colorNum, 1);
        this.bg.fillCircle(lineX, yOff + 6, 5);

        // Name
        const nameText = this.scene.add.text(lineX + 15, yOff - 2, entry.name, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
          color: branchColor, fontStyle: 'bold',
        });
        this.container.add(nameText);

        // Date
        const dateStr = new Date(entry.completedAt).toLocaleDateString();
        const dateText = this.scene.add.text(px + panelW - 30, yOff, dateStr, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }).setOrigin(1, 0);
        this.container.add(dateText);

        yOff += 28;
      });

      if (sorted.length > maxVisible) {
        const moreText = this.scene.add.text(px + 50, yOff, `... and ${sorted.length - maxVisible} more`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary, fontStyle: 'italic',
        });
        this.container.add(moreText);
      }
    }

    this.container.setVisible(true);
    this.visible = true;
  }

  hide(): void {
    this.container.setVisible(false);
    this.visible = false;
    this.onClose?.();
  }

  isVisible(): boolean {
    return this.visible;
  }

  private clear(): void {
    const children = this.container.getAll();
    for (const child of children) {
      if (child !== this.bg) child.destroy();
    }
    this.bg.clear();
  }

  destroy(): void {
    this.container.destroy();
  }
}
