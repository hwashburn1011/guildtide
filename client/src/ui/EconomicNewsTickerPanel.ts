/**
 * EconomicNewsTickerPanel — Fantasy-translated news ticker.
 * Displays scrolling financial news in fantasy terms.
 *
 * T-1057: Market ticker scrolling display
 * T-1060: Economic newspaper NPC daily briefing
 * T-1049: Financial sentiment shift notification
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { apiClient } from '../api/client';

interface NewsArticle {
  headline: string;
  body: string;
  source: string;
  category: string;
  timestamp: string;
}

interface TickerItem {
  symbol: string;
  fantasyName: string;
  direction: 'up' | 'down' | 'flat';
  changePct: number;
  shortDescription: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  stock: '#4ecca3',
  crypto: '#9b59b6',
  commodity: '#f5a623',
  economic: '#3498db',
};

export class EconomicNewsTickerPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private tickerContainer: Phaser.GameObjects.Container | null = null;
  private tickerTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async show(): Promise<void> {
    if (this.modal) this.modal.destroy();

    this.modal = new UIModal(this.scene, {
      title: 'The Economic Herald',
      width: 700,
      height: 520,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
        this.tickerTween?.destroy();
        this.tickerTween = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const [articles, ticker] = await Promise.all([
        apiClient.getFinancialNews(),
        apiClient.getFinancialTicker(),
      ]);
      this.renderNewspaper(content, articles, ticker);
    } catch {
      content.add(
        this.scene.add.text(320, 60, 'The Herald is out of print today.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderNewspaper(
    container: Phaser.GameObjects.Container,
    articles: NewsArticle[],
    ticker: TickerItem[],
  ): void {
    let y = 0;

    // Scrolling ticker bar at top
    this.renderTickerBar(container, ticker, y);
    y += 30;

    // Separator
    const sep = this.scene.add.graphics();
    sep.lineStyle(1, 0x444455, 1);
    sep.lineBetween(10, y, 660, y);
    container.add(sep);
    y += 10;

    // Articles
    container.add(
      this.scene.add.text(10, y, 'Today\'s Headlines', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.subheading}px`,
        color: COLORS.textPrimary,
      }),
    );
    y += 24;

    for (const article of articles) {
      const catColor = CATEGORY_COLORS[article.category] || '#888899';

      // Category tag
      container.add(
        this.scene.add.text(10, y, article.source, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small - 2}px`,
          color: catColor,
        }),
      );
      y += 14;

      // Headline
      container.add(
        this.scene.add.text(10, y, article.headline, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
          wordWrap: { width: 640 },
        }),
      );
      y += 22;

      // Body
      container.add(
        this.scene.add.text(10, y, article.body, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#888899',
          wordWrap: { width: 640 },
        }),
      );
      y += 36;

      // Article separator
      const artSep = this.scene.add.graphics();
      artSep.lineStyle(1, 0x333344, 0.5);
      artSep.lineBetween(20, y, 650, y);
      container.add(artSep);
      y += 10;
    }
  }

  private renderTickerBar(container: Phaser.GameObjects.Container, ticker: TickerItem[], y: number): void {
    // Background bar
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRect(0, y, 670, 24);
    container.add(bg);

    // Build ticker text
    this.tickerContainer = this.scene.add.container(0, y + 2);
    container.add(this.tickerContainer);

    let x = 10;
    for (const item of ticker) {
      const dirColor = item.direction === 'up' ? '#4ecca3' : item.direction === 'down' ? '#ff4444' : '#a0a0b0';
      const arrow = item.direction === 'up' ? '+' : item.direction === 'down' ? '-' : '=';

      const text = this.scene.add.text(x, 0, `${item.fantasyName} ${arrow}${Math.abs(item.changePct).toFixed(1)}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: dirColor,
      });
      this.tickerContainer.add(text);
      x += text.width + 30;
    }

    // Animate ticker scroll if content is wider than panel
    if (x > 660) {
      this.tickerTween = this.scene.tweens.add({
        targets: this.tickerContainer,
        x: -x + 660,
        duration: x * 30,
        repeat: -1,
        yoyo: true,
        ease: 'Linear',
      });
    }
  }

  destroy(): void {
    this.tickerTween?.destroy();
    this.tickerTween = null;
    this.modal?.destroy();
    this.modal = null;
  }
}
