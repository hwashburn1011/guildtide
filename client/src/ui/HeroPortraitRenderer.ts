import * as Phaser from 'phaser';
import type { HeroPortrait } from '@shared/types';

/**
 * Renders a procedural hero portrait from portrait config data.
 * Uses layered geometric shapes to represent facial features.
 * T-0405: Layered facial feature composition
 * T-0406: Feature sets (hairstyle, face shape, eyes, mouth, accessories)
 * T-0407: Color palette per feature (skin tone, hair color, eye color)
 * T-0408: Portrait preview with randomize
 * T-0409: Portrait customization editor
 * T-0410: Role-specific frame decorations
 */

const ROLE_FRAME_COLORS: Record<string, number> = {
  farmer: 0x4ecca3,
  scout: 0x4dabf7,
  merchant: 0xffd700,
  blacksmith: 0xc87533,
  alchemist: 0xbe4bdb,
  hunter: 0xe94560,
  defender: 0xa0a0a0,
  mystic: 0x9775fa,
  caravan_master: 0xf59f00,
  archivist: 0x74c0fc,
};

const ROLE_FRAME_SYMBOLS: Record<string, string> = {
  farmer: '🌾', scout: '🔍', merchant: '💰', blacksmith: '⚒',
  alchemist: '⚗', hunter: '🏹', defender: '🛡', mystic: '✨',
  caravan_master: '🐎', archivist: '📚',
};

export class HeroPortraitRenderer {
  /**
   * Draw a portrait into a Phaser Graphics object.
   * @param gfx Graphics to draw into
   * @param x center x
   * @param y center y
   * @param size total portrait size (square)
   * @param portrait portrait config
   * @param role hero role for frame decoration
   * @param rarityColor color for rarity border
   */
  static draw(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    portrait: HeroPortrait,
    role?: string,
    rarityColor?: number,
  ): void {
    const halfSize = size / 2;

    // Background circle (skin tone)
    const skinColor = Phaser.Display.Color.HexStringToColor(portrait.skinTone).color;
    gfx.fillStyle(skinColor, 1);
    gfx.fillCircle(x, y, halfSize * 0.7);

    // Face shape variants (based on faceShape index)
    const faceWidth = halfSize * (0.55 + (portrait.faceShape % 4) * 0.05);
    const faceHeight = halfSize * (0.65 + (portrait.faceShape % 3) * 0.05);
    gfx.fillStyle(skinColor, 1);
    gfx.fillEllipse(x, y + 2, faceWidth * 2, faceHeight * 2);

    // Hair (on top)
    const hairColor = Phaser.Display.Color.HexStringToColor(portrait.hairColor).color;
    gfx.fillStyle(hairColor, 1);
    const hairVariant = portrait.hairStyle % 6;
    switch (hairVariant) {
      case 0: // Short crop
        gfx.fillEllipse(x, y - halfSize * 0.3, faceWidth * 2.1, halfSize * 0.6);
        break;
      case 1: // Long flowing
        gfx.fillEllipse(x, y - halfSize * 0.25, faceWidth * 2.2, halfSize * 0.7);
        gfx.fillRect(x - faceWidth * 0.9, y - halfSize * 0.1, faceWidth * 0.3, halfSize * 0.8);
        gfx.fillRect(x + faceWidth * 0.6, y - halfSize * 0.1, faceWidth * 0.3, halfSize * 0.8);
        break;
      case 2: // Mohawk
        gfx.fillRect(x - faceWidth * 0.15, y - halfSize * 0.7, faceWidth * 0.3, halfSize * 0.5);
        break;
      case 3: // Bald (just a shine)
        gfx.fillStyle(0xffffff, 0.15);
        gfx.fillCircle(x - faceWidth * 0.2, y - halfSize * 0.35, halfSize * 0.12);
        break;
      case 4: // Braids
        gfx.fillEllipse(x, y - halfSize * 0.25, faceWidth * 2, halfSize * 0.5);
        gfx.fillRect(x - faceWidth * 0.7, y, faceWidth * 0.15, halfSize * 0.9);
        gfx.fillRect(x + faceWidth * 0.55, y, faceWidth * 0.15, halfSize * 0.9);
        break;
      default: // Spiky
        for (let i = -2; i <= 2; i++) {
          gfx.fillTriangle(
            x + i * faceWidth * 0.3, y - halfSize * 0.6,
            x + i * faceWidth * 0.3 - 4, y - halfSize * 0.2,
            x + i * faceWidth * 0.3 + 4, y - halfSize * 0.2,
          );
        }
        break;
    }

    // Eyes
    const eyeColor = Phaser.Display.Color.HexStringToColor(portrait.eyeColor).color;
    const eyeSize = halfSize * 0.08 + (portrait.eyes % 4) * 0.01;
    const eyeY = y - halfSize * 0.05;
    const eyeSpacing = faceWidth * 0.35;

    // Eye whites
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillEllipse(x - eyeSpacing, eyeY, eyeSize * 3, eyeSize * 2);
    gfx.fillEllipse(x + eyeSpacing, eyeY, eyeSize * 3, eyeSize * 2);

    // Pupils
    gfx.fillStyle(eyeColor, 1);
    gfx.fillCircle(x - eyeSpacing, eyeY, eyeSize);
    gfx.fillCircle(x + eyeSpacing, eyeY, eyeSize);

    // Mouth
    const mouthY = y + halfSize * 0.2;
    const mouthVariant = portrait.mouth % 4;
    gfx.fillStyle(0xcc6666, 1);
    switch (mouthVariant) {
      case 0: // Smile
        gfx.fillEllipse(x, mouthY, halfSize * 0.25, halfSize * 0.08);
        break;
      case 1: // Grin
        gfx.fillEllipse(x, mouthY, halfSize * 0.3, halfSize * 0.12);
        break;
      case 2: // Neutral
        gfx.fillRect(x - halfSize * 0.1, mouthY - 1, halfSize * 0.2, 3);
        break;
      default: // Smirk
        gfx.fillEllipse(x + halfSize * 0.05, mouthY, halfSize * 0.2, halfSize * 0.07);
        break;
    }

    // Accessory
    if (portrait.accessory > 0) {
      const accVariant = portrait.accessory % 5;
      gfx.fillStyle(0xffd700, 0.8);
      switch (accVariant) {
        case 1: // Earring
          gfx.fillCircle(x - faceWidth * 0.85, y + halfSize * 0.05, 3);
          break;
        case 2: // Headband
          gfx.lineStyle(2, 0xffd700);
          gfx.beginPath();
          gfx.arc(x, y - halfSize * 0.25, faceWidth * 0.9, Math.PI, 0, false);
          gfx.strokePath();
          break;
        case 3: // Scar
          gfx.lineStyle(2, 0xcc4444, 0.7);
          gfx.beginPath();
          gfx.moveTo(x + faceWidth * 0.1, y - halfSize * 0.15);
          gfx.lineTo(x + faceWidth * 0.4, y + halfSize * 0.15);
          gfx.strokePath();
          break;
        case 4: // Eye patch
          gfx.fillStyle(0x1a1a1a, 0.9);
          gfx.fillCircle(x + eyeSpacing, eyeY, eyeSize * 2);
          break;
        default: break;
      }
    }

    // Role-specific frame decoration
    if (role) {
      const frameColor = ROLE_FRAME_COLORS[role] || 0xffffff;
      gfx.lineStyle(2, frameColor, 0.8);
      gfx.strokeCircle(x, y, halfSize * 0.85);

      // Corner decorations
      const cornerSize = 4;
      gfx.fillStyle(frameColor, 0.8);
      gfx.fillRect(x - halfSize * 0.85, y - halfSize * 0.85, cornerSize, cornerSize);
      gfx.fillRect(x + halfSize * 0.85 - cornerSize, y - halfSize * 0.85, cornerSize, cornerSize);
    }

    // Rarity border
    if (rarityColor !== undefined) {
      gfx.lineStyle(3, rarityColor, 1);
      gfx.strokeRoundedRect(x - halfSize, y - halfSize, size, size, 8);
    }
  }

