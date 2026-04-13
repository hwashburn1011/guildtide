import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

export class EventLogPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(800);
    this.container.setVisible(false);
  }

  async show(): Promise<void> {
    if (this.visible) return;
    this.visible = true;
    this.container.removeAll(true);
    this.container.setVisible(true);

    // Backdrop
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.5);
    backdrop.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    backdrop.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    backdrop.on('pointerup', () => this.hide());
    this.container.add(backdrop);

    // Panel
    const panelW = 520;
    const panelH = 500;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const panel = this.scene.add.graphics();
    panel.fillStyle(COLORS.panelBg, 0.97);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, COLORS.panelBorder);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(panelX + 20, panelY + 14, 'Event Log', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });
    this.container.add(title);

    // Close button
    const closeBtn = this.scene.add.text(panelX + panelW - 16, panelY + 14, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // Loading text
    const loadingText = this.scene.add.text(
      panelX + panelW / 2, panelY + panelH / 2, 'Loading...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);
    this.container.add(loadingText);

    try {
      const events = await apiClient.getEventLog();
      loadingText.destroy();

      if (events.length === 0) {
        const empty = this.scene.add.text(
          panelX + panelW / 2, panelY + panelH / 2, 'No events yet.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5);
        this.container.add(empty);
        return;
      }

      // Create a mask for scrollable area
      const listY = panelY + 50;
      const listH = panelH - 60;
      const entryHeight = 60;
      let scrollOffset = 0;

      const listContainer = this.scene.add.container(0, 0);
      this.container.add(listContainer);

      const renderEntries = (): void => {
        listContainer.removeAll(true);
        const maxVisible = Math.floor(listH / entryHeight);
        const startIdx = Math.floor(scrollOffset / entryHeight);
        const visibleEvents = events.slice(startIdx, startIdx + maxVisible + 1);

        visibleEvents.forEach((evt: any, i: number) => {
          const ey = listY + i * entryHeight - (scrollOffset % entryHeight);
          if (ey < listY - entryHeight || ey > listY + listH) return;

          const entryBg = this.scene.add.graphics();
          entryBg.fillStyle(i % 2 === 0 ? 0x1a1a2e : 0x16213e, 0.8);
          entryBg.fillRect(panelX + 10, ey, panelW - 20, entryHeight - 4);
          listContainer.add(entryBg);

          const evtTitle = evt.title || evt.type || 'Event';
          const evtText = this.scene.add.text(panelX + 20, ey + 6, evtTitle, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textPrimary,
            fontStyle: 'bold',
          });
          listContainer.add(evtText);

          const desc = evt.narrative || evt.description || '';
          const descText = this.scene.add.text(panelX + 20, ey + 26, desc.substring(0, 70), {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          });
          listContainer.add(descText);

          if (evt.resolvedAt || evt.createdAt) {
            const dateStr = new Date(evt.resolvedAt || evt.createdAt).toLocaleString();
            const dateText = this.scene.add.text(panelX + panelW - 24, ey + 6, dateStr, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: COLORS.textSecondary,
            }).setOrigin(1, 0);
            listContainer.add(dateText);
          }
        });
      };

      renderEntries();

      // Scroll via wheel
      const maxScroll = Math.max(0, events.length * entryHeight - listH);
      this.scene.input.on('wheel', (_pointer: any, _gx: any, _gy: any, _gz: any, deltaY: number) => {
        if (!this.visible) return;
        scrollOffset = Phaser.Math.Clamp(scrollOffset + deltaY * 0.5, 0, maxScroll);
        renderEntries();
      });
    } catch {
      loadingText.setText('Failed to load event log.');
    }
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
    this.container.removeAll(true);
  }
}
