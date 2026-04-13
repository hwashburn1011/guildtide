/**
 * Item drop animation from expedition loot.
 * T-0753: Implement item drop animation from expedition loot.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

const RARITY_COLORS: Record<string, { hex: string; glow: number }> = {
  common: { hex: '#a0a0b0', glow: 0xa0a0b0 },
  uncommon: { hex: '#4ecca3', glow: 0x4ecca3 },
  rare: { hex: '#4dabf7', glow: 0x4dabf7 },
  epic: { hex: '#b366ff', glow: 0xb366ff },
  legendary: { hex: '#ffd700', glow: 0xffd700 },
};

interface LootDrop {
  name: string;
  rarity: string;
  quantity: number;
}

export class ItemDropAnimation {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Play loot drop animation for multiple items */
  playLootDrop(items: LootDrop[], startX?: number, startY?: number): void {
    const sx = startX ?? GAME_WIDTH / 2;
    const sy = startY ?? GAME_HEIGHT / 3;

    items.forEach((item, index) => {
      this.scene.time.delayedCall(index * 300, () => {
        this.animateSingleDrop(item, sx, sy, index);
      });
    });
  }

  private animateSingleDrop(item: LootDrop, startX: number, startY: number, index: number): void {
    const colors = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
    const isLegendary = item.rarity === 'legendary';
    const isEpic = item.rarity === 'epic';

    // Target position (spread out items)
    const targetX = startX + (index - 2) * 120;
    const targetY = startY + 100;

    // Glow effect for rare+ items
    if (isLegendary || isEpic) {
      const glow = this.scene.add.graphics().setDepth(198);
      glow.fillStyle(colors.glow, 0.3);
      glow.fillCircle(targetX, targetY, 30);
      glow.setAlpha(0);

      this.scene.tweens.add({
        targets: glow,
        alpha: { from: 0, to: 0.6 },
        duration: 400,
        delay: 200,
        yoyo: true,
        repeat: 2,
        onComplete: () => glow.destroy(),
      });
    }

    // Item card background
    const cardW = 100;
    const cardH = 50;
    const card = this.scene.add.graphics().setDepth(199);
    card.fillStyle(0x0a0a1e, 0.9);
    card.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
    card.lineStyle(2, colors.glow);
    card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
    card.setPosition(startX, startY - 50);
    card.setAlpha(0);
    card.setScale(0.3);

    // Item name text
    const nameText = this.scene.add.text(startX, startY - 55, item.name, {
      fontFamily: FONTS.primary,
      fontSize: '11px',
      color: colors.hex,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    // Quantity text
    const qtyText = this.scene.add.text(startX, startY - 40, `x${item.quantity}`, {
      fontFamily: FONTS.primary,
      fontSize: '10px',
      color: COLORS.textSecondary,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    // Rarity label
    const rarityText = this.scene.add.text(startX, startY - 28, item.rarity.toUpperCase(), {
      fontFamily: FONTS.primary,
      fontSize: '8px',
      color: colors.hex,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    // Drop animation — falls from above with bounce
    this.scene.tweens.add({
      targets: [card],
      y: targetY,
      alpha: 1,
      scale: 1,
      duration: 500,
      ease: 'Bounce.easeOut',
    });

    this.scene.tweens.add({
      targets: [nameText],
      y: targetY - 10,
      alpha: 1,
      duration: 500,
      ease: 'Bounce.easeOut',
    });

    this.scene.tweens.add({
      targets: [qtyText],
      y: targetY + 5,
      alpha: 1,
      duration: 500,
      ease: 'Bounce.easeOut',
    });

    this.scene.tweens.add({
      targets: [rarityText],
      y: targetY + 18,
      alpha: 1,
      duration: 500,
      ease: 'Bounce.easeOut',
    });

    // Sparkle particles for legendary
    if (isLegendary) {
      for (let i = 0; i < 8; i++) {
        const spark = this.scene.add.text(
          targetX + (Math.random() - 0.5) * 60,
          targetY + (Math.random() - 0.5) * 40,
          '\u2605',
          { fontFamily: FONTS.primary, fontSize: '8px', color: '#ffd700' }
        ).setOrigin(0.5).setDepth(201).setAlpha(0);

        this.scene.tweens.add({
          targets: spark,
          alpha: { from: 0, to: 1 },
          y: spark.y - 20,
          duration: 600,
          delay: 500 + i * 100,
          yoyo: true,
          onComplete: () => spark.destroy(),
        });
      }
    }

    // Fade out after display
    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: [card, nameText, qtyText, rarityText],
        alpha: 0,
        y: '-=20',
        duration: 400,
        onComplete: () => {
          card.destroy();
          nameText.destroy();
          qtyText.destroy();
          rarityText.destroy();
        },
      });
    });
  }
}
