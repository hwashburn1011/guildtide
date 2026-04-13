import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { UIProgressBar } from './components/UIProgressBar';
import type { Guild } from '@shared/types';

/**
 * Guild prestige panel showing the option to reset for permanent bonuses.
 * Prestige is available at level 25+.
 */
export class GuildPrestigePanel {
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
      title: 'Guild Prestige',
      width: 480,
      height: 400,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    const minLevel = 25;
    const canPrestige = guild.level >= minLevel;

    let y = 0;

    content.add(
      this.scene.add.text(0, y, 'Prestige System', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );
    y += 30;

    content.add(
      this.scene.add.text(0, y, [
        'Resetting your guild grants permanent production bonuses',
        'that persist through all future progress.',
        '',
        'Requires: Guild Level 25+',
        'Bonus: +5% global production per prestige level',
      ].join('\n'), {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
        lineSpacing: 4,
        wordWrap: { width: 400 },
      }),
    );
    y += 100;

    // Progress toward prestige
    if (!canPrestige) {
      content.add(
        this.scene.add.text(0, y, `Progress to Prestige: Level ${guild.level} / ${minLevel}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
        }),
      );
      y += 22;

      const bar = new UIProgressBar(this.scene, {
        x: 0, y,
        width: 380,
        height: 16,
        value: guild.level,
        maxValue: minLevel,
        fillColor: COLORS.accent,
        showPercent: true,
      });
      content.add(bar);
      y += 40;

      content.add(
        this.scene.add.text(0, y, `${minLevel - guild.level} more levels needed`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#e94560',
          fontStyle: 'italic',
        }),
      );
    } else {
      content.add(
        this.scene.add.text(0, y, 'You are eligible for Prestige!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#4ecca3',
          fontStyle: 'bold',
        }),
      );
      y += 30;

      content.add(
        this.scene.add.text(0, y, [
          'Warning: Prestige will reset your:',
          '  - Guild level to 1',
          '  - All buildings',
          '  - Resources',
          '',
          'You will KEEP: Heroes, Inventory, Research',
        ].join('\n'), {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#f5a623',
          lineSpacing: 3,
        }),
      );
      y += 110;

      const prestigeBtn = new UIButton(this.scene, {
        x: 100,
        y,
        width: 200,
        height: 40,
        text: 'Prestige (Coming Soon)',
        variant: 'danger',
        fontSize: FONTS.sizes.small,
        disabled: true, // Not yet implemented server-side
      });
      content.add(prestigeBtn);
    }

    this.modal.open();
  }
}
