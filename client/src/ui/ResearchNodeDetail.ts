import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

/**
 * ResearchNodeDetail — detailed info panel for a single research node.
 * Shows full description, cost breakdown, effects, prerequisites, lore,
 * and gated content (buildings, destinations, recipes).
 *
 * T-0632: Tooltip with description, cost, time, and effects
 * T-0665: Lore entries unlocked alongside node completion
 * T-0672: Flavor text and lore descriptions
 */

export interface NodeDetailData {
  id: string;
  name: string;
  description: string;
  branch: string;
  tier: number;
  prerequisites: string[];
  cost: { resources: Record<string, number>; timeSeconds: number };
  effects: Record<string, number>;
  lore?: string;
  gatedBuildings?: string[];
  gatedDestinations?: string[];
  gatedRecipes?: string[];
  status: 'locked' | 'available' | 'researching' | 'completed';
  prereqNames?: string[];
}

const STATUS_LABELS: Record<string, string> = {
  locked: 'LOCKED',
  available: 'AVAILABLE',
  researching: 'IN PROGRESS',
  completed: 'COMPLETED',
};

const STATUS_COLORS_HEX: Record<string, string> = {
  locked: '#555555',
  available: '#3498db',
  researching: '#f5a623',
  completed: '#ffd700',
};

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

export class ResearchNodeDetail {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private visible = false;
  private onClose: (() => void) | null = null;
  private onStartResearch: ((id: string) => void) | null = null;
  private onQueueResearch: ((id: string) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(200).setVisible(false);
    this.bg = scene.add.graphics();
    this.container.add(this.bg);
  }

  setCallbacks(opts: {
    onClose?: () => void;
    onStartResearch?: (id: string) => void;
    onQueueResearch?: (id: string) => void;
  }): void {
    this.onClose = opts.onClose ?? null;
    this.onStartResearch = opts.onStartResearch ?? null;
    this.onQueueResearch = opts.onQueueResearch ?? null;
  }

  show(data: NodeDetailData): void {
    this.clear();

    const panelW = 420;
    const panelH = 480;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    // Backdrop
    this.bg.fillStyle(0x000000, 0.6);
    this.bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Panel background
    this.bg.fillStyle(COLORS.panelBg, 0.95);
    this.bg.fillRoundedRect(px, py, panelW, panelH, 10);
    const branchColorNum = parseInt((BRANCH_COLORS_HEX[data.branch] || '#3498db').replace('#', ''), 16);
    this.bg.lineStyle(2, branchColorNum);
    this.bg.strokeRoundedRect(px, py, panelW, panelH, 10);

    let yOff = py + 15;

    // Name & status
    const nameText = this.scene.add.text(px + 15, yOff, data.name, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`,
      color: BRANCH_COLORS_HEX[data.branch] || COLORS.textPrimary, fontStyle: 'bold',
    });
    this.container.add(nameText);

    const statusText = this.scene.add.text(px + panelW - 15, yOff + 5, STATUS_LABELS[data.status], {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: STATUS_COLORS_HEX[data.status], fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.container.add(statusText);

    yOff += 35;

    // Branch & tier
    const branchLabel = data.branch.charAt(0).toUpperCase() + data.branch.slice(1);
    const meta = this.scene.add.text(px + 15, yOff, `Branch: ${branchLabel}  |  Tier: ${data.tier}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
    });
    this.container.add(meta);
    yOff += 22;

    // Divider
    this.bg.lineStyle(1, COLORS.panelBorder);
    this.bg.lineBetween(px + 15, yOff, px + panelW - 15, yOff);
    yOff += 10;

