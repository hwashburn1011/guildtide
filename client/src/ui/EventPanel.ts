import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

/** T-0866/T-0867: Enhanced event display with rarity, category, illustrations, chain info */
const RARITY_BORDER_COLORS: Record<string, number> = {
  common: 0x888888,
  uncommon: 0x4ecca3,
  rare: 0x5b9bd5,
  legendary: 0xffd700,
};

const RARITY_LABEL_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#4ecca3',
  rare: '#5b9bd5',
  legendary: '#ffd700',
};

export class EventPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private onChanged: () => void;

  constructor(scene: Phaser.Scene, onChanged: () => void) {
    this.scene = scene;
    this.onChanged = onChanged;
  }

  show(event: any): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const rarity: string = event.rarity || 'common';
    const borderColor = RARITY_BORDER_COLORS[rarity] || RARITY_BORDER_COLORS.common;

    // Overlay
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(100);

    this.container = this.scene.add.container(0, 0).setDepth(101);

    const panelW = 600;
    const panelH = 480;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    // Background with rarity-colored border
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, borderColor);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    // Illustration placeholder area
    if (event.illustration) {
      const illustBg = this.scene.add.graphics();
      illustBg.fillStyle(COLORS.background, 0.5);
      illustBg.fillRoundedRect(px + panelW - 120, py + 15, 100, 60, 6);
      this.container.add(illustBg);
      this.container.add(
        this.scene.add.text(px + panelW - 70, py + 45, event.illustration, {
          fontFamily: FONTS.primary,
          fontSize: '9px',
          color: '#555',
          align: 'center',
        }).setOrigin(0.5)
      );
    }

    // Close button
    const closeBtn = this.scene.add.text(px + panelW - 20, py + 80, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // Event title
    this.container.add(
      this.scene.add.text(px + 25, py + 20, event.title, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      })
    );

    // Rarity + Category badges
    const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);
    this.container.add(
      this.scene.add.text(px + 25, py + 50, rarityLabel, {
        fontFamily: FONTS.primary,
        fontSize: '11px',
        color: RARITY_LABEL_COLORS[rarity] || '#aaa',
        fontStyle: 'bold',
      })
    );

    if (event.category) {
      this.container.add(
        this.scene.add.text(px + 110, py + 50, event.category, {
          fontFamily: FONTS.primary,
          fontSize: '11px',
          color: COLORS.textSecondary,
        })
      );
    }

    // Chain indicator
    if (event.chainId) {
      this.container.add(
        this.scene.add.text(px + 200, py + 50, `Chain Step ${event.chainStep || '?'}`, {
          fontFamily: FONTS.primary,
          fontSize: '11px',
          color: '#ffd700',
        })
      );
    }

    // Expiry with countdown
    const remainingMs = event.remainingMs || (new Date(event.expiresAt).getTime() - Date.now());
    const expiresIn = Math.max(0, Math.floor(remainingMs / 3600000));
    const expiresMinutes = Math.max(0, Math.floor((remainingMs % 3600000) / 60000));
    this.container.add(
      this.scene.add.text(px + 25, py + 68, `Expires in ${expiresIn}h ${expiresMinutes}m`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: expiresIn < 3 ? '#e94560' : COLORS.textSecondary,
      })
    );

    // Description
    this.container.add(
      this.scene.add.text(px + 25, py + 90, event.description, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        wordWrap: { width: panelW - 50 },
        lineSpacing: 4,
      })
    );

    // Choices
    let choiceY = py + 195;
    event.choices.forEach((choice: any, i: number) => {
      const choiceBg = this.scene.add.graphics();
      choiceBg.fillStyle(COLORS.background, 0.8);
      choiceBg.fillRoundedRect(px + 25, choiceY, panelW - 50, 65, 6);
      choiceBg.lineStyle(1, COLORS.panelBorder, 0.5);
      choiceBg.strokeRoundedRect(px + 25, choiceY, panelW - 50, 65, 6);
      this.container!.add(choiceBg);

      // Choice label
      this.container!.add(
        this.scene.add.text(px + 40, choiceY + 10, choice.label, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textAccent,
          fontStyle: 'bold',
        })
      );

      // Choice description
      this.container!.add(
        this.scene.add.text(px + 40, choiceY + 32, choice.description, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        })
      );

      // Risk indicator
      if (choice.risk > 0) {
        this.container!.add(
          this.scene.add.text(px + panelW - 40, choiceY + 10, `Risk: ${Math.round(choice.risk * 100)}%`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#f59f00',
          }).setOrigin(1, 0)
        );
      }

      // Requirements
      if (choice.requires) {
        const reqParts: string[] = [];
        if (choice.requires.heroRole) reqParts.push(`${choice.requires.heroCount || 1}x ${choice.requires.heroRole}`);
        if (choice.requires.resource) reqParts.push(`${choice.requires.amount} ${choice.requires.resource}`);
        if (reqParts.length > 0) {
          this.container!.add(
            this.scene.add.text(px + panelW - 40, choiceY + 48, `Requires: ${reqParts.join(', ')}`, {
              fontFamily: FONTS.primary,
              fontSize: '10px',
              color: '#6a6a7a',
            }).setOrigin(1, 0)
          );
        }
      }

      // Make the whole card clickable
      const hitZone = this.scene.add.zone(px + 25 + (panelW - 50) / 2, choiceY + 32, panelW - 50, 65)
        .setInteractive({ useHandCursor: true });
      hitZone.setDepth(102);

      hitZone.on('pointerover', () => {
        choiceBg.clear();
        choiceBg.fillStyle(0x0f3460, 0.9);
        choiceBg.fillRoundedRect(px + 25, choiceY, panelW - 50, 65, 6);
      });
      hitZone.on('pointerout', () => {
        choiceBg.clear();
        choiceBg.fillStyle(COLORS.background, 0.8);
        choiceBg.fillRoundedRect(px + 25, choiceY, panelW - 50, 65, 6);
      });
      hitZone.on('pointerup', () => this.handleChoice(event.id, i));

      this.container!.add(hitZone);

      choiceY += 75;
    });
  }

  private async handleChoice(eventId: string, choiceIndex: number): Promise<void> {
    try {
      const result = await apiClient.respondToEvent(eventId, choiceIndex);
      this.hide();

      // Show result modal
      this.showResult(result);
      this.onChanged();
    } catch (err) {
      // Show error in the panel
      const errorText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100,
        err instanceof Error ? err.message : 'Failed to respond', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#ff4444',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setDepth(200);

      this.scene.time.delayedCall(3000, () => errorText.destroy());
    }
  }

  private showResult(result: { success: boolean; narrative: string; rewards?: Record<string, number>; chainAdvanced?: boolean }): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const overlay = this.scene.add.graphics().setDepth(100);
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );

    const panelW = 450;
    const panelH = 250;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics().setDepth(101);
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, result.success ? 0x4ecca3 : 0xe94560);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);

    const title = this.scene.add.text(centerX, py + 25, result.success ? 'Success!' : 'Failed', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: result.success ? '#4ecca3' : '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    const narrative = this.scene.add.text(centerX, py + 65, result.narrative, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      wordWrap: { width: panelW - 40 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5, 0).setDepth(102);

    // Show rewards if success
    if (result.success && result.rewards) {
      let rewardY = py + 150;
      for (const [res, amount] of Object.entries(result.rewards)) {
        this.scene.add.text(centerX, rewardY, `+${amount} ${res}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#4ecca3',
          fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(102);
        rewardY += 22;
      }
    }

    // Chain advancement indicator
    if (result.chainAdvanced) {
      this.scene.add.text(centerX, py + panelH - 60, 'Chain continues...', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(102);
    }

    const okBtn = this.scene.add.text(centerX, py + panelH - 30, 'OK', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
      backgroundColor: '#e94560',
      padding: { x: 30, y: 8 },
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(102);

    okBtn.on('pointerup', () => {
      overlay.destroy();
      bg.destroy();
      title.destroy();
      narrative.destroy();
      okBtn.destroy();
    });
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
