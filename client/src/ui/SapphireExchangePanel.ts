/**
 * SapphireExchangePanel — In-game exchange UI reflecting real markets.
 * Never shows raw financial data — always fantasy-translated.
 *
 * T-0995: Stock market summary in Observatory
 * T-1004: Commodity price chart with real-world comparison
 * T-1013: Crypto sentiment gauge
 * T-1018: Market volatility indicator in expedition planning
 * T-1040: Market sector dashboard
 * T-1057: Market ticker scrolling display
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';

interface TickerItem {
  symbol: string;
  fantasyName: string;
  direction: 'up' | 'down' | 'flat';
  changePct: number;
  shortDescription: string;
}

interface SectorItem {
  sector: string;
  fantasyName: string;
  affectedBuilding: string;
  changePct: number;
  efficiencyModifier: number;
  description: string;
}

interface ObservatorySummary {
  sapphireIndex: { value: number; trend: string; fantasyDescription: string };
  commodityOverview: Array<{ name: string; fantasyName: string; trend: string; effect: string }>;
  sentimentGauge: { label: string; value: number; description: string };
  stormIndex: { label: string; value: number; description: string };
  economicPhase: { name: string; description: string };
}

const DIRECTION_COLORS: Record<string, string> = {
  up: '#4ecca3',
  down: '#ff4444',
  flat: '#a0a0b0',
  rising: '#4ecca3',
  falling: '#ff4444',
  stable: '#a0a0b0',
};

export class SapphireExchangePanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(): Promise<void> {
    if (this.modal) this.modal.destroy();

    this.modal = new UIModal(this.scene, {
      title: 'The Sapphire Exchange',
      width: 750,
      height: 600,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const [summary, ticker, sectors] = await Promise.all([
        apiClient.getFinancialObservatory(),
        apiClient.getFinancialTicker(),
        apiClient.getFinancialSectors(),
      ]);
      this.renderExchange(content, summary, ticker, sectors);
    } catch {
      content.add(
        this.scene.add.text(350, 60, 'The Sapphire Exchange is temporarily closed.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderExchange(
    container: Phaser.GameObjects.Container,
    summary: ObservatorySummary,
    ticker: TickerItem[],
    sectors: SectorItem[],
  ): void {
    let y = 0;

    // Exchange Index Header
    const indexColor = DIRECTION_COLORS[summary.sapphireIndex.trend] || '#a0a0b0';
    container.add(
      this.scene.add.text(10, y, `Sapphire Exchange Index`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 22;
    container.add(
      this.scene.add.text(10, y, summary.sapphireIndex.fantasyDescription, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: indexColor,
        wordWrap: { width: 700 },
      }),
    );
    y += 36;

    // Sentiment Gauge
    container.add(
      this.scene.add.text(10, y, `Courage & Avarice: ${summary.sentimentGauge.label}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 18;
    // Draw gauge bar
    const gaugeWidth = 300;
    const gaugeBg = this.scene.add.graphics();
    gaugeBg.fillStyle(0x333344, 1);
    gaugeBg.fillRoundedRect(10, y, gaugeWidth, 12, 6);
    container.add(gaugeBg);

    const gaugeFill = this.scene.add.graphics();
    const fillColor = summary.sentimentGauge.value < 30 ? 0xff4444
      : summary.sentimentGauge.value > 70 ? 0x4ecca3
      : 0xf5a623;
    gaugeFill.fillStyle(fillColor, 1);
    gaugeFill.fillRoundedRect(10, y, (summary.sentimentGauge.value / 100) * gaugeWidth, 12, 6);
    container.add(gaugeFill);
    y += 20;

    container.add(
      this.scene.add.text(10, y, summary.sentimentGauge.description, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#888899',
        wordWrap: { width: 700 },
      }),
    );
    y += 30;

    // Storm Index
    container.add(
      this.scene.add.text(10, y, `Storm Index: ${summary.stormIndex.label}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: summary.stormIndex.value > 25 ? '#ff6644' : '#4ecca3',
      }),
    );
    y += 18;
    container.add(
      this.scene.add.text(10, y, summary.stormIndex.description, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#888899',
        wordWrap: { width: 700 },
      }),
    );
    y += 30;

    // Economic Phase
    container.add(
      this.scene.add.text(10, y, `Economic Phase: ${summary.economicPhase.name}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 18;
    container.add(
      this.scene.add.text(10, y, summary.economicPhase.description, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#888899',
        wordWrap: { width: 700 },
      }),
    );
    y += 30;

    // Commodity Overview
    container.add(
      this.scene.add.text(10, y, 'Commodity Markets', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 22;

    for (const commodity of summary.commodityOverview) {
      const color = DIRECTION_COLORS[commodity.trend] || '#a0a0b0';
      container.add(
        this.scene.add.text(20, y, `${commodity.fantasyName}: ${commodity.trend}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color,
        }),
      );
      container.add(
        this.scene.add.text(250, y, commodity.effect, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#888899',
        }),
      );
      y += 18;
    }
    y += 10;

    // Sector Performance
    container.add(
      this.scene.add.text(10, y, 'Guild Sectors', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 22;

    for (const sector of sectors) {
      const color = sector.changePct > 0.5 ? '#4ecca3' : sector.changePct < -0.5 ? '#ff4444' : '#a0a0b0';
      container.add(
        this.scene.add.text(20, y, `${sector.fantasyName} (${sector.affectedBuilding})`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color,
        }),
      );
      container.add(
        this.scene.add.text(350, y, sector.description, {
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
