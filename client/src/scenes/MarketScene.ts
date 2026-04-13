/**
 * Market scene with price tables, trend indicators, NPC merchants,
 * auction house, trade routes, analytics, and more.
 *
 * T-0551 through T-0620
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import type { Resources } from '@shared/types';
import { ResourceType } from '@shared/enums';
import { PriceHistoryChart } from '../ui/PriceHistoryChart';
import { NpcMerchantPanel } from '../ui/NpcMerchantPanel';
import { TradeRoutePanel } from '../ui/TradeRoutePanel';
import { MarketAnalyticsPanel } from '../ui/MarketAnalyticsPanel';

interface MarketItem {
  resource: string;
  basePrice: number;
  currentPrice: number;
  trend: 'rising' | 'falling' | 'stable';
  changePercent: number;
  supplyDemandRatio: number;
}

interface DailyDeal {
  resource: string;
  discount: number;
  quantity: number;
  expiresAt: number;
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

// T-0558: Tab definitions for the market UI
type MarketTab = 'prices' | 'merchants' | 'auctions' | 'routes' | 'analytics';

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
  private economicPhase: string = 'stable';
  private inflationIndex: number = 100;
  private newsTicker: string[] = [];
  private dailyDeals: DailyDeal[] = [];
  private activeEvents: Array<{ id: string; title: string; description: string }> = [];
  private activeTab: MarketTab = 'prices';
  private merchantPanel: NpcMerchantPanel | null = null;
  private tradeRoutePanel: TradeRoutePanel | null = null;
  private analyticsPanel: MarketAnalyticsPanel | null = null;
  private newsTickerText: Phaser.GameObjects.Text | null = null;
  private newsTickerTween: Phaser.Tweens.Tween | null = null;

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
      this.economicPhase = marketData.economicPhase;
      this.inflationIndex = marketData.inflationIndex;
      this.newsTicker = marketData.newsTicker;
      this.dailyDeals = marketData.dailyDeals;
      this.activeEvents = marketData.activeEvents;

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

    // Economic phase badge
    const phaseColors: Record<string, string> = {
      boom: '#4ecca3', stable: '#a0a0b0', recession: '#f5a623',
      depression: '#ff4444', recovery: '#3498db',
    };
    this.add.text(130, 20, this.economicPhase.toUpperCase(), {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: phaseColors[this.economicPhase] ?? COLORS.textSecondary,
      fontStyle: 'bold',
    });

    // Inflation index
    const inflColor = this.inflationIndex > 110 ? '#ff4444' : this.inflationIndex < 90 ? '#4ecca3' : COLORS.textSecondary;
    this.add.text(280, 20, `CPI: ${this.inflationIndex}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: inflColor,
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

    // --- Gold, Confidence, Rep bar ---
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
    this.confidenceText = this.add.text(GAME_WIDTH - 20, 65, `Confidence: ${confidenceLabel}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: confidenceColor,
    }).setOrigin(1, 0);

    // --- T-0603: News ticker ---
    this.buildNewsTicker();

    // --- T-0558: Category tabs ---
    this.buildTabBar();

    // --- Quantity selector ---
    const qY = 125;
    this.add.text(20, qY + 5, 'Qty:', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    });

    this.quantityText = this.add.text(65, qY + 5, `${this.quantity}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    });

    const quantities = [1, 10, 50, 100];
    quantities.forEach((q, i) => {
      const btn = this.add.text(95 + i * 50, qY + 2, `[${q}]`, {
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

    // T-0593: Search button
    const searchBtn = this.add.text(350, qY + 2, '[Search]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
      fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    searchBtn.on('pointerup', () => this.showMessage('Search: type a resource name to filter', '#a0a0b0'));

    // --- Error/message text area ---
    this.errorText = this.add.text(GAME_WIDTH / 2, qY + 2, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ff4444',
    }).setOrigin(0.5, 0).setAlpha(0);

    // --- Content area ---
    this.contentContainer = this.add.container(0, 0);
    this.renderPricesTab();

    // --- Bottom nav ---
    this.buildBottomNav();
  }

  // T-0603: Scrolling news ticker
  private buildNewsTicker(): void {
    const tickerY = 95;
    const tickerBg = this.add.graphics();
    tickerBg.fillStyle(0x0a0a1e, 0.7);
    tickerBg.fillRect(0, tickerY, GAME_WIDTH, 20);

    const tickerMsg = this.newsTicker.join('  |  ');
    this.newsTickerText = this.add.text(GAME_WIDTH, tickerY + 2, tickerMsg, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });

    // Scroll animation
    const textWidth = this.newsTickerText.width + GAME_WIDTH;
    this.newsTickerTween = this.tweens.add({
      targets: this.newsTickerText,
      x: -this.newsTickerText.width,
      duration: Math.max(8000, textWidth * 15),
      repeat: -1,
    });
  }

  // T-0558: Tab bar
  private buildTabBar(): void {
    const tabY = 115;
    const tabs: Array<{ label: string; key: MarketTab }> = [
      { label: 'Prices', key: 'prices' },
      { label: 'Merchants', key: 'merchants' },
      { label: 'Auctions', key: 'auctions' },
      { label: 'Trade Routes', key: 'routes' },
      { label: 'Analytics', key: 'analytics' },
    ];

    tabs.forEach((tab, i) => {
      const x = GAME_WIDTH - 20 - (tabs.length - i) * 95;
      const isActive = tab.key === this.activeTab;
      const text = this.add.text(x, tabY, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: isActive ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: isActive ? 'bold' : 'normal',
      }).setInteractive({ useHandCursor: true });

      text.on('pointerup', () => {
        this.activeTab = tab.key;
        this.contentContainer?.removeAll(true);
        switch (tab.key) {
          case 'prices': this.renderPricesTab(); break;
          case 'merchants': this.showMerchants(); break;
          case 'auctions': this.renderAuctionsTab(); break;
          case 'routes': this.showTradeRoutes(); break;
          case 'analytics': this.showAnalytics(); break;
        }
      });
    });
  }

  // --- Prices Tab ---
  private renderPricesTab(): void {
    const tableY = 150;
    const cols = { resource: 30, base: 150, price: 230, trend: 330, change: 400, sd: 490, stock: 580, buy: 730, sell: 850, quick: 960 };

    // Table header bg
    const tableBg = this.add.graphics();
    tableBg.fillStyle(COLORS.panelBorder, 0.5);
    tableBg.fillRect(10, tableY, GAME_WIDTH - 20, 30);
    this.contentContainer?.add(tableBg);

    const headerStyle = {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
      fontStyle: 'bold' as const,
    };

    const headers = [
      { x: cols.resource, t: 'Resource' }, { x: cols.base, t: 'Base' },
      { x: cols.price, t: 'Price' }, { x: cols.trend, t: 'Trend' },
      { x: cols.change, t: 'Chg%' }, { x: cols.sd, t: 'S/D' },
      { x: cols.stock, t: 'Stock' }, { x: cols.buy, t: 'Buy' },
      { x: cols.sell, t: 'Sell' }, { x: cols.quick, t: 'Quick' },
    ];

    for (const h of headers) {
      this.contentContainer?.add(this.add.text(h.x, tableY + 7, h.t, headerStyle));
    }

    // Table rows
    this.items.forEach((item, idx) => {
      const rowY = tableY + 35 + idx * 45;
      this.renderRow(item, rowY, cols, idx);
    });

    // T-0618: Daily deals section
    if (this.dailyDeals.length > 0) {
      const dealsY = tableY + 35 + this.items.length * 45 + 10;
      this.renderDailyDeals(dealsY);
    }
  }

  private renderRow(
    item: MarketItem,
    y: number,
    cols: Record<string, number>,
    idx: number,
  ): void {
    if (idx % 2 === 0) {
      const rowBg = this.add.graphics();
      rowBg.fillStyle(COLORS.panelBg, 0.4);
      rowBg.fillRect(10, y - 5, GAME_WIDTH - 20, 40);
      this.contentContainer?.add(rowBg);
    }

    const rowStyle = {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
    };

    const label = RESOURCE_LABELS[item.resource] || item.resource;
    this.contentContainer?.add(this.add.text(cols.resource, y + 5, label, rowStyle));
    this.contentContainer?.add(this.add.text(cols.base, y + 5, `${item.basePrice}g`, { ...rowStyle, color: COLORS.textSecondary }));
    this.contentContainer?.add(this.add.text(cols.price, y + 5, `${item.currentPrice}g`, { ...rowStyle, color: COLORS.textGold, fontStyle: 'bold' }));

    // T-0557: Trend arrow with color
    this.contentContainer?.add(this.add.text(cols.trend, y + 3, TREND_ICONS[item.trend], {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: TREND_COLORS[item.trend],
      fontStyle: 'bold',
    }));

    // Change percent
    const chgColor = item.changePercent > 0 ? '#ff4444' : item.changePercent < 0 ? '#4ecca3' : COLORS.textSecondary;
    const chgSign = item.changePercent > 0 ? '+' : '';
    this.contentContainer?.add(this.add.text(cols.change, y + 5, `${chgSign}${item.changePercent}%`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: chgColor,
    }));

    // Supply/demand ratio
    const sdColor = item.supplyDemandRatio > 1.2 ? '#ff4444' : item.supplyDemandRatio < 0.8 ? '#4ecca3' : COLORS.textSecondary;
    this.contentContainer?.add(this.add.text(cols.sd, y + 5, `${item.supplyDemandRatio}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: sdColor,
    }));

    // Stock
    const stock = this.resources ? Math.floor(this.resources[item.resource as ResourceType] || 0) : 0;
    const stockText = this.add.text(cols.stock, y + 5, `${stock}`, rowStyle);
    this.contentContainer?.add(stockText);

    // Buy button
    const buyBtn = this.add.text(cols.buy, y + 2, ' Buy ', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textPrimary,
      backgroundColor: '#0f3460',
      padding: { x: 8, y: 4 },
      fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    buyBtn.on('pointerover', () => buyBtn.setStyle({ backgroundColor: '#1a5276' }));
    buyBtn.on('pointerout', () => buyBtn.setStyle({ backgroundColor: '#0f3460' }));
    buyBtn.on('pointerup', () => this.handleBuy(item.resource as ResourceType, stockText));
    this.contentContainer?.add(buyBtn);

    // Sell button
    const sellBtn = this.add.text(cols.sell, y + 2, ' Sell ', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textPrimary,
      backgroundColor: '#4a1942',
      padding: { x: 8, y: 4 },
      fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    sellBtn.on('pointerover', () => sellBtn.setStyle({ backgroundColor: '#6b2a5e' }));
    sellBtn.on('pointerout', () => sellBtn.setStyle({ backgroundColor: '#4a1942' }));
    sellBtn.on('pointerup', () => this.handleSell(item.resource as ResourceType, stockText));
    this.contentContainer?.add(sellBtn);

    // T-0612: Quick-sell button
    const quickBtn = this.add.text(cols.quick, y + 2, 'Q', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textPrimary,
      backgroundColor: '#333355',
      padding: { x: 6, y: 4 },
    }).setInteractive({ useHandCursor: true });
    quickBtn.on('pointerup', () => this.handleQuickSell(item.resource as ResourceType, stockText));
    this.contentContainer?.add(quickBtn);
  }

  // T-0618: Daily deals section
  private renderDailyDeals(startY: number): void {
    let y = startY;
    this.contentContainer?.add(
      this.add.text(30, y, 'Daily Deals', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 22;

    for (const deal of this.dailyDeals) {
      const label = RESOURCE_LABELS[deal.resource] || deal.resource;
      const discountPct = Math.round(deal.discount * 100);
      this.contentContainer?.add(
        this.add.text(40, y, `${label}: ${discountPct}% off (${deal.quantity} available)`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#4ecca3',
        }),
      );
      y += 18;
    }
  }

  // --- T-0571-T-0577: Auctions Tab ---
  private renderAuctionsTab(): void {
    const y = 155;
    this.contentContainer?.add(
      this.add.text(30, y, 'Auction House', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    this.contentContainer?.add(
      this.add.text(30, y + 28, 'List items for auction or bid on active listings.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );

    // Load auctions asynchronously
    this.loadAuctions(y + 60);
  }

  private async loadAuctions(startY: number): Promise<void> {
    try {
      const auctions = await apiClient.getAuctions();
      let y = startY;

      if (auctions.length === 0) {
        this.contentContainer?.add(
          this.add.text(30, y, 'No active auctions. Be the first to list!', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textSecondary,
          }),
        );
        return;
      }

      // Headers
      const cols = [30, 150, 250, 370, 500, 620];
      ['Resource', 'Qty', 'Current Bid', 'Buyout', 'Time Left', 'Action'].forEach((h, i) => {
        this.contentContainer?.add(
          this.add.text(cols[i], y, h, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
            fontStyle: 'bold',
          }),
        );
      });
      y += 20;

      for (const auction of auctions.slice(0, 8)) {
        const remaining = Math.max(0, auction.expiresAt - Date.now());
        const mins = Math.ceil(remaining / 60000);
        const timeStr = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

        this.contentContainer?.add(this.add.text(cols[0], y, auction.resource, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textPrimary,
        }));
        this.contentContainer?.add(this.add.text(cols[1], y, `${auction.quantity}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
        }));
        this.contentContainer?.add(this.add.text(cols[2], y, `${auction.currentBid}g`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textGold,
        }));
        this.contentContainer?.add(this.add.text(cols[3], y, auction.buyoutPrice ? `${auction.buyoutPrice}g` : '--', {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
        }));
        // T-0575: Auction timer
        this.contentContainer?.add(this.add.text(cols[4], y, timeStr, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: remaining < 600000 ? '#ff4444' : COLORS.textSecondary,
        }));

        const bidBtn = this.add.text(cols[5], y - 2, ' Bid ', {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textPrimary, backgroundColor: '#0f3460',
          padding: { x: 8, y: 4 }, fontStyle: 'bold',
        }).setInteractive({ useHandCursor: true });
        bidBtn.on('pointerup', () => this.handleBid(auction.id, auction.currentBid + 1));
        this.contentContainer?.add(bidBtn);

        y += 30;
      }
    } catch {
      this.showMessage('Failed to load auctions', '#ff4444');
    }
  }

  // --- Panel launchers ---
  private showMerchants(): void {
    this.merchantPanel?.destroy();
    this.merchantPanel = new NpcMerchantPanel(this, () => this.refreshData());
    this.merchantPanel.show();
  }

  private showTradeRoutes(): void {
    this.tradeRoutePanel?.destroy();
    this.tradeRoutePanel = new TradeRoutePanel(this, () => this.refreshData());
    this.tradeRoutePanel.show();
  }

  private showAnalytics(): void {
    this.analyticsPanel?.destroy();
    this.analyticsPanel = new MarketAnalyticsPanel(this);
    this.analyticsPanel.show();
  }

  // --- Trade handlers ---
  private async handleBuy(resource: ResourceType, stockText: Phaser.GameObjects.Text): Promise<void> {
    try {
      const result = await apiClient.marketBuy(resource, this.quantity);
      this.resources = result.resources as Resources;
      this.updateGoldDisplay();
      stockText.setText(`${Math.floor(result.resources[resource] || 0)}`);
      const feeMsg = result.fees > 0 ? ` (fee: ${result.fees}g)` : '';
      this.showMessage(`Bought ${this.quantity} ${resource} for ${result.totalPrice}g${feeMsg}`, '#4ecca3');
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
      const feeMsg = result.fees > 0 ? ` (fee: ${result.fees}g)` : '';
      this.showMessage(`Sold ${this.quantity} ${resource} for ${result.totalPrice}g${feeMsg}`, '#4ecca3');
    } catch (err) {
      this.showMessage(err instanceof Error ? err.message : 'Sale failed', '#ff4444');
    }
  }

  // T-0612: Quick sell handler
  private async handleQuickSell(resource: ResourceType, stockText: Phaser.GameObjects.Text): Promise<void> {
    try {
      const result = await apiClient.marketQuickSell(resource, this.quantity);
      this.resources = result.resources as Resources;
      this.updateGoldDisplay();
      stockText.setText(`${Math.floor(result.resources[resource] || 0)}`);
      this.showMessage(`Quick-sold ${this.quantity} ${resource} for ${result.totalPrice}g (floor price)`, '#f5a623');
    } catch (err) {
      this.showMessage(err instanceof Error ? err.message : 'Quick sell failed', '#ff4444');
    }
  }

  // T-0574: Bid handler
  private async handleBid(auctionId: string, amount: number): Promise<void> {
    try {
      await apiClient.placeBid(auctionId, amount);
      this.showMessage(`Bid ${amount}g placed!`, '#4ecca3');
    } catch (err) {
      this.showMessage(err instanceof Error ? err.message : 'Bid failed', '#ff4444');
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

  private async refreshData(): Promise<void> {
    try {
      const guildData = await apiClient.getGuild();
      this.resources = guildData.resources;
      this.updateGoldDisplay();
    } catch { /* ignore refresh failures */ }
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
      const isActive = i === 2;
      const text = this.add.text(x, navY + 25, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: isActive ? COLORS.textGold : COLORS.textSecondary,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      text.on('pointerover', () => text.setColor(COLORS.textGold));
      text.on('pointerout', () => {
        if (!isActive) text.setColor(COLORS.textSecondary);
      });

      if (!isActive) {
        text.on('pointerup', () => this.scene.start(tab.scene));
      }
    });
  }
}
