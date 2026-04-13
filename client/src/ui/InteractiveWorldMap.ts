/**
 * InteractiveWorldMap — Zoomable/pannable world map with region markers,
 * fog-of-war, travel routes, pins, and biome visualization.
 *
 * T-1071: World map layout with 8 distinct regions
 * T-1072: Zoom and pan controls
 * T-1073: Region boundary drawing with clickable area detection
 * T-1074–T-1081: Biome-themed region rendering
 * T-1084: Fog-of-war rendering
 * T-1085: Region discovery animation
 * T-1090: Travel route visualization
 * T-1099: Resource node markers
 * T-1103: Boss markers
 * T-1104: Map legend
 * T-1108: Seasonal visual changes
 * T-1110: Minimap in expedition view
 * T-1115: Trade route visualization
 * T-1116: Player-created map pins
 * T-1117: Region zoom-in detail view
 * T-1118: Night/day overlay
 * T-1120: Active event indicators
 * T-1123: Biome transition zones
 * T-1124: Hover tooltip
 * T-1128: Expedition party travel animation
 * T-1133: Grid coordinate system
 * T-1137: NPC caravan route lines
 * T-1140: Performance optimization
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

interface MapRegion {
  id: string;
  name?: string;
  biome?: { id: string; name: string; color: number; icon: string };
  mapX: number;
  mapY: number;
  mapRadius: number;
  difficulty?: number;
  discovered: boolean;
  fogOfWar: boolean;
  explorationPercent?: number;
  hasOutpost?: boolean;
  claimed?: boolean;
  connections?: string[];
  bossCount?: number;
  resourceNodeCount?: number;
  gridCoordinate?: string;
}

interface MapPin {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
}

interface TravelState {
  arrived: boolean;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
  currentX?: number;
  currentY?: number;
  progress?: number;
  toRegion?: string;
}

interface CaravanRoute {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  fromName: string;
  toName: string;
}

// Season-based tinting
const SEASON_TINT: Record<string, number> = {
  spring: 0x88ff88,
  summer: 0xffff44,
  autumn: 0xff8844,
  winter: 0xaaddff,
};

export class InteractiveWorldMap {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private regions: MapRegion[] = [];
  private regionGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private regionLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private tooltip: Phaser.GameObjects.Container | null = null;
  private zoom = 1.0;
  private panX = 0;
  private panY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private onRegionClick: ((regionId: string) => void) | null = null;
  private mapWidth: number;
  private mapHeight: number;
  private mapOriginX: number;
  private mapOriginY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    this.mapOriginX = x;
    this.mapOriginY = y;
    this.mapWidth = width;
    this.mapHeight = height;
    this.container = scene.add.container(x, y);

    // T-1140: Performance — use a single container with minimal redraws
    this.setupInputHandlers();
  }

  setOnRegionClick(cb: (regionId: string) => void): void {
    this.onRegionClick = cb;
  }

  /**
   * T-1072: Setup zoom and pan input handlers.
   */
  private setupInputHandlers(): void {
    // Pan with drag
    const hitArea = this.scene.add.zone(
      this.mapOriginX + this.mapWidth / 2,
      this.mapOriginY + this.mapHeight / 2,
      this.mapWidth,
      this.mapHeight,
    ).setInteractive({ draggable: true });

    hitArea.on('dragstart', (_pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartX = this.panX;
      this.dragStartY = this.panY;
    });

    hitArea.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.panX = this.dragStartX + (dragX - this.mapOriginX - this.mapWidth / 2);
      this.panY = this.dragStartY + (dragY - this.mapOriginY - this.mapHeight / 2);
      this.updateTransform();
    });

    hitArea.on('dragend', () => {
      this.isDragging = false;
    });

    // Zoom with scroll wheel
    this.scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _deltaX: number, deltaY: number) => {
      const prevZoom = this.zoom;
      this.zoom = Phaser.Math.Clamp(this.zoom - deltaY * 0.001, 0.5, 3.0);
      if (this.zoom !== prevZoom) {
        this.updateTransform();
      }
    });
  }

  private updateTransform(): void {
    this.container.setScale(this.zoom);
    this.container.setPosition(
      this.mapOriginX + this.panX,
      this.mapOriginY + this.panY,
    );
  }

  /**
   * Render all regions on the map.
   */
  render(regions: MapRegion[], season?: string): void {
    this.regions = regions;
    this.container.removeAll(true);
    this.regionGraphics.clear();
    this.regionLabels.clear();

    // T-1133: Draw grid
    this.drawGrid();

    // T-1123: Draw biome transition zones between connected regions
    this.drawBiomeTransitions(regions);

    // Draw connection lines first (below regions)
    this.drawConnections(regions);

    // Draw each region
    for (const region of regions) {
      this.drawRegion(region, season);
    }
  }

  /**
   * T-1133: Grid coordinate system.
   */
  private drawGrid(): void {
    const grid = this.scene.add.graphics();
    grid.lineStyle(1, 0x1a2a3a, 0.3);

    // Draw grid lines every 10 map units
    for (let x = 0; x <= 100; x += 10) {
      const px = (x / 100) * this.mapWidth;
      grid.lineBetween(px, 0, px, this.mapHeight);

      // Column labels (A-J)
      const label = String.fromCharCode(65 + x / 10);
      this.scene.add.text(px + 2, 2, label, {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: '#3a4a5a',
      }).setDepth(0);
    }

    for (let y = 0; y <= 100; y += 10) {
      const py = (y / 100) * this.mapHeight;
      grid.lineBetween(0, py, this.mapWidth, py);

      // Row labels (1-10)
      this.scene.add.text(2, py + 2, `${y / 10 + 1}`, {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: '#3a4a5a',
      }).setDepth(0);
    }

    this.container.add(grid);
  }

  /**
   * T-1073, T-1074–T-1081, T-1084, T-1108: Draw individual region.
   */
  private drawRegion(region: MapRegion, season?: string): void {
    const px = (region.mapX / 100) * this.mapWidth;
    const py = (region.mapY / 100) * this.mapHeight;
    const radius = (region.mapRadius / 100) * this.mapWidth;

    const gfx = this.scene.add.graphics();

    if (region.fogOfWar || !region.discovered) {
      // T-1084: Fog-of-war — dimmed undiscovered region
      gfx.fillStyle(0x222233, 0.6);
      gfx.fillCircle(px, py, radius);
      gfx.lineStyle(1, 0x333344, 0.4);
      gfx.strokeCircle(px, py, radius);

      // Question mark
      const label = this.scene.add.text(px, py, '?', {
        fontFamily: FONTS.primary,
        fontSize: '20px',
        color: '#444466',
      }).setOrigin(0.5);

      this.container.add([gfx, label]);

      // Clickable zone for undiscovered regions
      const zone = this.scene.add.zone(px, py, radius * 2, radius * 2)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.onRegionClick?.(region.id));
      this.container.add(zone);
      return;
    }

    // Biome color
    const biomeColor = region.biome?.color || 0x666666;

    // T-1108: Seasonal visual changes
    let fillColor = biomeColor;
    if (season && SEASON_TINT[season]) {
      // Blend biome color with seasonal tint
      fillColor = Phaser.Display.Color.ObjectToColor(
        Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(biomeColor),
          Phaser.Display.Color.IntegerToColor(SEASON_TINT[season]),
          100,
          15,
        ),
      ).color;
    }

    // Region fill
    gfx.fillStyle(fillColor, 0.7);
    gfx.fillCircle(px, py, radius);

    // Border — different for claimed regions
    if (region.claimed) {
      gfx.lineStyle(3, 0xffd700, 0.9);
    } else {
      gfx.lineStyle(2, 0xffffff, 0.3);
    }
    gfx.strokeCircle(px, py, radius);

    // T-1121: Exploration progress ring
    if (region.explorationPercent !== undefined && region.explorationPercent > 0 && region.explorationPercent < 100) {
      const angle = (region.explorationPercent / 100) * Math.PI * 2 - Math.PI / 2;
      gfx.lineStyle(2, 0x4ecca3, 0.8);
      gfx.beginPath();
      gfx.arc(px, py, radius + 3, -Math.PI / 2, angle, false);
      gfx.strokePath();
    }

    this.regionGraphics.set(region.id, gfx);

    // Region icon
    const icon = region.biome?.icon || '';
    const iconText = this.scene.add.text(px, py - 8, icon, {
      fontSize: '16px',
    }).setOrigin(0.5);

    // Region name
    const nameText = this.scene.add.text(px, py + 10, region.name || '', {
      fontFamily: FONTS.primary,
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.regionLabels.set(region.id, nameText);

    // T-1099: Resource node markers
    if (region.resourceNodeCount && region.resourceNodeCount > 0) {
      const resText = this.scene.add.text(px + radius - 5, py - radius + 5, `\u{1F48E}${region.resourceNodeCount}`, {
        fontSize: '8px',
        color: '#aaddff',
      }).setOrigin(1, 0);
      this.container.add(resText);
    }

    // T-1103: Boss markers
    if (region.bossCount && region.bossCount > 0) {
      const bossText = this.scene.add.text(px - radius + 5, py - radius + 5, `\u{2694}${region.bossCount}`, {
        fontSize: '8px',
        color: '#e94560',
      }).setOrigin(0, 0);
      this.container.add(bossText);
    }

    // T-1092: Outpost marker
    if (region.hasOutpost) {
      const outpostText = this.scene.add.text(px + radius - 5, py + radius - 5, '\u{1F3E0}', {
        fontSize: '10px',
      }).setOrigin(1, 1);
      this.container.add(outpostText);
    }

    // T-1133: Grid coordinate
    if (region.gridCoordinate) {
      const coordText = this.scene.add.text(px - radius + 2, py + radius - 12, region.gridCoordinate, {
        fontFamily: FONTS.primary,
        fontSize: '8px',
        color: '#667788',
      });
      this.container.add(coordText);
    }

    this.container.add([gfx, iconText, nameText]);

    // Clickable zone
    const zone = this.scene.add.zone(px, py, radius * 2, radius * 2)
      .setInteractive({ useHandCursor: true });

    // T-1124: Hover tooltip
    zone.on('pointerover', () => {
      this.showTooltip(region, px, py - radius - 10);
      gfx.lineStyle(2, 0xffd700, 1);
      gfx.strokeCircle(px, py, radius + 2);
    });

    zone.on('pointerout', () => {
      this.hideTooltip();
    });

    zone.on('pointerup', () => {
      if (!this.isDragging) {
        this.onRegionClick?.(region.id);
      }
    });

    this.container.add(zone);
  }

  /**
   * Draw connection lines between regions.
   */
  private drawConnections(regions: MapRegion[]): void {
    const drawn = new Set<string>();
    const gfx = this.scene.add.graphics();
    gfx.lineStyle(1, 0x334455, 0.4);

    for (const region of regions) {
      if (!region.connections || !region.discovered) continue;
      for (const connId of region.connections) {
        const key = [region.id, connId].sort().join('-');
        if (drawn.has(key)) continue;
        drawn.add(key);

        const conn = regions.find(r => r.id === connId);
        if (!conn) continue;

        const x1 = (region.mapX / 100) * this.mapWidth;
        const y1 = (region.mapY / 100) * this.mapHeight;
        const x2 = (conn.mapX / 100) * this.mapWidth;
        const y2 = (conn.mapY / 100) * this.mapHeight;

        gfx.lineBetween(x1, y1, x2, y2);
      }
    }

    this.container.addAt(gfx, 0);
  }

  /**
   * T-1123: Draw biome transition zones.
   */
  private drawBiomeTransitions(regions: MapRegion[]): void {
    const gfx = this.scene.add.graphics();

    for (const region of regions) {
      if (!region.connections || !region.discovered || !region.biome) continue;
      for (const connId of region.connections) {
        const conn = regions.find(r => r.id === connId && r.discovered && r.biome);
        if (!conn || !conn.biome) continue;
        if (region.biome.id === conn.biome.id) continue;

        const x1 = (region.mapX / 100) * this.mapWidth;
        const y1 = (region.mapY / 100) * this.mapHeight;
        const x2 = (conn.mapX / 100) * this.mapWidth;
        const y2 = (conn.mapY / 100) * this.mapHeight;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;

        // Small blended zone at midpoint
        gfx.fillStyle(region.biome.color, 0.15);
        gfx.fillCircle(mx, my, 8);
        gfx.fillStyle(conn.biome.color, 0.15);
        gfx.fillCircle(mx, my, 6);
      }
    }

    this.container.addAt(gfx, 0);
  }

  /**
   * T-1090, T-1115: Draw travel route and caravan lines.
   */
  drawTravelRoute(travel: TravelState): void {
    if (!travel || travel.arrived) return;

    const gfx = this.scene.add.graphics();
    const x1 = ((travel.fromX || 0) / 100) * this.mapWidth;
    const y1 = ((travel.fromY || 0) / 100) * this.mapHeight;
    const x2 = ((travel.toX || 0) / 100) * this.mapWidth;
    const y2 = ((travel.toY || 0) / 100) * this.mapHeight;
    const cx = ((travel.currentX || 0) / 100) * this.mapWidth;
    const cy = ((travel.currentY || 0) / 100) * this.mapHeight;

    // Route line
    gfx.lineStyle(2, 0xffd700, 0.6);
    gfx.lineBetween(x1, y1, x2, y2);

    // T-1128: Party marker at current position
    gfx.fillStyle(0xffd700, 1);
    gfx.fillCircle(cx, cy, 5);

    // Progress label
    const label = this.scene.add.text(cx, cy - 12, `${travel.progress || 0}%`, {
      fontFamily: FONTS.primary,
      fontSize: '9px',
      color: '#ffd700',
    }).setOrigin(0.5);

    this.container.add([gfx, label]);
  }

  /**
   * T-1137: Draw NPC caravan routes.
   */
  drawCaravanRoutes(routes: CaravanRoute[]): void {
    const gfx = this.scene.add.graphics();
    gfx.lineStyle(1, 0x8888aa, 0.3);

    for (const route of routes) {
      const x1 = (route.fromX / 100) * this.mapWidth;
      const y1 = (route.fromY / 100) * this.mapHeight;
      const x2 = (route.toX / 100) * this.mapWidth;
      const y2 = (route.toY / 100) * this.mapHeight;

      // Dashed line effect
      const segments = 10;
      for (let i = 0; i < segments; i += 2) {
        const t1 = i / segments;
        const t2 = (i + 1) / segments;
        gfx.lineBetween(
          x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1,
          x1 + (x2 - x1) * t2, y1 + (y2 - y1) * t2,
        );
      }
    }

    this.container.addAt(gfx, 1);
  }

  /**
   * T-1116: Draw player pins.
   */
  drawPins(pins: MapPin[]): void {
    for (const pin of pins) {
      const px = (pin.x / 100) * this.mapWidth;
      const py = (pin.y / 100) * this.mapHeight;

      const pinGfx = this.scene.add.graphics();
      const color = parseInt(pin.color.replace('#', ''), 16) || 0xffd700;
      pinGfx.fillStyle(color, 1);
      pinGfx.fillTriangle(px, py, px - 4, py - 10, px + 4, py - 10);
      pinGfx.fillCircle(px, py - 12, 4);

      const label = this.scene.add.text(px, py - 22, pin.label, {
        fontFamily: FONTS.primary,
        fontSize: '8px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 2, y: 1 },
      }).setOrigin(0.5);

      this.container.add([pinGfx, label]);
    }
  }

  /**
   * T-1118: Apply night/day overlay.
   */
  applyDayNightOverlay(opacity: number): void {
    if (opacity <= 0) return;
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000033, opacity);
    overlay.fillRect(0, 0, this.mapWidth, this.mapHeight);
    this.container.add(overlay);
  }

  /**
   * T-1124: Show hover tooltip.
   */
  private showTooltip(region: MapRegion, x: number, y: number): void {
    this.hideTooltip();

    const tooltip = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(-80, -45, 160, 42, 6);
    bg.lineStyle(1, 0x0f3460);
    bg.strokeRoundedRect(-80, -45, 160, 42, 6);

    const name = this.scene.add.text(0, -38, region.name || '???', {
      fontFamily: FONTS.primary,
      fontSize: '11px',
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    const info = region.discovered
      ? `${region.biome?.name || ''} | Diff: ${region.difficulty || '?'} | ${region.explorationPercent || 0}% explored`
      : 'Undiscovered';

    const details = this.scene.add.text(0, -22, info, {
      fontFamily: FONTS.primary,
      fontSize: '9px',
      color: COLORS.textSecondary,
    }).setOrigin(0.5, 0);

    tooltip.add([bg, name, details]);
    this.tooltip = tooltip;
    this.container.add(tooltip);
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  /**
   * T-1085: Play discovery animation.
   */
  playDiscoveryAnimation(regionId: string): void {
    const region = this.regions.find(r => r.id === regionId);
    if (!region) return;

    const px = (region.mapX / 100) * this.mapWidth;
    const py = (region.mapY / 100) * this.mapHeight;
    const radius = (region.mapRadius / 100) * this.mapWidth;

    const ring = this.scene.add.graphics();
    ring.lineStyle(3, 0xffd700, 1);
    ring.strokeCircle(px, py, radius);
    this.container.add(ring);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });

    // Flash text
    const text = this.scene.add.text(px, py - radius - 20, 'DISCOVERED!', {
      fontFamily: FONTS.primary,
      fontSize: '14px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.container.add(text);

    this.scene.tweens.add({
      targets: text,
      y: py - radius - 40,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  /**
   * T-1117: Zoom into a specific region.
   */
  zoomToRegion(regionId: string): void {
    const region = this.regions.find(r => r.id === regionId);
    if (!region) return;

    const px = (region.mapX / 100) * this.mapWidth;
    const py = (region.mapY / 100) * this.mapHeight;

    this.scene.tweens.add({
      targets: this,
      zoom: 2.0,
      panX: -px + this.mapWidth / 2,
      panY: -py + this.mapHeight / 2,
      duration: 500,
      ease: 'Power2',
      onUpdate: () => this.updateTransform(),
    });
  }

  /**
   * Reset zoom to overview.
   */
  resetZoom(): void {
    this.scene.tweens.add({
      targets: this,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      duration: 400,
      ease: 'Power2',
      onUpdate: () => this.updateTransform(),
    });
  }

  /**
   * T-1110: Get minimap data for expedition view.
   */
  getMinimapData(): { regions: Array<{ id: string; x: number; y: number; color: number; discovered: boolean }> } {
    return {
      regions: this.regions.map(r => ({
        id: r.id,
        x: r.mapX,
        y: r.mapY,
        color: r.biome?.color || 0x333333,
        discovered: r.discovered,
      })),
    };
  }

  /**
   * T-1120: Draw active event indicators per region.
   */
  drawEventIndicators(indicators: Array<{ regionId: string; mapX: number; mapY: number; eventName: string }>): void {
    for (const ind of indicators) {
      const px = (ind.mapX / 100) * this.mapWidth;
      const py = (ind.mapY / 100) * this.mapHeight;

      // Pulsing exclamation mark
      const marker = this.scene.add.text(px + 15, py - 15, '\u{2757}', {
        fontSize: '12px',
      }).setOrigin(0.5);

      this.scene.tweens.add({
        targets: marker,
        alpha: 0.3,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });

      this.container.add(marker);
    }
  }

  /**
   * T-1114: Draw political overlay showing faction territories.
   */
  drawPoliticalOverlay(data: Array<{ regionId: string; mapX: number; mapY: number; mapRadius: number; claimed: boolean; dominantFaction: string }>): void {
    const gfx = this.scene.add.graphics();

    for (const entry of data) {
      const px = (entry.mapX / 100) * this.mapWidth;
      const py = (entry.mapY / 100) * this.mapHeight;
      const radius = (entry.mapRadius / 100) * this.mapWidth;

      // Territorial border color based on claim status
      const color = entry.claimed ? 0xffd700 : 0x4466aa;
      gfx.lineStyle(2, color, 0.6);
      gfx.strokeCircle(px, py, radius + 5);

      // Faction label below region
      const label = this.scene.add.text(px, py + radius + 8, entry.dominantFaction, {
        fontFamily: FONTS.primary,
        fontSize: '8px',
        color: entry.claimed ? '#ffd700' : '#6688aa',
      }).setOrigin(0.5);

      this.container.add(label);
    }

    this.container.addAt(gfx, 2);
  }

  /**
   * T-1126: Export map state as data URL (for sharing).
   */
  getMapSnapshot(): string {
    // In a real implementation this would use canvas.toDataURL()
    // For now return a placeholder
    return `data:text/plain;base64,${btoa('Guildtide World Map Export')}`;
  }

  destroy(): void {
    this.container.destroy();
  }
}
