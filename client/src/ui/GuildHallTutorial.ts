import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIButton } from './components/UIButton';

interface TutorialStep {
  title: string;
  text: string;
  targetX: number;
  targetY: number;
}

/**
 * First-time guild hall tutorial walkthrough.
 * Highlights key UI areas and explains functionality.
 */
export class GuildHallTutorial {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private steps: TutorialStep[];
  private currentStep: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(3000);

    this.steps = [
      {
        title: 'Welcome to Your Guild Hall!',
        text: 'This is your base of operations. From here you can build structures, manage heroes, and grow your guild.',
        targetX: GAME_WIDTH / 2,
        targetY: GAME_HEIGHT / 2,
      },
      {
        title: 'Resource Bar',
        text: 'Your resources are shown here. Buildings produce resources automatically over time.',
        targetX: GAME_WIDTH / 2,
        targetY: 75,
      },
      {
        title: 'Guild Info',
        text: 'Your guild level and XP are displayed here. Level up to unlock new buildings and features!',
        targetX: 300,
        targetY: 110,
      },
      {
        title: 'Buildings',
        text: 'Build and upgrade structures to produce resources. Click "Build" in the header to see available buildings.',
        targetX: GAME_WIDTH / 2,
        targetY: 250,
      },
      {
        title: 'Daily Rewards',
        text: 'Log in every day to claim rewards! Your streak increases the bonus.',
        targetX: GAME_WIDTH - 200,
        targetY: 110,
      },
      {
        title: 'Navigation',
        text: 'Use the bottom bar to access Expeditions, Market, World Map, and Research as you level up.',
        targetX: GAME_WIDTH / 2,
        targetY: GAME_HEIGHT - 50,
      },
    ];

    this.showStep();
  }

  private showStep(): void {
    this.container.removeAll(true);

    if (this.currentStep >= this.steps.length) {
      this.complete();
      return;
    }

    const step = this.steps[this.currentStep];

    // Semi-transparent overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.container.add(overlay);

    // Spotlight circle at target
    overlay.fillStyle(0x000000, 0); // Clear the spotlight area
    // We can't easily cut a hole in Phaser graphics, so we use a lighter circle
    const spotlight = this.scene.add.graphics();
    spotlight.fillStyle(0xffd700, 0.1);
    spotlight.fillCircle(step.targetX, step.targetY, 60);
    spotlight.lineStyle(2, COLORS.gold, 0.6);
    spotlight.strokeCircle(step.targetX, step.targetY, 60);
    this.container.add(spotlight);

    // Tooltip box
    const boxW = 380;
    const boxH = 140;
    let boxX = step.targetX - boxW / 2;
    let boxY = step.targetY + 80;

    // Clamp to screen
    boxX = Phaser.Math.Clamp(boxX, 20, GAME_WIDTH - boxW - 20);
    boxY = Phaser.Math.Clamp(boxY, 20, GAME_HEIGHT - boxH - 20);

    // If target is low, place box above
    if (boxY + boxH > GAME_HEIGHT - 60) {
      boxY = step.targetY - boxH - 80;
    }

    const box = this.scene.add.graphics();
    box.fillStyle(COLORS.panelBg, 0.95);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 10);
    box.lineStyle(2, COLORS.gold, 0.8);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 10);
    this.container.add(box);

    // Step indicator
    this.container.add(
      this.scene.add.text(boxX + boxW - 10, boxY + 8, `${this.currentStep + 1}/${this.steps.length}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      }).setOrigin(1, 0),
    );

    // Title
    this.container.add(
      this.scene.add.text(boxX + 15, boxY + 12, step.title, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );

    // Text
    this.container.add(
      this.scene.add.text(boxX + 15, boxY + 38, step.text, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        wordWrap: { width: boxW - 30 },
        lineSpacing: 3,
      }),
    );

    // Next button
    const isLast = this.currentStep === this.steps.length - 1;
    const nextBtn = new UIButton(this.scene, {
      x: boxX + boxW - 110,
      y: boxY + boxH - 45,
      width: 90,
      height: 32,
      text: isLast ? 'Got it!' : 'Next',
      variant: 'primary',
      fontSize: FONTS.sizes.small,
      onClick: () => {
        this.currentStep++;
        this.showStep();
      },
    });
    this.container.add(nextBtn);

    // Skip button
    if (!isLast) {
      const skipBtn = this.scene.add.text(boxX + 15, boxY + boxH - 30, 'Skip Tutorial', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      }).setInteractive({ useHandCursor: true });

      skipBtn.on('pointerup', () => this.complete());
      skipBtn.on('pointerover', () => skipBtn.setColor(COLORS.textAccent));
      skipBtn.on('pointerout', () => skipBtn.setColor(COLORS.textSecondary));
      this.container.add(skipBtn);
    }
  }

  private complete(): void {
    // Mark tutorial as seen
    localStorage.setItem('guildtide_guild_tutorial_seen', 'true');

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 300,
      onComplete: () => this.container.destroy(),
    });
  }

  static shouldShow(): boolean {
    return !localStorage.getItem('guildtide_guild_tutorial_seen');
  }
}
