import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';
import { apiClient } from '../api/client';
import { NotificationSystem } from '../systems/NotificationSystem';
import { DAILY_LOGIN_REWARDS } from '@shared/constants';
import type { Guild } from '@shared/types';

/**
 * Daily login reward calendar showing 7-day cycle.
 * Current day is highlighted, claimed days are checked.
 */
export class DailyRewardCalendar {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onRefresh: () => void;

  constructor(scene: Phaser.Scene, onRefresh: () => void) {
    this.scene = scene;
    this.onRefresh = onRefresh;
  }

  show(guild: Guild): void {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Daily Login Rewards',
      width: 520,
      height: 380,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    const streak = guild.loginStreak ?? 0;
    const currentDay = ((streak > 0 ? streak - 1 : 0) % 7) + 1;
    const today = new Date().toISOString().slice(0, 10);
    const claimedToday = guild.lastDailyReward === today;

    // Streak display
    content.add(
      this.scene.add.text(0, 0, `Login Streak: ${streak} day${streak !== 1 ? 's' : ''}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );

    // Grid of 7 reward cards
    const cardW = 60;
    const cardH = 120;
    const gap = 8;
    const startX = (440 - 7 * (cardW + gap)) / 2;

    DAILY_LOGIN_REWARDS.forEach((reward, i) => {
      const x = startX + i * (cardW + gap);
      const y = 40;
      const isCurrentDay = reward.day === currentDay;
      const isPast = reward.day < currentDay || (reward.day === currentDay && claimedToday);

      // Card background
      const bg = this.scene.add.graphics();
      const fillColor = isCurrentDay && !claimedToday ? COLORS.accent : isPast ? 0x1a3a2e : COLORS.panelBg;
      bg.fillStyle(fillColor, 0.9);
      bg.fillRoundedRect(x, y, cardW, cardH, 6);
      bg.lineStyle(isCurrentDay ? 2 : 1, isCurrentDay ? COLORS.gold : COLORS.panelBorder);
      bg.strokeRoundedRect(x, y, cardW, cardH, 6);
      content.add(bg);

      // Day number
      content.add(
        this.scene.add.text(x + cardW / 2, y + 10, `Day ${reward.day}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: isCurrentDay ? COLORS.textGold : COLORS.textPrimary,
          fontStyle: 'bold',
        }).setOrigin(0.5),
      );

      // Reward resources
      const resourceLines = Object.entries(reward.resources);
      resourceLines.forEach(([res, amt], ri) => {
        content.add(
          this.scene.add.text(x + cardW / 2, y + 28 + ri * 14, `+${amt}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#4ecca3',
          }).setOrigin(0.5),
        );
        content.add(
          this.scene.add.text(x + cardW / 2, y + 40 + ri * 14, res, {
            fontFamily: FONTS.primary,
            fontSize: '9px',
            color: COLORS.textSecondary,
          }).setOrigin(0.5),
        );
      });

      // XP
      content.add(
        this.scene.add.text(x + cardW / 2, y + cardH - 22, `+${reward.xp} XP`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textGold,
        }).setOrigin(0.5),
      );

      // Checkmark for past days
      if (isPast) {
        content.add(
          this.scene.add.text(x + cardW / 2, y + cardH - 8, '\u2713', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: '#4ecca3',
            fontStyle: 'bold',
          }).setOrigin(0.5),
        );
      }
    });

    // Claim button
    if (!claimedToday) {
      const claimBtn = new UIButton(this.scene, {
        x: 160,
        y: 200,
        width: 160,
        height: 40,
        text: 'Claim Today\'s Reward',
        variant: 'primary',
        fontSize: FONTS.sizes.small,
        onClick: () => this.claimReward(),
      });
      content.add(claimBtn);
    } else {
      content.add(
        this.scene.add.text(240, 210, 'Already claimed today!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: '#4ecca3',
          fontStyle: 'bold',
        }).setOrigin(0.5),
      );

      content.add(
        this.scene.add.text(240, 232, 'Come back tomorrow for the next reward.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5),
      );
    }

    this.modal.open();
  }

  private async claimReward(): Promise<void> {
    try {
      const result = await apiClient.claimDailyReward();
      const rewardDesc = Object.entries(result.resources)
        .map(([res, amt]) => `+${amt} ${res}`)
        .join(', ');
      NotificationSystem.show(this.scene, `${result.label}: ${rewardDesc} (+${result.xp} XP)`, 'success');
      this.modal?.close();
      this.onRefresh();
    } catch (err) {
      NotificationSystem.show(this.scene, err instanceof Error ? err.message : 'Failed to claim', 'warning');
    }
  }
}