    // Description
    const descText = this.scene.add.text(px + 15, yOff, data.description, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary, wordWrap: { width: panelW - 30 },
    });
    this.container.add(descText);
    yOff += descText.height + 12;

    // Cost
    if (data.status !== 'completed') {
      const costTitle = this.scene.add.text(px + 15, yOff, 'Cost:', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: '#88bbff', fontStyle: 'bold',
      });
      this.container.add(costTitle);
      yOff += 18;

      for (const [res, amt] of Object.entries(data.cost.resources)) {
        const costLine = this.scene.add.text(px + 25, yOff, `${res}: ${amt}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
        });
        this.container.add(costLine);
        yOff += 15;
      }
      const timeMin = Math.ceil(data.cost.timeSeconds / 60);
      const timeLine = this.scene.add.text(px + 25, yOff, `Time: ${timeMin} min`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
      });
      this.container.add(timeLine);
      yOff += 18;
    }

    // Effects
    const effectTitle = this.scene.add.text(px + 15, yOff, 'Effects:', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3', fontStyle: 'bold',
    });
    this.container.add(effectTitle);
    yOff += 18;

    for (const [key, val] of Object.entries(data.effects)) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const valStr = val < 1 ? `+${Math.round(val * 100)}%` : val === 1 ? 'Unlocked' : `+${val}`;
      const effectLine = this.scene.add.text(px + 25, yOff, `${label}: ${valStr}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#a0ddb0',
      });
      this.container.add(effectLine);
      yOff += 15;
    }
    yOff += 5;

    // Prerequisites
    if (data.prerequisites.length > 0) {
      const prereqTitle = this.scene.add.text(px + 15, yOff, 'Requires:', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: '#e94560', fontStyle: 'bold',
      });
      this.container.add(prereqTitle);
      yOff += 18;

      const prereqNames = data.prereqNames || data.prerequisites;
      for (const name of prereqNames) {
        const prereqLine = this.scene.add.text(px + 25, yOff, `- ${name}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#d08080',
        });
        this.container.add(prereqLine);
        yOff += 15;
      }
      yOff += 5;
    }

    // Lore (T-0665, T-0672)
    if (data.lore && data.status === 'completed') {
      const loreTitle = this.scene.add.text(px + 15, yOff, 'Lore:', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: '#c0a060', fontStyle: 'italic',
      });
      this.container.add(loreTitle);
      yOff += 18;

      const loreText = this.scene.add.text(px + 25, yOff, `"${data.lore}"`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
        color: '#b09050', fontStyle: 'italic', wordWrap: { width: panelW - 50 },
      });
      this.container.add(loreText);
      yOff += loreText.height + 8;
    }

    // Gated content (T-0654, T-0655, T-0656)
    const gated: string[] = [];
    if (data.gatedBuildings?.length) gated.push(`Unlocks buildings: ${data.gatedBuildings.join(', ')}`);
    if (data.gatedDestinations?.length) gated.push(`Unlocks destinations: ${data.gatedDestinations.join(', ')}`);
    if (data.gatedRecipes?.length) gated.push(`Unlocks recipes: ${data.gatedRecipes.join(', ')}`);

    if (gated.length > 0) {
      for (const g of gated) {
        const gatedLine = this.scene.add.text(px + 15, yOff, g, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#88ccff',
        });
        this.container.add(gatedLine);
        yOff += 15;
      }
      yOff += 5;
    }

    // Action buttons
    const btnY = py + panelH - 50;

    if (data.status === 'available') {
      const startBtn = this.scene.add.text(px + panelW / 2 - 80, btnY, '[ Start Research ]', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: '#4ecca3', fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });
      startBtn.on('pointerup', () => this.onStartResearch?.(data.id));
      startBtn.on('pointerover', () => startBtn.setColor('#6eeec3'));
      startBtn.on('pointerout', () => startBtn.setColor('#4ecca3'));
      this.container.add(startBtn);

      const queueBtn = this.scene.add.text(px + panelW / 2 + 50, btnY, '[ Queue ]', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: '#3498db', fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });
      queueBtn.on('pointerup', () => this.onQueueResearch?.(data.id));
      queueBtn.on('pointerover', () => queueBtn.setColor('#5ab8fb'));
      queueBtn.on('pointerout', () => queueBtn.setColor('#3498db'));
      this.container.add(queueBtn);
    }

    // Close button
    const closeBtn = this.scene.add.text(px + panelW - 30, py + 8, 'X', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textAccent, fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // Click backdrop to close
    const backdropZone = this.scene.add.zone(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0, 0).setInteractive();
    this.container.addAt(backdropZone, 1); // behind panel content
    backdropZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < px || pointer.x > px + panelW || pointer.y < py || pointer.y > py + panelH) {
        this.hide();
      }
    });

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
    // Remove all children except bg
    const children = this.container.getAll();
    for (const child of children) {
      if (child !== this.bg) {
        child.destroy();
      }
    }
    this.bg.clear();
  }

  destroy(): void {
    this.container.destroy();
  }
}
