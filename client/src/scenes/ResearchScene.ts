import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

interface ResearchNode {
  id: string;
  name: string;
  description: string;
  branch: string;
  prerequisites: string[];
  cost: { resources: Record<string, number>; timeSeconds: number };
  effects: Record<string, number>;
}

interface ActiveResearch {
  researchId: string;
  startTime: number;
  duration: number;
  remainingSeconds: number;
  node: ResearchNode;
}

interface ResearchState {
  completed: string[];
  active: ActiveResearch | null;
  available: ResearchNode[];
  tree: ResearchNode[];
}

const BRANCH_ORDER = ['agriculture', 'logistics', 'knowledge', 'military'];
const BRANCH_LABELS: Record<string, string> = {
  agriculture: 'Agriculture',
  logistics: 'Logistics',
  knowledge: 'Knowledge',
  military: 'Military',
  mastery: 'Mastery',
};
const BRANCH_COLORS: Record<string, number> = {
  agriculture: 0x4ecca3,
  logistics: 0x3498db,
  knowledge: 0x9b59b6,
  military: 0xe74c3c,
  mastery: 0xffd700,
};

const STATUS_COLORS = {
  locked: '#555555',
  available: '#3498db',
  researching: '#f5a623',
  complete: '#ffd700',
};

export class ResearchScene extends Phaser.Scene {
  private state: ResearchState | null = null;
  private contentContainer: Phaser.GameObjects.Container | null = null;
  private progressBar: Phaser.GameObjects.Graphics | null = null;
  private progressText: Phaser.GameObjects.Text | null = null;
  private messageText: Phaser.GameObjects.Text | null = null;
  private updateTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'ResearchScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor(COLORS.background);

    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading research...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);

    try {
      const state = await apiClient.getResearchState();
      this.state = state;
      loadingText.destroy();
      this.buildUI();

      // Poll for active research progress
      this.updateTimer = this.time.addEvent({
        delay: 1000,
        callback: () => this.tickProgress(),
        loop: true,
      });
    } catch (err) {
      loadingText.setText('Failed to load research data');
      if (err instanceof Error && err.message.includes('401')) {
        localStorage.removeItem('guildtide_token');
        this.scene.start('LoginScene');
      }
    }
  }

  private buildUI(): void {
    if (!this.state) return;

    // --- Header ---
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.panelBg, 0.9);
    headerBg.fillRect(0, 0, GAME_WIDTH, 55);
    headerBg.lineStyle(2, COLORS.panelBorder);
    headerBg.strokeRect(0, 0, GAME_WIDTH, 55);

    this.add.text(20, 15, 'Research Tree', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });

    const backBtn = this.add.text(GAME_WIDTH - 20, 18, '< Back', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    backBtn.on('pointerup', () => {
      this.scene.start('GuildHallScene');
    });

    // --- Active research bar ---
    this.renderActiveResearch();

    // --- Message area ---
    this.messageText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 65, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ff4444',
    }).setOrigin(0.5).setAlpha(0);

    // --- Tree content ---
    this.contentContainer = this.add.container(0, 0);
    this.renderTree();

    // --- Bottom nav ---
    this.buildBottomNav();
  }

  private renderActiveResearch(): void {
    const barY = 60;
    const barBg = this.add.graphics();
    barBg.fillStyle(COLORS.panelBg, 0.7);
    barBg.fillRect(0, barY, GAME_WIDTH, 35);

    if (this.state?.active) {
      const a = this.state.active;
      this.add.text(20, barY + 8, `Researching: ${a.node.name}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#f5a623',
        fontStyle: 'bold',
      });

      // Progress bar background
      this.progressBar = this.add.graphics();
      const pbX = 320;
      const pbW = 400;
      const pbH = 16;
      const pbY = barY + 10;

      this.progressBar.fillStyle(0x333333, 1);
      this.progressBar.fillRect(pbX, pbY, pbW, pbH);

      const fraction = 1 - a.remainingSeconds / a.duration;
      this.progressBar.fillStyle(0xf5a623, 1);
      this.progressBar.fillRect(pbX, pbY, pbW * Math.min(1, fraction), pbH);

      const remaining = Math.ceil(a.remainingSeconds);
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      this.progressText = this.add.text(pbX + pbW + 10, pbY, `${minutes}:${seconds.toString().padStart(2, '0')}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
      });
    } else {
      this.add.text(20, barY + 8, 'No active research — select a node below', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      });
    }
  }

  private renderTree(): void {
    if (!this.state || !this.contentContainer) return;

    const { completed, active, available, tree } = this.state;
    const completedSet = new Set(completed);
    const availableSet = new Set(available.map((n) => n.id));
    const activeId = active?.researchId;

    const startY = 105;
    const colWidth = GAME_WIDTH / 4;
    const nodeHeight = 100;
    const nodeWidth = colWidth - 30;
    const nodePadding = 15;

    // Group nodes by branch (non-mastery)
    const branchNodes: Record<string, ResearchNode[]> = {};
    const masteryNodes: ResearchNode[] = [];

    for (const node of tree) {
      if (node.branch === 'mastery') {
        masteryNodes.push(node);
      } else {
        if (!branchNodes[node.branch]) branchNodes[node.branch] = [];
        branchNodes[node.branch].push(node);
      }
    }

    // Render branch headers and nodes
    BRANCH_ORDER.forEach((branch, colIdx) => {
      const x = colIdx * colWidth + nodePadding;
      const nodes = branchNodes[branch] || [];
      const branchColor = BRANCH_COLORS[branch] || 0xcccccc;

      // Branch header
      const headerText = this.add.text(x + nodeWidth / 2, startY, BRANCH_LABELS[branch], {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: `#${branchColor.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      this.contentContainer!.add(headerText);

      // Render each node in this branch
      nodes.forEach((node, rowIdx) => {
        const ny = startY + 30 + rowIdx * nodeHeight;
        this.renderNode(node, x, ny, nodeWidth, nodeHeight - 10, completedSet, availableSet, activeId, branchColor);
      });
    });

    // Mastery row at bottom
    if (masteryNodes.length > 0) {
      const masteryY = startY + 30 + 4 * nodeHeight;
      const masteryHeaderText = this.add.text(GAME_WIDTH / 2, masteryY - 15, 'Mastery', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      this.contentContainer!.add(masteryHeaderText);

      masteryNodes.forEach((node, idx) => {
        const mx = idx * colWidth + nodePadding;
        this.renderNode(node, mx, masteryY + 20, nodeWidth, nodeHeight - 10, completedSet, availableSet, activeId, 0xffd700);
      });
    }
  }

  private renderNode(
    node: ResearchNode,
    x: number,
    y: number,
    w: number,
    h: number,
    completedSet: Set<string>,
    availableSet: Set<string>,
    activeId: string | undefined,
    branchColor: number,
  ): void {
    const isComplete = completedSet.has(node.id);
    const isActive = activeId === node.id;
    const isAvailable = availableSet.has(node.id);

    let statusColor: string;
    let borderColor: number;
    let bgAlpha = 0.6;

    if (isComplete) {
      statusColor = STATUS_COLORS.complete;
      borderColor = 0xffd700;
      bgAlpha = 0.8;
    } else if (isActive) {
      statusColor = STATUS_COLORS.researching;
      borderColor = 0xf5a623;
    } else if (isAvailable) {
      statusColor = STATUS_COLORS.available;
      borderColor = branchColor;
    } else {
      statusColor = STATUS_COLORS.locked;
      borderColor = 0x333333;
      bgAlpha = 0.3;
    }

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.panelBg, bgAlpha);
    bg.fillRoundedRect(x, y, w, h, 6);
    bg.lineStyle(2, borderColor);
    bg.strokeRoundedRect(x, y, w, h, 6);
    this.contentContainer!.add(bg);

    // Status indicator
    const statusLabel = isComplete ? 'DONE' : isActive ? 'IN PROGRESS' : isAvailable ? 'AVAILABLE' : 'LOCKED';
    const statusText = this.add.text(x + w - 8, y + 4, statusLabel, {
      fontFamily: FONTS.primary,
      fontSize: '10px',
      color: statusColor,
      fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.contentContainer!.add(statusText);

    // Name
    const nameText = this.add.text(x + 8, y + 6, node.name, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: isComplete ? '#ffd700' : COLORS.textPrimary,
      fontStyle: 'bold',
    });
    this.contentContainer!.add(nameText);

    // Description (truncated)
    const desc = node.description.length > 50 ? node.description.substring(0, 47) + '...' : node.description;
    const descText = this.add.text(x + 8, y + 24, desc, {
      fontFamily: FONTS.primary,
      fontSize: '11px',
      color: COLORS.textSecondary,
      wordWrap: { width: w - 16 },
    });
    this.contentContainer!.add(descText);

    // Cost line
    if (!isComplete) {
      const costParts: string[] = [];
      for (const [res, amt] of Object.entries(node.cost.resources)) {
        costParts.push(`${res}: ${amt}`);
      }
      const timeMin = Math.ceil(node.cost.timeSeconds / 60);
      costParts.push(`${timeMin}m`);

      const costStr = costParts.join(' | ');
      const costText = this.add.text(x + 8, y + h - 18, costStr, {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: isAvailable ? '#88bbff' : '#666666',
      });
      this.contentContainer!.add(costText);
    }

    // Make available nodes clickable
    if (isAvailable && !this.state?.active) {
      const hitZone = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      this.contentContainer!.add(hitZone);

      hitZone.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(COLORS.panelBg, 0.9);
        bg.fillRoundedRect(x, y, w, h, 6);
        bg.lineStyle(3, branchColor);
        bg.strokeRoundedRect(x, y, w, h, 6);
      });

      hitZone.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(COLORS.panelBg, bgAlpha);
        bg.fillRoundedRect(x, y, w, h, 6);
        bg.lineStyle(2, borderColor);
        bg.strokeRoundedRect(x, y, w, h, 6);
      });

      hitZone.on('pointerup', () => {
        this.handleStartResearch(node.id);
      });
    }
  }

  private async handleStartResearch(researchId: string): Promise<void> {
    try {
      const newState = await apiClient.startResearch(researchId);
      this.state = newState;
      this.scene.restart();
    } catch (err) {
      this.showMessage(err instanceof Error ? err.message : 'Research failed', '#ff4444');
    }
  }

  private tickProgress(): void {
    if (!this.state?.active) return;

    this.state.active.remainingSeconds -= 1;

    if (this.state.active.remainingSeconds <= 0) {
      // Research complete — refresh from server
      this.refreshState();
      return;
    }

    // Update progress bar
    if (this.progressBar && this.progressText) {
      const a = this.state.active;
      const fraction = 1 - a.remainingSeconds / a.duration;
      const pbX = 320;
      const pbW = 400;
      const pbH = 16;
      const pbY = 70;

      this.progressBar.clear();
      this.progressBar.fillStyle(0x333333, 1);
      this.progressBar.fillRect(pbX, pbY, pbW, pbH);
      this.progressBar.fillStyle(0xf5a623, 1);
      this.progressBar.fillRect(pbX, pbY, pbW * Math.min(1, fraction), pbH);

      const remaining = Math.ceil(a.remainingSeconds);
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      this.progressText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
  }

  private async refreshState(): Promise<void> {
    try {
      const state = await apiClient.getResearchState();
      this.state = state;
      this.scene.restart();
    } catch {
      // Silently fail
    }
  }

  private showMessage(msg: string, color: string): void {
    if (!this.messageText) return;
    this.messageText.setText(msg).setColor(color).setAlpha(1);
    this.time.delayedCall(3000, () => {
      this.messageText?.setAlpha(0);
    });
  }

  private buildBottomNav(): void {
    const navY = GAME_HEIGHT - 50;
    const navBg = this.add.graphics();
    navBg.fillStyle(COLORS.panelBg, 0.9);
    navBg.fillRect(0, navY, GAME_WIDTH, 50);
    navBg.lineStyle(2, COLORS.panelBorder);
    navBg.strokeRect(0, navY, GAME_WIDTH, 50);

    const tabs = ['Guild Hall', 'Expeditions', 'Market', 'World Map', 'Research'];
    const tabWidth = GAME_WIDTH / tabs.length;

    tabs.forEach((tab, i) => {
      const x = tabWidth * i + tabWidth / 2;
      const text = this.add.text(x, navY + 25, tab, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: i === 4 ? COLORS.textGold : COLORS.textSecondary,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      text.on('pointerover', () => text.setColor(COLORS.textGold));
      text.on('pointerout', () => {
        if (i !== 4) text.setColor(COLORS.textSecondary);
      });

      if (i === 0) {
        text.on('pointerup', () => this.scene.start('GuildHallScene'));
      } else if (i === 1) {
        text.on('pointerup', () => this.scene.start('ExpeditionScene'));
      } else if (i === 2) {
        text.on('pointerup', () => this.scene.start('MarketScene'));
      }
    });
  }
}
