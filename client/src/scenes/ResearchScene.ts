import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import { ResearchNodeDetail, type NodeDetailData } from '../ui/ResearchNodeDetail';
import { ResearchBranchPanel, type BranchInfo } from '../ui/ResearchBranchPanel';
import { ResearchTimelinePanel, type TimelineEntry } from '../ui/ResearchTimelinePanel';

/* ──────────────── Interfaces ──────────────── */

interface ResearchNode {
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
}

interface ActiveResearch {
  researchId: string;
  startTime: number;
  duration: number;
  remainingSeconds: number;
  node: ResearchNode;
}

interface QueueItem {
  researchId: string;
  addedAt: number;
}

interface AdvancedResearchState {
  completed: string[];
  active: ActiveResearch | null;
  available: ResearchNode[];
  tree: ResearchNode[];
  queue: QueueItem[];
  branchStats: Record<string, { total: number; done: number; percent: number }>;
  activeBonuses: Array<{ branch: string; label: string; effects: Record<string, number> }>;
  activeSynergies: Array<{ branchA: string; branchB: string; label: string; effects: Record<string, number> }>;
  milestones: Array<{ percent: number; label: string; achieved: boolean }>;
  overallPercent: number;
  activeEvents: Array<{ id: string; title: string; description: string }>;
  history: Array<{ researchId: string; completedAt: number; branch: string; name: string }>;
  advisor: ResearchNode | null;
  speedModifier: number;
  contributions: Array<{ playerId: string; playerName: string; points: number }>;
  season: string;
}

/* ──────────────── Constants ──────────────── */

const EXPANDED_BRANCHES = ['combat', 'economic', 'exploration', 'arcane', 'civic'];
const LEGACY_BRANCHES = ['agriculture', 'logistics', 'knowledge', 'military'];
const ALL_BRANCHES = [...LEGACY_BRANCHES, ...EXPANDED_BRANCHES];

const BRANCH_LABELS: Record<string, string> = {
  agriculture: 'Agriculture', logistics: 'Logistics', knowledge: 'Knowledge', military: 'Military',
  mastery: 'Mastery', combat: 'Combat', economic: 'Economic', exploration: 'Exploration',
  arcane: 'Arcane', civic: 'Civic',
};

const BRANCH_COLORS: Record<string, number> = {
  agriculture: 0x4ecca3, logistics: 0x3498db, knowledge: 0x9b59b6, military: 0xe74c3c,
  mastery: 0xffd700, combat: 0xff6347, economic: 0x2ecc71, exploration: 0x1abc9c,
  arcane: 0x8e44ad, civic: 0xf39c12,
};

const STATUS_COLORS: Record<string, string> = {
  locked: '#555555', available: '#3498db', researching: '#f5a623', complete: '#ffd700',
};

/* ──────────────── Scene ──────────────── */

export class ResearchScene extends Phaser.Scene {
  private state: AdvancedResearchState | null = null;
  private contentContainer: Phaser.GameObjects.Container | null = null;
  private connectionGraphics: Phaser.GameObjects.Graphics | null = null;
  private progressBar: Phaser.GameObjects.Graphics | null = null;
  private progressText: Phaser.GameObjects.Text | null = null;
  private messageText: Phaser.GameObjects.Text | null = null;
  private updateTimer: Phaser.Time.TimerEvent | null = null;
  private nodePositions: Map<string, { x: number; y: number; w: number; h: number }> = new Map();

  // Sub-panels
  private nodeDetail: ResearchNodeDetail | null = null;
  private branchPanel: ResearchBranchPanel | null = null;
  private timelinePanel: ResearchTimelinePanel | null = null;

  // Zoom/pan (T-0648)
  private zoomLevel = 1;
  private panX = 0;
  private panY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  // Search (T-0647)
  private searchQuery = '';
  private searchResults: Set<string> = new Set();

  // Filter (T-0670)
  private branchFilter: string | null = null;

