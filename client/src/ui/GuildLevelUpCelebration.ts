import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

/**
 * Full-screen celebration overlay for guild level-ups.
 * Shows the new level, rewards earned, and particle effects.
 */
export class GuildLevelUpCelebration {
  static show(
    scene: Phaser.Scene,
    newLevel: number,
    rewardLabel: string,
    resourcesGranted: Record<string, number>,
  ): void {
    const container = scene.add.container(0, 0);
    container.setDepth(2000);
    container.setAlpha(0);

    // Dark overlay
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    container.add(overlay);

    // Glow effect behind text
    const glow = scene.add.graphics();
    glow.fillStyle(COLORS.gold, 0.15);
    glow.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 120);
    container.add(glow);

    // Level up text
    const levelUpText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'LEVEL UP!', {
      fontFamily: FONTS.primary,
      fontSize: '42px',
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(levelUpText);

    // New level
    const newLevelText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, `Level ${newLevel}`, {
      fontFamily: FONTS.primary,
      fontSize: '28px',
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(newLevelText);

    // Reward label
    if (rewardLabel) {
      const rewardText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15, rewardLabel, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: '#4ecca3',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(rewardText);
    }

    // Resource grants
    const entries = Object.entries(resourcesGranted).filter(([, v]) => v > 0);
    if (entries.length > 0) {
      const rewardStr = entries.map(([res, amt]) => `+${amt} ${res}`).join('  ');
      const grantsText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, rewardStr, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold,
      }).setOrigin(0.5);
      container.add(grantsText);
    }

    // Tap to continue
    const continueText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, 'Tap to continue', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);
    container.add(continueText);

    // Pulse animation on continue text
    scene.tweens.add({
      targets: continueText,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Particle-like stars
    for (let i = 0; i < 20; i++) {
      const starX = Phaser.Math.Between(100, GAME_WIDTH - 100);
      const starY = Phaser.Math.Between(50, GAME_HEIGHT - 100);
      const star = scene.add.text(starX, starY, '\u2605', {
        fontFamily: FONTS.primary,
        fontSize: `${Phaser.Math.Between(12, 28)}px`,
        color: COLORS.textGold,
      }).setOrigin(0.5).setAlpha(0);
      container.add(star);

      scene.tweens.add({
        targets: star,
        alpha: { from: 0, to: 0.8 },
        scale: { from: 0, to: 1.2 },
        duration: Phaser.Math.Between(300, 800),
        delay: Phaser.Math.Between(100, 600),
        yoyo: true,
        repeat: 2,
      });
    }

    // Scale-in effect for level text
    levelUpText.setScale(0);
    scene.tweens.add({
      targets: levelUpText,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    newLevelText.setScale(0);
    scene.tweens.add({
      targets: newLevelText,
      scale: 1,
      duration: 500,
      delay: 200,
      ease: 'Back.easeOut',
    });

    // Fade in
    scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: 300,
    });

    // Click to dismiss
    const dismissZone = scene.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    dismissZone.setInteractive();
    container.add(dismissZone);

    dismissZone.on('pointerup', () => {
      scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        onComplete: () => container.destroy(),
      });
    });

    // Auto-dismiss after 5 seconds
    scene.time.delayedCall(5000, () => {
      if (container.active) {
        scene.tweens.add({
          targets: container,
          alpha: 0,
          duration: 300,
          onComplete: () => container.destroy(),
        });
      }
    });
  }
}
