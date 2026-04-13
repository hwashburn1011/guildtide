/**
 * MarketObservatoryPanel — Reveals financial connections progressively.
 * Shows the Observatory building's financial insights.
 *
 * T-0995: Stock market summary display in Observatory
 * T-1035: Financial data educational tooltips
 * T-1050: Financial data visualization in research tree
 * T-1066: Economic advisor NPC
 * T-1069: Sector rotation calendar
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';

interface Tooltip {
  title: string;
  description: string;
  gameEffect: string;
}

interface AdvisorPrediction {
  topic: string;
  prediction: string;
  confidence: number;
  fantasyRationale: string;
}

interface ResearchNode {
  nodeId: string;
  name: string;
  description: string;
  prerequisite: string | null;
  unlocksFeature: string;
}

interface RotationEntry {
  month: number;
  favoredSector: string;
  fantasyName: string;
  description: string;
}

export class MarketObservatoryPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private currentTab: 'insights' | 'advisor' | 'research' | 'calendar' = 'insights';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(): Promise<void> {
    if (this.modal) this.modal.destroy();

    this.modal = new UIModal(this.scene, {
      title: 'Market Observatory',
      width: 720,
      height: 580,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    await this.renderTab(content);
  }

  private async renderTab(container: Phaser.GameObjects.Container): Promise<void> {
    // Clear existing content
    container.removeAll(true);

    // Tab buttons
    const tabs: Array<{ key: typeof this.currentTab; label: string }> = [
      { key: 'insights', label: 'Insights' },
      { key: 'advisor', label: 'Advisor' },
      { key: 'research', label: 'Research' },
      { key: 'calendar', label: 'Calendar' },
    ];

    let tabX = 10;
    for (const tab of tabs) {
      const isActive = tab.key === this.currentTab;
      const tabBtn = this.scene.add.text(tabX, 0, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: isActive ? COLORS.textPrimary : '#666677',
        backgroundColor: isActive ? '#2a2a3e' : undefined,
        padding: { x: 10, y: 4 },
      });
      tabBtn.setInteractive({ useHandCursor: true });
      tabBtn.on('pointerdown', () => {
        this.currentTab = tab.key;
        this.renderTab(container);
      });
      container.add(tabBtn);
      tabX += tabBtn.width + 10;
    }

    const startY = 32;

    try {
      switch (this.currentTab) {
        case 'insights':
          await this.renderInsights(container, startY);
          break;
        case 'advisor':
          await this.renderAdvisor(container, startY);
          break;
        case 'research':
          await this.renderResearch(container, startY);
          break;
        case 'calendar':
          await this.renderCalendar(container, startY);
          break;
      }
    } catch {
      container.add(
        this.scene.add.text(340, startY + 40, 'Observatory data unavailable.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private async renderInsights(container: Phaser.GameObjects.Container, startY: number): Promise<void> {
    const tooltips: Record<string, Tooltip> = await apiClient.getFinancialTooltips();
    let y = startY;

    container.add(
      this.scene.add.text(10, y, 'Financial Insights', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.subheading}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 24;

    container.add(
      this.scene.add.text(10, y, 'The Observatory reveals hidden connections between the world\'s markets and your guild\'s fortunes.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#888899',
        wordWrap: { width: 680 },
      }),
    );
    y += 32;

    for (const [_key, tooltip] of Object.entries(tooltips)) {
      container.add(
        this.scene.add.text(10, y, tooltip.title, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#4ecca3',
          fontStyle: 'bold',
        }),
      );
      y += 18;

      container.add(
        this.scene.add.text(20, y, tooltip.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#a0a0b0',
          wordWrap: { width: 660 },
        }),
      );
      y += 18;

      container.add(
        this.scene.add.text(20, y, `Effect: ${tooltip.gameEffect}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#666677',
          wordWrap: { width: 660 },
        }),
      );
      y += 24;

      if (y > 480) break; // Prevent overflow
    }
  }

  private async renderAdvisor(container: Phaser.GameObjects.Container, startY: number): Promise<void> {
    const predictions: AdvisorPrediction[] = await apiClient.getFinancialAdvisor();
    let y = startY;

    container.add(
      this.scene.add.text(10, y, 'Economic Advisor', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.subheading}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 24;

    container.add(
      this.scene.add.text(10, y, '"Welcome, Guild Master. Let me share my readings of the market currents..."', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#9b59b6',
        fontStyle: 'italic',
        wordWrap: { width: 680 },
      }),
    );
    y += 28;

    for (const pred of predictions) {
      container.add(
        this.scene.add.text(10, y, pred.topic, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#4ecca3',
          fontStyle: 'bold',
        }),
      );
      y += 20;

      container.add(
        this.scene.add.text(20, y, pred.prediction, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textPrimary,
          wordWrap: { width: 660 },
        }),
      );
      y += 30;

      container.add(
        this.scene.add.text(20, y, pred.fantasyRationale, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#888899',
          fontStyle: 'italic',
          wordWrap: { width: 660 },
        }),
      );
      y += 20;

      // Confidence bar
      const confWidth = 150;
      const confBg = this.scene.add.graphics();
      confBg.fillStyle(0x333344, 1);
      confBg.fillRoundedRect(20, y, confWidth, 8, 4);
      container.add(confBg);

      const confFill = this.scene.add.graphics();
      confFill.fillStyle(0x4ecca3, 1);
      confFill.fillRoundedRect(20, y, confWidth * pred.confidence, 8, 4);
      container.add(confFill);

      container.add(
        this.scene.add.text(180, y - 2, `Confidence: ${Math.round(pred.confidence * 100)}%`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small - 2}px`,
          color: '#666677',
        }),
      );
      y += 24;
    }
  }

  private async renderResearch(container: Phaser.GameObjects.Container, startY: number): Promise<void> {
    const nodes: ResearchNode[] = await apiClient.getFinancialResearchNodes();
    let y = startY;

    container.add(
      this.scene.add.text(10, y, 'Economic Research Tree', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.subheading}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 24;

    for (const node of nodes) {
      container.add(
        this.scene.add.text(10, y, node.name, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#4ecca3',
        }),
      );
      y += 18;

      container.add(
        this.scene.add.text(20, y, node.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#a0a0b0',
          wordWrap: { width: 660 },
        }),
      );
      y += 16;

      container.add(
        this.scene.add.text(20, y, `Unlocks: ${node.unlocksFeature}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#666677',
        }),
      );
      y += 14;

      if (node.prerequisite) {
        container.add(
          this.scene.add.text(20, y, `Requires: ${node.prerequisite}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small - 2}px`,
            color: '#555566',
          }),
        );
        y += 14;
      }
      y += 8;
    }
  }

  private async renderCalendar(container: Phaser.GameObjects.Container, startY: number): Promise<void> {
    const rotation: RotationEntry[] = await apiClient.getFinancialRotation();
    let y = startY;

    container.add(
      this.scene.add.text(10, y, 'Sector Rotation Calendar', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.subheading}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 24;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth() + 1;

    for (const entry of rotation) {
      const isCurrentMonth = entry.month === currentMonth;
      const color = isCurrentMonth ? '#4ecca3' : '#a0a0b0';

      container.add(
        this.scene.add.text(10, y, `${monthNames[entry.month - 1]}:`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color,
          fontStyle: isCurrentMonth ? 'bold' : 'normal',
        }),
      );

      container.add(
        this.scene.add.text(60, y, entry.fantasyName, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color,
        }),
      );

      container.add(
        this.scene.add.text(250, y, entry.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: isCurrentMonth ? '#888899' : '#555566',
          wordWrap: { width: 420 },
        }),
      );
      y += 22;
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
