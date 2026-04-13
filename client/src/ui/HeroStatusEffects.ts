import * as Phaser from 'phaser';
import { FONTS } from '../config';

/**
 * Displays hero status effect icons on hero cards.
 * T-0447: Hero status effects display (buffed, injured, tired, inspired)
 * T-0431: Hero injury system from failed expeditions
 * T-0432: Injury recovery timer and Hospital building healing
 * T-0463: Hero rest mechanic requiring downtime after expeditions
 */

interface StatusEffect {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const STATUS_EFFECTS: StatusEffect[] = [
  { id: 'injured', label: 'Injured', icon: '🤕', color: '#e94560', description: 'Recovering from expedition injury' },
  { id: 'tired', label: 'Tired', icon: '😴', color: '#f59f00', description: 'Needs rest after expedition' },
  { id: 'buffed', label: 'Buffed', icon: '💪', color: '#4ecca3', description: 'Temporarily boosted stats' },
  { id: 'inspired', label: 'Inspired', icon: '✨', color: '#ffd700', description: 'High morale inspiration bonus' },
  { id: 'training', label: 'Training', icon: '🏋', color: '#4dabf7', description: 'Training at the Barracks' },
  { id: 'resting', label: 'Resting', icon: '🛏', color: '#9775fa', description: 'Resting to recover morale' },
  { id: 'sick', label: 'Sick', icon: '🤒', color: '#c87533', description: 'Needs healing at Hospital' },
  { id: 'blessed', label: 'Blessed', icon: '🙏', color: '#ffd700', description: 'Temple blessing active' },
];

export class HeroStatusEffects {
  /**
   * Determine active status effects for a hero.
   */
  static getActiveEffects(hero: {
    status: string;
    morale?: number;
    injury?: { injuredAt: string; recoveryHours: number; healedAt: string | null } | null;
    training?: { stat: string; startedAt: string } | null;
  }): StatusEffect[] {
    const effects: StatusEffect[] = [];

    if (hero.injury && !hero.injury.healedAt) {
      effects.push(STATUS_EFFECTS.find(e => e.id === 'injured')!);
    }

    if (hero.status === 'training') {
      effects.push(STATUS_EFFECTS.find(e => e.id === 'training')!);
    }

    if (hero.status === 'resting') {
      effects.push(STATUS_EFFECTS.find(e => e.id === 'resting')!);
    }

    if ((hero.morale ?? 70) >= 85) {
      effects.push(STATUS_EFFECTS.find(e => e.id === 'inspired')!);
    }

    if ((hero.morale ?? 70) < 30) {
      effects.push(STATUS_EFFECTS.find(e => e.id === 'tired')!);
    }

    return effects.filter(Boolean);
  }

  /**
   * Draw status effect icons at the given position.
   */
  static draw(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    effects: StatusEffect[],
  ): void {
    let offsetX = 0;

    for (const effect of effects) {
      const iconText = scene.add.text(x + offsetX, y, effect.icon, {
        fontFamily: FONTS.primary,
        fontSize: '14px',
      }).setInteractive();

      // Tooltip on hover
      iconText.on('pointerover', () => {
        const tooltip = scene.add.text(x + offsetX, y - 20, `${effect.label}: ${effect.description}`, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: effect.color,
          backgroundColor: '#0a0a1a',
          padding: { x: 4, y: 2 },
        }).setDepth(500);
        iconText.setData('tooltip', tooltip);
        container.add(tooltip);
      });

      iconText.on('pointerout', () => {
        const tooltip = iconText.getData('tooltip') as Phaser.GameObjects.Text;
        tooltip?.destroy();
      });

      container.add(iconText);
      offsetX += 20;
    }
  }
}
