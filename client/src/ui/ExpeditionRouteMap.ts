/**
 * Expedition Route Map — visual route progress display showing
 * the expedition path with waypoints and encounter markers.
 *
 * T-0501: Expedition route visualization on world map
 * T-0502: Route waypoint system with encounter points marked
 * T-0503: Route progress animation showing party movement
 * T-0533: Map fog-of-war system
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { RouteWaypoint, Expedition } from '@shared/types';

const MAP_PADDING = 40;
const MAP_WIDTH = 540;
const MAP_HEIGHT = 280;

const WAYPOINT_COLORS: Record<string, number> = {
  start: 0x4ecca3,
  encounter: 0xf5a623,
  rest: 0x6eb5ff,
  boss: 0xe94560,
  destination: 0xffd700,
};

export class ExpeditionRouteMap {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private partyMarker: Phaser.GameObjects.Graphics | null = null;
  private progressTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
  }

  /**
   * Render the route map for an expedition with waypoints.
   */
  render(waypoints: RouteWaypoint[], progress: number, fogOfWar?: Record<string, boolean>): void {
    this.container.removeAll(true);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111122, 0.9);
    bg.fillRoundedRect(0, 0, MAP_WIDTH, MAP_HEIGHT, 8);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(0, 0, MAP_WIDTH, MAP_HEIGHT, 8);
    this.container.add(bg);

    // Title
    this.container.add(
      this.scene.add.text(MAP_WIDTH / 2, 12, 'Expedition Route', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }).setOrigin(0.5),
    );

    if (!waypoints || waypoints.length === 0) {
      this.container.add(
        this.scene.add.text(MAP_WIDTH / 2, MAP_HEIGHT / 2, 'No route data available', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5),
      );
      return;
    }

    // Draw route line
    const routeGraphics = this.scene.add.graphics();
    this.container.add(routeGraphics);

    const mapLeft = MAP_PADDING;
    const mapTop = 35;
    const mapRight = MAP_WIDTH - MAP_PADDING;
    const mapBottom = MAP_HEIGHT - 30;
    const mapW = mapRight - mapLeft;
    const mapH = mapBottom - mapTop;

    // Draw connecting lines
    routeGraphics.lineStyle(2, 0x334466, 0.6);
    routeGraphics.beginPath();
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const px = mapLeft + wp.x * mapW;
      const py = mapTop + wp.y * mapH;
      if (i === 0) {
        routeGraphics.moveTo(px, py);
      } else {
        routeGraphics.lineTo(px, py);
      }
    }
    routeGraphics.strokePath();

    // Draw reached path (highlighted)
    const reachedWaypoints = waypoints.filter(w => w.reached);
    if (reachedWaypoints.length > 1) {
      routeGraphics.lineStyle(3, 0x4ecca3, 0.8);
      routeGraphics.beginPath();
      for (let i = 0; i < reachedWaypoints.length; i++) {
        const wp = reachedWaypoints[i];
        const px = mapLeft + wp.x * mapW;
        const py = mapTop + wp.y * mapH;
        if (i === 0) {
          routeGraphics.moveTo(px, py);
        } else {
          routeGraphics.lineTo(px, py);
        }
      }
      routeGraphics.strokePath();
    }

    // Draw waypoint markers
    for (const wp of waypoints) {
      const px = mapLeft + wp.x * mapW;
      const py = mapTop + wp.y * mapH;
      const color = WAYPOINT_COLORS[wp.type] ?? 0xaaaaaa;
      const radius = wp.type === 'boss' ? 8 : wp.type === 'start' || wp.type === 'destination' ? 7 : 5;

      const marker = this.scene.add.graphics();
      marker.fillStyle(color, wp.reached ? 1 : 0.3);
      marker.fillCircle(px, py, radius);
      if (wp.reached) {
        marker.lineStyle(1, 0xffffff, 0.5);
        marker.strokeCircle(px, py, radius);
      }
      this.container.add(marker);

      // Waypoint label
      const label = this.scene.add.text(px, py + radius + 4, wp.name, {
        fontFamily: FONTS.primary,
        fontSize: '9px',
        color: wp.reached ? COLORS.textPrimary : COLORS.textSecondary,
      }).setOrigin(0.5, 0);
      this.container.add(label);

      // Encounter result indicator
      if (wp.encounterResult) {
        const resultColor = wp.encounterResult.outcome === 'success'
          ? '#4ecca3'
          : wp.encounterResult.outcome === 'partial'
            ? '#f5a623'
            : '#e94560';
        const resultIcon = wp.encounterResult.outcome === 'success' ? '+' : wp.encounterResult.outcome === 'partial' ? '~' : 'x';
        this.container.add(
          this.scene.add.text(px + radius + 2, py - radius, resultIcon, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: resultColor,
            fontStyle: 'bold',
          }),
        );
      }
    }

    // Party position marker (animated)
    if (progress < 1) {
      const currentX = mapLeft + progress * mapW;
      const currentY = mapTop + 0.5 * mapH;

      // Find interpolated position along waypoints
      let interpX = currentX;
      let interpY = currentY;
      if (waypoints.length >= 2) {
        const segIdx = Math.min(
          Math.floor(progress * (waypoints.length - 1)),
          waypoints.length - 2,
        );
        const segProgress = (progress * (waypoints.length - 1)) - segIdx;
        const wp1 = waypoints[segIdx];
        const wp2 = waypoints[segIdx + 1];
        interpX = mapLeft + (wp1.x + (wp2.x - wp1.x) * segProgress) * mapW;
        interpY = mapTop + (wp1.y + (wp2.y - wp1.y) * segProgress) * mapH;
      }

      this.partyMarker = this.scene.add.graphics();
      this.partyMarker.fillStyle(0xffffff, 1);
      this.partyMarker.fillCircle(interpX, interpY, 4);
      this.partyMarker.lineStyle(2, COLORS.gold);
      this.partyMarker.strokeCircle(interpX, interpY, 6);
      this.container.add(this.partyMarker);

      // Pulse animation
      this.progressTween = this.scene.tweens.add({
        targets: this.partyMarker,
        alpha: { from: 1, to: 0.4 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    }

    // Fog-of-war overlay for undiscovered areas (if applicable)
    if (fogOfWar) {
      const fogGraphics = this.scene.add.graphics();
      this.container.add(fogGraphics);
      // Draw subtle fog patches for unrevealed destinations
      for (const wp of waypoints) {
        if (wp.type === 'destination' && fogOfWar[wp.id] === false) {
          const px = mapLeft + wp.x * mapW;
          const py = mapTop + wp.y * mapH;
          fogGraphics.fillStyle(0x000000, 0.6);
          fogGraphics.fillCircle(px, py, 20);
          this.container.add(
            this.scene.add.text(px, py, '?', {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.small}px`,
              color: '#555555',
            }).setOrigin(0.5),
          );
        }
      }
    }

    // Progress label
    const progressPct = Math.round(progress * 100);
    this.container.add(
      this.scene.add.text(MAP_WIDTH / 2, MAP_HEIGHT - 15, `Progress: ${progressPct}%`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: progress >= 1 ? '#4ecca3' : COLORS.textSecondary,
      }).setOrigin(0.5),
    );
  }

  /**
   * Render a fog-of-war world map showing explored vs unexplored destinations.
   */
  renderFogOfWarMap(fogOfWar: Record<string, boolean>, destinations: any[]): void {
    this.container.removeAll(true);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111122, 0.9);
    bg.fillRoundedRect(0, 0, MAP_WIDTH, MAP_HEIGHT, 8);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(0, 0, MAP_WIDTH, MAP_HEIGHT, 8);
    this.container.add(bg);

    this.container.add(
      this.scene.add.text(MAP_WIDTH / 2, 12, 'World Exploration Map', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }).setOrigin(0.5),
    );

    const cols = 4;
    const rows = 2;
    const cellW = (MAP_WIDTH - 80) / cols;
    const cellH = (MAP_HEIGHT - 60) / rows;

    destinations.forEach((dest, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = 40 + col * cellW + cellW / 2;
      const cy = 40 + row * cellH + cellH / 2;
      const explored = fogOfWar[dest.id] ?? false;

      const g = this.scene.add.graphics();
      g.fillStyle(explored ? 0x1a2e4a : 0x0a0a15, 0.8);
      g.fillRoundedRect(cx - cellW / 2 + 3, cy - cellH / 2 + 3, cellW - 6, cellH - 6, 4);
      g.lineStyle(1, explored ? 0x4ecca3 : 0x333333);
      g.strokeRoundedRect(cx - cellW / 2 + 3, cy - cellH / 2 + 3, cellW - 6, cellH - 6, 4);
      this.container.add(g);

      if (explored) {
        this.container.add(
          this.scene.add.text(cx, cy - 8, dest.name, {
            fontFamily: FONTS.primary,
            fontSize: '9px',
            color: COLORS.textPrimary,
            wordWrap: { width: cellW - 16 },
            align: 'center',
          }).setOrigin(0.5),
        );
        this.container.add(
          this.scene.add.text(cx, cy + 10, `Diff: ${dest.difficulty}`, {
            fontFamily: FONTS.primary,
            fontSize: '8px',
            color: COLORS.textSecondary,
          }).setOrigin(0.5),
        );
      } else {
        this.container.add(
          this.scene.add.text(cx, cy, '???', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: '#333333',
          }).setOrigin(0.5),
        );
      }
    });

    const explored = Object.values(fogOfWar).filter(Boolean).length;
    const total = destinations.length;
    this.container.add(
      this.scene.add.text(MAP_WIDTH / 2, MAP_HEIGHT - 12, `Explored: ${explored}/${total}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      }).setOrigin(0.5),
    );
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    if (this.progressTween) {
      this.progressTween.destroy();
      this.progressTween = null;
    }
    this.container.removeAll(true);
    this.container.destroy();
  }
}
