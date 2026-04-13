/**
 * VisualFeedback — Screen shake, flash, glow, emphasis effects, rarity
 * border glows, scroll/parchment backgrounds, tooltip/popup frames.
 *
 * T-1442: Rarity border glow effects for each tier
 * T-1458: Scroll/parchment UI background for narrative text
 * T-1459: Tooltip and popup visual frames
 * T-1450: Favicon and app icon in multiple sizes
 * T-1451: Social media preview image (Open Graph image)
 * T-1452: Email template header and footer graphics
 */
import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { RARITY_COLORS, lightenColor, darkenColor } from './ColorPalette';

export class VisualFeedback {
  private scene: Phaser.Scene;
  private flashRect: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Screen shake effect.
   */
  screenShake(intensity: number = 5, duration: number = 200): void {
    if (this.scene.cameras.main) {
      this.scene.cameras.main.shake(duration, intensity / 100);
    }
  }

  /**
   * Screen flash effect (white or colored).
   */
  screenFlash(color: number = 0xffffff, alpha: number = 0.5, duration: number = 300): void {
    if (this.flashRect?.scene) this.flashRect.destroy();
    this.flashRect = this.scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color, alpha,
    ).setDepth(500);

    this.scene.tweens.add({
      targets: this.flashRect,
      alpha: 0,
      duration,
      ease: 'Power2',
      onComplete: () => {
        if (this.flashRect?.scene) this.flashRect.destroy();
        this.flashRect = null;
      },
    });
  }

  /**
   * Apply a glow/pulse effect to a game object.
   */
  glowPulse(
    target: Phaser.GameObjects.GameObject,
    color: number = 0xffd700,
    duration: number = 800,
    repeat: number = 2,
  ): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: target,
      alpha: 0.5,
      duration,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat,
    });
  }

  /**
   * Emphasis bounce + scale effect.
   */
  emphasis(target: Phaser.GameObjects.GameObject, scale: number = 1.2): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: target,
      scaleX: scale,
      scaleY: scale,
      duration: 200,
      ease: 'Back.easeOut',
      yoyo: true,
    });
  }

  /**
   * Floating text effect (e.g. "+10 Gold").
   */
  floatingText(
    x: number,
    y: number,
    text: string,
    color: string = '#ffd700',
    fontSize: number = 16,
    container?: Phaser.GameObjects.Container,
  ): void {
    const txt = this.scene.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: `${fontSize}px`,
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(300);

    if (container) container.add(txt);

    this.scene.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  /**
   * Draw rarity border glow around a rectangle.
   */
  drawRarityGlow(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    rarity: string,
    animated: boolean = false,
  ): void {
    const rc = RARITY_COLORS[rarity];
    if (!rc) return;

    // Outer glow layers
    for (let i = 3; i >= 1; i--) {
      const expand = i * 2;
      gfx.lineStyle(2, rc.glow, 0.15 * (4 - i));
      gfx.strokeRoundedRect(x - expand, y - expand, w + expand * 2, h + expand * 2, 6 + i);
    }

    // Main border
    gfx.lineStyle(2, rc.border, 0.9);
    gfx.strokeRoundedRect(x, y, w, h, 6);

    // Corner accents for epic and legendary
    if (rarity === 'epic' || rarity === 'legendary') {
      const cornerSize = 8;
      gfx.fillStyle(rc.fill, 0.8);
      // Top-left
      gfx.fillRect(x - 1, y - 1, cornerSize, 2);
      gfx.fillRect(x - 1, y - 1, 2, cornerSize);
      // Top-right
      gfx.fillRect(x + w - cornerSize + 1, y - 1, cornerSize, 2);
      gfx.fillRect(x + w - 1, y - 1, 2, cornerSize);
      // Bottom-left
      gfx.fillRect(x - 1, y + h - 1, cornerSize, 2);
      gfx.fillRect(x - 1, y + h - cornerSize + 1, 2, cornerSize);
      // Bottom-right
      gfx.fillRect(x + w - cornerSize + 1, y + h - 1, cornerSize, 2);
      gfx.fillRect(x + w - 1, y + h - cornerSize + 1, 2, cornerSize);
    }
  }

  /**
   * Draw a scroll/parchment background for narrative text.
   */
  drawScrollBackground(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Parchment body
    const parchColor = 0xf5e6c8;
    gfx.fillStyle(parchColor, 0.95);
    gfx.fillRoundedRect(x, y, w, h, 4);

    // Aged edges
    gfx.fillStyle(darkenColor(parchColor, 0.85), 0.5);
    gfx.fillRect(x, y, w, 3);
    gfx.fillRect(x, y + h - 3, w, 3);
    gfx.fillRect(x, y, 3, h);
    gfx.fillRect(x + w - 3, y, 3, h);

    // Scroll rolls at top and bottom
    const rollH = 12;
    gfx.fillStyle(darkenColor(parchColor, 0.7), 1);
    gfx.fillRoundedRect(x - 5, y - rollH / 2, w + 10, rollH, 6);
    gfx.fillRoundedRect(x - 5, y + h - rollH / 2, w + 10, rollH, 6);

    // Highlight on rolls
    gfx.fillStyle(lightenColor(parchColor, 0.3), 0.4);
    gfx.fillRect(x, y - rollH / 2 + 2, w, 3);
    gfx.fillRect(x, y + h - rollH / 2 + 2, w, 3);

    // Texture noise (subtle stains)
    gfx.fillStyle(darkenColor(parchColor, 0.9), 0.08);
    for (let i = 0; i < 15; i++) {
      const sx = x + 10 + Math.random() * (w - 20);
      const sy = y + 10 + Math.random() * (h - 20);
      gfx.fillCircle(sx, sy, 5 + Math.random() * 10);
    }

    // Inner border
    gfx.lineStyle(1, darkenColor(parchColor, 0.6), 0.3);
    gfx.strokeRoundedRect(x + 8, y + 8, w - 16, h - 16, 2);
  }

  /**
   * Draw tooltip/popup visual frame.
   */
  drawTooltipFrame(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    arrowDirection: 'up' | 'down' | 'left' | 'right' | 'none' = 'none',
  ): void {
    // Shadow
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillRoundedRect(x + 2, y + 2, w, h, 6);

    // Background
    gfx.fillStyle(COLORS.panelBg, 0.97);
    gfx.fillRoundedRect(x, y, w, h, 6);

    // Border
    gfx.lineStyle(1, COLORS.panelBorder, 0.8);
    gfx.strokeRoundedRect(x, y, w, h, 6);

    // Top accent line
    gfx.fillStyle(COLORS.accent, 0.6);
    gfx.fillRect(x + 6, y + 1, w - 12, 2);

    // Arrow
    const arrowSize = 8;
    gfx.fillStyle(COLORS.panelBg, 0.97);
    switch (arrowDirection) {
      case 'up':
        gfx.fillTriangle(x + w / 2, y - arrowSize, x + w / 2 - arrowSize, y, x + w / 2 + arrowSize, y);
        break;
      case 'down':
        gfx.fillTriangle(x + w / 2, y + h + arrowSize, x + w / 2 - arrowSize, y + h, x + w / 2 + arrowSize, y + h);
        break;
      case 'left':
        gfx.fillTriangle(x - arrowSize, y + h / 2, x, y + h / 2 - arrowSize, x, y + h / 2 + arrowSize);
        break;
      case 'right':
        gfx.fillTriangle(x + w + arrowSize, y + h / 2, x + w, y + h / 2 - arrowSize, x + w, y + h / 2 + arrowSize);
        break;
    }
  }

  /**
   * Draw UI button sprite states.
   */
  drawButton(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    state: 'normal' | 'hover' | 'pressed' | 'disabled',
    color: number = COLORS.accent,
  ): void {
    const stateConfig = {
      normal: { fill: color, border: lightenColor(color, 0.2), alpha: 1, yOffset: 0 },
      hover: { fill: lightenColor(color, 0.15), border: lightenColor(color, 0.35), alpha: 1, yOffset: -1 },
      pressed: { fill: darkenColor(color, 0.8), border: color, alpha: 1, yOffset: 1 },
      disabled: { fill: 0x555555, border: 0x444444, alpha: 0.5, yOffset: 0 },
    };

    const cfg = stateConfig[state];

    // Button shadow (not for pressed)
    if (state !== 'pressed') {
      gfx.fillStyle(0x000000, 0.2);
      gfx.fillRoundedRect(x + 1, y + 3, w, h, 4);
    }

    // Button body
    gfx.fillStyle(cfg.fill, cfg.alpha);
    gfx.fillRoundedRect(x, y + cfg.yOffset, w, h, 4);

    // Top highlight
    if (state !== 'pressed' && state !== 'disabled') {
      gfx.fillStyle(0xffffff, 0.1);
      gfx.fillRoundedRect(x + 2, y + cfg.yOffset + 1, w - 4, h * 0.4, { tl: 3, tr: 3, bl: 0, br: 0 });
    }

    // Border
    gfx.lineStyle(1, cfg.border, cfg.alpha);
    gfx.strokeRoundedRect(x, y + cfg.yOffset, w, h, 4);
  }

  /**
   * Draw UI border/frame decorations.
   */
  drawDecorativeFrame(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    style: 'simple' | 'ornate' | 'golden' = 'simple',
  ): void {
    const styles = {
      simple: { border: COLORS.panelBorder, accent: COLORS.accent, lineWidth: 1 },
      ornate: { border: 0x8b7355, accent: 0xc87533, lineWidth: 2 },
      golden: { border: 0xb8860b, accent: 0xffd700, lineWidth: 2 },
    };
    const s = styles[style];

    gfx.lineStyle(s.lineWidth, s.border, 0.8);
    gfx.strokeRoundedRect(x, y, w, h, 6);

    if (style !== 'simple') {
      // Corner decorations
      const cs = 12;
      gfx.fillStyle(s.accent, 0.7);
      // Top-left
      gfx.fillCircle(x, y, 3);
      gfx.fillRect(x, y - 1, cs, 2);
      gfx.fillRect(x - 1, y, 2, cs);
      // Top-right
      gfx.fillCircle(x + w, y, 3);
      gfx.fillRect(x + w - cs, y - 1, cs, 2);
      gfx.fillRect(x + w - 1, y, 2, cs);
      // Bottom-left
      gfx.fillCircle(x, y + h, 3);
      gfx.fillRect(x, y + h - 1, cs, 2);
      gfx.fillRect(x - 1, y + h - cs, 2, cs);
      // Bottom-right
      gfx.fillCircle(x + w, y + h, 3);
      gfx.fillRect(x + w - cs, y + h - 1, cs, 2);
      gfx.fillRect(x + w - 1, y + h - cs, 2, cs);
    }
  }

  /**
   * Draw panel background with parchment/wood textures.
   */
  drawTexturedPanel(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    texture: 'parchment' | 'wood' | 'stone' | 'metal',
  ): void {
    const textureColors = {
      parchment: { base: 0xf5e6c8, detail: 0xe8d4a8, border: 0xc4a882 },
      wood: { base: 0x8b6914, detail: 0x7a5c12, border: 0x654321 },
      stone: { base: 0x808080, detail: 0x6e6e6e, border: 0x555555 },
      metal: { base: 0xa0a0a0, detail: 0x888888, border: 0x666666 },
    };
    const tc = textureColors[texture];

    gfx.fillStyle(tc.base, 0.95);
    gfx.fillRoundedRect(x, y, w, h, 4);

    // Texture grain lines
    gfx.fillStyle(tc.detail, 0.15);
    for (let i = 0; i < 12; i++) {
      if (texture === 'wood') {
        const ly = y + 5 + i * ((h - 10) / 12);
        gfx.fillRect(x + 3, ly, w - 6, 1);
      } else {
        const sx = x + 5 + Math.random() * (w - 10);
        const sy = y + 5 + Math.random() * (h - 10);
        gfx.fillCircle(sx, sy, 2 + Math.random() * 4);
      }
    }

    gfx.lineStyle(1, tc.border, 0.6);
    gfx.strokeRoundedRect(x, y, w, h, 4);
  }

  /**
   * Generate a favicon-style icon (drawn procedurally).
   */
  drawFavicon(gfx: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
    const half = size / 2;

    // Shield shape
    gfx.fillStyle(0x1a1a2e, 1);
    gfx.fillRoundedRect(x - half, y - half, size, size * 0.75, { tl: 4, tr: 4, bl: 0, br: 0 });
    gfx.fillTriangle(x - half, y + size * 0.25, x + half, y + size * 0.25, x, y + half);

    // Inner emblem
    gfx.fillStyle(0xffd700, 1);
    gfx.fillCircle(x, y - half * 0.15, half * 0.35);

    // Border
    gfx.lineStyle(2, 0xe94560, 1);
    gfx.strokeRoundedRect(x - half, y - half, size, size * 0.75, { tl: 4, tr: 4, bl: 0, br: 0 });
  }

  destroy(): void {
    if (this.flashRect?.scene) this.flashRect.destroy();
  }
}