  // Pulse animation for active node (T-0677)
  private pulseNodeId: string | null = null;
  private pulseGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: 'ResearchScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.nodePositions.clear();
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;

    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading research...', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textSecondary,
    }).setOrigin(0.5);

    try {
      const state = await apiClient.getAdvancedResearchState();
      this.state = state;
      loadingText.destroy();
      this.buildUI();

      this.updateTimer = this.time.addEvent({
        delay: 1000, callback: () => this.tickProgress(), loop: true,
      });
    } catch (err) {
      loadingText.setText('Failed to load research data');
      if (err instanceof Error && err.message.includes('401')) {
        localStorage.removeItem('guildtide_token');
        this.scene.start('LoginScene');
      }
    }
  }

  /* ──────────────── UI Build ──────────────── */

  private buildUI(): void {
    if (!this.state) return;

    // Sub-panels
    this.nodeDetail = new ResearchNodeDetail(this);
    this.nodeDetail.setCallbacks({
      onStartResearch: (id) => this.handleStartResearch(id),
      onQueueResearch: (id) => this.handleQueueResearch(id),
    });

    this.branchPanel = new ResearchBranchPanel(this);
    this.branchPanel.setCallbacks({
      onSelectBranch: (b) => { this.branchFilter = b; this.branchPanel?.hide(); this.rebuildTree(); },
    });

    this.timelinePanel = new ResearchTimelinePanel(this);

    // --- Header ---
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.panelBg, 0.9);
    headerBg.fillRect(0, 0, GAME_WIDTH, 55);
    headerBg.lineStyle(2, COLORS.panelBorder);
    headerBg.strokeRect(0, 0, GAME_WIDTH, 55);

    this.add.text(20, 15, 'Research Tree', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold, fontStyle: 'bold',
    });

    // Speed modifier display (T-0674)
    const speedStr = `Speed: ${Math.round(this.state.speedModifier * 100)}%`;
    this.add.text(220, 20, speedStr, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: this.state.speedModifier > 1 ? '#4ecca3' : COLORS.textSecondary,
    });

    // Overall progress (T-0646)
    const overallStr = `Overall: ${Math.round(this.state.overallPercent)}%`;
    this.add.text(380, 20, overallStr, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: '#88bbff',
    });

    // Season indicator (T-0666)
    const seasonLabel = this.state.season.charAt(0).toUpperCase() + this.state.season.slice(1);
    this.add.text(530, 20, `Season: ${seasonLabel}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    });

    // Top-right toolbar
    let toolX = GAME_WIDTH - 20;
    const toolY = 18;

    const backBtn = this.add.text(toolX, toolY, '< Back', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent, fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    backBtn.on('pointerup', () => this.scene.start('GuildHallScene'));
    toolX -= 70;

    // Timeline button
    const histBtn = this.add.text(toolX, toolY, 'Timeline', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: '#c0a060', fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    histBtn.on('pointerup', () => this.showTimeline());
    toolX -= 80;

    // Branches button
    const branchBtn = this.add.text(toolX, toolY, 'Branches', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: '#88bbff', fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    branchBtn.on('pointerup', () => this.showBranches());
    toolX -= 80;

    // Search button (T-0647)
    const searchBtn = this.add.text(toolX, toolY, 'Search', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: '#aaaacc', fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    searchBtn.on('pointerup', () => this.promptSearch());
    toolX -= 70;

    // Zoom controls (T-0648)
    const zoomInBtn = this.add.text(toolX, toolY, '+', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary, fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    zoomInBtn.on('pointerup', () => this.setZoom(Math.min(2, this.zoomLevel + 0.2)));
    toolX -= 25;

    const zoomOutBtn = this.add.text(toolX, toolY, '-', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary, fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    zoomOutBtn.on('pointerup', () => this.setZoom(Math.max(0.4, this.zoomLevel - 0.2)));
    toolX -= 25;

    const resetBtn = this.add.text(toolX, toolY, 'Fit', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    resetBtn.on('pointerup', () => { this.zoomLevel = 1; this.panX = 0; this.panY = 0; this.rebuildTree(); });

    // --- Active research bar ---
    this.renderActiveResearch();

    // --- Queue display (T-0640) ---
    this.renderQueue();

    // --- Message area ---
    this.messageText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 65, '', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#ff4444',
    }).setOrigin(0.5).setAlpha(0);

    // --- Advisor suggestion (T-0652) ---
    this.renderAdvisor();

    // --- Tree content ---
    this.contentContainer = this.add.container(0, 0);
    this.connectionGraphics = this.add.graphics();
    this.contentContainer.add(this.connectionGraphics);
    this.pulseGraphics = this.add.graphics();
    this.contentContainer.add(this.pulseGraphics);

    this.renderTree();

    // Pan via drag (T-0648)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > 95 && pointer.y < GAME_HEIGHT - 50) {
        this.isDragging = true;
        this.dragStartX = pointer.x - this.panX;
        this.dragStartY = pointer.y - this.panY;
      }
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.isDown) {
        this.panX = pointer.x - this.dragStartX;
        this.panY = pointer.y - this.dragStartY;
        if (this.contentContainer) {
          this.contentContainer.setPosition(this.panX, this.panY);
          this.contentContainer.setScale(this.zoomLevel);
        }
      }
    });
    this.input.on('pointerup', () => { this.isDragging = false; });

    // Mouse wheel zoom
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gx: number[], _gy: number[], _gz: number[], deltaY: number) => {
      const newZoom = Phaser.Math.Clamp(this.zoomLevel - deltaY * 0.001, 0.4, 2);
      this.setZoom(newZoom);
    });

    // Keyboard navigation (T-0676)
    this.input.keyboard?.on('keydown-LEFT', () => { this.panX += 50; this.applyTransform(); });
    this.input.keyboard?.on('keydown-RIGHT', () => { this.panX -= 50; this.applyTransform(); });
    this.input.keyboard?.on('keydown-UP', () => { this.panY += 50; this.applyTransform(); });
    this.input.keyboard?.on('keydown-DOWN', () => { this.panY -= 50; this.applyTransform(); });
    this.input.keyboard?.on('keydown-PLUS', () => this.setZoom(Math.min(2, this.zoomLevel + 0.1)));
    this.input.keyboard?.on('keydown-MINUS', () => this.setZoom(Math.max(0.4, this.zoomLevel - 0.1)));
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.nodeDetail?.isVisible()) this.nodeDetail.hide();
      else if (this.branchPanel?.isVisible()) this.branchPanel.hide();
      else if (this.timelinePanel?.isVisible()) this.timelinePanel.hide();
    });

    // --- Bottom nav ---
    this.buildBottomNav();

    // --- Mini-map (T-0649) ---
    this.renderMiniMap();
  }

  /* ──────────────── Active Research Bar ──────────────── */

  private renderActiveResearch(): void {
    const barY = 60;
    const barBg = this.add.graphics();
    barBg.fillStyle(COLORS.panelBg, 0.7);
    barBg.fillRect(0, barY, GAME_WIDTH, 35);

    if (this.state?.active) {
      const a = this.state.active;
      this.add.text(20, barY + 8, `Researching: ${a.node.name}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: '#f5a623', fontStyle: 'bold',
      });

      const pbX = 300;
      const pbW = 380;
      const pbH = 16;
      const pbY = barY + 10;

      this.progressBar = this.add.graphics();
      this.progressBar.fillStyle(0x333333, 1);
      this.progressBar.fillRect(pbX, pbY, pbW, pbH);
      const fraction = 1 - a.remainingSeconds / a.duration;
      this.progressBar.fillStyle(0xf5a623, 1);
      this.progressBar.fillRect(pbX, pbY, pbW * Math.min(1, fraction), pbH);

      const remaining = Math.ceil(a.remainingSeconds);
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      this.progressText = this.add.text(pbX + pbW + 10, pbY, `${minutes}:${seconds.toString().padStart(2, '0')}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textPrimary,
      });

      // Cancel button (T-0641)
      const cancelBtn = this.add.text(pbX + pbW + 80, pbY, '[Cancel]', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
        color: '#e94560', fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });
      cancelBtn.on('pointerup', () => this.handleCancelResearch());

      this.pulseNodeId = a.researchId;
    } else {
      this.add.text(20, barY + 8, 'No active research - select a node below', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
      });
      this.pulseNodeId = null;
    }
  }

  /* ──────────────── Queue Display (T-0640) ──────────────── */

  private renderQueue(): void {
    if (!this.state || this.state.queue.length === 0) return;

    const qY = 95;
    const qBg = this.add.graphics();
    qBg.fillStyle(COLORS.panelBg, 0.5);
    qBg.fillRect(0, qY, GAME_WIDTH, 22);

    this.add.text(10, qY + 3, 'Queue:', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
      color: '#88bbff', fontStyle: 'bold',
    });

    let qx = 60;
    for (const item of this.state.queue) {
      const node = this.state.tree.find((n) => n.id === item.researchId);
      if (!node) continue;
      const label = node.name;
      const qt = this.add.text(qx, qY + 3, `${label} >`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#6688aa',
      }).setInteractive({ useHandCursor: true });
      qt.on('pointerup', () => this.handleDequeueResearch(item.researchId));
      qx += qt.width + 15;
    }
  }

  /* ──────────────── Advisor (T-0652) ──────────────── */

  private renderAdvisor(): void {
    if (!this.state?.advisor) return;

    const adv = this.state.advisor;
    const ay = GAME_HEIGHT - 90;

    this.add.text(10, ay, `Advisor suggests: ${adv.name}`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
      color: '#c0a060', fontStyle: 'italic',
    });
    const advBtn = this.add.text(250, ay, '[View]', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
      color: '#88bbff',
    }).setInteractive({ useHandCursor: true });
    advBtn.on('pointerup', () => this.showNodeDetail(adv));
  }

  /* ──────────────── Tree Rendering (T-0629 to T-0631) ──────────────── */

  private renderTree(): void {
    if (!this.state || !this.contentContainer || !this.connectionGraphics) return;

    const { completed, active, available, tree } = this.state;
    const completedSet = new Set(completed);
    const availableSet = new Set(available.map((n) => n.id));
    const activeId = active?.researchId;

    const startY = 120;
    const nodeHeight = 90;
    const nodeWidth = 200;
    const nodePadding = 15;

    // Determine which branches to show
    const branchesToShow = this.branchFilter
      ? [this.branchFilter]
      : ALL_BRANCHES;

    // Group nodes by branch (non-mastery)
    const branchNodes: Record<string, ResearchNode[]> = {};
    const masteryNodes: ResearchNode[] = [];

    for (const node of tree) {
      if (node.branch === 'mastery') {
        masteryNodes.push(node);
      } else if (branchesToShow.includes(node.branch)) {
        if (!branchNodes[node.branch]) branchNodes[node.branch] = [];
        branchNodes[node.branch].push(node);
      }
    }

    // Sort each branch by tier
    for (const branch of Object.keys(branchNodes)) {
      branchNodes[branch].sort((a, b) => a.tier - b.tier);
    }

    const activeBranches = branchesToShow.filter((b) => b !== 'mastery' && branchNodes[b]?.length);
    const colWidth = Math.max(220, Math.min(GAME_WIDTH / activeBranches.length, 260));

    // Draw branch headers and nodes
    activeBranches.forEach((branch, colIdx) => {
      const x = colIdx * colWidth + nodePadding;
      const nodes = branchNodes[branch] || [];
      const branchColor = BRANCH_COLORS[branch] || 0xcccccc;

      // Branch header
      const headerText = this.add.text(x + nodeWidth / 2, startY, BRANCH_LABELS[branch] || branch, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
        color: `#${branchColor.toString(16).padStart(6, '0')}`, fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      this.contentContainer!.add(headerText);

      // Branch completion bar
      const stats = this.state!.branchStats[branch];
      if (stats) {
        const cbX = x + 10;
        const cbY = startY + 24;
        const cbW = nodeWidth - 20;
        const cbH = 4;
        const cg = this.add.graphics();
        cg.fillStyle(0x333333, 1);
        cg.fillRoundedRect(cbX, cbY, cbW, cbH, 2);
        cg.fillStyle(branchColor, 1);
        cg.fillRoundedRect(cbX, cbY, cbW * stats.percent, cbH, 2);
        this.contentContainer!.add(cg);
      }

      // Render each node
      nodes.forEach((node, rowIdx) => {
        const ny = startY + 35 + rowIdx * nodeHeight;
        const nw = nodeWidth - 10;
        this.nodePositions.set(node.id, { x: x, y: ny, w: nw, h: nodeHeight - 15 });
        this.renderNode(node, x, ny, nw, nodeHeight - 15, completedSet, availableSet, activeId, branchColor);
      });
    });

    // Draw connection lines (T-0630)
    this.drawConnections(tree, completedSet);

    // Mastery row at bottom
    if (masteryNodes.length > 0 && !this.branchFilter) {
      const masteryY = startY + 35 + 12 * nodeHeight; // below all branches
      const mTitle = this.add.text(GAME_WIDTH / 2, masteryY - 15, 'Mastery', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
        color: '#ffd700', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      this.contentContainer!.add(mTitle);

      const mColWidth = Math.min(GAME_WIDTH / masteryNodes.length, 260);
      masteryNodes.forEach((node, idx) => {
        const mx = idx * mColWidth + nodePadding;
        const mw = mColWidth - 30;
        this.nodePositions.set(node.id, { x: mx, y: masteryY + 20, w: mw, h: nodeHeight - 15 });
        this.renderNode(node, mx, masteryY + 20, mw, nodeHeight - 15, completedSet, availableSet, activeId, 0xffd700);
      });
    }
  }

  /* ──────────────── Connection Lines (T-0630, T-0664) ──────────────── */

  private drawConnections(tree: ResearchNode[], completedSet: Set<string>): void {
    if (!this.connectionGraphics) return;
    const g = this.connectionGraphics;

    for (const node of tree) {
      const targetPos = this.nodePositions.get(node.id);
      if (!targetPos) continue;

      for (const prereqId of node.prerequisites) {
        const srcPos = this.nodePositions.get(prereqId);
        if (!srcPos) continue;

        const bothDone = completedSet.has(node.id) && completedSet.has(prereqId);
        const prereqDone = completedSet.has(prereqId);

        const lineColor = bothDone ? 0xffd700 : prereqDone ? 0x3498db : 0x333333;
        const lineAlpha = bothDone ? 0.8 : prereqDone ? 0.6 : 0.3;

        g.lineStyle(2, lineColor, lineAlpha);

        const sx = srcPos.x + srcPos.w / 2;
        const sy = srcPos.y + srcPos.h;
        const tx = targetPos.x + targetPos.w / 2;
        const ty = targetPos.y;

        // Curved connection
        const midY = (sy + ty) / 2;
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(sx, midY);
        g.lineTo(tx, midY);
        g.lineTo(tx, ty);
        g.strokePath();

        // Arrow indicator
        if (prereqDone && !completedSet.has(node.id)) {
          g.fillStyle(lineColor, lineAlpha);
          g.fillTriangle(tx - 4, ty, tx + 4, ty, tx, ty + 6);
        }
      }
    }
  }

  /* ──────────────── Node Render (T-0631) ──────────────── */

  private renderNode(
    node: ResearchNode, x: number, y: number, w: number, h: number,
    completedSet: Set<string>, availableSet: Set<string>,
    activeId: string | undefined, branchColor: number,
  ): void {
    const isComplete = completedSet.has(node.id);
    const isActive = activeId === node.id;
    const isAvailable = availableSet.has(node.id);
    const isSearchHit = this.searchResults.size > 0 && this.searchResults.has(node.id);

    let borderColor: number;
    let bgAlpha = 0.6;
    let statusLabel: string;

    if (isComplete) {
      borderColor = 0xffd700; bgAlpha = 0.8; statusLabel = 'DONE';
    } else if (isActive) {
      borderColor = 0xf5a623; statusLabel = 'IN PROGRESS';
    } else if (isAvailable) {
      borderColor = branchColor; statusLabel = 'AVAILABLE';
    } else {
      borderColor = 0x333333; bgAlpha = 0.3; statusLabel = 'LOCKED';
    }

    // Search highlight
    if (isSearchHit) {
      borderColor = 0x00ff88;
      bgAlpha = 0.9;
    }

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.panelBg, bgAlpha);
    bg.fillRoundedRect(x, y, w, h, 6);
    bg.lineStyle(isSearchHit ? 3 : 2, borderColor);
    bg.strokeRoundedRect(x, y, w, h, 6);

    // Completion glow (T-0637)
    if (isComplete) {
      bg.lineStyle(1, 0xffd700, 0.3);
      bg.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 8);
    }

    this.contentContainer!.add(bg);

    // Status indicator
    const statusColor = isComplete ? STATUS_COLORS.complete : isActive ? STATUS_COLORS.researching
      : isAvailable ? STATUS_COLORS.available : STATUS_COLORS.locked;
    const statusText = this.add.text(x + w - 8, y + 4, statusLabel, {
      fontFamily: FONTS.primary, fontSize: '10px', color: statusColor, fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.contentContainer!.add(statusText);

    // Tier indicator
    const tierText = this.add.text(x + 8, y + 4, `T${node.tier}`, {
      fontFamily: FONTS.primary, fontSize: '9px', color: '#666688',
    });
    this.contentContainer!.add(tierText);

    // Name
    const nameText = this.add.text(x + 8, y + 16, node.name, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: isComplete ? '#ffd700' : COLORS.textPrimary, fontStyle: 'bold',
    });
    this.contentContainer!.add(nameText);

    // Description
    const desc = node.description.length > 45 ? node.description.substring(0, 42) + '...' : node.description;
    const descText = this.add.text(x + 8, y + 34, desc, {
      fontFamily: FONTS.primary, fontSize: '11px', color: COLORS.textSecondary,
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
      const costText = this.add.text(x + 8, y + h - 16, costStr, {
        fontFamily: FONTS.primary, fontSize: '9px',
        color: isAvailable ? '#88bbff' : '#555555',
      });
      this.contentContainer!.add(costText);
    }

    // Prerequisites indicator (T-0664)
    if (node.prerequisites.length > 0 && !isComplete) {
      const unmet = node.prerequisites.filter((p) => !completedSet.has(p));
      if (unmet.length > 0) {
        const lockIcon = this.add.text(x + w - 20, y + h - 16, `${unmet.length}`, {
          fontFamily: FONTS.primary, fontSize: '9px', color: '#e94560',
        });
        this.contentContainer!.add(lockIcon);
      }
    }

    // Click handler — all nodes are clickable for detail view
    const hitZone = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.contentContainer!.add(hitZone);

    hitZone.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.panelBg, 0.9);
      bg.fillRoundedRect(x, y, w, h, 6);
      bg.lineStyle(3, isSearchHit ? 0x00ff88 : branchColor);
      bg.strokeRoundedRect(x, y, w, h, 6);
    });

    hitZone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.panelBg, bgAlpha);
      bg.fillRoundedRect(x, y, w, h, 6);
      bg.lineStyle(isSearchHit ? 3 : 2, borderColor);
      bg.strokeRoundedRect(x, y, w, h, 6);
      if (isComplete) {
        bg.lineStyle(1, 0xffd700, 0.3);
        bg.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 8);
      }
    });

    hitZone.on('pointerup', () => {
      this.showNodeDetail(node);
    });
  }

  /* ──────────────── Node Detail (T-0632, T-0633) ──────────────── */

  private showNodeDetail(node: ResearchNode): void {
    if (!this.state || !this.nodeDetail) return;

    const completedSet = new Set(this.state.completed);
    const availableSet = new Set(this.state.available.map((n) => n.id));
    const activeId = this.state.active?.researchId;

    let status: NodeDetailData['status'];
    if (completedSet.has(node.id)) status = 'completed';
    else if (activeId === node.id) status = 'researching';
    else if (availableSet.has(node.id)) status = 'available';
    else status = 'locked';

    const prereqNames = node.prerequisites.map((id) => {
      const n = this.state!.tree.find((t) => t.id === id);
      return n ? n.name : id;
    });

    this.nodeDetail.show({
      ...node,
      status,
      prereqNames,
    });
  }

  /* ──────────────── Branch Panel ──────────────── */

  private showBranches(): void {
    if (!this.state || !this.branchPanel) return;

    const branches: BranchInfo[] = [];
    for (const [branch, stats] of Object.entries(this.state.branchStats)) {
      const bonus = this.state.activeBonuses.find((b) => b.branch === branch);
      const effects: Record<string, number> = {};
      // Aggregate effects for this branch
      for (const node of this.state.tree) {
        if (node.branch !== branch) continue;
        if (!this.state.completed.includes(node.id)) continue;
        for (const [k, v] of Object.entries(node.effects)) {
          effects[k] = (effects[k] || 0) + v;
        }
      }

      branches.push({
        branch,
        total: stats.total,
        done: stats.done,
        percent: stats.percent,
        effects,
        isComplete: stats.percent >= 1.0,
        bonusLabel: bonus?.label,
        bonusEffects: bonus?.effects,
      });
    }

    // Achievement badges (T-0667)
    const achievements: string[] = [];
    if (this.state.overallPercent >= 100) achievements.push('Completionist - All research done!');
    const fullBranches = branches.filter((b) => b.isComplete).map((b) => b.branch);
    if (fullBranches.length >= 1) achievements.push(`Specialist - Completed: ${fullBranches.join(', ')}`);
    if (this.state.activeSynergies.length > 0) {
      achievements.push(`Synergist - ${this.state.activeSynergies.map((s) => s.label).join(', ')}`);
    }

    this.branchPanel.show(branches, achievements);
  }

  /* ──────────────── Timeline Panel ──────────────── */

  private showTimeline(): void {
    if (!this.state || !this.timelinePanel) return;

    const entries: TimelineEntry[] = this.state.history.map((h) => ({
      researchId: h.researchId,
      name: h.name,
      branch: h.branch,
      completedAt: h.completedAt,
    }));

    const showTutorial = this.state.completed.length === 0;
    this.timelinePanel.show(entries, showTutorial);
  }

  /* ──────────────── Search (T-0647) ──────────────── */

  private promptSearch(): void {
    // Simple prompt approach — in a real UI this would be a text input
    const query = window.prompt('Search research nodes by name:');
    if (query === null) return;
    this.searchQuery = query;

    if (query.trim() === '') {
      this.searchResults.clear();
    } else {
      const q = query.toLowerCase();
      this.searchResults = new Set(
        this.state?.tree
          .filter((n) => n.name.toLowerCase().includes(q) || n.description.toLowerCase().includes(q))
          .map((n) => n.id) || [],
      );
    }
    this.rebuildTree();
  }

  /* ──────────────── Zoom/Pan (T-0648) ──────────────── */

  private setZoom(level: number): void {
    this.zoomLevel = level;
    this.applyTransform();
  }

  private applyTransform(): void {
    if (this.contentContainer) {
      this.contentContainer.setPosition(this.panX, this.panY);
      this.contentContainer.setScale(this.zoomLevel);
    }
  }

  private rebuildTree(): void {
    if (!this.contentContainer) return;
    // Clear content container
    const children = this.contentContainer.getAll();
    for (const child of children) {
      child.destroy();
    }
    this.connectionGraphics = this.add.graphics();
    this.contentContainer.add(this.connectionGraphics);
    this.pulseGraphics = this.add.graphics();
    this.contentContainer.add(this.pulseGraphics);
    this.nodePositions.clear();
    this.renderTree();
    this.applyTransform();
  }

  /* ──────────────── Mini-Map (T-0649) ──────────────── */

  private renderMiniMap(): void {
    const mmW = 120;
    const mmH = 80;
    const mmX = GAME_WIDTH - mmW - 10;
    const mmY = GAME_HEIGHT - 50 - mmH - 10;

    const mmBg = this.add.graphics().setDepth(100);
    mmBg.fillStyle(0x111122, 0.7);
    mmBg.fillRoundedRect(mmX, mmY, mmW, mmH, 4);
    mmBg.lineStyle(1, 0x333355);
    mmBg.strokeRoundedRect(mmX, mmY, mmW, mmH, 4);

    // Dots for each node
    if (this.state) {
      const completedSet = new Set(this.state.completed);
      const branches = ALL_BRANCHES.filter((b) => this.state!.tree.some((n) => n.branch === b));

      branches.forEach((branch, colIdx) => {
        const branchNodes = this.state!.tree.filter((n) => n.branch === branch).sort((a, b) => a.tier - b.tier);
        const dotX = mmX + 10 + colIdx * (mmW - 20) / Math.max(1, branches.length - 1);

        branchNodes.forEach((node, rowIdx) => {
          const dotY = mmY + 10 + rowIdx * ((mmH - 20) / Math.max(1, branchNodes.length));
          const color = completedSet.has(node.id) ? 0xffd700
            : this.state!.active?.researchId === node.id ? 0xf5a623
            : 0x333355;
          mmBg.fillStyle(color, 1);
          mmBg.fillCircle(dotX, dotY, 2);
        });
      });
    }
  }

  /* ──────────────── Actions ──────────────── */

  private async handleStartResearch(researchId: string): Promise<void> {
    try {
      this.nodeDetail?.hide();
      await apiClient.startResearch(researchId);
      this.showCompletionEffect('Research started!', '#4ecca3');
      this.refreshState();
    } catch (err) {
      this.showMessage(err instanceof Error ? err.message : 'Research failed', '#ff4444');
    }
  }

  private async handleQueueResearch(researchId: string): Promise<void> {
    try {
      this.nodeDetail?.hide();
      await apiClient.queueResearch(researchId);
      this.showMessage('Added to queue', '#88bbff');
      this.refreshState();
    } catch (err) {
      this.showMessage(err instanceof Error ? err.message : 'Queue failed', '#ff4444');
    }
  }

  private async handleDequeueResearch(researchId: string): Promise<void> {
    try {
      await apiClient.dequeueResearch(researchId);
      this.showMessage('Removed from queue', '#88bbff');
      this.refreshState();
    } catch (err) {
      this.showMessage(err instanceof Error ? err.message : 'Dequeue failed', '#ff4444');
    }
  }

  private async handleCancelResearch(): Promise<void> {
    try {
      const result = await apiClient.cancelResearch();
      const refundStr = Object.entries(result.refunded).map(([k, v]) => `${k}: ${v}`).join(', ');
      this.showMessage(`Cancelled. Refunded: ${refundStr}`, '#f5a623');
      this.refreshState();
    } catch (err) {
      this.showMessage(err instanceof Error ? err.message : 'Cancel failed', '#ff4444');
    }
  }

  /* ──────────────── Completion Effect (T-0637) ──────────────── */

  private showCompletionEffect(text: string, color: string): void {
    const fx = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, text, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`,
      color, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(1).setDepth(300);

    this.tweens.add({
      targets: fx,
      alpha: 0,
      y: GAME_HEIGHT / 2 - 120,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => fx.destroy(),
    });

    // Sparkle particles (T-0637)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const sparkle = this.add.text(
        GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, '*',
        { fontFamily: FONTS.primary, fontSize: '20px', color: '#ffd700' },
      ).setOrigin(0.5).setDepth(300);

      this.tweens.add({
        targets: sparkle,
        x: GAME_WIDTH / 2 + Math.cos(angle) * 80,
        y: GAME_HEIGHT / 2 - 50 + Math.sin(angle) * 80,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  /* ──────────────── Progress Tick ──────────────── */

  private tickProgress(): void {
    if (!this.state?.active) return;

    this.state.active.remainingSeconds -= 1;

    if (this.state.active.remainingSeconds <= 0) {
      // Research complete (T-0636)
      this.showCompletionEffect(`${this.state.active.node.name} Complete!`, '#ffd700');
      this.refreshState();
      return;
    }

    // Update progress bar
    if (this.progressBar && this.progressText) {
      const a = this.state.active;
      const fraction = 1 - a.remainingSeconds / a.duration;
      const pbX = 300; const pbW = 380; const pbH = 16; const pbY = 70;

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

    // Pulse animation for active node (T-0677)
    if (this.pulseNodeId && this.pulseGraphics) {
      const pos = this.nodePositions.get(this.pulseNodeId);
      if (pos) {
        this.pulseGraphics.clear();
        const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.5;
        this.pulseGraphics.lineStyle(2, 0xf5a623, pulse);
        this.pulseGraphics.strokeRoundedRect(pos.x - 3, pos.y - 3, pos.w + 6, pos.h + 6, 8);
      }
    }
  }

  private async refreshState(): Promise<void> {
    try {
      const state = await apiClient.getAdvancedResearchState();
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

    const tabs = [
      { label: 'Guild Hall', scene: 'GuildHallScene' },
      { label: 'Expeditions', scene: 'ExpeditionScene' },
      { label: 'Market', scene: 'MarketScene' },
      { label: 'World Map', scene: 'WorldMapScene' },
      { label: 'Research', scene: 'ResearchScene' },
    ];
    const tabWidth = GAME_WIDTH / tabs.length;

    tabs.forEach((tab, i) => {
      const x = tabWidth * i + tabWidth / 2;
      const isActive = i === 4;
      const text = this.add.text(x, navY + 25, tab.label, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: isActive ? COLORS.textGold : COLORS.textSecondary,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      text.on('pointerover', () => text.setColor(COLORS.textGold));
      text.on('pointerout', () => { if (!isActive) text.setColor(COLORS.textSecondary); });
      if (!isActive) text.on('pointerup', () => this.scene.start(tab.scene));
    });
  }
}
