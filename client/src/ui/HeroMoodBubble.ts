import * as Phaser from 'phaser';
import { FONTS } from '../config';

/**
 * Hero mood dialog bubbles shown on the guild hall scene.
 * T-0442: Hero mood dialog bubbles
 * T-0457: Hero voice line text system for interactions
 */

const MOOD_LINES: Record<string, string[]> = {
  happy: [
    'What a great day!', 'I love this guild!', 'Feeling unstoppable!',
    'Best guild ever!', 'Let\'s go on an adventure!',
  ],
  neutral: [
    'Just another day...', 'Hmm, what to do?', 'Could use some action.',
    'The weather is nice.', 'I wonder what\'s for lunch.',
  ],
  unhappy: [
    'Sigh...', 'I\'ve seen better days...', 'Need a break...',
    'This isn\'t what I signed up for.', 'When\'s my day off?',
  ],
  angry: [
    'I can\'t take this anymore!', 'Why does nobody listen?',
    'I\'m thinking about leaving...', 'This is unfair!',
  ],
};

export class HeroMoodBubble {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show a temporary speech bubble for a hero.
   * @param x world x position
   * @param y world y position
   * @param heroName hero's name
   * @param morale morale value (0-100)
   * @param voiceLine optional specific voice line
   */
  show(x: number, y: number, heroName: string, morale: number, voiceLine?: string): void {
    this.hide();

    const mood = morale >= 80 ? 'happy' : morale >= 60 ? 'neutral' : morale >= 40 ? 'unhappy' : 'angry';
    const line = voiceLine || this.getRandomLine(mood);

    this.container = this.scene.add.container(x, y - 40).setDepth(150);

    // Bubble background
    const text = this.scene.add.text(0, 0, `${heroName}: "${line}"`, {
      fontFamily: FONTS.primary,
      fontSize: '11px',
      color: '#ffffff',
      wordWrap: { width: 180 },
      padding: { x: 8, y: 6 },
    });

    const bubbleW = text.width + 16;
    const bubbleH = text.height + 12;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a3e, 0.92);
    bg.fillRoundedRect(-bubbleW / 2, -bubbleH, bubbleW, bubbleH, 8);
    // Triangle pointer
    bg.fillTriangle(
      -5, 0,
      5, 0,
      0, 8,
    );
    bg.lineStyle(1, 0x4a4a6a);
    bg.strokeRoundedRect(-bubbleW / 2, -bubbleH, bubbleW, bubbleH, 8);

    text.setPosition(-bubbleW / 2 + 8, -bubbleH + 6);

    this.container.add(bg);
    this.container.add(text);

    // Fade in
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });

    // Auto-hide after 4 seconds
    this.timer = this.scene.time.delayedCall(4000, () => {
      if (this.container) {
        this.scene.tweens.add({
          targets: this.container,
          alpha: 0,
          duration: 500,
          ease: 'Power2',
          onComplete: () => this.hide(),
        });
      }
    });
  }

  private getRandomLine(mood: string): string {
    const lines = MOOD_LINES[mood] || MOOD_LINES.neutral;
    return lines[Math.floor(Math.random() * lines.length)];
  }

  hide(): void {
    this.timer?.destroy();
    this.container?.destroy(true);
    this.container = null;
    this.timer = null;
  }
}
