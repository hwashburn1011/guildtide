/**
 * EventChainPanel — Multi-step event chain display.
 *
 * T-0923: Event chain progress tracker showing completed/remaining events
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

interface ChainDefinition {
  id: string;
  title: string;
  description: string;
  totalSteps: number;
}

interface ChainProgress {
  chainId: string;
  currentStep: number;
  completedSteps: number[];
  startedAt: string;
  lastStepAt: string;
}

export class EventChainPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(): Promise<void> {
    this.hide();

    let data: { definitions: ChainDefinition[]; activeChains: ChainProgress[] };
    try {
      data = await apiClient.getEventChains();
    } catch {
      return;
    }

    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(100);

    this.container = this.scene.add.container(0, 0).setDepth(101);

    const panelW = 650;
    const panelH = 480;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    // Close button
    const closeBtn = this.scene.add
      .text(px + panelW - 20, py + 15, 'X', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textSecondary,
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // Title
    this.container.add(
      this.scene.add.text(px + 25, py + 20, 'Event Chains', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );

    let yOffset = py + 60;

    if (data.definitions.length === 0) {
      this.container.add(
        this.scene.add.text(px + 25, yOffset, 'No event chains available yet.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textSecondary,
        }),
      );
      return;
    }

    for (const def of data.definitions) {
      const active = data.activeChains.find(c => c.chainId === def.id);

      // Chain card
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(COLORS.background, 0.8);
      cardBg.fillRoundedRect(px + 15, yOffset, panelW - 30, 70, 6);
      cardBg.lineStyle(1, active ? 0x4ecca3 : COLORS.panelBorder, 0.6);
      cardBg.strokeRoundedRect(px + 15, yOffset, panelW - 30, 70, 6);
      this.container.add(cardBg);

      // Chain title
      this.container.add(
        this.scene.add.text(px + 30, yOffset + 10, def.title, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: active ? '#4ecca3' : COLORS.textPrimary,
          fontStyle: 'bold',
        }),
      );

      // Description
      this.container.add(
        this.scene.add.text(px + 30, yOffset + 32, def.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: panelW - 80 },
        }),
      );

      // Progress dots
      const dotStartX = px + panelW - 50;
      for (let i = 1; i <= def.totalSteps; i++) {
        const dotColor = active && active.completedSteps.includes(i)
          ? 0x4ecca3
          : active && active.currentStep === i
            ? 0xffd700
            : 0x444466;

        const dot = this.scene.add.graphics();
        dot.fillStyle(dotColor);
        dot.fillCircle(dotStartX - (def.totalSteps - i) * 18, yOffset + 20, 6);
        this.container.add(dot);
      }

      // Status label
      const status = active
        ? `Step ${active.currentStep}/${def.totalSteps}`
        : 'Not Started';
      this.container.add(
        this.scene.add
          .text(px + panelW - 40, yOffset + 52, status, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: active ? '#ffd700' : '#666',
          })
          .setOrigin(1, 0),
      );

      yOffset += 80;
    }
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
