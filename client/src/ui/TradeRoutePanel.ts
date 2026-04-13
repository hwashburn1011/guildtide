/**
 * Trade route visualization and management panel.
 *
 * T-0578: Trade route system between regions
 * T-0579: Trade route visualization
 * T-0580: Trade route profit calculator
 * T-0581: Trade route risk system
 * T-0582: Caravan tracking with progress indicator
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';

interface TradeRouteData {
  id: string;
  fromRegion: string;
  toRegion: string;
  resource: string;
  quantity: number;
  departedAt: number;
  arrivesAt: number;
  risk: number;
  status: 'in_transit' | 'delivered' | 'lost';
}

export class TradeRoutePanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onRefresh: () => void;

  constructor(scene: Phaser.Scene, onRefresh: () => void) {
    this.scene = scene;
    this.onRefresh = onRefresh;
  }

  async show(): Promise<void> {
    if (this.modal) this.modal.destroy();

    this.modal = new UIModal(this.scene, {
      title: 'Trade Routes',
      width: 620,
      height: 500,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    this.modal.open();

    try {
      const routes: TradeRouteData[] = await apiClient.getTradeRoutes();
      this.renderRoutes(content, routes);
    } catch {
      content.add(
        this.scene.add.text(280, 60, 'Failed to load trade routes', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
        }).setOrigin(0.5),
      );
    }
  }

  private renderRoutes(container: Phaser.GameObjects.Container, routes: TradeRouteData[]): void {
    let y = 0;

    // Header
    container.add(
      this.scene.add.text(0, y, 'Active Caravans', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 28;

    if (routes.length === 0) {
      container.add(
        this.scene.add.text(0, y, 'No active trade routes. Launch one from the World Map!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }),
      );
      return;
    }

    // Table headers
    const cols = [0, 180, 280, 370, 460];
    ['Route', 'Cargo', 'Progress', 'Risk', 'ETA'].forEach((h, i) => {
      container.add(
        this.scene.add.text(cols[i], y, h, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          fontStyle: 'bold',
        }),
      );
    });
    y += 20;

    for (const route of routes) {
      this.renderRouteRow(container, route, y, cols);
      y += 50;
    }
  }

  private renderRouteRow(
    container: Phaser.GameObjects.Container,
    route: TradeRouteData,
    y: number,
    cols: number[],
  ): void {
    // Route path
    container.add(
      this.scene.add.text(cols[0], y, `${route.fromRegion} -> ${route.toRegion}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
      }),
    );

    // Cargo
    container.add(
      this.scene.add.text(cols[1], y, `${route.quantity}x ${route.resource}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      }),
    );

    // Progress bar
    const now = Date.now();
    const totalDuration = route.arrivesAt - route.departedAt;
    const elapsed = Math.min(now - route.departedAt, totalDuration);
    const progress = totalDuration > 0 ? elapsed / totalDuration : 1;

    const barWidth = 80;
    const barHeight = 12;
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x333355, 0.5);
    barBg.fillRoundedRect(cols[2], y + 3, barWidth, barHeight, 3);
    container.add(barBg);

    const barFill = this.scene.add.graphics();
    const fillColor = progress >= 1 ? 0x4ecca3 : 0x0f3460;
    barFill.fillStyle(fillColor, 0.8);
    barFill.fillRoundedRect(cols[2], y + 3, barWidth * progress, barHeight, 3);
    container.add(barFill);

    container.add(
      this.scene.add.text(cols[2] + barWidth / 2, y + 3 + barHeight / 2, `${Math.round(progress * 100)}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textPrimary,
      }).setOrigin(0.5),
    );

    // Risk level
    const riskPct = Math.round(route.risk * 100);
    const riskColor = riskPct > 15 ? '#ff4444' : riskPct > 10 ? '#f5a623' : '#4ecca3';
    container.add(
      this.scene.add.text(cols[3], y, `${riskPct}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: riskColor,
        fontStyle: 'bold',
      }),
    );

    // ETA
    const remaining = Math.max(0, route.arrivesAt - now);
    const minutes = Math.ceil(remaining / 60000);
    const etaStr = remaining <= 0 ? 'Arrived' : minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    container.add(
      this.scene.add.text(cols[4], y, etaStr, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: remaining <= 0 ? '#4ecca3' : COLORS.textSecondary,
      }),
    );

    // Caravan icon animation (simple dot moving along path)
    if (route.status === 'in_transit') {
      const iconX = cols[0] + progress * (cols[1] - cols[0] - 20);
      const icon = this.scene.add.text(iconX, y + 20, '\u{1F6B6}', {
        fontSize: `${FONTS.sizes.tiny}px`,
      });
      this.scene.tweens.add({
        targets: icon,
        x: icon.x + 5,
        duration: 1000,
        yoyo: true,
        repeat: -1,
      });
      container.add(icon);
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
