import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIProgressBar } from './components/UIProgressBar';
import {
  GUILD_LEVEL_REWARDS,
  GUILD_BASE_XP,
  GUILD_XP_MULTIPLIER,
  BASE_BUILDING_SLOTS,
} from '@shared/constants';
import type { Guild } from '@shared/types';

/**
 * Panel showing guild hall expansion milestones.
 * Displays how many building slots are unlocked at each level.
 */
export class GuildExpansionPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(guild: Guild): void {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Guild Hall Expansion',
      width: 480,
      height: 460,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    let y = 0;

    // Current slots
    const currentSlots = guild.buildingSlots ?? BASE_BUILDING_SLOTS;
    const usedSlots = guild.buildings?.length ?? 0;

    content.add(
      this.scene.add.text(0, y, `Building Slots: ${usedSlots} / ${currentSlots}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 24;

    // Slots progress bar
    const slotsBar = new UIProgressBar(this.scene, {
      x: 0, y,
      width: 400,
      height: 16,
      value: usedSlots,
      maxValue: currentSlots,
      fillColor: usedSlots >= currentSlots ? COLORS.danger : COLORS.success,
    });
    content.add(slotsBar);
    y += 35;

    // Expansion milestones
    content.add(
      this.scene.add.text(0, y, 'Expansion Milestones', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 26;

    const milestones = Object.entries(GUILD_LEVEL_REWARDS)
      .filter(([, reward]) => reward.buildingSlots)
      .sort(([a], [b]) => parseInt(a) - parseInt(b));

    milestones.forEach(([level, reward]) => {
      const lvl = parseInt(level);
      const isUnlocked = guild.level >= lvl;

      // Row
      const bg = this.scene.add.graphics();
      bg.fillStyle(isUnlocked ? 0x1a3a2e : COLORS.panelBg, 0.8);
      bg.fillRoundedRect(0, y, 420, 30, 4);
      bg.lineStyle(1, isUnlocked ? 0x4ecca3 : COLORS.panelBorder, 0.4);
      bg.strokeRoundedRect(0, y, 420, 30, 4);
      content.add(bg);

      // Level requirement
      content.add(
        this.scene.add.text(10, y + 7, `Level ${lvl}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: isUnlocked ? '#4ecca3' : COLORS.textSecondary,
          fontStyle: 'bold',
        }),
      );

      // Reward label
      content.add(
        this.scene.add.text(100, y + 7, reward.label, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: isUnlocked ? COLORS.textPrimary : COLORS.textSecondary,
        }),
      );

      // Slot count
      content.add(
        this.scene.add.text(400, y + 7, `+${reward.buildingSlots} slots`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: isUnlocked ? COLORS.textGold : COLORS.textSecondary,
        }).setOrigin(1, 0),
      );

      // Checkmark
      if (isUnlocked) {
        content.add(
          this.scene.add.text(420, y + 7, '\u2713', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: '#4ecca3',
          }),
        );
      }

      y += 36;
    });

    this.modal.open();
  }
}
