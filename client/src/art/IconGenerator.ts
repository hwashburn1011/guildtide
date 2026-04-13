/**
 * IconGenerator — Procedural icon generation for resources, items, buildings,
 * hero roles, status effects, and UI actions.
 *
 * T-1384: Icon set for all 8 resource types (32x32 and 64x64)
 * T-1385: Icon set for building types (48x48 for build menu)
 * T-1386: Icon set for hero roles (32x32 badges)
 * T-1387: Icon set for item categories (32x32 inventory icons)
 * T-1388: Icon set for status effects (24x24 buff/debuff icons)
 * T-1389: Icon set for navigation and UI actions (24x24 toolbar icons)
 * T-1431: Notification icon set (exclamation, checkmark, star, warning)
 * T-1432: Quest marker icons for world map
 * T-1440: Achievement badge icons (30 achievement types)
 * T-1443: Research tree node icons (60 research nodes)
 */
import * as Phaser from 'phaser';
import { RARITY_COLORS } from './ColorPalette';

// ── Resource Icons ──────────────────────────────────────────────────────

interface IconDef {
  bgColor: number;
  symbol: string;
  accentColor: number;
}

const RESOURCE_ICONS: Record<string, IconDef> = {
  gold: { bgColor: 0xffd700, symbol: '●', accentColor: 0xb8860b },
  wood: { bgColor: 0x8b4513, symbol: '▲', accentColor: 0x654321 },
  stone: { bgColor: 0x808080, symbol: '◆', accentColor: 0x555555 },
  food: { bgColor: 0x4ecca3, symbol: '◉', accentColor: 0x2d7a5a },
  iron: { bgColor: 0xa0a0a0, symbol: '⬡', accentColor: 0x6a6a6a },
  herbs: { bgColor: 0x228b22, symbol: '✿', accentColor: 0x145a14 },
  essence: { bgColor: 0x9370db, symbol: '✦', accentColor: 0x6a3aaa },
  sapphire: { bgColor: 0x0077b6, symbol: '◇', accentColor: 0x005588 },
};

const BUILDING_ICONS: Record<string, IconDef> = {
  tavern: { bgColor: 0xc87533, symbol: '🍺', accentColor: 0x8b4513 },
  workshop: { bgColor: 0x708090, symbol: '⚒', accentColor: 0x4a5568 },
  farm: { bgColor: 0x4ecca3, symbol: '🌾', accentColor: 0x2d7a5a },
  mine: { bgColor: 0x6c757d, symbol: '⛏', accentColor: 0x4a4a4a },
  marketplace: { bgColor: 0xe9c46a, symbol: '💰', accentColor: 0xb8860b },
  library: { bgColor: 0x4dabf7, symbol: '📚', accentColor: 0x2d6abf },
  barracks: { bgColor: 0xe94560, symbol: '⚔', accentColor: 0xaa2244 },
  warehouse: { bgColor: 0x8b7355, symbol: '📦', accentColor: 0x6a5a40 },
  temple: { bgColor: 0x9775fa, symbol: '✝', accentColor: 0x6a3aaa },
  observatory: { bgColor: 0x5b9bd5, symbol: '🔭', accentColor: 0x3a6aaa },
  expedition_hall: { bgColor: 0xf5a623, symbol: '🗺', accentColor: 0xaa7a10 },
};

const HERO_ROLE_ICONS: Record<string, IconDef> = {
  farmer: { bgColor: 0x4ecca3, symbol: '🌾', accentColor: 0x2d7a5a },
  scout: { bgColor: 0x4dabf7, symbol: '🔍', accentColor: 0x2d6abf },
  merchant: { bgColor: 0xffd700, symbol: '💰', accentColor: 0xb8860b },
  blacksmith: { bgColor: 0xc87533, symbol: '⚒', accentColor: 0x8b4513 },
  alchemist: { bgColor: 0xbe4bdb, symbol: '⚗', accentColor: 0x8a2aaa },
  hunter: { bgColor: 0xe94560, symbol: '🏹', accentColor: 0xaa2244 },
  defender: { bgColor: 0xa0a0a0, symbol: '🛡', accentColor: 0x6a6a6a },
  mystic: { bgColor: 0x9775fa, symbol: '✨', accentColor: 0x6a3aaa },
  caravan_master: { bgColor: 0xf59f00, symbol: '🐎', accentColor: 0xaa6a00 },
  archivist: { bgColor: 0x74c0fc, symbol: '📖', accentColor: 0x4a8abb },
};

