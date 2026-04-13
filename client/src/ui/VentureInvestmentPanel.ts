/**
 * VentureInvestmentPanel — Player investment UI for market-linked ventures.
 *
 * T-1038: Portfolio tracker for in-game investments linked to real markets
 * T-1039: Dividend payment system
 * T-1056: Commodity futures in-game trading
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';

interface Venture {
  id: string;
  ventureName: string;
  sector: string;
  investedGold: number;
  currentValue: number;
  returnPct: number;
  dividendAccrued: number;
  status: string;
  purchaseDate: string;
}

interface CommodityFuture {
  id: string;
  commodity: string;
  quantity: number;
  purchasePrice: number;
  maturityDate: string;
}

const SECTOR_COLORS: Record<string, string> = {
  technology: '#9b59b6',
  healthcare: '#3498db',
  energy: '#f5a623',
  agriculture: '#4ecca3',
};

export class VentureInvestmentPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(): Promise<void> {
    if (this.modal) this.modal.destroy();

    this.modal = new UIModal(this.scene, {
      title: 'Guild Ventures & Investments',
      width: 700,
      height: 560,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const [ventures, futures] = await Promise.all([
        apiClient.getFinancialVentures(),
        apiClient.getFinancialFutures(),
      ]);
      this.renderPortfolio(content, ventures, futures);
    } catch {
      content.add(
        this.scene.add.text(320, 60, 'Failed to load venture portfolio.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderPortfolio(
    container: Phaser.GameObjects.Container,
    ventures: Venture[],
    futures: CommodityFuture[],
  ): void {
    let y = 0;

    // Portfolio summary
    const totalInvested = ventures.reduce((sum, v) => sum + v.investedGold, 0);
    const totalValue = ventures.reduce((sum, v) => sum + v.currentValue, 0);
    const totalDividends = ventures.reduce((sum, v) => sum + v.dividendAccrued, 0);
    const totalPnL = totalValue - totalInvested + totalDividends;

    container.add(
      this.scene.add.text(10, y, 'Portfolio Summary', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.subheading}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 24;

    container.add(
      this.scene.add.text(10, y, `Invested: ${totalInvested} gold`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: '#a0a0b0',
      }),
    );
    container.add(
      this.scene.add.text(200, y, `Value: ${totalValue} gold`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
      }),
    );
    container.add(
      this.scene.add.text(380, y, `P&L: ${totalPnL >= 0 ? '+' : ''}${totalPnL} gold`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: totalPnL >= 0 ? '#4ecca3' : '#ff4444',
      }),
    );
    y += 24;

    container.add(
      this.scene.add.text(10, y, `Dividends earned: ${totalDividends} gold`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#4ecca3',
      }),
    );
    y += 28;

    // Active Ventures
    container.add(
      this.scene.add.text(10, y, 'Active Ventures', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.subheading}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 22;

    if (ventures.length === 0) {
      container.add(
        this.scene.add.text(20, y, 'No active ventures. Visit the Sapphire Exchange to invest.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#888899',
        }),
      );
      y += 20;
    }

    for (const venture of ventures) {
      const sectorColor = SECTOR_COLORS[venture.sector] || '#a0a0b0';
      const returnColor = venture.returnPct >= 0 ? '#4ecca3' : '#ff4444';

      container.add(
        this.scene.add.text(20, y, venture.ventureName, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: sectorColor,
        }),
      );
      y += 18;

      container.add(
        this.scene.add.text(30, y, `Invested: ${venture.investedGold}g  |  Value: ${venture.currentValue}g`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#a0a0b0',
        }),
      );
      container.add(
        this.scene.add.text(400, y, `Return: ${venture.returnPct >= 0 ? '+' : ''}${venture.returnPct.toFixed(1)}%`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: returnColor,
        }),
      );
      y += 18;

      container.add(
        this.scene.add.text(30, y, `Dividends: ${venture.dividendAccrued}g  |  Status: ${venture.status}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#888899',
        }),
      );
      y += 22;
    }
    y += 10;

    // Commodity Futures
    container.add(
      this.scene.add.text(10, y, 'Commodity Futures', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.subheading}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 22;

    if (futures.length === 0) {
      container.add(
        this.scene.add.text(20, y, 'No active commodity futures.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#888899',
        }),
      );
      y += 20;
    }

    for (const future of futures) {
      container.add(
        this.scene.add.text(20, y, `${future.commodity}: ${future.quantity} units @ ${future.purchasePrice}g`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#a0a0b0',
        }),
      );
      container.add(
        this.scene.add.text(420, y, `Matures: ${new Date(future.maturityDate).toLocaleDateString()}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#888899',
        }),
      );
      y += 18;
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
