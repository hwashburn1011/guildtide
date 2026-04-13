import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

/**
 * Social tutorial introducing multiplayer features (T-1224).
 * Shows a sequence of guided steps explaining social features.
 */
export class SocialTutorial {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private currentStep: number = 0;
  private overlay: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private stepText: Phaser.GameObjects.Text;
  private nextBtn: Phaser.GameObjects.Text;
  private skipBtn: Phaser.GameObjects.Text;

  private steps = [
    {
      title: 'Welcome to the Social Hub!',
      body: 'This is your gateway to multiplayer features. Connect with other players, form alliances, trade resources, and compete on leaderboards.',
    },
    {
      title: 'Friends',
      body: 'Search for other players and add them as friends. View their online status, send gifts, and initiate trades directly from your friend list.',
    },
    {
      title: 'Chat',
      body: 'Stay connected with Global chat (all players), Alliance chat (your alliance only), and Private messages (direct to a friend).',
    },
    {
      title: 'Alliances',
      body: 'Create or join an alliance with up to 25 guilds. Work together on joint expeditions, share resources through the treasury, and unlock alliance perks.',
    },
    {
      title: 'Guild Wars',
      body: 'Challenge rival guilds to async competitive events. Set objectives like most expeditions or highest trade volume, place wagers, and earn rewards.',
    },
    {
      title: 'Leaderboards',
      body: 'Compete across categories: Guild Level, Wealth, Expeditions, Trade Volume, Hero Power, and Alliance Rank. Weekly resets award top players.',
    },
    {
      title: 'World Boss Events',
      body: 'Periodically, powerful world bosses appear. All alliance members must cooperate to deal enough damage before time runs out. Rewards scale with contribution.',
    },
    {
      title: 'Ready to Go!',
      body: 'Explore the Social Hub tabs to discover all features. Add friends, join an alliance, and start climbing the leaderboards!',
    },
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1000);

    // Semi-transparent overlay
    this.overlay = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7,
    );
    this.container.add(this.overlay);

    // Tutorial panel
    const pw = 600;
    const ph = 300;
    this.panel = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, pw, ph, COLORS.panelBg,
    ).setStrokeStyle(2, COLORS.gold);
    this.container.add(this.panel);

    // Title
    this.titleText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
    }).setOrigin(0.5);
    this.container.add(this.titleText);

    // Body
    this.bodyText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
      wordWrap: { width: pw - 60 },
      align: 'center',
    }).setOrigin(0.5);
    this.container.add(this.bodyText);

    // Step indicator
    this.stepText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    }).setOrigin(0.5);
    this.container.add(this.stepText);

    // Next button
    this.nextBtn = scene.add.text(GAME_WIDTH / 2 + 100, GAME_HEIGHT / 2 + 120, 'Next >', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.nextStep());
    this.container.add(this.nextBtn);

    // Skip button
    this.skipBtn = scene.add.text(GAME_WIDTH / 2 - 100, GAME_HEIGHT / 2 + 120, 'Skip', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.close());
    this.container.add(this.skipBtn);

    this.showStep(0);
  }

  private showStep(step: number): void {
    if (step >= this.steps.length) {
      this.close();
      return;
    }

    this.currentStep = step;
    const s = this.steps[step];
    this.titleText.setText(s.title);
    this.bodyText.setText(s.body);
    this.stepText.setText(`Step ${step + 1} of ${this.steps.length}`);

    if (step === this.steps.length - 1) {
      this.nextBtn.setText('Done');
    } else {
      this.nextBtn.setText('Next >');
    }
  }

  private nextStep(): void {
    this.showStep(this.currentStep + 1);
  }

  private close(): void {
    this.container.destroy();
    // Store that tutorial has been seen
    localStorage.setItem('guildtide_social_tutorial_seen', 'true');
  }

  static shouldShow(): boolean {
    return !localStorage.getItem('guildtide_social_tutorial_seen');
  }
}
