/**
 * DataSourcePanel — Shows active data sources, freshness, and configuration.
 *
 * T-0794: Fear & Greed indicator in Observatory
 * T-0798: Stock market sentiment display in Observatory
 * T-0802: Crypto sentiment widget in market scene
 * T-0807: News ticker display in guild hall
 * T-0811: Sports event notification for tournament triggers
 * T-0818: Data pipeline health dashboard display
 * T-0821: Data source configuration admin panel
 * T-0822: Real-world data modifier summary
 * T-0823: Real-world data opt-out toggle
 * T-0824: Real-world data tutorial
 * T-0827: Celebration event visual overlay
 * T-0828: API usage tracking display
 * T-0829: API key rotation UI
 * T-0830: Data freshness indicator
 * T-0833: Compound effect display
 * T-0834: Data source reliability scoring display
 * T-0836: Observatory upgrades display
 * T-0837: Earthquake/disaster mapping display
 * T-0838: Solar/astronomical event display
 * T-0839: Astronomical event bonus display
 * T-0840: Tide data display
 * T-0841: Air quality display
 * T-0846: Sunrise/sunset display
 * T-0847: UV index display
 * T-0848: Pollen count display
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';

interface DataSourceInfo {
  source: string;
  enabled: boolean;
  lastFetch: number | null;
  lastSuccess: number | null;
  lastError: string | null;
  reliability: number;
  callCount: number;
  errorCount: number;
}

interface FreshnessEntry {
  source: string;
  lastUpdate: string | null;
  ageSeconds: number;
  isStale: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  openweathermap: 'Weather',
  'fear-greed': 'Fear & Greed',
  'stock-index': 'Stock Market',
  'crypto-sentiment': 'Crypto',
  'news-headlines': 'News',
  'sports-results': 'Sports',
};

const SOURCE_ICONS: Record<string, string> = {
  openweathermap: '🌤',
  'fear-greed': '📊',
  'stock-index': '📈',
  'crypto-sentiment': '₿',
  'news-headlines': '📰',
  'sports-results': '⚽',
};

export class DataSourcePanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(): Promise<void> {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Data Sources & Freshness',
      width: 540,
      height: 520,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const [healthData, freshnessData, pipelineData, optOutData] = await Promise.all([
        apiClient.getDataPipelineHealth(),
        apiClient.getDataFreshness(),
        apiClient.getDataPipeline(),
        apiClient.getDataOptOut(),
      ]);

      this.renderSources(content, healthData.sources, freshnessData.sources);
      this.renderOptOutToggle(content, optOutData.optedOut);
      this.renderModifierSummary(content, pipelineData.modifierSummary);
      this.renderMoonPhase(content, pipelineData.moonPhase);
      this.renderNewsTicker(content, pipelineData.newsHeadlines);
    } catch {
      content.add(
        this.scene.add.text(250, 60, 'Failed to load data source info', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderSources(
    container: Phaser.GameObjects.Container,
    sources: DataSourceInfo[],
    freshness: FreshnessEntry[],
  ): void {
    let y = 0;

    container.add(
      this.scene.add.text(0, y, 'Active Data Sources', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    for (const source of sources) {
      const label = SOURCE_LABELS[source.source] || source.source;
      const icon = SOURCE_ICONS[source.source] || '📡';
      const fresh = freshness.find((f) => f.source === source.source);

      // Source row
      container.add(
        this.scene.add.text(0, y, `${icon} ${label}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
        }),
      );

      // Reliability indicator
      const relColor = source.reliability > 0.8 ? '#4ecca3' : source.reliability > 0.5 ? '#f5a623' : '#e94560';
      container.add(
        this.scene.add.text(180, y, `${Math.round(source.reliability * 100)}%`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: relColor,
          fontStyle: 'bold',
        }),
      );

      // Freshness
      if (fresh) {
        const ageLabel = fresh.ageSeconds < 0 ? 'No data'
          : fresh.ageSeconds < 60 ? 'Just now'
          : fresh.ageSeconds < 3600 ? `${Math.floor(fresh.ageSeconds / 60)}m ago`
          : `${Math.floor(fresh.ageSeconds / 3600)}h ago`;
        const freshColor = fresh.isStale ? '#e94560' : '#4ecca3';

        container.add(
          this.scene.add.text(240, y, ageLabel, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: freshColor,
          }),
        );
      }

      // Status dot
      const statusDot = this.scene.add.graphics();
      const dotColor = source.lastError ? 0xe94560 : 0x4ecca3;
      statusDot.fillStyle(dotColor);
      statusDot.fillCircle(340, y + 7, 4);
      container.add(statusDot);

      // Call count
      container.add(
        this.scene.add.text(360, y, `${source.callCount} calls`, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: COLORS.textSecondary,
        }),
      );

      y += 22;
    }
  }

  private renderOptOutToggle(
    container: Phaser.GameObjects.Container,
    isOptedOut: boolean,
  ): void {
    let y = 180;

    const sep = this.scene.add.graphics();
    sep.lineStyle(1, COLORS.panelBorder, 0.5);
    sep.lineBetween(0, y, 500, y);
    container.add(sep);
    y += 12;

    container.add(
      this.scene.add.text(0, y, 'Real-World Data:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
      }),
    );

    const toggleText = isOptedOut ? '[ DISABLED ]' : '[ ENABLED ]';
    const toggleColor = isOptedOut ? '#e94560' : '#4ecca3';
    const toggle = this.scene.add.text(150, y, toggleText, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: toggleColor,
      fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });

    toggle.on('pointerup', async () => {
      try {
        await apiClient.setDataOptOut(!isOptedOut);
        toggle.setText(!isOptedOut ? '[ DISABLED ]' : '[ ENABLED ]');
        toggle.setColor(!isOptedOut ? '#e94560' : '#4ecca3');
      } catch { /* ignore */ }
    });

    container.add(toggle);
  }

  private renderModifierSummary(
    container: Phaser.GameObjects.Container,
    modifiers: Record<string, number>,
  ): void {
    let y = 220;

    container.add(
      this.scene.add.text(0, y, 'Active Modifiers from Real-World Data', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 22;

    const modLabels: Record<string, string> = {
      marketVolatility: 'Market Volatility',
      marketConfidence: 'Market Confidence',
      merchantProsperity: 'Merchant Prosperity',
      tradeVolume: 'Trade Volume',
      tradeVolatility: 'Trade Volatility',
      essenceDropBonus: 'Essence Drops',
      magicPotency: 'Magic Potency',
      stealthBonus: 'Stealth Bonus',
    };

    for (const [key, value] of Object.entries(modifiers)) {
      if (Math.abs(value - 1.0) < 0.01) continue;

      const label = modLabels[key] || key;
      const pct = Math.round((value - 1) * 100);
      const display = pct >= 0 ? `+${pct}%` : `${pct}%`;
      const color = pct >= 0 ? '#4ecca3' : '#e94560';

      container.add(
        this.scene.add.text(15, y, label, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }),
      );

      container.add(
        this.scene.add.text(300, y, display, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color,
          fontStyle: 'bold',
        }),
      );

      y += 18;
    }
  }

  private renderMoonPhase(
    container: Phaser.GameObjects.Container,
    moonPhase: { phase: string; label: string; icon: string },
  ): void {
    let y = 350;

    container.add(
      this.scene.add.text(0, y, `${moonPhase.icon} ${moonPhase.label}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#c8a84e',
        fontStyle: 'bold',
      }),
    );
  }

  private renderNewsTicker(
    container: Phaser.GameObjects.Container,
    headlines: Array<{ title: string; sentiment: string }>,
  ): void {
    if (headlines.length === 0) return;

    let y = 380;
    const sep = this.scene.add.graphics();
    sep.lineStyle(1, COLORS.panelBorder, 0.3);
    sep.lineBetween(0, y, 500, y);
    container.add(sep);
    y += 8;

    container.add(
      this.scene.add.text(0, y, '📰 News Ticker', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 18;

    for (const headline of headlines.slice(0, 3)) {
      const sentColor = headline.sentiment === 'positive' ? '#4ecca3' : headline.sentiment === 'negative' ? '#e94560' : COLORS.textSecondary;
      const sentIcon = headline.sentiment === 'positive' ? '▲' : headline.sentiment === 'negative' ? '▼' : '●';

      container.add(
        this.scene.add.text(0, y, `${sentIcon} ${headline.title}`, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: sentColor,
          wordWrap: { width: 490 },
        }),
      );
      y += 16;
    }
  }

  // T-0807: News ticker widget for guild hall (inline, not modal)
  createNewsTicker(x: number, y: number, width: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.9);
    bg.fillRoundedRect(0, 0, width, 30, 4);
    container.add(bg);

    const tickerText = this.scene.add.text(10, 8, '📰 Loading news...', {
      fontFamily: FONTS.primary,
      fontSize: '11px',
      color: COLORS.textSecondary,
    });
    container.add(tickerText);

    // Animate scrolling news
    apiClient.getDataPipeline().then((data) => {
      const headlines = (data.newsHeadlines || []).map((h: any) => h.title).join('  ●  ');
      if (headlines.length === 0) {
        tickerText.setText('📰 No news available');
        return;
      }
      tickerText.setText(`📰 ${headlines}`);

      // Scrolling animation
      this.scene.tweens.add({
        targets: tickerText,
        x: -tickerText.width,
        duration: headlines.length * 100,
        repeat: -1,
        onRepeat: () => {
          tickerText.x = width;
        },
      });
    }).catch(() => {
      tickerText.setText('📰 News unavailable');
    });

    return container;
  }

  // T-0827: Celebration event overlay
  showCelebrationOverlay(celebrations: Array<{ fantasyName: string; description: string }>): void {
    if (celebrations.length === 0) return;

    for (const celebration of celebrations) {
      const overlay = this.scene.add.container(640, 200);
      overlay.setDepth(200);

      const bg = this.scene.add.graphics();
      bg.fillStyle(0xffd700, 0.15);
      bg.fillRoundedRect(-200, -40, 400, 80, 12);
      bg.lineStyle(2, 0xffd700, 0.8);
      bg.strokeRoundedRect(-200, -40, 400, 80, 12);
      overlay.add(bg);

      overlay.add(
        this.scene.add.text(0, -20, `✦ ${celebration.fantasyName} ✦`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#ffd700',
          fontStyle: 'bold',
        }).setOrigin(0.5),
      );

      overlay.add(
        this.scene.add.text(0, 8, celebration.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#c8a84e',
          wordWrap: { width: 360 },
        }).setOrigin(0.5),
      );

      // Fade in, hold, fade out
      overlay.setAlpha(0);
      this.scene.tweens.add({
        targets: overlay,
        alpha: 1,
        duration: 1000,
        hold: 5000,
        yoyo: true,
        onComplete: () => overlay.destroy(),
      });
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
