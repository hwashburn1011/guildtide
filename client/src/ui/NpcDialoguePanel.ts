/**
 * NpcDialoguePanel — NPC conversation UI with branching dialog.
 *
 * T-1335: Dialog UI with NPC portrait, text box, and choice buttons
 * T-1337: NPC relationship tracking display
 * T-1338: NPC gift system UI
 * T-1339: NPC shop integration within dialog flow
 * T-1340: NPC quest offering through dialog
 * T-1362: Narrative text fade-in presentation with pacing
 * T-1372: NPC daily dialog that changes based on weather and events
 * T-1373: NPC remembrance of past player choices in dialog
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

interface DialogNode {
  id: string;
  text: string;
  emotion?: string;
  choices: Array<{
    label: string;
    nextNodeId: string;
    relationshipChange?: number;
    startsQuestId?: string;
    opensShop?: boolean;
    requiresRelationship?: number;
  }>;
  isTerminal?: boolean;
  rumor?: { text: string; accuracy: number };
}

export class NpcDialoguePanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private npcId: string;
  private npcName: string;
  private npcTitle: string;
  private currentNodeId: string | undefined;
  private onClose: () => void;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    scene: Phaser.Scene,
    npcId: string,
    npcName: string,
    npcTitle: string,
    onClose: () => void,
  ) {
    this.scene = scene;
    this.npcId = npcId;
    this.npcName = npcName;
    this.npcTitle = npcTitle;
    this.onClose = onClose;
  }

  async show(nodeId?: string): Promise<void> {
    this.currentNodeId = nodeId;
    this.cleanup();

    // Overlay
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(400);

    this.container = this.scene.add.container(0, 0).setDepth(401);

    // Fetch dialog
    try {
      const response = await apiClient.getNpcDialog(this.npcId, this.currentNodeId);
      this.renderDialog(response.node, response.weatherText);
    } catch {
      this.renderError();
    }
  }

  private renderDialog(node: DialogNode, weatherText?: string): void {
    if (!this.container) return;

    const panelW = 680;
    const panelH = 320;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = GAME_HEIGHT - panelH - 40;

    // Dialog box background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.95);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    // Portrait area
    const portraitX = px + 20;
    const portraitY = py + 20;
    const portraitBg = this.scene.add.graphics();
    portraitBg.fillStyle(0x0a1628, 1);
    portraitBg.fillRoundedRect(portraitX, portraitY, 80, 80, 8);
    portraitBg.lineStyle(2, COLORS.gold);
    portraitBg.strokeRoundedRect(portraitX, portraitY, 80, 80, 8);
    this.container.add(portraitBg);

    // Emotion indicator
    const emotionIcons: Record<string, string> = {
      neutral: '\u{1F610}', happy: '\u{1F60A}', sad: '\u{1F622}',
      angry: '\u{1F620}', surprised: '\u{1F632}', thinking: '\u{1F914}',
    };
    const emotionIcon = emotionIcons[node.emotion || 'neutral'] || '\u{1F610}';
    this.container.add(this.scene.add.text(portraitX + 40, portraitY + 40, emotionIcon, {
      fontFamily: FONTS.primary, fontSize: '36px',
    }).setOrigin(0.5));

    // NPC name and title
    this.container.add(this.scene.add.text(px + 115, py + 20, this.npcName, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));
    this.container.add(this.scene.add.text(px + 115, py + 42, this.npcTitle, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
    }));

    // Close button
    const closeBtn = this.scene.add.text(px + panelW - 15, py + 10, 'X', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // T-1362: Typewriter text
    const dialogText = weatherText
      ? `${weatherText}\n\n${node.text}`
      : node.text;

    const textObj = this.scene.add.text(px + 115, py + 65, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
      wordWrap: { width: panelW - 140 },
      lineSpacing: 3,
    });
    this.container.add(textObj);

    // Typewriter animation
    let charIndex = 0;
    this.typewriterTimer = this.scene.time.addEvent({
      delay: 25,
      repeat: dialogText.length - 1,
      callback: () => {
        charIndex++;
        textObj.setText(dialogText.substring(0, charIndex));
      },
    });

    // Choice buttons (appear after short delay)
    const choiceDelay = Math.min(dialogText.length * 25 + 200, 2000);
    this.scene.time.delayedCall(choiceDelay, () => {
      if (!this.container) return;
      let cy = py + 185;

      if (node.isTerminal || node.choices.length === 0) {
        const endBtn = this.scene.add.text(px + panelW / 2, cy, '[End conversation]', {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
          fontStyle: 'italic',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        endBtn.on('pointerup', () => this.hide());
        this.container!.add(endBtn);
        return;
      }

      for (let i = 0; i < node.choices.length; i++) {
        const choice = node.choices[i];
        const relChange = choice.relationshipChange
          ? ` (${choice.relationshipChange > 0 ? '+' : ''}${choice.relationshipChange})`
          : '';
        const label = `${i + 1}. ${choice.label}${relChange}`;
        const choiceText = this.scene.add.text(px + 115, cy, label, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#4dabf7',
        }).setInteractive({ useHandCursor: true });

        choiceText.on('pointerover', () => choiceText.setColor('#ffffff'));
        choiceText.on('pointerout', () => choiceText.setColor('#4dabf7'));
        choiceText.on('pointerup', () => this.selectChoice(node.id, i, choice));

        this.container!.add(choiceText);
        cy += 22;
      }
    });

    // Skip typewriter on click
    const skipZone = this.scene.add.zone(px + panelW / 2, py + panelH / 2, panelW, panelH)
      .setInteractive();
    skipZone.on('pointerdown', () => {
      if (this.typewriterTimer && charIndex < dialogText.length) {
        this.typewriterTimer.remove();
        this.typewriterTimer = null;
        textObj.setText(dialogText);
        charIndex = dialogText.length;
      }
    });
    this.container.add(skipZone);
  }

  private async selectChoice(
    nodeId: string,
    choiceIndex: number,
    choice: DialogNode['choices'][0],
  ): Promise<void> {
    try {
      const result = await apiClient.chooseNpcDialog(this.npcId, nodeId, choiceIndex);

      if (choice.opensShop) {
        this.hide();
        // The calling code should open the shop
        return;
      }

      if (choice.startsQuestId || result.startsQuestId) {
        // Notification of quest start would happen here
      }

      if (result.nextNode) {
        this.cleanup();
        this.overlay = this.scene.add.graphics();
        this.overlay.fillStyle(0x000000, 0.7);
        this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.overlay.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
          Phaser.Geom.Rectangle.Contains,
        );
        this.overlay.setDepth(400);
        this.container = this.scene.add.container(0, 0).setDepth(401);
        this.renderDialog(result.nextNode);
      } else {
        this.hide();
      }
    } catch {
      this.hide();
    }
  }

  private renderError(): void {
    if (!this.container) return;
    const px = (GAME_WIDTH - 400) / 2;
    const py = (GAME_HEIGHT - 100) / 2;
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.95);
    bg.fillRoundedRect(px, py, 400, 100, 12);
    this.container.add(bg);
    this.container.add(this.scene.add.text(px + 200, py + 50, 'Failed to load dialog', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textAccent,
    }).setOrigin(0.5));

    this.scene.time.delayedCall(2000, () => this.hide());
  }

  private cleanup(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
      this.typewriterTimer = null;
    }
    if (this.container) {
      this.container.removeAll(true);
      this.container.destroy();
      this.container = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }

  hide(): void {
    this.cleanup();
    this.onClose();
  }
}
