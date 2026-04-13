/**
 * Expedition Encounter Panel — encounter resolution UI showing
 * encounter details, outcomes, and effects.
 *
 * T-0484: Encounter engine display
 * T-0485: Combat encounter display
 * T-0486: Treasure encounter display
 * T-0487: Trap encounter display
 * T-0488: NPC encounter display
 * T-0489: Rest encounter display
 * T-0490: Weather encounter display
 * T-0524: Environmental hazard display
 * T-0525: Hazard mitigation display
 * T-0527: Seasonal content display
 * T-0535: Camping scene between journey legs
 * T-0544: Danger zone warnings
 * T-0547: First-time expedition tutorial
 * T-0548: Merchant caravan encounter
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import type { ExpeditionEncounterResult } from '@shared/types';

const ENCOUNTER_ICONS: Record<string, string> = {
  combat: '\u2694',
  treasure: '\u2728',
  trap: '\u26A0',
  npc: '\uD83D\uDDE3',
  rest: '\u2615',
  weather: '\u2601',
  merchant: '\uD83D\uDCB0',
  hazard: '\u2622',
};

const ENCOUNTER_COLORS: Record<string, string> = {
  combat: '#e94560',
  treasure: '#ffd700',
  trap: '#f5a623',
  npc: '#6eb5ff',
  rest: '#4ecca3',
  weather: '#a0a0b0',
  merchant: '#f5a623',
  hazard: '#ff6633',
};

export class ExpeditionEncounterPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show a list of encounter results from an expedition.
   */
  showEncounters(encounters: ExpeditionEncounterResult[]): void {
    if (this.modal) this.modal.destroy();

    this.modal = new UIModal(this.scene, {
      title: 'Expedition Encounters',
      width: 580,
      height: 480,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });
    this.modal.open();

    const content = this.modal.getContentContainer();
    this.renderEncounterList(content, encounters);
  }

  /**
   * Show a single encounter result in detail.
   */
  showEncounterDetail(encounter: ExpeditionEncounterResult): void {
    if (this.modal) this.modal.destroy();

    this.modal = new UIModal(this.scene, {
      title: encounter.title,
      width: 480,
      height: 350,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });
    this.modal.open();

    const content = this.modal.getContentContainer();
    this.renderEncounterDetail(content, encounter);
  }

  /**
   * Show danger zone warning for under-leveled party.
   */
  showDangerWarning(
    partyPower: number,
    recommendedPower: number,
    destinationName: string,
  ): void {
    if (this.modal) this.modal.destroy();

    this.modal = new UIModal(this.scene, {
      title: 'Danger Zone Warning',
      width: 420,
      height: 250,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });
    this.modal.open();

    const content = this.modal.getContentContainer();
    let y = 0;

    content.add(
      this.scene.add.text(200, y, '\u26A0', {
        fontFamily: FONTS.primary,
        fontSize: '36px',
        color: '#e94560',
      }).setOrigin(0.5),
    );
    y += 50;

    content.add(
      this.scene.add.text(200, y, `Warning: ${destinationName} is dangerous!`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#e94560',
        fontStyle: 'bold',
      }).setOrigin(0.5),
    );
    y += 25;

    content.add(
      this.scene.add.text(200, y, `Your party power: ${partyPower}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textPrimary,
      }).setOrigin(0.5),
    );
    y += 18;

    content.add(
      this.scene.add.text(200, y, `Recommended: ${recommendedPower}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textGold,
      }).setOrigin(0.5),
    );
    y += 25;

    content.add(
      this.scene.add.text(200, y, 'Your party may face severe challenges.\nConsider upgrading heroes or changing party composition.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        align: 'center',
        wordWrap: { width: 380 },
      }).setOrigin(0.5),
    );
  }

  /**
   * Show first-time expedition tutorial.
   */
  showTutorial(): void {
    if (this.modal) this.modal.destroy();

    this.modal = new UIModal(this.scene, {
      title: 'Expedition Guide',
      width: 520,
      height: 420,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });
    this.modal.open();

    const content = this.modal.getContentContainer();
    let y = 0;

    const steps = [
      { title: '1. Choose a Destination', desc: 'Select a destination from the map. Each has different difficulty and rewards.' },
      { title: '2. Form Your Party', desc: 'Select up to 5 heroes. Match hero roles to the expedition type for bonuses.' },
      { title: '3. Check Supplies', desc: 'Longer expeditions need more supplies. Scout ahead to see what you will face.' },
      { title: '4. Launch!', desc: 'Your heroes will journey out and face encounters along the way.' },
      { title: '5. Collect Rewards', desc: 'When complete, collect loot, XP, and check for rare discoveries.' },
      { title: 'Tips', desc: 'Scouts speed up travel. Weather affects difficulty. Save party templates for quick re-runs.' },
    ];

    for (const step of steps) {
      content.add(
        this.scene.add.text(0, y, step.title, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }),
      );
      y += 18;

      content.add(
        this.scene.add.text(10, y, step.desc, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 480 },
        }),
      );
      y += 30;
    }
  }

  /**
   * Show scouting results.
   */
  showScoutingResults(
    destinationName: string,
    revealedEncounters: string[],
    estimatedDanger: string,
  ): void {
    if (this.modal) this.modal.destroy();

    this.modal = new UIModal(this.scene, {
      title: `Scouting: ${destinationName}`,
      width: 420,
      height: 300,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });
    this.modal.open();

    const content = this.modal.getContentContainer();
    let y = 0;

    const dangerColor = estimatedDanger === 'Extreme' ? '#e94560' :
      estimatedDanger === 'High' ? '#f5a623' :
        estimatedDanger === 'Moderate' ? '#ffd700' : '#4ecca3';

    content.add(
      this.scene.add.text(0, y, `Danger Level: ${estimatedDanger}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: dangerColor,
        fontStyle: 'bold',
      }),
    );
    y += 30;

    content.add(
      this.scene.add.text(0, y, 'Potential Encounters:', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 22;

    if (revealedEncounters.length === 0) {
      content.add(
        this.scene.add.text(10, y, 'Scouts could not determine what lies ahead.', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          fontStyle: 'italic',
        }),
      );
    } else {
      for (const enc of revealedEncounters) {
        content.add(
          this.scene.add.text(10, y, `- ${enc}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          }),
        );
        y += 18;
      }
    }

    y += 15;
    content.add(
      this.scene.add.text(0, y, 'Note: Additional encounters may occur that were not scouted.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        wordWrap: { width: 380 },
      }),
    );
  }

  private renderEncounterList(container: Phaser.GameObjects.Container, encounters: ExpeditionEncounterResult[]): void {
    let y = 0;

    if (encounters.length === 0) {
      container.add(
        this.scene.add.text(250, 60, 'No encounters occurred', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5),
      );
      return;
    }

    container.add(
      this.scene.add.text(0, y, `${encounters.length} Encounters`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textPrimary,
        fontStyle: 'bold',
      }),
    );
    y += 28;

    for (const enc of encounters) {
      const typeColor = ENCOUNTER_COLORS[enc.type] ?? COLORS.textSecondary;
      const outcomeColor = enc.outcome === 'success' ? '#4ecca3' : enc.outcome === 'partial' ? '#f5a623' : '#e94560';
      const icon = ENCOUNTER_ICONS[enc.type] ?? '?';

      const bg = this.scene.add.graphics();
      bg.fillStyle(COLORS.panelBg, 0.5);
      bg.fillRoundedRect(0, y, 540, 55, 4);
      container.add(bg);

      // Icon and title
      container.add(
        this.scene.add.text(10, y + 5, `${icon} ${enc.title}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: typeColor,
          fontStyle: 'bold',
        }),
      );

      // Type badge
      container.add(
        this.scene.add.text(480, y + 5, enc.type.toUpperCase(), {
          fontFamily: FONTS.primary,
          fontSize: '9px',
          color: typeColor,
        }).setOrigin(1, 0),
      );

      // Outcome
      container.add(
        this.scene.add.text(490, y + 5, enc.outcome.toUpperCase(), {
          fontFamily: FONTS.primary,
          fontSize: '9px',
          color: outcomeColor,
          fontStyle: 'bold',
        }),
      );

      // Narrative
      container.add(
        this.scene.add.text(10, y + 22, enc.narrative, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
          wordWrap: { width: 520 },
        }),
      );

      // Loot if any
      if (enc.loot && Object.keys(enc.loot).length > 0) {
        const lootStr = Object.entries(enc.loot).map(([k, v]) => `${k}: +${v}`).join(', ');
        container.add(
          this.scene.add.text(10, y + 40, `Loot: ${lootStr}`, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: COLORS.textGold,
          }),
        );
      }

      y += 60;
    }
  }

  private renderEncounterDetail(container: Phaser.GameObjects.Container, enc: ExpeditionEncounterResult): void {
    let y = 0;
    const typeColor = ENCOUNTER_COLORS[enc.type] ?? COLORS.textSecondary;
    const outcomeColor = enc.outcome === 'success' ? '#4ecca3' : enc.outcome === 'partial' ? '#f5a623' : '#e94560';

    container.add(
      this.scene.add.text(0, y, `${enc.type.toUpperCase()} Encounter`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: typeColor,
        fontStyle: 'bold',
      }),
    );
    y += 28;

    container.add(
      this.scene.add.text(0, y, `Outcome: ${enc.outcome.toUpperCase()}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: outcomeColor,
        fontStyle: 'bold',
      }),
    );
    y += 25;

    container.add(
      this.scene.add.text(0, y, enc.narrative, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
        wordWrap: { width: 440 },
        fontStyle: 'italic',
      }),
    );
    y += 45;

    // Effects
    if (Object.keys(enc.effects).length > 0) {
      container.add(
        this.scene.add.text(0, y, 'Effects:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
        }),
      );
      y += 20;

      for (const [key, value] of Object.entries(enc.effects)) {
        const effectColor = (value as number) > 0 ? '#4ecca3' : '#e94560';
        const sign = (value as number) > 0 ? '+' : '';
        container.add(
          this.scene.add.text(10, y, `${key}: ${sign}${value}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: effectColor,
          }),
        );
        y += 16;
      }
    }

    // Loot
    if (enc.loot && Object.keys(enc.loot).length > 0) {
      y += 5;
      container.add(
        this.scene.add.text(0, y, 'Loot Gained:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        }),
      );
      y += 20;

      for (const [resource, amount] of Object.entries(enc.loot)) {
        container.add(
          this.scene.add.text(10, y, `${resource}: +${amount}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textGold,
          }),
        );
        y += 16;
      }
    }
  }

  destroy(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