const ITEM_CATEGORY_ICONS: Record<string, IconDef> = {
  weapon: { bgColor: 0xe94560, symbol: '⚔', accentColor: 0xaa2244 },
  armor: { bgColor: 0x4682b4, symbol: '🛡', accentColor: 0x2d5a8a },
  accessory: { bgColor: 0xffd700, symbol: '💍', accentColor: 0xb8860b },
  consumable: { bgColor: 0x4ecca3, symbol: '🧪', accentColor: 0x2d7a5a },
  material: { bgColor: 0x8b7355, symbol: '◆', accentColor: 0x6a5a40 },
  gem: { bgColor: 0x9370db, symbol: '💎', accentColor: 0x6a3aaa },
  quest: { bgColor: 0xf5a623, symbol: '📜', accentColor: 0xaa7a10 },
  recipe: { bgColor: 0x74c0fc, symbol: '📋', accentColor: 0x4a8abb },
};

const STATUS_EFFECT_ICONS: Record<string, IconDef> = {
  strength_up: { bgColor: 0xe94560, symbol: '↑', accentColor: 0xaa2244 },
  defense_up: { bgColor: 0x4682b4, symbol: '↑', accentColor: 0x2d5a8a },
  speed_up: { bgColor: 0x4ecca3, symbol: '↑', accentColor: 0x2d7a5a },
  poisoned: { bgColor: 0x228b22, symbol: '☠', accentColor: 0x145a14 },
  burning: { bgColor: 0xff4500, symbol: '🔥', accentColor: 0xcc3300 },
  frozen: { bgColor: 0x87ceeb, symbol: '❄', accentColor: 0x4682b4 },
  blessed: { bgColor: 0xffd700, symbol: '✦', accentColor: 0xb8860b },
  cursed: { bgColor: 0x4b0082, symbol: '☠', accentColor: 0x2a004a },
  stunned: { bgColor: 0xffa500, symbol: '★', accentColor: 0xcc8400 },
  regenerating: { bgColor: 0x00ff7f, symbol: '♥', accentColor: 0x00aa55 },
  shielded: { bgColor: 0xc0c0c0, symbol: '◈', accentColor: 0x888888 },
  weakened: { bgColor: 0x8b0000, symbol: '↓', accentColor: 0x550000 },
};

const NAV_ACTION_ICONS: Record<string, IconDef> = {
  home: { bgColor: 0x4dabf7, symbol: '⌂', accentColor: 0x2d6abf },
  map: { bgColor: 0x4ecca3, symbol: '🗺', accentColor: 0x2d7a5a },
  inventory: { bgColor: 0x8b7355, symbol: '🎒', accentColor: 0x6a5a40 },
  settings: { bgColor: 0x708090, symbol: '⚙', accentColor: 0x4a5568 },
  quest: { bgColor: 0xf5a623, symbol: '❗', accentColor: 0xaa7a10 },
  chat: { bgColor: 0x9775fa, symbol: '💬', accentColor: 0x6a3aaa },
  help: { bgColor: 0x4dabf7, symbol: '?', accentColor: 0x2d6abf },
  close: { bgColor: 0xe94560, symbol: '✕', accentColor: 0xaa2244 },
  back: { bgColor: 0x708090, symbol: '←', accentColor: 0x4a5568 },
  forward: { bgColor: 0x708090, symbol: '→', accentColor: 0x4a5568 },
};

const NOTIFICATION_ICONS: Record<string, IconDef> = {
  exclamation: { bgColor: 0xf5a623, symbol: '!', accentColor: 0xaa7a10 },
  checkmark: { bgColor: 0x4ecca3, symbol: '✓', accentColor: 0x2d7a5a },
  star: { bgColor: 0xffd700, symbol: '★', accentColor: 0xb8860b },
  warning: { bgColor: 0xe94560, symbol: '⚠', accentColor: 0xaa2244 },
};

const QUEST_MARKER_ICONS: Record<string, IconDef> = {
  available: { bgColor: 0xffd700, symbol: '!', accentColor: 0xb8860b },
  active: { bgColor: 0x4dabf7, symbol: '?', accentColor: 0x2d6abf },
  complete: { bgColor: 0x4ecca3, symbol: '✓', accentColor: 0x2d7a5a },
  failed: { bgColor: 0xe94560, symbol: '✕', accentColor: 0xaa2244 },
  boss: { bgColor: 0xff4500, symbol: '☠', accentColor: 0xcc3300 },
  merchant: { bgColor: 0xe9c46a, symbol: '💰', accentColor: 0xb8860b },
  camp: { bgColor: 0xf5a623, symbol: '⛺', accentColor: 0xaa7a10 },
  danger: { bgColor: 0x8b0000, symbol: '⚠', accentColor: 0x550000 },
};

