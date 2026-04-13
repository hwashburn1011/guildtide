/**
 * SpriteGenerator — Procedural sprite creation for buildings, heroes, items,
 * enemies, NPCs, and seasonal decorations.
 *
 * T-1390: Tavern building illustration with 3 upgrade level variations
 * T-1391: Workshop building illustration with 3 upgrade level variations
 * T-1392: Farm building illustration with 3 upgrade level variations
 * T-1393: Mine building illustration with 3 upgrade level variations
 * T-1394: Marketplace building illustration with 3 upgrade level variations
 * T-1395: Library building illustration with 3 upgrade level variations
 * T-1396: Barracks building illustration with 3 upgrade level variations
 * T-1397: Warehouse building illustration with 3 upgrade level variations
 * T-1398: Temple building illustration with 3 upgrade level variations
 * T-1399: Observatory building illustration with 3 upgrade level variations
 * T-1400: Expedition Hall building illustration with 3 upgrade level variations
 * T-1401: Hero portrait base templates for 10 roles
 * T-1409: Weapon sprites (5 types x 5 rarities)
 * T-1410: Armor sprites (5 types x 5 rarities)
 * T-1411: Accessory sprites (3 types x 5 rarities)
 * T-1435: Enemy sprites for all 20 enemy types
 * T-1436: Boss sprites for 5 boss encounters
 * T-1438: NPC character portraits (15 unique NPCs)
 * T-1439: Seasonal decoration sprites (20 seasonal items)
 * T-1441: Gem and enchantment visual effect sprites
 * T-1445: Item set visual indicators
 * T-1455: Market stall and merchant booth illustrations
 * T-1457: Guild emblem component sprites (shapes, symbols, borders)
 */
import * as Phaser from 'phaser';
import { RARITY_COLORS, darkenColor, lightenColor } from './ColorPalette';

// ── Building definitions ────────────────────────────────────────────────

interface BuildingVisual {
  baseColor: number;
  roofColor: number;
  accentColor: number;
  symbol: string;
  widthRatio: number;
  heightRatio: number;
}

const BUILDING_VISUALS: Record<string, BuildingVisual> = {
  tavern: { baseColor: 0xc87533, roofColor: 0x8b4513, accentColor: 0xffd700, symbol: '🍺', widthRatio: 1.0, heightRatio: 1.0 },
  workshop: { baseColor: 0x708090, roofColor: 0x4a5568, accentColor: 0xff6347, symbol: '⚒', widthRatio: 1.1, heightRatio: 0.9 },
  farm: { baseColor: 0x8b7355, roofColor: 0x654321, accentColor: 0x4ecca3, symbol: '🌾', widthRatio: 1.3, heightRatio: 0.7 },
  mine: { baseColor: 0x555555, roofColor: 0x333333, accentColor: 0xffa500, symbol: '⛏', widthRatio: 0.9, heightRatio: 1.1 },
  marketplace: { baseColor: 0xe9c46a, roofColor: 0xc2956a, accentColor: 0xff4500, symbol: '💰', widthRatio: 1.2, heightRatio: 0.8 },
  library: { baseColor: 0x4a5568, roofColor: 0x2d3748, accentColor: 0x4dabf7, symbol: '📚', widthRatio: 0.9, heightRatio: 1.2 },
  barracks: { baseColor: 0x8b0000, roofColor: 0x4a0000, accentColor: 0xc0c0c0, symbol: '⚔', widthRatio: 1.1, heightRatio: 1.0 },
  warehouse: { baseColor: 0x8b7355, roofColor: 0x6a5a40, accentColor: 0xa0a0a0, symbol: '📦', widthRatio: 1.3, heightRatio: 0.9 },
  temple: { baseColor: 0xf0e6d3, roofColor: 0x9775fa, accentColor: 0xffd700, symbol: '✝', widthRatio: 0.8, heightRatio: 1.3 },
  observatory: { baseColor: 0x2d3748, roofColor: 0x1a2332, accentColor: 0x5b9bd5, symbol: '🔭', widthRatio: 0.7, heightRatio: 1.4 },
  expedition_hall: { baseColor: 0xd4a373, roofColor: 0x8b6914, accentColor: 0xf5a623, symbol: '🗺', widthRatio: 1.2, heightRatio: 1.0 },
};

