import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Loading bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(COLORS.panelBg, 0.8);
    progressBox.fillRect(centerX - 160, centerY - 25, 320, 50);

    const loadingText = this.add.text(centerX, centerY - 50, 'Loading...', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textPrimary,
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(COLORS.accent, 1);
      progressBar.fillRect(centerX - 150, centerY - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Placeholder: no assets to load yet, but this is where they'll go
    // this.load.image('logo', 'assets/sprites/logo.png');
  }

  create(): void {
    // Check for stored auth token
    const token = localStorage.getItem('guildtide_token');
    if (token) {
      this.scene.start('GuildHallScene');
    } else {
      this.scene.start('LoginScene');
    }
  }
}
