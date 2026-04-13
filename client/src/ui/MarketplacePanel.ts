/**
 * Marketplace building UI with buy/sell tabs and price display.
 *
 * T-0314: Marketplace building — trade interface and NPC merchants
 * T-0316: Marketplace UI with buy/sell tabs and price display
 * T-0317: Marketplace trade commission reduction on upgrade
 * T-0318: Marketplace upgrade effects (more merchants, lower fees)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UITabPanel } from './components/UITabPanel';
import { UIButton } from './components/UIButton';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import type { Building } from '@shared/types';

export class MarketplacePanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onRefresh: () => void;

  constructor(scene: Phaser.Scene, onRefresh: () => void) {
    this.scene = scene;
    this.onRefresh = onRefresh;
  }

  async show(building: Building): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Marketplace — Trade',
      width: 540,
      height: 480,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const [prices, detail] = await Promise.all([
        apiClient.getMarketPrices(),
        apiClient.getExtendedBuildingDetail(building.type),
      ]);
      this.renderMarketplace(content, building, prices, detail);
    } catch {
      content.add(
        this.scene.add.text(220, 60, 'Failed to load market data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderMarketplace(
    container: Phaser.GameObjects.Container,
    building: Building,
    prices: any,
    detail: any,
  ): void {
    let y = 0;
    const level = building.level;
    const commission = Math.max(15 - level, 3);
    const merchantCount = Math.min(2 + Math.floor(level / 2), 10);

    container.add(
      this.scene.add.text(0, y, `Level ${level} Marketplace`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    container.add(
      this.scene.add.text(0, y, `Commission: ${commission}%  |  Merchants: ${merchantCount}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 20;

    container.add(
      this.scene.add.text(0, y, `Market Confidence: ${prices.confidence ?? 'N/A'}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 30;

    // Price table header
    const cols = [0, 120, 220, 320, 400];
    const headers = ['Resource', 'Price', 'Trend', 'Buy', 'Sell'];
    headers.forEach((h, i) => {
      container.add(
        this.scene.add.text(cols[i], y, h, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
          fontStyle: 'bold',
        }),
      );
    });
    y += 22;

    // Price rows
    const items = prices.items ?? [];
    for (const item of items) {
      const trendColor = item.trend === 'rising' ? '#4ecca3' : item.trend === 'falling' ? '#e94560' : COLORS.textSecondary;
      const trendArrow = item.trend === 'rising' ? 'UP' : item.trend === 'falling' ? 'DN' : '--';

      container.add(
        this.scene.add.text(cols[0], y, item.resource, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
        }),
      );

      container.add(
        this.scene.add.text(cols[1], y, `${item.currentPrice}g`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }),
      );

      container.add(
        this.scene.add.text(cols[2], y, trendArrow, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: trendColor,
          fontStyle: 'bold',
        }),
      );

      // Buy/Sell buttons
      const buyBtn = new UIButton(this.scene, {
        x: cols[3] + 20,
        y: y + 7,
        width: 50,
        height: 22,
        text: 'Buy',
        style: 'primary',
        onClick: () => this.trade('buy', item.resource),
      });
      container.add(buyBtn.getContainer());

      const sellBtn = new UIButton(this.scene, {
        x: cols[4] + 20,
        y: y + 7,
        width: 50,
        height: 22,
        text: 'Sell',
        style: 'secondary',
        onClick: () => this.trade('sell', item.resource),
      });
      container.add(sellBtn.getContainer());

      y += 30;
    }
  }

  private async trade(action: 'buy' | 'sell', resource: string): Promise<void> {
    try {
      if (action === 'buy') {
        await apiClient.marketBuy(resource, 10);
      } else {
        await apiClient.marketSell(resource, 10);
      }
      NotificationSystem.getInstance(this.scene).showSuccess(`${action === 'buy' ? 'Bought' : 'Sold'} 10 ${resource}`);
      this.onRefresh();
    } catch {
      NotificationSystem.getInstance(this.scene).showError(`Failed to ${action} ${resource}`);
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
