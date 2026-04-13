import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import type { Resources } from '@shared/types';
import { ResourceType } from '@shared/enums';

interface MarketItem {
  resource: string;
  basePrice: number;
  currentPrice: number;
  trend: 'rising' | 'falling' | 'stable';
}

const TREND_ICONS: Record<string, string> = {
  rising: '\u2191',
  falling: '\u2193',
  stable: '\u2192',
};

const TREND_COLORS: Record<string, string> = {
  rising: '#ff4444',
  falling: '#4ecca3',
  stable: '#a0a0b0',
};

const RESOURCE_LABELS: Record<string, string> = {
  wood: 'Wood',
  stone: 'Stone',
  herbs: 'Herbs',
  ore: 'Ore',
  water: 'Water',
  food: 'Food',
  essence: 'Essence',
};

export class MarketScene extends Phaser.Scene {
  private items: MarketItem[] = [];
  private resources: Resources | null = null;
  private confidence: number = 1;
  private quantity: number = 1;
  private contentContainer: Phaser.GameObjects.Container | null = null;
  private goldText: Phaser.GameObjects.Text | null = null;
  private quantityText: Phaser.GameObjects.Text | null = null;
  private confidenceText: Phaser.GameObjects.Text | null = null;
  private errorText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'MarketScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.quantity = 1;

    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading market...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);

    try {
      const [marketData, guildData] = await Promise.all([
        apiClient.getMarketPrices(),
        apiClient.getGuild(),
      ]);

      this.items = marketData.items;
      this.confidence = marketData.confidence;
      this.resources = guildData.resources;

      loadingText.destroy();
      this.buildUI();
    } catch (err) {
      loadingText.setText('Failed to load market data');
      if (err instanceof Error && err.message.includes('401')) {
        localStorage.removeItem('guildtide_token');
        this.scene.start('LoginScene');
      }
    }
  }

  private buildUI(): void {
    // --- Header ---
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.panelBg, 0.9);
    headerBg.fillRect(0, 0, GAME_WIDTH, 55);
    headerBg.lineStyle(2, COLORS.panelBorder);
    headerBg.strokeRect(0, 0, GAME_WIDTH, 55);

    this.add.text(20, 15, 'Market', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });

    // Back button
    const backBtn = this.add.text(GAME_WIDTH - 20, 18, '< Back', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    backBtn.on('pointerup', () => {
      this.scene.start('GuildHallScene');
    });

    // --- Gold & Confidence bar ---
    const infoBg = this.add.graphics();
    infoBg.fillStyle(COLORS.panelBg, 0.7);
    infoBg.fillRect(0, 55, GAME_WIDTH, 40);

    const goldAmount = this.resources ? Math.floor(this.resources[ResourceType.Gold] || 0) : 0;
    this.goldText = this.add.text(20, 65, `Gold: ${goldAmount}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });

    const confidenceLabel = this.confidence >= 0.8 ? 'High' : this.confidence >= 0.5 ? 'Medium' : 'Low';
    const confidenceColor = this.confidence >= 0.8 ? '#4ecca3' : this.confidence >= 0.5 ? '#f5a623' : '#ff4444';
    this.confidenceText = this.add.text(GAME_WIDTH - 20, 65, `Market Confidence: ${confidenceLabel}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: confidenceColor,
    }).setOrigin(1, 0);

    // --- Quantity selector ---
    const qY = 100;
    this.add.text(20, qY + 5, 'Quantity:', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    });

    this.quantityText = this.add.text(120, qY + 5, `${this.quantity}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });

    const quantities = [1, 10, 100];
    quantities.forEach((q, i) => {
      const btn = this.add.text(160 + i * 60, qY + 2, `[${q}]`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textAccent,
        fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });

      btn.on('pointerup', () => {
        this.quantity = q;
        this.quantityText?.setText(`${q}`);
      });
    });

    // --- Error text area ---
    this.errorText = this.add.text(GAME_WIDTH / 2, qY + 2, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ff4444',
    }).setOrigin(0.5, 0).setAlpha(0);

    // --- Table header ---
    const tableY = 130;
    const cols = { resource: 30, base: 200, price: 300, trend: 420, stock: 500, buy: 680, sell: 820 };

    const tableBg = this.add.graphics();
    tableBg.fillStyle(COLORS.panelBorder, 0.5);
    tableBg.fillRect(10, tableY, GAME_WIDTH - 20, 30);

    const headerStyle = {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
      fontStyle: 'bold' as const,
    };

    this.add.text(cols.resource, tableY + 7, 'Resource', headerStyle);
    this.add.text(cols.base, tableY + 7, 'Base', headerStyle);
    this.add.text(cols.price, tableY + 7, 'Price', headerStyle);
    this.add.text(cols.trend, tableY + 7, 'Trend', headerStyle);
    this.add.text(cols.stock, tableY + 7, 'Your Stock', headerStyle);
    this.add.text(cols.buy, tableY + 7, 'Buy', headerStyle);
    this.add.text(cols.sell, tableY + 7, 'Sell', headerStyle);

    // --- Table rows ---
    this.contentContainer = this.add.container(0, 0);

    this.items.forEach((item, idx) => {
      const rowY = tableY + 35 + idx * 50;
      this.renderRow(item, rowY, cols, idx);
    });

    // --- Bottom nav ---
    this.buildBottomNav();
  }

  private renderRow(
    item: MarketItem,
    y: number,
    cols: Record<string, number>,
    idx: number,
  ): void {
    // Alternate row background
    if (idx % 2 === 0) {
      const rowBg = this.add.graphics();
      rowBg.fillStyle(COLORS.panelBg, 0.4);
      rowBg.fillRect(10, y - 5, GAME_WIDTH - 20, 45);
      this.contentContainer?.add(rowBg);
    }

    const rowStyle = {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
    };

    // Resource name
    const label = RESOURCE_LABELS[item.resource] || item.resource;
    this.contentContainer?.add(
      this.add.text(cols.resource, y + 8, label, rowStyle),
    );

    // Base price
    this.contentContainer?.add(
      this.add.text(cols.base, y + 8, `${item.basePrice}g`, {
        ...rowStyle,
        color: COLORS.textSecondary,
      }),
    );

    // Current price
    this.contentContainer?.add(
      this.add.text(cols.price, y + 8, `${item.currentPrice}g`, {
        ...rowStyle,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );

    // Trend arrow
    this.contentContainer?.add(
      this.add.text(cols.trend, y + 6, TREND_ICONS[item.trend], {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: TREND_COLORS[item.trend],
        fontStyle: 'bold',
      }),
    );

    // Stock
    const stock = this.resources ? Math.floor(this.resources[item.resource as ResourceType] || 0) : 0;
    const stockText = this.add.text(cols.stock, y + 8, `${stock}`, rowStyle);
    this.contentContainer?.add(stockText);

    // Buy button
    const buyBtn = this.add.text(cols.buy, y + 5, '  Buy  ', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      backgroundColor: '#0f3460',
      padding: { x: 10, y: 6 },
      fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });

    buyBtn.on('pointerover', () => buyBtn.setStyle({ backgroundColor: '#1a5276' }));
    buyBtn.on('pointerout', () => buyBtn.setStyle({ backgroundColor: '#0f3460' }));
    buyBtn.on('pointerup', () => this.handleBuy(item.resource as ResourceType, stockText));
    this.contentContainer?.add(buyBtn);

    // Sell button
    const sellBtn = this.add.text(cols.sell, y + 5, '  Sell  ', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      backgroundColor: '#4a1942',
      padding: { x: 10, y: 6 },
      fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });

    sellBtn.on('pointerover', () => sellBtn.setStyle({ backgroundColor: '#6b2a5e' }));
    sellBtn.on('pointerout', () => sellBtn.setStyle({ backgroundColor: '#4a1942' }));
    sellBtn.on('pointerup', () => this.handleSell(item.resource as ResourceType, stockText));
    this.contentContainer?.add(sellBtn);
  }

  private async handleBuy(resource: ResourceType, stockText: Phaser.GameObjects.Text): Promise<void> {
    try {
      const result = await apiClient.marketBuy(resource, this.quantity);
      this.resources = result.resources as Resources;
      this.updateGoldDisplay();
      stockText.setText(`${Math.floor(result.resources[resource] || 0)}`);
      this.showMessage(`Bought ${this.quantity} ${resource} for ${result.totalPrice}g`, '#4ecca3');
    } catch (err) {
      this.showMessage(err instanceof Error ? err.message : 'Purchase failed', '#ff4444');
    }
  }

  private async handleSell(resource: ResourceType, stockText: Phaser.GameObjects.Text): Promise<void> {
    try {
      const result = await apiClient.marketSell(resource, this.quantity);
      this.resources = result.resources as Resources;
      this.updateGoldDisplay();
      stockText.setText(`${Math.floor(result.resources[resource] || 0)}`);
      this.showMessage(`Sold ${this.quantity} ${resource} for ${result.totalPrice}g`, '#4ecca3');
    } catch (err) {
      this.showMessage(err instanceof Error ? err.message : 'Sale failed', '#ff4444');
    }
  }

  private updateGoldDisplay(): void {
    if (!this.resources || !this.goldText) return;
    const gold = Math.floor(this.resources[ResourceType.Gold] || 0);
    this.goldText.setText(`Gold: ${gold}`);
  }

  private showMessage(msg: string, color: string): void {
    if (!this.errorText) return;
    this.errorText.setText(msg).setColor(color).setAlpha(1);
    this.time.delayedCall(3000, () => {
      this.errorText?.setAlpha(0);
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
        color: i === 2 ? COLORS.textGold : COLORS.textSecondary,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      text.on('pointerover', () => text.setColor(COLORS.textGold));
      text.on('pointerout', () => {
        if (i !== 2) text.setColor(COLORS.textSecondary);
      });

      if (i === 0) {
        text.on('pointerup', () => this.scene.start('GuildHallScene'));
      } else if (i === 1) {
        text.on('pointerup', () => this.scene.start('ExpeditionScene'));
      }
    });
  }
}
