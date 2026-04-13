/**
 * Item visual preview on hero portrait when equipped.
 * T-0725, T-0726, T-0727: Item visual preview with weapon/armor variations.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';

const RARITY_GLOW: Record<string, number> = {
  common: 0x606070,
  uncommon: 0x4ecca3,
  rare: 0x4dabf7,
  epic: 0xb366ff,
  legendary: 0xffd700,
};

const WEAPON_SYMBOLS: Record<string, string> = {
  sword: '\u2694',   // crossed swords
  staff: '\u2756',   // diamond
  bow: '\u27B3',     // arrow
  dagger: '\u2020',  // dagger
  mace: '\u2726',    // star
};

const SLOT_POSITIONS: Record<string, { x: number; y: number }> = {
  weapon: { x: -35, y: -10 },
  armor: { x: 0, y: 5 },
  helmet: { x: 0, y: -30 },
  boots: { x: 0, y: 35 },
  shield: { x: 35, y: -5 },
  ring: { x: -30, y: 20 },
  amulet: { x: 0, y: -15 },
  belt: { x: 0, y: 18 },
  cloak: { x: 25, y: 0 },
  charm: { x: -25, y: 25 },
  tool: { x: 30, y: 25 },
};

export class ItemVisualPreview {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Render equipment visual indicators around a hero portrait */
  renderEquipmentPreview(
    container: Phaser.GameObjects.Container,
    centerX: number,
    centerY: number,
    equipment: Record<string, string | null>,
    templateMap: Map<string, any>,
  ): void {
    for (const [slot, templateId] of Object.entries(equipment)) {
      if (!templateId) continue;

      const template = templateMap.get(templateId);
      if (!template) continue;

      const pos = SLOT_POSITIONS[slot];
      if (!pos) continue;

      const drawX = centerX + pos.x;
      const drawY = centerY + pos.y;

      const glowColor = RARITY_GLOW[template.rarity] || 0x606070;

      // Draw slot indicator
      const indicator = this.scene.add.graphics();

      // Glow ring
      indicator.lineStyle(2, glowColor, 0.8);
      indicator.strokeCircle(drawX, drawY, 8);

      // Fill based on rarity
      indicator.fillStyle(glowColor, 0.3);
      indicator.fillCircle(drawX, drawY, 7);

      container.add(indicator);

      // Weapon type symbol
      if (slot === 'weapon' && template.weaponType) {
        const symbol = WEAPON_SYMBOLS[template.weaponType] || '\u2605';
        const symbolText = this.scene.add.text(drawX, drawY, symbol, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: '#ffffff',
        }).setOrigin(0.5);
        container.add(symbolText);
      }

      // Rarity-colored dot for non-weapon slots
      if (slot !== 'weapon') {
        const rarityDot = this.scene.add.graphics();
        rarityDot.fillStyle(glowColor, 1);
        rarityDot.fillCircle(drawX, drawY, 3);
        container.add(rarityDot);
      }
    }
  }

  /** Render a paper-doll equipment display */
  renderPaperDoll(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    equipment: Record<string, string | null>,
    templateMap: Map<string, any>,
  ): void {
    const slots = [
      { slot: 'helmet', label: 'Head', x: 80, y: 0 },
      { slot: 'amulet', label: 'Neck', x: 130, y: 25 },
      { slot: 'cloak', label: 'Back', x: 30, y: 25 },
      { slot: 'armor', label: 'Chest', x: 80, y: 55 },
      { slot: 'weapon', label: 'Weapon', x: 10, y: 65 },
      { slot: 'shield', label: 'Shield', x: 150, y: 65 },
      { slot: 'ring', label: 'Ring', x: 10, y: 100 },
      { slot: 'belt', label: 'Belt', x: 80, y: 95 },
      { slot: 'charm', label: 'Charm', x: 150, y: 100 },
      { slot: 'boots', label: 'Boots', x: 80, y: 130 },
      { slot: 'tool', label: 'Tool', x: 150, y: 130 },
    ];

    for (const { slot, label, x: sx, y: sy } of slots) {
      const drawX = x + sx;
      const drawY = y + sy;
      const templateId = equipment[slot] || null;
      const template = templateId ? templateMap.get(templateId) : null;

      const glowColor = template ? (RARITY_GLOW[template.rarity] || 0x606070) : 0x333355;

      // Slot background
      const slotBg = this.scene.add.graphics();
      slotBg.fillStyle(0x1a1a2e, 0.8);
      slotBg.fillRoundedRect(drawX, drawY, 32, 24, 3);
      slotBg.lineStyle(1, glowColor, template ? 1 : 0.3);
      slotBg.strokeRoundedRect(drawX, drawY, 32, 24, 3);
      container.add(slotBg);

      // Slot label
      container.add(
        this.scene.add.text(drawX + 16, drawY - 2, label, {
          fontFamily: FONTS.primary,
          fontSize: '7px',
          color: '#6a6a7a',
        }).setOrigin(0.5, 1)
      );

      if (template) {
        // Item name (abbreviated)
        const shortName = template.name.length > 8
          ? template.name.substring(0, 7) + '.'
          : template.name;

        container.add(
          this.scene.add.text(drawX + 16, drawY + 12, shortName, {
            fontFamily: FONTS.primary,
            fontSize: '7px',
            color: RARITY_GLOW[template.rarity] ? `#${RARITY_GLOW[template.rarity].toString(16).padStart(6, '0')}` : COLORS.textSecondary,
            fontStyle: 'bold',
          }).setOrigin(0.5)
        );
      } else {
        container.add(
          this.scene.add.text(drawX + 16, drawY + 12, 'Empty', {
            fontFamily: FONTS.primary,
            fontSize: '7px',
            color: '#444460',
          }).setOrigin(0.5)
        );
      }
    }
  }
}
