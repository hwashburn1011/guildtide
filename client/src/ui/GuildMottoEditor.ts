import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';

/**
 * Simple motto editor modal. Uses a prompt for text input
 * since Phaser doesn't have native text input.
 */
export class GuildMottoEditor {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onRefresh: () => void;

  constructor(scene: Phaser.Scene, onRefresh: () => void) {
    this.scene = scene;
    this.onRefresh = onRefresh;
  }

  show(currentMotto: string): void {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Edit Guild Motto',
      width: 440,
      height: 280,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();

    content.add(
      this.scene.add.text(0, 0, 'Your guild motto appears on the guild hall banner.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: 380 },
      }),
    );

    content.add(
      this.scene.add.text(0, 30, 'Current motto:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );

    const mottoDisplay = this.scene.add.text(0, 50, currentMotto || '(none)', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: currentMotto ? COLORS.textGold : COLORS.textSecondary,
      fontStyle: currentMotto ? 'italic' : 'normal',
      wordWrap: { width: 380 },
    });
    content.add(mottoDisplay);

    content.add(
      this.scene.add.text(0, 90, 'Max 100 characters', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      }),
    );

    // Edit button - uses browser prompt since Phaser lacks text input
    const editBtn = new UIButton(this.scene, {
      x: 0,
      y: 120,
      width: 160,
      height: 40,
      text: 'Set Motto',
      variant: 'primary',
      fontSize: FONTS.sizes.small,
      onClick: () => this.promptMotto(currentMotto),
    });
    content.add(editBtn);

    // Clear button
    if (currentMotto) {
      const clearBtn = new UIButton(this.scene, {
        x: 180,
        y: 120,
        width: 120,
        height: 40,
        text: 'Clear',
        variant: 'ghost',
        fontSize: FONTS.sizes.small,
        onClick: () => this.saveMotto(''),
      });
      content.add(clearBtn);
    }

    this.modal.open();
  }

  private promptMotto(current: string): void {
    const newMotto = prompt('Enter your guild motto (max 100 characters):', current);
    if (newMotto !== null) {
      this.saveMotto(newMotto.slice(0, 100));
    }
  }

  private async saveMotto(motto: string): Promise<void> {
    try {
      await apiClient.setGuildMotto(motto);
      NotificationSystem.show(this.scene, motto ? 'Motto updated!' : 'Motto cleared', 'success');
      this.modal?.close();
      this.onRefresh();
    } catch (err) {
      NotificationSystem.show(this.scene, err instanceof Error ? err.message : 'Failed', 'error');
    }
  }
}