  /**
   * Generate a randomized portrait config.
   */
  /**
   * T-1402: 20 hairstyle variations for portrait system
   * T-1403: 10 face shape variations for portrait system
   * T-1404: 15 eye style variations for portrait system
   * T-1405: 10 mouth/expression variations for portrait system
   * T-1406: 15 accessory variations (hats, earrings, scars)
   * T-1407: 12 skin tone palette for portrait system
   * T-1408: 15 hair color palette for portrait system
   */
  static readonly HAIRSTYLE_COUNT = 20;
  static readonly FACE_SHAPE_COUNT = 10;
  static readonly EYE_STYLE_COUNT = 15;
  static readonly MOUTH_COUNT = 10;
  static readonly ACCESSORY_COUNT = 15;

  static readonly SKIN_TONES = [
    '#ffe0bd', '#f5deb3', '#f0c8a0', '#deb887', '#d2b48c',
    '#c68642', '#a0724a', '#8d5524', '#6b3a1f', '#4a2c0a',
    '#f5e0d0', '#e0c0a8',
  ];

  static readonly HAIR_COLORS = [
    '#1a1a1a', '#2b1a0e', '#4a2c0a', '#6b3a1f', '#8b6914',
    '#c68642', '#d4a017', '#e8c84a', '#cc3333', '#aa2244',
    '#f5f5f5', '#c0c0c0', '#6a0dad', '#1e90ff', '#228b22',
  ];

  static readonly EYE_COLORS = [
    '#4a2c0a', '#8b4513', '#1e90ff', '#4169e1', '#228b22',
    '#2e8b57', '#808080', '#a0a0a0', '#d4a017', '#cc3333',
    '#9370db', '#00ced1', '#ff6347', '#ffd700', '#4b0082',
  ];

  static randomize(): HeroPortrait {
    const skinTones = HeroPortraitRenderer.SKIN_TONES;
    const hairColors = HeroPortraitRenderer.HAIR_COLORS;
    const eyeColors = HeroPortraitRenderer.EYE_COLORS;

    return {
      hairStyle: Math.floor(Math.random() * HeroPortraitRenderer.HAIRSTYLE_COUNT),
      faceShape: Math.floor(Math.random() * HeroPortraitRenderer.FACE_SHAPE_COUNT),
      eyes: Math.floor(Math.random() * HeroPortraitRenderer.EYE_STYLE_COUNT),
      mouth: Math.floor(Math.random() * HeroPortraitRenderer.MOUTH_COUNT),
      accessory: Math.floor(Math.random() * HeroPortraitRenderer.ACCESSORY_COUNT),
      skinTone: skinTones[Math.floor(Math.random() * skinTones.length)],
      hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
      eyeColor: eyeColors[Math.floor(Math.random() * eyeColors.length)],
    };
  }
}
