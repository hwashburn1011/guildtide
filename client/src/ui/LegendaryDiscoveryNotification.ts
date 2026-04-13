/**
 * Legendary item discovery notification with fanfare animation.
 * T-0736, T-0737: Legendary item system with discovery notification.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

export class LegendaryDiscoveryNotification {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Show a legendary item discovery notification with animation */
  show(itemName: string, lore?: string): void {
    const container = this.scene.add.container(0, 0).setDepth(500);

    // Full-screen flash
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffd700, 0.5);
    flash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    container.add(flash);

    // Fade flash
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
    });

    // Background panel
    const panelW = 500;
    const panelH = 200;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a1e, 0.95);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(3, 0xffd700);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    container.add(bg);

    // Golden border glow animation
    const glowBorder = this.scene.add.graphics();
    glowBorder.lineStyle(2, 0xffd700, 0.5);
    glowBorder.strokeRoundedRect(px - 4, py - 4, panelW + 8, panelH + 8, 14);
    container.add(glowBorder);

    this.scene.tweens.add({
      targets: glowBorder,
      alpha: { from: 0.3, to: 1 },
      duration: 600,
      yoyo: true,
      repeat: 3,
    });

    // Star particles around the panel
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 120 + Math.random() * 40;
      const starX = GAME_WIDTH / 2 + Math.cos(angle) * radius;
      const starY = GAME_HEIGHT / 2 + Math.sin(angle) * radius;

      const star = this.scene.add.text(starX, starY, '\u2605', {
        fontFamily: FONTS.primary,
        fontSize: `${12 + Math.random() * 8}px`,
        color: '#ffd700',
      }).setOrigin(0.5).setAlpha(0);
      container.add(star);

      this.scene.tweens.add({
        targets: star,
        alpha: { from: 0, to: 1 },
        scale: { from: 0, to: 1.2 },
        duration: 400,
        delay: 200 + i * 80,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: star,
            alpha: 0,
            scale: 0.5,
            duration: 800,
            delay: 1500,
          });
        },
      });
    }

    // "LEGENDARY" header
    const header = this.scene.add.text(GAME_WIDTH / 2, py + 25, '\u2605 LEGENDARY ITEM DISCOVERED \u2605', {
      fontFamily: FONTS.primary,
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScale(0);
    container.add(header);

    this.scene.tweens.add({
      targets: header,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
      delay: 300,
    });

    // Item name
    const nameText = this.scene.add.text(GAME_WIDTH / 2, py + 65, itemName, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    container.add(nameText);

    this.scene.tweens.add({
      targets: nameText,
      alpha: 1,
      y: py + 70,
      duration: 600,
      delay: 600,
    });

    // Lore text
    if (lore) {
      const loreText = this.scene.add.text(GAME_WIDTH / 2, py + 110, `"${lore}"`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: '#c0a050',
        align: 'center',
        wordWrap: { width: panelW - 60 },
      }).setOrigin(0.5).setAlpha(0);
      container.add(loreText);

      this.scene.tweens.add({
        targets: loreText,
        alpha: 1,
        duration: 800,
        delay: 1000,
      });
    }

    // Click to dismiss
    const dismissText = this.scene.add.text(GAME_WIDTH / 2, py + panelH - 20, 'Click to dismiss', {
      fontFamily: FONTS.primary,
      fontSize: '10px',
      color: '#6a6a7a',
    }).setOrigin(0.5).setAlpha(0);
    container.add(dismissText);

    this.scene.tweens.add({
      targets: dismissText,
      alpha: 1,
      duration: 500,
      delay: 1500,
    });

    // Make clickable to dismiss
    const hitArea = this.scene.add.graphics();
    hitArea.fillStyle(0x000000, 0.01);
    hitArea.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    hitArea.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    container.add(hitArea);

    hitArea.on('pointerup', () => {
      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 400,
        onComplete: () => container.destroy(true),
      });
    });

    // Auto-dismiss after 8 seconds
    this.scene.time.delayedCall(8000, () => {
      if (container && container.active) {
        this.scene.tweens.add({
          targets: container,
          alpha: 0,
          duration: 400,
          onComplete: () => container.destroy(true),
        });
      }
    });
  }
}
