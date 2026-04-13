import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

interface TutorialStep {
  title: string;
  text: string;
  highlightX: number;
  highlightY: number;
  arrowDir: 'down' | 'up' | 'left' | 'right';
}

const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Guildtide!',
    text: 'You are the leader of a new guild.\nLet\'s get started building your empire.',
    highlightX: GAME_WIDTH / 2,
    highlightY: GAME_HEIGHT / 2,
    arrowDir: 'down',
  },
  {
    title: 'Build your first Farm',
    text: 'Buildings produce resources over time.\nClick "Upgrade" on the Farm to get started.',
    highlightX: 140,
    highlightY: 160,
    arrowDir: 'down',
  },
  {
    title: 'Recruit a Hero',
    text: 'Heroes can be assigned to buildings\nand sent on expeditions.',
    highlightX: GAME_WIDTH - 160,
    highlightY: 20,
    arrowDir: 'up',
  },
  {
    title: 'Assign your Hero',
    text: 'Assign heroes to buildings to boost\ntheir resource output.',
    highlightX: GAME_WIDTH - 160,
    highlightY: 20,
    arrowDir: 'up',
  },
  {
    title: 'Check the Weather',
    text: 'Weather affects your guild\'s production\nand triggers special events.',
    highlightX: GAME_WIDTH - 120,
    highlightY: 160,
    arrowDir: 'down',
  },
  {
    title: 'You\'re ready!',
    text: 'Explore expeditions, the market, and research.\nYour guild awaits, leader!',
    highlightX: GAME_WIDTH / 2,
    highlightY: GAME_HEIGHT / 2,
    arrowDir: 'down',
  },
];

const STORAGE_KEY = 'guildtide_tutorial_complete';

export class TutorialOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private currentStep = 0;

  static shouldShow(guildLevel: number, buildingCount: number): boolean {
    if (localStorage.getItem(STORAGE_KEY) === 'true') return false;
    return guildLevel <= 1 && buildingCount === 0;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(900);
    this.renderStep();
  }

  private renderStep(): void {
    this.container.removeAll(true);

    const step = STEPS[this.currentStep];

    // Semi-transparent backdrop
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.6);
    backdrop.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    backdrop.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.container.add(backdrop);

    // Tooltip box
    const boxW = 360;
    const boxH = 140;
    let boxX = step.highlightX - boxW / 2;
    let boxY = step.arrowDir === 'up' ? step.highlightY + 40 : step.highlightY - boxH - 40;

    // Clamp to screen
    boxX = Phaser.Math.Clamp(boxX, 10, GAME_WIDTH - boxW - 10);
    boxY = Phaser.Math.Clamp(boxY, 10, GAME_HEIGHT - boxH - 60);

    const box = this.scene.add.graphics();
    box.fillStyle(COLORS.panelBg, 0.97);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 10);
    box.lineStyle(2, COLORS.accent);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 10);
    this.container.add(box);

    // Arrow indicator
    const arrowX = Phaser.Math.Clamp(step.highlightX, boxX + 20, boxX + boxW - 20);
    const arrow = this.scene.add.graphics();
    arrow.fillStyle(COLORS.accent, 1);
    if (step.arrowDir === 'down') {
      arrow.fillTriangle(arrowX - 10, boxY + boxH, arrowX + 10, boxY + boxH, arrowX, boxY + boxH + 14);
    } else {
      arrow.fillTriangle(arrowX - 10, boxY, arrowX + 10, boxY, arrowX, boxY - 14);
    }
    this.container.add(arrow);

    // Step counter
    const counter = this.scene.add.text(boxX + boxW - 12, boxY + 10,
      `${this.currentStep + 1}/${STEPS.length}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0);
    this.container.add(counter);

    // Title
    const title = this.scene.add.text(boxX + 20, boxY + 14, step.title, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    });
    this.container.add(title);

    // Body text
    const body = this.scene.add.text(boxX + 20, boxY + 44, step.text, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      lineSpacing: 4,
    });
    this.container.add(body);

    // Next / Skip buttons
    const isLast = this.currentStep === STEPS.length - 1;

    const nextBtn = this.scene.add.text(boxX + boxW - 20, boxY + boxH - 16,
      isLast ? 'Start Playing' : 'Next', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ffffff',
      backgroundColor: '#e94560',
      padding: { x: 14, y: 6 },
      fontStyle: 'bold',
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerup', () => {
      if (isLast) {
        this.complete();
      } else {
        this.currentStep++;
        this.renderStep();
      }
    });
    this.container.add(nextBtn);

    if (!isLast) {
      const skipBtn = this.scene.add.text(boxX + 20, boxY + boxH - 16, 'Skip Tutorial', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      }).setOrigin(0, 1).setInteractive({ useHandCursor: true });

      skipBtn.on('pointerup', () => this.complete());
      this.container.add(skipBtn);
    }
  }

  private complete(): void {
    localStorage.setItem(STORAGE_KEY, 'true');
    this.container.destroy();
  }
}
