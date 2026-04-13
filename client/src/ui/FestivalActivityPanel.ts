/**
 * FestivalActivityPanel — Festival-specific mini-activities UI.
 *
 * T-0955: New Year celebration event with fireworks animation
 * T-0956: Valentine's Day event with hero relationship bonuses
 * T-0957: Easter/Spring Festival event with egg hunt mini-game
 * T-0958: Summer Solstice event with daylight bonuses
 * T-0959: Halloween event with spooky expedition content
 * T-0960: Thanksgiving/Harvest event with food bonus
 * T-0961: Winter Solstice event with gift exchange mechanic
 * T-0962: New Year's Eve event with year-in-review summary
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';

interface FestivalActivityData {
  id: string;
  name: string;
  description: string;
  type: 'mini_game' | 'collection' | 'social' | 'competition';
  duration: number;
  rewards: {
    resources?: Record<string, number>;
    xp: number;
    items?: string[];
  };
  cooldownHours: number;
  available: boolean;
  cooldownRemaining?: number;
}

interface FestivalData {
  name: string;
  fantasyName: string;
  flavorText: string;
  activities: FestivalActivityData[];
  buffs: Record<string, number>;
  endsAt: string;
}

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  mini_game: '#e94560',
  collection: '#4ecca3',
  social: '#5b9bd5',
  competition: '#f5a623',
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  mini_game: 'Mini-Game',
  collection: 'Collection',
  social: 'Social',
  competition: 'Competition',
};

export class FestivalActivityPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onStartActivity: (activityId: string) => void;

  constructor(scene: Phaser.Scene, onStartActivity: (activityId: string) => void) {
    this.scene = scene;
    this.onStartActivity = onStartActivity;
  }

  show(festival: FestivalData): void {
    this.hide();

    this.modal = new UIModal(this.scene, {
      title: festival.fantasyName,
      width: 600,
      height: 520,
      onClose: () => { this.modal?.destroy(); this.modal = null; },
    });

    const content = this.modal.getContentContainer();
    let y = 0;

    // Festival flavor text
    content.add(this.scene.add.text(0, y, festival.flavorText, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary, fontStyle: 'italic',
      wordWrap: { width: 560 },
    }));
    y += 35;

    // Active buffs
    const buffEntries = Object.entries(festival.buffs).filter(([, v]) => v > 0);
    if (buffEntries.length > 0) {
      content.add(this.scene.add.text(0, y, 'Active Buffs:', {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textGold, fontStyle: 'bold',
      }));
      y += 18;

      const buffLabels: Record<string, string> = {
        morale: 'Morale', goldIncome: 'Gold Income',
        marketDiscount: 'Market Discount', xpBonus: 'XP Bonus',
      };

      let bx = 0;
      for (const [key, value] of buffEntries) {
        const label = buffLabels[key] ?? key;
        content.add(this.scene.add.text(bx, y, `+${Math.round(value * 100)}% ${label}`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#4ecca3',
        }));
        bx += 140;
      }
      y += 22;
    }

    // Countdown
    const endsAt = new Date(festival.endsAt);
    const hoursLeft = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 3600000));
    content.add(this.scene.add.text(0, y, `Festival ends in ${hoursLeft}h`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
      color: hoursLeft < 6 ? '#e94560' : COLORS.textSecondary,
    }));
    y += 25;

    // Separator
    const sep = this.scene.add.graphics();
    sep.fillStyle(COLORS.panelBorder, 0.5);
    sep.fillRect(0, y, 560, 1);
    content.add(sep);
    y += 10;

    // Activities header
    content.add(this.scene.add.text(0, y, 'Festival Activities', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary, fontStyle: 'bold',
    }));
    y += 28;

    // Activity cards
    for (const activity of festival.activities) {
      const cardH = 80;
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(COLORS.panelBg, 0.8);
      cardBg.fillRoundedRect(0, y, 560, cardH, 6);
      cardBg.lineStyle(1, activity.available ? COLORS.panelBorder : 0x444444);
      cardBg.strokeRoundedRect(0, y, 560, cardH, 6);
      content.add(cardBg);

      // Activity type badge
      const typeColor = ACTIVITY_TYPE_COLORS[activity.type] ?? '#888';
      const typeLabel = ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type;
      content.add(this.scene.add.text(10, y + 8, typeLabel, {
        fontFamily: FONTS.primary, fontSize: '10px', color: typeColor, fontStyle: 'bold',
      }));

      // Activity name
      content.add(this.scene.add.text(10, y + 22, activity.name, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
        color: activity.available ? COLORS.textPrimary : COLORS.textSecondary,
        fontStyle: 'bold',
      }));

      // Description
      content.add(this.scene.add.text(10, y + 40, activity.description, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: 360 },
      }));

      // Duration
      content.add(this.scene.add.text(10, y + 58, `${activity.duration} min`, {
        fontFamily: FONTS.primary, fontSize: '10px', color: '#888',
      }));

      // Rewards
      const rewardParts: string[] = [];
      if (activity.rewards.resources) {
        for (const [res, amt] of Object.entries(activity.rewards.resources)) {
          rewardParts.push(`+${amt} ${res}`);
        }
      }
      rewardParts.push(`+${activity.rewards.xp} XP`);
      content.add(this.scene.add.text(100, y + 58, rewardParts.join('  '), {
        fontFamily: FONTS.primary, fontSize: '10px', color: '#4ecca3',
      }));

      // Start button or cooldown
      if (activity.available) {
        const startBtn = new UIButton(this.scene, {
          x: 440, y: y + 20, width: 100, height: 35,
          text: 'Start', variant: 'primary', fontSize: FONTS.sizes.small,
          onClick: () => this.onStartActivity(activity.id),
        });
        content.add(startBtn);
      } else {
        const cdHours = activity.cooldownRemaining ?? activity.cooldownHours;
        content.add(this.scene.add.text(470, y + 30, `${cdHours}h cooldown`, {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: '#888',
        }).setOrigin(0.5));
      }

      y += cardH + 8;
    }

    this.modal.open();
  }

  hide(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
