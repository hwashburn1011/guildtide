import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

/**
 * ResearchBranchPanel — branch overview with completion tracker.
 * T-0646: Branch completion stats
 * T-0642: Branch specialization at tier 3
 * T-0643: Specialization choice dialog
 * T-0667: Achievement badges (completionist, specialist)
 * T-0678: Batch info display (all effects of a branch)
 */

export interface BranchInfo {
  branch: string;
  total: number;
  done: number;
  percent: number;
  effects: Record<string, number>;
  isComplete: boolean;
  bonusLabel?: string;
  bonusEffects?: Record<string, number>;
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

const BRANCH_ICONS: Record<string, string> = {
  agriculture: 'Crop',
  logistics: 'Cart',
  knowledge: 'Book',
  military: 'Sword',
  mastery: 'Star',
  combat: 'Axe',
  economic: 'Coin',
  exploration: 'Map',
  arcane: 'Wand',
  civic: 'Flag',
};

export class ResearchBranchPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private visible = false;
  private onClose: (() => void) | null = null;
  private onSelectBranch: ((branch: string) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(180).setVisible(false);
    this.bg = scene.add.graphics();
    this.container.add(this.bg);
  }

  setCallbacks(opts: {
    onClose?: () => void;
    onSelectBranch?: (branch: string) => void;
  }): void {
    this.onClose = opts.onClose ?? null;
    this.onSelectBranch = opts.onSelectBranch ?? null;
  }

  show(branches: BranchInfo[], achievements: string[]): void {
    this.clear();

    const panelW = 700;
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
    const title = this.scene.add.text(px + 20, py + 15, 'Research Branches', {
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

    // Branch cards in 2 columns
    const colWidth = (panelW - 60) / 2;
    const cardH = 80;
    const startY = py + 55;
    const startX = px + 20;

    branches.forEach((branch, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = startX + col * (colWidth + 20);
      const cy = startY + row * (cardH + 10);

      const branchColor = parseInt((BRANCH_COLORS_HEX[branch.branch] || '#3498db').replace('#', ''), 16);

      // Card bg
      this.bg.fillStyle(0x1a2040, 0.8);
      this.bg.fillRoundedRect(cx, cy, colWidth, cardH, 6);
      this.bg.lineStyle(2, branch.isComplete ? 0xffd700 : branchColor);
      this.bg.strokeRoundedRect(cx, cy, colWidth, cardH, 6);

      // Icon placeholder
      const icon = BRANCH_ICONS[branch.branch] || '?';
      const iconText = this.scene.add.text(cx + 10, cy + 8, icon, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: BRANCH_COLORS_HEX[branch.branch] || COLORS.textPrimary,
        fontStyle: 'bold',
      });
      this.container.add(iconText);

      // Branch name
      const nameLabel = branch.branch.charAt(0).toUpperCase() + branch.branch.slice(1);
      const nameText = this.scene.add.text(cx + 55, cy + 8, nameLabel, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: branch.isComplete ? '#ffd700' : COLORS.textPrimary,
        fontStyle: 'bold',
      });
      this.container.add(nameText);

      // Progress
      const progressStr = `${branch.done}/${branch.total} (${Math.round(branch.percent * 100)}%)`;
      const progressText = this.scene.add.text(cx + 55, cy + 28, progressStr, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      });
      this.container.add(progressText);

      // Progress bar
      const barX = cx + 55;
      const barY = cy + 48;
      const barW = colWidth - 70;
      const barH = 10;
      this.bg.fillStyle(0x333333, 1);
      this.bg.fillRoundedRect(barX, barY, barW, barH, 3);
      this.bg.fillStyle(branchColor, 1);
      this.bg.fillRoundedRect(barX, barY, barW * branch.percent, barH, 3);

      // Completion badge (T-0667)
      if (branch.isComplete) {
        const badge = this.scene.add.text(cx + colWidth - 40, cy + 8, 'DONE', {
          fontFamily: FONTS.primary, fontSize: '10px',
          color: '#ffd700', fontStyle: 'bold',
        });
        this.container.add(badge);
      }

      // Bonus label if complete
      if (branch.bonusLabel) {
        const bonusText = this.scene.add.text(cx + 55, cy + 62, `Bonus: ${branch.bonusLabel}`, {
          fontFamily: FONTS.primary, fontSize: '10px',
          color: '#4ecca3', fontStyle: 'italic',
        });
        this.container.add(bonusText);
      }

      // Make clickable to filter by branch
      const hitZone = this.scene.add.zone(cx, cy, colWidth, cardH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      hitZone.on('pointerup', () => this.onSelectBranch?.(branch.branch));
      this.container.add(hitZone);
    });

    // Achievement badges section (T-0667)
    const achY = startY + Math.ceil(branches.length / 2) * (cardH + 10) + 10;
    if (achievements.length > 0) {
      const achTitle = this.scene.add.text(startX, achY, 'Achievements:', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: '#ffd700', fontStyle: 'bold',
      });
      this.container.add(achTitle);

      achievements.forEach((ach, i) => {
        const achText = this.scene.add.text(startX + 10, achY + 20 + i * 16, `* ${ach}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
          color: '#c0a060',
        });
        this.container.add(achText);
      });
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