export class IconGenerator {
  private scene: Phaser.Scene;
  private cache: Map<string, Phaser.GameObjects.RenderTexture> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Draw a procedural icon onto a Graphics object at (x, y) with given size.
   */
  drawIcon(
    gfx: Phaser.GameObjects.Graphics,
    category: string,
    key: string,
    x: number,
    y: number,
    size: number,
    rarity?: string,
  ): Phaser.GameObjects.Text | null {
    const def = this.getIconDef(category, key);
    if (!def) return null;

    const half = size / 2;
    const radius = half * 0.85;

    // Rarity glow ring
    if (rarity && RARITY_COLORS[rarity]) {
      const rc = RARITY_COLORS[rarity];
      gfx.lineStyle(3, rc.glow, 0.6);
      gfx.strokeCircle(x, y, radius + 3);
    }

    // Background circle
    gfx.fillStyle(def.bgColor, 0.9);
    gfx.fillCircle(x, y, radius);

    // Inner accent ring
    gfx.lineStyle(2, def.accentColor, 0.8);
    gfx.strokeCircle(x, y, radius * 0.75);

    // Symbol text
    const txt = this.scene.add.text(x, y, def.symbol, {
      fontFamily: 'Arial',
      fontSize: `${Math.floor(size * 0.45)}px`,
      color: '#ffffff',
    }).setOrigin(0.5);

    return txt;
  }

  /**
   * Generate a procedural icon as a RenderTexture (cached).
   */
  generateIcon(category: string, key: string, size: number, rarity?: string): Phaser.GameObjects.RenderTexture {
    const cacheKey = `${category}_${key}_${size}_${rarity || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.scene) return cached;

    const rt = this.scene.add.renderTexture(0, 0, size, size).setVisible(false);
    const gfx = this.scene.add.graphics();
    const half = size / 2;

    const def = this.getIconDef(category, key);
    if (def) {
      const radius = half * 0.85;
      if (rarity && RARITY_COLORS[rarity]) {
        gfx.lineStyle(3, RARITY_COLORS[rarity].glow, 0.6);
        gfx.strokeCircle(half, half, radius + 2);
      }
      gfx.fillStyle(def.bgColor, 0.9);
      gfx.fillCircle(half, half, radius);
      gfx.lineStyle(2, def.accentColor, 0.8);
      gfx.strokeCircle(half, half, radius * 0.75);
    }

    rt.draw(gfx);
    gfx.destroy();
    this.cache.set(cacheKey, rt);
    return rt;
  }

  /**
   * Draw achievement badge with icon and frame.
   */
  drawAchievementBadge(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    tier: 'bronze' | 'silver' | 'gold',
    symbol: string,
  ): Phaser.GameObjects.Text {
    const tierColors = {
      bronze: { fill: 0xcd7f32, border: 0x8b5a2b },
      silver: { fill: 0xc0c0c0, border: 0x808080 },
      gold: { fill: 0xffd700, border: 0xb8860b },
    };
    const colors = tierColors[tier];
    const half = size / 2;

    // Badge shield shape
    gfx.fillStyle(colors.fill, 0.9);
    gfx.fillRoundedRect(x - half, y - half, size, size * 1.1, half * 0.3);
    gfx.lineStyle(2, colors.border, 1);
    gfx.strokeRoundedRect(x - half, y - half, size, size * 1.1, half * 0.3);

    // Inner decoration
    gfx.lineStyle(1, 0xffffff, 0.3);
    gfx.strokeCircle(x, y, half * 0.5);

    return this.scene.add.text(x, y, symbol, {
      fontFamily: 'Arial',
      fontSize: `${Math.floor(size * 0.45)}px`,
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  /**
   * Draw a research tree node icon.
   */
  drawResearchNode(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    branch: string,
    unlocked: boolean,
  ): void {
    const branchColors: Record<string, number> = {
      economy: 0xffd700,
      military: 0xe94560,
      exploration: 0x4dabf7,
      crafting: 0xc87533,
      magic: 0x9775fa,
      agriculture: 0x4ecca3,
      diplomacy: 0xf5a623,
      architecture: 0x708090,
    };

    const half = size / 2;
    const color = branchColors[branch] || 0x708090;

    // Hexagon shape
    gfx.fillStyle(unlocked ? color : 0x333344, unlocked ? 0.9 : 0.5);
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      points.push({ x: x + half * Math.cos(angle), y: y + half * Math.sin(angle) });
    }
    gfx.fillPoints(points as any, true);

    gfx.lineStyle(2, unlocked ? 0xffffff : 0x555566, 0.8);
    gfx.strokePoints(points as any, true);

    if (!unlocked) {
      // Lock indicator
      gfx.fillStyle(0x888899, 0.8);
      gfx.fillCircle(x, y, half * 0.3);
    }
  }

  private getIconDef(category: string, key: string): IconDef | null {
    const lookups: Record<string, Record<string, IconDef>> = {
      resource: RESOURCE_ICONS,
      building: BUILDING_ICONS,
      role: HERO_ROLE_ICONS,
      item: ITEM_CATEGORY_ICONS,
      status: STATUS_EFFECT_ICONS,
      nav: NAV_ACTION_ICONS,
      notification: NOTIFICATION_ICONS,
      quest: QUEST_MARKER_ICONS,
    };
    return lookups[category]?.[key] || null;
  }

  destroy(): void {
    this.cache.forEach((rt) => { if (rt.scene) rt.destroy(); });
    this.cache.clear();
  }
}
