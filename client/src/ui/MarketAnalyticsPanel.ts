/**
 * Market analytics dashboard with trends, forecasts, economic indicators,
 * P&L tracking, achievements, event display, and inflation tracking.
 *
 * T-0585: Economic indicator dashboard
 * T-0592: Market analytics (most traded, biggest movers)
 * T-0601: Market achievements
 * T-0603: Market news ticker
 * T-0609: P&L tracker
 * T-0619: Inflation tracking
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';
import { PriceHistoryChart } from './PriceHistoryChart';

interface AnalyticsDashboard {
  mostTraded: Array<{ resource: string; volume: number }>;
  biggestMovers: Array<{ resource: string; changePercent: number; direction: string }>;
  economicCycle: { phase: string; priceMultiplier: number; demandMultiplier: number };
  inflationIndex: number;
  playerPnL: number;
  playerReputation: number;
  achievements: Array<{ id: string; name: string; description: string; current: number; requirement: number; unlocked: boolean }>;
  priceHistory: Array<{ timestamp: number; prices: Record<string, number> }>;
  activeEvents: Array<{ id: string; title: string; description: string; duration: number }>;
  rareSpotlight: { resource: string; discount: number; availableUntil: number } | null;
  circuitBreakerActive: boolean;
}

const PHASE_COLORS: Record<string, string> = {
  boom: '#4ecca3',
  stable: '#a0a0b0',
  recession: '#f5a623',
  depression: '#ff4444',
  recovery: '#3498db',
};

export class MarketAnalyticsPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(): Promise<void> {
    if (this.modal) this.modal.destroy();

    this.modal = new UIModal(this.scene, {
      title: 'Market Analytics',
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
      const data: AnalyticsDashboard = await apiClient.getMarketAnalytics();
      this.renderDashboard(content, data);
    } catch {
      content.add(
        this.scene.add.text(320, 60, 'Failed to load analytics', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderDashboard(container: Phaser.GameObjects.Container, data: AnalyticsDashboard): void {
    let y = 0;

    // --- Circuit breaker warning ---
    if (data.circuitBreakerActive) {
      const warningBg = this.scene.add.graphics();
      warningBg.fillStyle(0xe94560, 0.2);
      warningBg.fillRoundedRect(0, y, 660, 28, 4);
      container.add(warningBg);
      container.add(
        this.scene.add.text(330, y + 14, 'CIRCUIT BREAKER ACTIVE — Trading Halted', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#ff4444',
          fontStyle: 'bold',
        }).setOrigin(0.5),
      );
      y += 34;
    }

    // --- Top row: Phase + Inflation + P&L ---
    const phaseColor = PHASE_COLORS[data.economicCycle.phase] ?? COLORS.textSecondary;
    container.add(
      this.scene.add.text(0, y, `Economy: ${data.economicCycle.phase.toUpperCase()}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: phaseColor,
        fontStyle: 'bold',
      }),
    );

    container.add(
      this.scene.add.text(220, y, `Inflation: ${data.inflationIndex}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: data.inflationIndex > 110 ? '#ff4444' : data.inflationIndex < 90 ? '#4ecca3' : COLORS.textSecondary,
      }),
    );

    const pnlColor = data.playerPnL >= 0 ? '#4ecca3' : '#ff4444';
    const pnlSign = data.playerPnL >= 0 ? '+' : '';
    container.add(
      this.scene.add.text(380, y, `P&L: ${pnlSign}${data.playerPnL}g`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: pnlColor,
        fontStyle: 'bold',
      }),
    );

    container.add(
      this.scene.add.text(520, y, `Rep: ${data.playerReputation}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
      }),
    );
    y += 28;

    // --- Multipliers ---
    container.add(
      this.scene.add.text(0, y, `Price x${data.economicCycle.priceMultiplier} | Demand x${data.economicCycle.demandMultiplier}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      }),
    );
    y += 22;

    // --- Rare spotlight ---
    if (data.rareSpotlight) {
      const spotBg = this.scene.add.graphics();
      spotBg.fillStyle(0xffd700, 0.1);
      spotBg.fillRoundedRect(0, y, 660, 24, 4);
      container.add(spotBg);
      container.add(
        this.scene.add.text(10, y + 4, `SPOTLIGHT: ${data.rareSpotlight.resource} — ${Math.round(data.rareSpotlight.discount * 100)}% off!`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }),
      );
      y += 30;
    }

    // --- Active Events ---
    if (data.activeEvents.length > 0) {
      container.add(
        this.scene.add.text(0, y, 'Active Events:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textAccent,
          fontStyle: 'bold',
        }),
      );
      y += 18;
      for (const event of data.activeEvents) {
        container.add(
          this.scene.add.text(10, y, `${event.title} — ${event.description} (${event.duration}h)`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          }),
        );
        y += 16;
      }
      y += 6;
    }

    // --- Most Traded ---
    container.add(
      this.scene.add.text(0, y, 'Most Traded:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 18;

    for (const item of data.mostTraded.slice(0, 5)) {
      container.add(
        this.scene.add.text(10, y, `${item.resource}: ${item.volume} units`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textPrimary,
        }),
      );
      y += 15;
    }
    y += 6;

    // --- Biggest Movers ---
    container.add(
      this.scene.add.text(0, y, 'Biggest Movers:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 18;

    for (const mover of data.biggestMovers.slice(0, 5)) {
      const arrow = mover.direction === 'rising' ? '\u2191' : mover.direction === 'falling' ? '\u2193' : '\u2192';
      const color = mover.direction === 'rising' ? '#ff4444' : mover.direction === 'falling' ? '#4ecca3' : COLORS.textSecondary;
      container.add(
        this.scene.add.text(10, y, `${arrow} ${mover.resource}: ${mover.changePercent}%`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color,
        }),
      );
      y += 15;
    }
    y += 6;

    // --- Price history sparkline ---
    if (data.priceHistory.length >= 2) {
      container.add(
        this.scene.add.text(0, y, 'Price History (24h):', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }),
      );
      y += 20;

      const chart = new PriceHistoryChart(this.scene);
      // Show average price as sparkline
      const avgData = data.priceHistory.map(s => {
        const vals = Object.values(s.prices);
        const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        return { timestamp: s.timestamp, price: Math.round(avg) };
      });
      chart.render({ x: 0, y, width: 300, height: 100, data: avgData, label: 'Avg Price' });
      container.add(chart.getContainer());
      y += 110;
    }

    // --- Achievements ---
    container.add(
      this.scene.add.text(0, y, 'Achievements:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 18;

    for (const ach of data.achievements) {
      const achColor = ach.unlocked ? '#4ecca3' : COLORS.textSecondary;
      const checkmark = ach.unlocked ? '[x]' : '[ ]';
      container.add(
        this.scene.add.text(10, y, `${checkmark} ${ach.name} — ${ach.current}/${ach.requirement}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: achColor,
        }),
      );
      y += 15;
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
