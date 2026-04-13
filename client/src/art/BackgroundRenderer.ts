/**
 * BackgroundRenderer — Parallax backgrounds, sky gradients, ambient elements,
 * world map region visuals, combat backgrounds, and loading screens.
 *
 * T-1422: World map region illustrations (8 region artworks)
 * T-1423: World map terrain textures for each biome
 * T-1424: Minimap region thumbnails
 * T-1425: Loading screen illustrations (4 seasonal themed)
 * T-1426: Login page background artwork
 * T-1427: Guild hall background illustration with parallax layers
 * T-1434: Combat background illustrations for each biome
 * T-1444: Research tree branch decorations
 * T-1446: Tutorial illustration panels
 * T-1447: Empty state illustrations for lists and pages
 * T-1448: Error state illustrations (404, 500, offline)
 */
import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { BIOME_PALETTES, SEASON_PALETTES, darkenColor, lightenColor, lerpColor } from './ColorPalette';

interface ParallaxLayer {
  elements: Phaser.GameObjects.GameObject[];
  speed: number;
  y: number;
}

export class BackgroundRenderer {
  private scene: Phaser.Scene;
  private layers: ParallaxLayer[] = [];
  private skyGradient: Phaser.GameObjects.Graphics | null = null;
  private ambientElements: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Draw a sky gradient background.
   */
  drawSkyGradient(
    topColor: number,
    bottomColor: number,
    width: number = GAME_WIDTH,
    height: number = GAME_HEIGHT,
  ): Phaser.GameObjects.Graphics {
    if (this.skyGradient?.scene) this.skyGradient.destroy();

    this.skyGradient = this.scene.add.graphics().setDepth(-100);
    const steps = 32;
    const stripH = height / steps;

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const color = lerpColor(topColor, bottomColor, t);
      this.skyGradient.fillStyle(color, 1);
      this.skyGradient.fillRect(0, i * stripH, width, stripH + 1);
    }
    return this.skyGradient;
  }

  /**
   * Draw seasonal sky background with appropriate gradient.
   */
  drawSeasonalSky(season: string): Phaser.GameObjects.Graphics {
    const pal = SEASON_PALETTES[season] || SEASON_PALETTES.spring;
    return this.drawSkyGradient(pal.skyGradientTop, pal.skyGradientBottom);
  }

  /**
   * Create parallax background layers for guild hall.
   */
  createGuildHallParallax(season: string, biome: string = 'plains'): void {
    this.clearLayers();
    const biomePal = BIOME_PALETTES[biome] || BIOME_PALETTES.plains;
    const seasonPal = SEASON_PALETTES[season] || SEASON_PALETTES.spring;

    // Layer 0: Far mountains
    const farGfx = this.scene.add.graphics().setDepth(-90);
    farGfx.fillStyle(darkenColor(biomePal.primary, 0.3), 0.6);
    for (let i = 0; i < 6; i++) {
      const peakX = i * (GAME_WIDTH / 5) + Math.random() * 80;
      const peakY = GAME_HEIGHT * 0.3 + Math.random() * 40;
      const baseW = 200 + Math.random() * 150;
      farGfx.fillTriangle(peakX, peakY, peakX - baseW / 2, GAME_HEIGHT * 0.6, peakX + baseW / 2, GAME_HEIGHT * 0.6);
    }
    this.layers.push({ elements: [farGfx], speed: 0.1, y: 0 });

    // Layer 1: Mid hills
    const midGfx = this.scene.add.graphics().setDepth(-80);
    midGfx.fillStyle(darkenColor(biomePal.foliage, 0.5), 0.7);
    for (let i = 0; i < 8; i++) {
      const cx = i * (GAME_WIDTH / 6) + Math.random() * 60 - 30;
      const cy = GAME_HEIGHT * 0.5;
      const rx = 100 + Math.random() * 80;
      const ry = 30 + Math.random() * 20;
      midGfx.fillEllipse(cx, cy, rx * 2, ry * 2);
    }
    this.layers.push({ elements: [midGfx], speed: 0.3, y: 0 });

    // Layer 2: Foreground terrain
    const fgGfx = this.scene.add.graphics().setDepth(-70);
    fgGfx.fillStyle(biomePal.ground, 1);
    fgGfx.fillRect(0, GAME_HEIGHT * 0.65, GAME_WIDTH, GAME_HEIGHT * 0.35);

    // Grass/decoration on terrain
    fgGfx.fillStyle(biomePal.foliage, 0.8);
    for (let i = 0; i < 30; i++) {
      const gx = Math.random() * GAME_WIDTH;
      const gy = GAME_HEIGHT * 0.65 + Math.random() * 10;
      fgGfx.fillTriangle(gx, gy, gx - 4, gy + 8, gx + 4, gy + 8);
    }
    this.layers.push({ elements: [fgGfx], speed: 0.6, y: 0 });

    // Layer 3: Ambient (clouds, birds)
    this.createAmbientElements(seasonPal);
  }

  /**
   * Draw a world map region tile.
   */
  drawRegionTile(
    gfx: Phaser.GameObjects.Graphics,
    biome: string,
    x: number,
    y: number,
    w: number,
    h: number,
    highlighted: boolean = false,
  ): void {
    const pal = BIOME_PALETTES[biome] || BIOME_PALETTES.plains;

    // Base terrain
    gfx.fillStyle(pal.ground, 1);
    gfx.fillRoundedRect(x, y, w, h, 4);

    // Terrain texture pattern
    gfx.fillStyle(pal.secondary, 0.3);
    for (let i = 0; i < 6; i++) {
      const tx = x + 4 + Math.random() * (w - 8);
      const ty = y + 4 + Math.random() * (h - 8);
      gfx.fillCircle(tx, ty, 3 + Math.random() * 5);
    }

    // Biome-specific features
    switch (biome) {
      case 'forest':
        gfx.fillStyle(pal.foliage, 0.6);
        for (let i = 0; i < 5; i++) {
          const tx = x + 10 + Math.random() * (w - 20);
          const ty = y + 10 + Math.random() * (h - 20);
          gfx.fillTriangle(tx, ty - 8, tx - 6, ty + 4, tx + 6, ty + 4);
        }
        break;
      case 'desert':
        gfx.fillStyle(pal.accent, 0.4);
        for (let i = 0; i < 3; i++) {
          const tx = x + 10 + Math.random() * (w - 20);
          const ty = y + h * 0.5 + Math.random() * (h * 0.3);
          gfx.fillEllipse(tx, ty, 20, 8);
        }
        break;
      case 'tundra':
        gfx.fillStyle(0xffffff, 0.3);
        for (let i = 0; i < 8; i++) {
          const tx = x + Math.random() * w;
          const ty = y + Math.random() * h;
          gfx.fillCircle(tx, ty, 2);
        }
        break;
      case 'volcanic':
        gfx.fillStyle(0xff4500, 0.4);
        const cx = x + w / 2;
        const cy = y + h * 0.4;
        gfx.fillTriangle(cx, cy - 12, cx - 10, cy + 8, cx + 10, cy + 8);
        break;
      case 'coastal':
        gfx.fillStyle(pal.water, 0.5);
        gfx.fillRect(x, y + h * 0.7, w, h * 0.3);
        break;
      case 'mountain':
        gfx.fillStyle(pal.secondary, 0.5);
        for (let i = 0; i < 3; i++) {
          const mx = x + 8 + i * (w - 16) / 2;
          const my = y + h * 0.3;
          gfx.fillTriangle(mx, my, mx - 12, y + h * 0.7, mx + 12, y + h * 0.7);
        }
        break;
      case 'swamp':
        gfx.fillStyle(pal.water, 0.4);
        for (let i = 0; i < 4; i++) {
          gfx.fillEllipse(x + 10 + Math.random() * (w - 20), y + 10 + Math.random() * (h - 20), 15, 6);
        }
        break;
    }

    // Water feature
    if (biome !== 'desert' && biome !== 'volcanic') {
      gfx.fillStyle(pal.water, 0.3);
      gfx.fillEllipse(x + w * 0.7, y + h * 0.6, 12, 5);
    }

    // Highlight border
    if (highlighted) {
      gfx.lineStyle(3, 0xffd700, 0.9);
      gfx.strokeRoundedRect(x, y, w, h, 4);
    } else {
      gfx.lineStyle(1, lightenColor(pal.primary, 0.2), 0.5);
      gfx.strokeRoundedRect(x, y, w, h, 4);
    }
  }

  /**
   * Draw a minimap region thumbnail.
   */
  drawMinimapRegion(
    gfx: Phaser.GameObjects.Graphics,
    biome: string,
    x: number,
    y: number,
    size: number,
    active: boolean = false,
  ): void {
    const pal = BIOME_PALETTES[biome] || BIOME_PALETTES.plains;
    gfx.fillStyle(pal.primary, active ? 1 : 0.5);
    gfx.fillCircle(x, y, size / 2);
    if (active) {
      gfx.lineStyle(2, 0xffd700, 0.9);
      gfx.strokeCircle(x, y, size / 2 + 2);
    }
  }

  /**
   * Draw a combat background for a biome.
   */
  drawCombatBackground(
    gfx: Phaser.GameObjects.Graphics,
    biome: string,
    width: number = GAME_WIDTH,
    height: number = GAME_HEIGHT,
  ): void {
    const pal = BIOME_PALETTES[biome] || BIOME_PALETTES.plains;

    // Sky
    const steps = 16;
    const stripH = height * 0.6 / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const color = lerpColor(pal.sky, darkenColor(pal.sky, 0.6), t);
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, i * stripH, width, stripH + 1);
    }

    // Ground
    gfx.fillStyle(pal.ground, 1);
    gfx.fillRect(0, height * 0.6, width, height * 0.4);

    // Ground line detail
    gfx.lineStyle(2, lightenColor(pal.ground, 0.2), 0.5);
    gfx.lineBetween(0, height * 0.6, width, height * 0.6);

    // Biome decoration
    gfx.fillStyle(pal.foliage, 0.4);
    for (let i = 0; i < 10; i++) {
      const dx = Math.random() * width;
      const dy = height * 0.6 + Math.random() * 20;
      gfx.fillCircle(dx, dy, 3 + Math.random() * 5);
    }
  }

  /**
   * Draw a loading screen for a season.
   */
  drawLoadingScreen(
    season: string,
    width: number = GAME_WIDTH,
    height: number = GAME_HEIGHT,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0).setDepth(1000);
    const pal = SEASON_PALETTES[season] || SEASON_PALETTES.spring;

    // Background gradient
    const gfx = this.scene.add.graphics();
    const steps = 20;
    const stripH = height / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const color = lerpColor(pal.skyGradientTop, pal.skyGradientBottom, t);
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, i * stripH, width, stripH + 1);
    }
    container.add(gfx);

    // Season icon
    const seasonIcons: Record<string, string> = { spring: '🌱', summer: '☀', autumn: '🍂', winter: '❄' };
    const icon = this.scene.add.text(width / 2, height * 0.35, seasonIcons[season] || '⏳', {
      fontFamily: 'Arial',
      fontSize: '64px',
    }).setOrigin(0.5);
    container.add(icon);

    // Loading text
    const loadText = this.scene.add.text(width / 2, height * 0.55, 'Loading...', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(loadText);

    // Animated dots
    this.scene.tweens.add({
      targets: loadText,
      alpha: 0.3,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    return container;
  }

  /**
   * Draw login page background.
   */
  drawLoginBackground(width: number = GAME_WIDTH, height: number = GAME_HEIGHT): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0).setDepth(-100);

    const gfx = this.scene.add.graphics();
    // Dark gradient
    const steps = 24;
    const stripH = height / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const color = lerpColor(0x0a0a1e, 0x1a1a3e, t);
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, i * stripH, width, stripH + 1);
    }

    // Decorative stars
    gfx.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 60; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height * 0.6;
      gfx.fillCircle(sx, sy, 0.5 + Math.random() * 1.5);
    }

    // Castle silhouette
    gfx.fillStyle(0x111122, 1);
    // Main tower
    gfx.fillRect(width * 0.35, height * 0.5, width * 0.06, height * 0.3);
    gfx.fillRect(width * 0.59, height * 0.5, width * 0.06, height * 0.3);
    // Wall
    gfx.fillRect(width * 0.38, height * 0.6, width * 0.24, height * 0.2);
    // Battlements
    for (let i = 0; i < 5; i++) {
      gfx.fillRect(width * 0.38 + i * width * 0.05, height * 0.56, width * 0.03, height * 0.05);
    }
    // Gate
    gfx.fillStyle(0x080810, 1);
    gfx.fillRoundedRect(width * 0.47, height * 0.65, width * 0.06, height * 0.15, { tl: 10, tr: 10, bl: 0, br: 0 });

    // Ground
    gfx.fillStyle(0x0a0a1a, 1);
    gfx.fillRect(0, height * 0.8, width, height * 0.2);

    container.add(gfx);
    return container;
  }

  /**
   * Draw research tree branch decorations.
   */
  drawResearchBranch(
    gfx: Phaser.GameObjects.Graphics,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    unlocked: boolean,
    color: number = 0x4dabf7,
  ): void {
    const lineColor = unlocked ? color : 0x333344;
    const alpha = unlocked ? 0.8 : 0.3;

    gfx.lineStyle(3, lineColor, alpha);
    // Curved connection
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2 - 15;
    gfx.beginPath();
    gfx.moveTo(fromX, fromY);
    // Approximate bezier with line segments
    for (let t = 0; t <= 1; t += 0.1) {
      const px = (1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * midX + t * t * toX;
      const py = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * midY + t * t * toY;
      gfx.lineTo(px, py);
    }
    gfx.strokePath();

    // Decorative dots along branch
    if (unlocked) {
      for (let t = 0.2; t <= 0.8; t += 0.3) {
        const px = (1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * midX + t * t * toX;
        const py = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * midY + t * t * toY;
        gfx.fillStyle(color, 0.6);
        gfx.fillCircle(px, py, 2);
      }
    }
  }

  /**
   * Draw empty state illustration.
   */
  drawEmptyState(
    x: number,
    y: number,
    type: 'list' | 'search' | 'inventory' | 'quest',
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const gfx = this.scene.add.graphics();

    const iconMap = { list: '📋', search: '🔍', inventory: '🎒', quest: '🗺' };
    const msgMap = {
      list: 'Nothing here yet',
      search: 'No results found',
      inventory: 'Your inventory is empty',
      quest: 'No quests available',
    };

    // Circle bg
    gfx.fillStyle(COLORS.panelBg, 0.5);
    gfx.fillCircle(0, -15, 35);
    gfx.lineStyle(2, COLORS.panelBorder, 0.3);
    gfx.strokeCircle(0, -15, 35);
    container.add(gfx);

    const icon = this.scene.add.text(0, -20, iconMap[type], {
      fontFamily: 'Arial', fontSize: '32px',
    }).setOrigin(0.5);
    container.add(icon);

    const msg = this.scene.add.text(0, 25, msgMap[type], {
      fontFamily: 'Arial', fontSize: '14px', color: COLORS.textSecondary,
    }).setOrigin(0.5);
    container.add(msg);

    return container;
  }

  /**
   * Draw error state illustration.
   */
  drawErrorState(
    x: number,
    y: number,
    type: '404' | '500' | 'offline',
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const gfx = this.scene.add.graphics();

    const iconMap = { '404': '🔍', '500': '⚠', offline: '📡' };
    const titleMap = { '404': 'Page Not Found', '500': 'Server Error', offline: 'You\'re Offline' };
    const msgMap = {
      '404': 'The page you\'re looking for doesn\'t exist.',
      '500': 'Something went wrong on our end.',
      offline: 'Check your connection and try again.',
    };
    const colorMap = { '404': 0x4dabf7, '500': 0xe94560, offline: 0xf5a623 };

    gfx.fillStyle(colorMap[type], 0.15);
    gfx.fillCircle(0, -20, 45);
    gfx.lineStyle(2, colorMap[type], 0.4);
    gfx.strokeCircle(0, -20, 45);
    container.add(gfx);

    container.add(this.scene.add.text(0, -25, iconMap[type], {
      fontFamily: 'Arial', fontSize: '40px',
    }).setOrigin(0.5));

    container.add(this.scene.add.text(0, 30, titleMap[type], {
      fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));

    container.add(this.scene.add.text(0, 55, msgMap[type], {
      fontFamily: 'Arial', fontSize: '13px', color: COLORS.textSecondary,
    }).setOrigin(0.5));

    return container;
  }

  /**
   * Draw tutorial illustration panel.
   */
  drawTutorialPanel(
    x: number,
    y: number,
    step: number,
    width: number = 300,
    height: number = 180,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const gfx = this.scene.add.graphics();

    const stepIcons = ['🏰', '⚔', '🛒', '🗺', '🏆'];
    const stepTitles = ['Build Your Guild', 'Train Heroes', 'Trade Goods', 'Explore the World', 'Claim Victory'];

    gfx.fillStyle(COLORS.panelBg, 0.95);
    gfx.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    gfx.lineStyle(2, COLORS.panelBorder, 0.8);
    gfx.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    container.add(gfx);

    const idx = step % stepIcons.length;
    container.add(this.scene.add.text(0, -height * 0.15, stepIcons[idx], {
      fontFamily: 'Arial', fontSize: '48px',
    }).setOrigin(0.5));

    container.add(this.scene.add.text(0, height * 0.2, stepTitles[idx], {
      fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));

    // Step indicator dots
    for (let i = 0; i < stepIcons.length; i++) {
      const dotGfx = this.scene.add.graphics();
      dotGfx.fillStyle(i === idx ? 0xffd700 : 0x444455, i === idx ? 1 : 0.5);
      dotGfx.fillCircle(-20 + i * 10, height * 0.35, 3);
      container.add(dotGfx);
    }

    return container;
  }

  private createAmbientElements(seasonPal: { particleColors: number[] }): void {
    if (this.ambientElements?.scene) this.ambientElements.destroy();
    this.ambientElements = this.scene.add.container(0, 0).setDepth(-60);

    // Clouds
    const gfx = this.scene.add.graphics();
    for (let i = 0; i < 5; i++) {
      const cx = Math.random() * GAME_WIDTH;
      const cy = 30 + Math.random() * 80;
      gfx.fillStyle(0xffffff, 0.2 + Math.random() * 0.15);
      gfx.fillEllipse(cx, cy, 60 + Math.random() * 40, 20 + Math.random() * 10);
      gfx.fillEllipse(cx + 20, cy - 5, 40 + Math.random() * 20, 15 + Math.random() * 8);
    }
    this.ambientElements.add(gfx);
  }

  clearLayers(): void {
    for (const layer of this.layers) {
      for (const el of layer.elements) {
        if ((el as any).scene) (el as any).destroy();
      }
    }
    this.layers = [];
    if (this.ambientElements?.scene) this.ambientElements.destroy();
    this.ambientElements = null;
  }

  destroy(): void {
    this.clearLayers();
    if (this.skyGradient?.scene) this.skyGradient.destroy();
  }
}