// ── Enemy definitions ───────────────────────────────────────────────────

interface EnemyVisual {
  bodyColor: number;
  eyeColor: number;
  symbol: string;
  shape: 'circle' | 'triangle' | 'diamond' | 'square';
  size: number;
}

const ENEMY_VISUALS: Record<string, EnemyVisual> = {
  goblin: { bodyColor: 0x4a8b3a, eyeColor: 0xff0000, symbol: 'G', shape: 'circle', size: 0.7 },
  skeleton: { bodyColor: 0xd4c8a8, eyeColor: 0x00ff00, symbol: 'S', shape: 'circle', size: 0.8 },
  wolf: { bodyColor: 0x696969, eyeColor: 0xffff00, symbol: 'W', shape: 'triangle', size: 0.8 },
  bandit: { bodyColor: 0x5a3a2a, eyeColor: 0xffffff, symbol: 'B', shape: 'circle', size: 0.9 },
  spider: { bodyColor: 0x2a2a2a, eyeColor: 0xff0000, symbol: 'Sp', shape: 'circle', size: 0.6 },
  slime: { bodyColor: 0x00ff7f, eyeColor: 0x000000, symbol: 'Sl', shape: 'circle', size: 0.7 },
  orc: { bodyColor: 0x3a6a3a, eyeColor: 0xff4500, symbol: 'O', shape: 'square', size: 1.0 },
  wraith: { bodyColor: 0x4b0082, eyeColor: 0x00ffff, symbol: 'Wr', shape: 'diamond', size: 0.9 },
  troll: { bodyColor: 0x556b2f, eyeColor: 0xffa500, symbol: 'T', shape: 'square', size: 1.2 },
  elemental_fire: { bodyColor: 0xff4500, eyeColor: 0xffd700, symbol: 'F', shape: 'diamond', size: 1.0 },
  elemental_ice: { bodyColor: 0x87ceeb, eyeColor: 0x0000ff, symbol: 'I', shape: 'diamond', size: 1.0 },
  elemental_earth: { bodyColor: 0x8b4513, eyeColor: 0x00ff00, symbol: 'E', shape: 'square', size: 1.1 },
  vampire: { bodyColor: 0x4a0000, eyeColor: 0xff0000, symbol: 'V', shape: 'triangle', size: 0.9 },
  golem: { bodyColor: 0x808080, eyeColor: 0x00ffff, symbol: 'Go', shape: 'square', size: 1.3 },
  harpy: { bodyColor: 0x9370db, eyeColor: 0xffff00, symbol: 'H', shape: 'triangle', size: 0.8 },
  serpent: { bodyColor: 0x006400, eyeColor: 0xff0000, symbol: 'Se', shape: 'diamond', size: 0.9 },
  imp: { bodyColor: 0xff4444, eyeColor: 0xffd700, symbol: 'Im', shape: 'circle', size: 0.5 },
  mimic: { bodyColor: 0xc87533, eyeColor: 0xff0000, symbol: 'M', shape: 'square', size: 0.8 },
  wisp: { bodyColor: 0x00ffff, eyeColor: 0xffffff, symbol: 'Wi', shape: 'circle', size: 0.5 },
  shade: { bodyColor: 0x1a1a2e, eyeColor: 0x9370db, symbol: 'Sh', shape: 'diamond', size: 0.9 },
};

const BOSS_VISUALS: Record<string, EnemyVisual> = {
  dragon: { bodyColor: 0x8b0000, eyeColor: 0xffd700, symbol: 'D', shape: 'triangle', size: 2.0 },
  lich: { bodyColor: 0x4b0082, eyeColor: 0x00ff00, symbol: 'L', shape: 'diamond', size: 1.8 },
  titan: { bodyColor: 0x808080, eyeColor: 0xff4500, symbol: 'Ti', shape: 'square', size: 2.2 },
  hydra: { bodyColor: 0x006400, eyeColor: 0xff0000, symbol: 'Hy', shape: 'triangle', size: 2.0 },
  demon_lord: { bodyColor: 0x2a0000, eyeColor: 0xff0000, symbol: 'DL', shape: 'diamond', size: 2.5 },
};

