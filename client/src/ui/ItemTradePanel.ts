/**
 * Item trading between players with trade window UI.
 * T-0733, T-0734, T-0735: Trading system with offer/request panels.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

const RARITY_COLORS: Record<string, string> = {
  common: '#a0a0b0',
  uncommon: '#4ecca3',
  rare: '#4dabf7',
  epic: '#b366ff',
  legendary: '#ffd700',
};

type TradeTab = 'create' | 'pending' | 'gift';

export class ItemTradePanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private onChanged: () => void;
  private currentTab: TradeTab = 'create';
  private selectedOfferItems: Array<{ templateId: string; quantity: number }> = [];
  private selectedRequestItems: Array<{ templateId: string; quantity: number }> = [];

  constructor(scene: Phaser.Scene, onChanged: () => void) {
    this.scene = scene;
    this.onChanged = onChanged;
  }

  async show(): Promise<void> {
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(100);

    this.container = this.scene.add.container(0, 0).setDepth(101);

    const panelW = 900;
    const panelH = 580;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    this.container.add(
      this.scene.add.text(px + 20, py + 15, 'Item Trading', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      })
    );

    const closeBtn = this.scene.add.text(px + panelW - 20, py + 15, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // Tabs
    const tabs: Array<{ label: string; key: TradeTab }> = [
      { label: 'Create Trade', key: 'create' },
      { label: 'Pending', key: 'pending' },
      { label: 'Gift Item', key: 'gift' },
    ];
    tabs.forEach((tab, i) => {
      const btn = this.scene.add.text(px + 200 + i * 110, py + 20, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: this.currentTab === tab.key ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });
      btn.on('pointerup', () => {
        this.currentTab = tab.key;
        this.hide();
        this.show();
      });
      this.container!.add(btn);
    });

    const cx = px + 20;
    const cy = py + 50;
    const cw = panelW - 40;
    const ch = panelH - 70;

    switch (this.currentTab) {
      case 'create':
        await this.renderCreateTrade(cx, cy, cw, ch);
        break;
      case 'pending':
        await this.renderPendingTrades(cx, cy, cw, ch);
        break;
      case 'gift':
        await this.renderGiftTab(cx, cy, cw, ch);
        break;
    }
  }

  private async renderCreateTrade(x: number, y: number, w: number, h: number): Promise<void> {
    if (!this.container) return;

    try {
      const inventory = await apiClient.getInventory();

      const halfW = (w - 20) / 2;

      // LEFT: Your Offer
      this.container!.add(
        this.scene.add.text(x, y, 'Your Offer', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        })
      );

      // Offer items list
      let curY = y + 22;
      for (const offered of this.selectedOfferItems) {
        const tpl = inventory.find((i: any) => i.templateId === offered.templateId);
        this.container!.add(
          this.scene.add.text(x + 8, curY, `${tpl?.template?.name || offered.templateId} x${offered.quantity}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#4ecca3',
          })
        );
        curY += 18;
      }

      // Available items to add to offer
      curY = Math.max(curY, y + 60);
      this.container!.add(
        this.scene.add.text(x, curY, 'Add from inventory:', {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: '#6a6a7a',
        })
      );
      curY += 16;

      for (const item of inventory.slice(0, 15)) {
        if (curY > y + h - 60) break;
        const t = item.template;
        if (!t) continue;

        const rarityColor = RARITY_COLORS[t.rarity] || COLORS.textSecondary;
        const addBtn = this.scene.add.text(x + 8, curY, `+ ${t.name} x${item.quantity}`, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: rarityColor,
        }).setInteractive({ useHandCursor: true });
        addBtn.on('pointerup', () => {
          this.selectedOfferItems.push({ templateId: item.templateId, quantity: 1 });
          this.hide();
          this.show();
        });
        this.container!.add(addBtn);
        curY += 16;
      }

      // RIGHT: Request
      const rightX = x + halfW + 20;
      this.container!.add(
        this.scene.add.text(rightX, y, 'Requesting', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        })
      );

      this.container!.add(
        this.scene.add.text(rightX, y + 22, 'Trading requires another player to accept.\nFeature available when alliances are formed.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: halfW - 10 },
        })
      );

      // Send trade button
      if (this.selectedOfferItems.length > 0) {
        const sendBtn = this.scene.add.text(x + w / 2, y + h - 20, 'Send Trade Offer', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textAccent,
          fontStyle: 'bold',
          backgroundColor: 'rgba(233,69,96,0.2)',
          padding: { x: 16, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        sendBtn.on('pointerup', () => {
          this.showToast('Trade offer sent! (Awaiting alliance system)');
          this.selectedOfferItems = [];
          this.hide();
          this.show();
        });
        this.container!.add(sendBtn);
      }
    } catch (err) {
      this.showError(x, y, w, 'Failed to load trading data');
    }
  }

  private async renderPendingTrades(x: number, y: number, w: number, _h: number): Promise<void> {
    if (!this.container) return;

    this.container!.add(
      this.scene.add.text(x + w / 2, y + 80, 'No pending trades.\nCreate a trade offer to get started.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textSecondary,
        align: 'center',
      }).setOrigin(0.5)
    );
  }

  private async renderGiftTab(x: number, y: number, w: number, h: number): Promise<void> {
    if (!this.container) return;

    try {
      const inventory = await apiClient.getInventory();

      this.container!.add(
        this.scene.add.text(x, y, 'Send a gift to an alliance member:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        })
      );

      let curY = y + 24;
      for (const item of inventory.slice(0, 20)) {
        if (curY > y + h - 30) break;
        const t = item.template;
        if (!t) continue;

        const rarityColor = RARITY_COLORS[t.rarity] || COLORS.textSecondary;

        this.container!.add(
          this.scene.add.text(x + 8, curY, `${t.name} x${item.quantity}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: rarityColor,
          })
        );

        const giftBtn = this.scene.add.text(x + w - 10, curY, 'Gift', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textAccent,
          fontStyle: 'bold',
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        giftBtn.on('pointerup', () => {
          this.showToast('Gift sent! (Awaiting alliance system)');
        });
        this.container!.add(giftBtn);

        curY += 22;
      }
    } catch (err) {
      this.showError(x, y, w, 'Failed to load gift data');
    }
  }

  private showError(x: number, y: number, w: number, msg: string): void {
    if (!this.container) return;
    this.container.add(
      this.scene.add.text(x + w / 2, y + 80, msg, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: '#ff4444',
        align: 'center',
      }).setOrigin(0.5)
    );
  }

  private showToast(message: string): void {
    const toast = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, message, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(200);
    this.scene.time.delayedCall(3000, () => toast.destroy());
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