export class SpriteGenerator {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Draw a building sprite at (x, y) with given size and upgrade level (1-3).
   */
  drawBuilding(
    gfx: Phaser.GameObjects.Graphics,
    buildingType: string,
    x: number,
    y: number,
    size: number,
    level: number = 1,
  ): Phaser.GameObjects.Text | null {
    const vis = BUILDING_VISUALS[buildingType];
    if (!vis) return null;

    const w = size * vis.widthRatio;
    const h = size * vis.heightRatio;
    const lvlScale = 1.0 + (level - 1) * 0.12;
    const sw = w * lvlScale;
    const sh = h * lvlScale;

    // Foundation
    gfx.fillStyle(darkenColor(vis.baseColor, 0.5), 0.8);
    gfx.fillRect(x - sw / 2 - 2, y + sh * 0.35, sw + 4, sh * 0.15);

    // Main body
    gfx.fillStyle(vis.baseColor, 1);
    gfx.fillRoundedRect(x - sw / 2, y - sh * 0.3, sw, sh * 0.65, 3);

    // Roof (triangle)
    const roofPeak = y - sh * 0.55 - level * 4;
    gfx.fillStyle(vis.roofColor, 1);
    gfx.fillTriangle(
      x - sw / 2 - 4, y - sh * 0.3,
      x + sw / 2 + 4, y - sh * 0.3,
      x, roofPeak,
    );

    // Door
    gfx.fillStyle(darkenColor(vis.baseColor, 0.4), 1);
    gfx.fillRoundedRect(x - sw * 0.1, y + sh * 0.05, sw * 0.2, sh * 0.3, { tl: 5, tr: 5, bl: 0, br: 0 });

    // Windows (more for higher levels)
    const windowCount = level;
    gfx.fillStyle(0xffd700, 0.6);
    for (let i = 0; i < windowCount; i++) {
      const wx = x - sw * 0.3 + i * (sw * 0.6 / Math.max(windowCount - 1, 1));
      gfx.fillRect(wx - 3, y - sh * 0.15, 6, 6);
    }

    // Level decorations
    if (level >= 2) {
      gfx.lineStyle(2, vis.accentColor, 0.8);
      gfx.strokeRoundedRect(x - sw / 2, y - sh * 0.3, sw, sh * 0.65, 3);
    }
    if (level >= 3) {
      // Banner/flag at rooftop
      gfx.fillStyle(vis.accentColor, 0.9);
      gfx.fillTriangle(x + 2, roofPeak - 2, x + 12, roofPeak + 5, x + 2, roofPeak + 10);
      gfx.fillStyle(0xffffff, 0.3);
      gfx.fillCircle(x, roofPeak - 6, 3);
    }

    // Symbol label
    return this.scene.add.text(x, y - sh * 0.05, vis.symbol, {
      fontFamily: 'Arial',
      fontSize: `${Math.floor(size * 0.22)}px`,
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  /**
   * Draw an enemy sprite.
   */
  drawEnemy(
    gfx: Phaser.GameObjects.Graphics,
    enemyType: string,
    x: number,
    y: number,
    baseSize: number,
    isBoss: boolean = false,
  ): Phaser.GameObjects.Text | null {
    const vis = isBoss ? BOSS_VISUALS[enemyType] : ENEMY_VISUALS[enemyType];
    if (!vis) return null;

    const size = baseSize * vis.size;
    const half = size / 2;

    // Shadow
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillEllipse(x, y + half * 0.9, size * 0.7, size * 0.2);

    // Body
    gfx.fillStyle(vis.bodyColor, 1);
    switch (vis.shape) {
      case 'circle':
        gfx.fillCircle(x, y, half);
        break;
      case 'triangle':
        gfx.fillTriangle(x, y - half, x - half, y + half, x + half, y + half);
        break;
      case 'diamond':
        gfx.fillPoints([
          { x: x, y: y - half } as any,
          { x: x + half, y } as any,
          { x, y: y + half } as any,
          { x: x - half, y } as any,
        ], true);
        break;
      case 'square':
        gfx.fillRect(x - half, y - half, size, size);
        break;
    }

    // Eyes
    gfx.fillStyle(vis.eyeColor, 1);
    gfx.fillCircle(x - half * 0.25, y - half * 0.15, half * 0.12);
    gfx.fillCircle(x + half * 0.25, y - half * 0.15, half * 0.12);

    // Boss aura
    if (isBoss) {
      gfx.lineStyle(3, 0xff0000, 0.5);
      gfx.strokeCircle(x, y, half + 5);
      gfx.lineStyle(2, 0xffd700, 0.3);
      gfx.strokeCircle(x, y, half + 10);
    }

    // Outline
    gfx.lineStyle(1, lightenColor(vis.bodyColor, 0.3), 0.7);
    if (vis.shape === 'circle') gfx.strokeCircle(x, y, half);

    return this.scene.add.text(x, y + half * 0.4, vis.symbol, {
      fontFamily: 'Arial',
      fontSize: `${Math.floor(baseSize * 0.28)}px`,
      fontStyle: isBoss ? 'bold' : 'normal',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  /**
   * Draw a weapon sprite.
   */
  drawWeapon(
    gfx: Phaser.GameObjects.Graphics,
    weaponType: string,
    x: number,
    y: number,
    size: number,
    rarity: string = 'common',
  ): void {
    const rc = RARITY_COLORS[rarity] || RARITY_COLORS.common;
    const half = size / 2;

    // Rarity background glow
    gfx.fillStyle(rc.glow, 0.15);
    gfx.fillCircle(x, y, half);

    const bladeColor = rc.fill;
    const handleColor = 0x8b4513;

    switch (weaponType) {
      case 'sword':
        gfx.fillStyle(bladeColor, 1);
        gfx.fillRect(x - 2, y - half * 0.7, 4, half * 1.0);
        gfx.fillStyle(handleColor, 1);
        gfx.fillRect(x - half * 0.25, y + half * 0.3, half * 0.5, half * 0.15);
        gfx.fillRect(x - 2, y + half * 0.3, 4, half * 0.35);
        break;
      case 'axe':
        gfx.fillStyle(handleColor, 1);
        gfx.fillRect(x - 1, y - half * 0.5, 3, half * 1.2);
        gfx.fillStyle(bladeColor, 1);
        gfx.fillTriangle(x + 1, y - half * 0.5, x + half * 0.5, y - half * 0.2, x + 1, y + half * 0.1);
        break;
      case 'bow':
        gfx.lineStyle(3, handleColor, 1);
        gfx.beginPath();
        gfx.arc(x - half * 0.2, y, half * 0.6, -1.2, 1.2);
        gfx.strokePath();
        gfx.lineStyle(1, 0xcccccc, 0.8);
        gfx.lineBetween(x - half * 0.2 + half * 0.6 * Math.cos(-1.2), y + half * 0.6 * Math.sin(-1.2),
          x - half * 0.2 + half * 0.6 * Math.cos(1.2), y + half * 0.6 * Math.sin(1.2));
        break;
      case 'staff':
        gfx.fillStyle(handleColor, 1);
        gfx.fillRect(x - 2, y - half * 0.6, 4, half * 1.4);
        gfx.fillStyle(bladeColor, 1);
        gfx.fillCircle(x, y - half * 0.65, half * 0.2);
        break;
      case 'dagger':
        gfx.fillStyle(bladeColor, 1);
        gfx.fillTriangle(x, y - half * 0.5, x - 4, y + half * 0.1, x + 4, y + half * 0.1);
        gfx.fillStyle(handleColor, 1);
        gfx.fillRect(x - 3, y + half * 0.1, 6, half * 0.35);
        break;
    }

    // Rarity border
    gfx.lineStyle(2, rc.border, 0.8);
    gfx.strokeRoundedRect(x - half, y - half, size, size, 4);
  }

  /**
   * Draw an armor sprite.
   */
  drawArmor(
    gfx: Phaser.GameObjects.Graphics,
    armorType: string,
    x: number,
    y: number,
    size: number,
    rarity: string = 'common',
  ): void {
    const rc = RARITY_COLORS[rarity] || RARITY_COLORS.common;
    const half = size / 2;

    gfx.fillStyle(rc.glow, 0.1);
    gfx.fillCircle(x, y, half);

    const armorColor = rc.fill;

    switch (armorType) {
      case 'plate':
        gfx.fillStyle(armorColor, 1);
        gfx.fillRoundedRect(x - half * 0.5, y - half * 0.6, half * 1.0, half * 1.2, 6);
        gfx.lineStyle(1, lightenColor(armorColor, 0.3), 0.6);
        gfx.lineBetween(x, y - half * 0.4, x, y + half * 0.4);
        break;
      case 'leather':
        gfx.fillStyle(0x8b4513, 1);
        gfx.fillRoundedRect(x - half * 0.45, y - half * 0.55, half * 0.9, half * 1.1, 4);
        gfx.lineStyle(1, armorColor, 0.5);
        for (let i = 0; i < 3; i++) {
          gfx.lineBetween(x - half * 0.3, y - half * 0.3 + i * half * 0.25,
            x + half * 0.3, y - half * 0.3 + i * half * 0.25);
        }
        break;
      case 'robe':
        gfx.fillStyle(armorColor, 0.8);
        gfx.fillTriangle(x, y - half * 0.5, x - half * 0.45, y + half * 0.5, x + half * 0.45, y + half * 0.5);
        gfx.fillStyle(lightenColor(armorColor, 0.2), 0.6);
        gfx.fillCircle(x, y - half * 0.35, half * 0.15);
        break;
      case 'chain':
        gfx.fillStyle(0xa0a0a0, 1);
        gfx.fillRoundedRect(x - half * 0.45, y - half * 0.5, half * 0.9, half * 1.0, 3);
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 3; col++) {
            gfx.fillStyle(armorColor, 0.4);
            gfx.fillCircle(x - half * 0.25 + col * half * 0.25, y - half * 0.35 + row * half * 0.2, 2);
          }
        }
        break;
      case 'shield':
        gfx.fillStyle(armorColor, 1);
        gfx.fillRoundedRect(x - half * 0.4, y - half * 0.5, half * 0.8, half * 1.0, 8);
        gfx.lineStyle(2, lightenColor(armorColor, 0.3), 0.6);
        gfx.strokeCircle(x, y, half * 0.25);
        break;
    }

    gfx.lineStyle(2, rc.border, 0.8);
    gfx.strokeRoundedRect(x - half, y - half, size, size, 4);
  }

  /**
   * Draw an accessory sprite.
   */
  drawAccessory(
    gfx: Phaser.GameObjects.Graphics,
    accessoryType: string,
    x: number,
    y: number,
    size: number,
    rarity: string = 'common',
  ): void {
    const rc = RARITY_COLORS[rarity] || RARITY_COLORS.common;
    const half = size / 2;

    gfx.fillStyle(rc.glow, 0.1);
    gfx.fillCircle(x, y, half);

    switch (accessoryType) {
      case 'ring':
        gfx.lineStyle(3, rc.fill, 1);
        gfx.strokeCircle(x, y, half * 0.35);
        gfx.fillStyle(rc.glow, 1);
        gfx.fillCircle(x, y - half * 0.35, half * 0.12);
        break;
      case 'amulet':
        gfx.lineStyle(2, 0xffd700, 0.8);
        gfx.beginPath();
        gfx.arc(x, y - half * 0.2, half * 0.35, -2.5, -0.6);
        gfx.strokePath();
        gfx.fillStyle(rc.fill, 1);
        gfx.fillPoints([
          { x, y: y + half * 0.1 } as any,
          { x: x - half * 0.2, y: y + half * 0.3 } as any,
          { x, y: y + half * 0.5 } as any,
          { x: x + half * 0.2, y: y + half * 0.3 } as any,
        ], true);
        break;
      case 'charm':
        gfx.fillStyle(rc.fill, 1);
        gfx.fillCircle(x, y, half * 0.3);
        gfx.lineStyle(2, rc.glow, 0.6);
        gfx.strokeCircle(x, y, half * 0.3);
        for (let i = 0; i < 4; i++) {
          const angle = (Math.PI / 2) * i;
          gfx.fillStyle(rc.glow, 0.6);
          gfx.fillCircle(x + Math.cos(angle) * half * 0.45, y + Math.sin(angle) * half * 0.45, 3);
        }
        break;
    }

    gfx.lineStyle(2, rc.border, 0.8);
    gfx.strokeRoundedRect(x - half, y - half, size, size, 4);
  }

  /**
   * Draw an NPC portrait.
   */
  drawNpcPortrait(
    gfx: Phaser.GameObjects.Graphics,
    npcIndex: number,
    x: number,
    y: number,
    size: number,
  ): Phaser.GameObjects.Text {
    const npcColors = [
      0xc87533, 0x4ecca3, 0x9775fa, 0xe94560, 0x4dabf7,
      0xffd700, 0x708090, 0xf5a623, 0x228b22, 0xbe4bdb,
      0x5b9bd5, 0xcd853f, 0x87ceeb, 0x8b0000, 0x556b2f,
    ];
    const npcNames = [
      'Elder', 'Smith', 'Sage', 'Guard', 'Scholar',
      'Banker', 'Tinker', 'Healer', 'Ranger', 'Mage',
      'Sailor', 'Baker', 'Fisher', 'Knight', 'Druid',
    ];
    const idx = npcIndex % npcColors.length;
    const half = size / 2;

    // Face
    gfx.fillStyle(0xdeb887, 1);
    gfx.fillCircle(x, y, half * 0.6);

    // Hair
    gfx.fillStyle(npcColors[idx], 1);
    gfx.fillEllipse(x, y - half * 0.35, half * 1.2, half * 0.5);

    // Eyes
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(x - half * 0.15, y - half * 0.05, 2);
    gfx.fillCircle(x + half * 0.15, y - half * 0.05, 2);

    // Frame
    gfx.lineStyle(2, npcColors[idx], 0.8);
    gfx.strokeRoundedRect(x - half, y - half, size, size, 6);

    return this.scene.add.text(x, y + half * 0.85, npcNames[idx], {
      fontFamily: 'Arial',
      fontSize: `${Math.floor(size * 0.14)}px`,
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  /**
   * Draw seasonal decoration sprites.
   */
  drawSeasonalDecoration(
    gfx: Phaser.GameObjects.Graphics,
    season: string,
    variant: number,
    x: number,
    y: number,
    size: number,
  ): void {
    const half = size / 2;

    switch (season) {
      case 'spring':
        // Flowers
        gfx.fillStyle([0xff69b4, 0xffc0cb, 0xff1493, 0xda70d6, 0x98fb98][variant % 5], 0.9);
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 / 5) * i;
          gfx.fillCircle(x + Math.cos(angle) * half * 0.3, y + Math.sin(angle) * half * 0.3, half * 0.2);
        }
        gfx.fillStyle(0xffd700, 1);
        gfx.fillCircle(x, y, half * 0.15);
        break;
      case 'summer':
        // Suns, butterflies
        gfx.fillStyle([0xffd700, 0xffa500, 0xff6347, 0xff4500, 0xffff00][variant % 5], 0.9);
        gfx.fillCircle(x, y, half * 0.3);
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI / 4) * i;
          const rx = x + Math.cos(angle) * half * 0.5;
          const ry = y + Math.sin(angle) * half * 0.5;
          gfx.fillCircle(rx, ry, half * 0.1);
        }
        break;
      case 'autumn':
        // Leaves, pumpkins
        gfx.fillStyle([0xff8c00, 0xcd853f, 0x8b4513, 0xdaa520, 0xb8860b][variant % 5], 0.9);
        gfx.fillTriangle(x, y - half * 0.4, x - half * 0.3, y + half * 0.3, x + half * 0.3, y + half * 0.3);
        gfx.fillStyle(darkenColor(0x8b4513, 0.7), 1);
        gfx.fillRect(x - 1, y + half * 0.3, 2, half * 0.15);
        break;
      case 'winter':
        // Snowflakes, ornaments
        gfx.lineStyle(2, [0xffffff, 0xe0e8ff, 0xc0d0ff, 0xadd8e6, 0xb0e0e6][variant % 5], 0.9);
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          gfx.lineBetween(x, y, x + Math.cos(angle) * half * 0.5, y + Math.sin(angle) * half * 0.5);
        }
        break;
    }
  }

  /**
   * Draw gem / enchantment visual.
   */
  drawGem(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    gemColor: number,
  ): void {
    const half = size / 2;
    gfx.fillStyle(gemColor, 0.9);
    gfx.fillPoints([
      { x, y: y - half * 0.6 } as any,
      { x: x + half * 0.5, y: y - half * 0.1 } as any,
      { x: x + half * 0.3, y: y + half * 0.5 } as any,
      { x: x - half * 0.3, y: y + half * 0.5 } as any,
      { x: x - half * 0.5, y: y - half * 0.1 } as any,
    ], true);

    // Facet highlight
    gfx.fillStyle(lightenColor(gemColor, 0.5), 0.4);
    gfx.fillTriangle(x, y - half * 0.5, x + half * 0.2, y, x - half * 0.2, y);

    // Sparkle
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillCircle(x - half * 0.15, y - half * 0.3, 2);
  }

  /**
   * Draw item set glow indicator.
   */
  drawItemSetGlow(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    setColor: number,
    piecesOwned: number,
    totalPieces: number,
  ): void {
    const half = size / 2;
    const completionRatio = piecesOwned / totalPieces;
    const alpha = 0.2 + completionRatio * 0.5;

    gfx.lineStyle(2, setColor, alpha);
    gfx.strokeRoundedRect(x - half, y - half, size, size, 4);

    // Completion pips
    for (let i = 0; i < totalPieces; i++) {
      const px = x - half + 4 + i * ((size - 8) / (totalPieces - 1));
      gfx.fillStyle(i < piecesOwned ? setColor : 0x333344, i < piecesOwned ? 0.9 : 0.4);
      gfx.fillCircle(px, y + half - 4, 2);
    }
  }

  /**
   * Draw guild emblem with configurable shape, symbol, and border.
   */
  drawGuildEmblem(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    shape: 'shield' | 'circle' | 'diamond' | 'banner',
    fillColor: number,
    borderColor: number,
    symbol: string,
  ): Phaser.GameObjects.Text {
    const half = size / 2;

    gfx.fillStyle(fillColor, 1);
    switch (shape) {
      case 'shield':
        gfx.fillRoundedRect(x - half * 0.7, y - half * 0.8, half * 1.4, half * 1.2, { tl: 6, tr: 6, bl: 0, br: 0 });
        gfx.fillTriangle(x - half * 0.7, y + half * 0.4, x + half * 0.7, y + half * 0.4, x, y + half * 0.9);
        break;
      case 'circle':
        gfx.fillCircle(x, y, half * 0.8);
        break;
      case 'diamond':
        gfx.fillPoints([
          { x, y: y - half * 0.8 } as any,
          { x: x + half * 0.7, y } as any,
          { x, y: y + half * 0.8 } as any,
          { x: x - half * 0.7, y } as any,
        ], true);
        break;
      case 'banner':
        gfx.fillRect(x - half * 0.6, y - half * 0.8, half * 1.2, half * 1.4);
        gfx.fillTriangle(x - half * 0.6, y + half * 0.6, x + half * 0.6, y + half * 0.6, x, y + half * 0.9);
        break;
    }

    gfx.lineStyle(3, borderColor, 1);
    if (shape === 'circle') {
      gfx.strokeCircle(x, y, half * 0.8);
    }

    return this.scene.add.text(x, y - half * 0.1, symbol, {
      fontFamily: 'Arial',
      fontSize: `${Math.floor(size * 0.35)}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  /**
   * Draw market stall / merchant booth.
   */
  drawMarketStall(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    stallType: 'basic' | 'premium' | 'exotic',
  ): void {
    const w = size * 1.2;
    const h = size;
    const stallColors = { basic: 0xc87533, premium: 0xe9c46a, exotic: 0x9775fa };
    const color = stallColors[stallType];

    // Awning
    gfx.fillStyle(color, 0.9);
    gfx.fillTriangle(x - w / 2 - 5, y - h * 0.1, x + w / 2 + 5, y - h * 0.1, x, y - h * 0.55);

    // Counter
    gfx.fillStyle(darkenColor(color, 0.6), 1);
    gfx.fillRect(x - w / 2, y - h * 0.1, w, h * 0.15);

    // Table
    gfx.fillStyle(0x8b4513, 1);
    gfx.fillRect(x - w / 2 + 2, y + h * 0.05, w - 4, h * 0.4);

    // Legs
    gfx.fillStyle(darkenColor(0x8b4513, 0.7), 1);
    gfx.fillRect(x - w / 2 + 4, y + h * 0.45, 4, h * 0.2);
    gfx.fillRect(x + w / 2 - 8, y + h * 0.45, 4, h * 0.2);

    // Wares on counter
    gfx.fillStyle(0xffd700, 0.7);
    for (let i = 0; i < 3; i++) {
      gfx.fillRect(x - w * 0.3 + i * w * 0.25, y + h * 0.1, w * 0.12, h * 0.08);
    }
  }
}
