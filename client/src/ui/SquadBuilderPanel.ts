/**
 * Squad composition optimizer and formation builder.
 *
 * T-1256: Squad composition with front/back row
 * T-1258: Squad formation UI with drag-drop hero positioning
 * T-1259: Squad synergy bonuses display
 * T-1260: Synergy display on squad formation screen
 * T-1308: Combat power prediction before engagement
 */

import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { apiClient } from '../api/client';

interface SquadHero {
  id: string;
  name: string;
  role: string;
  level: number;
  stats: {
    strength: number;
    agility: number;
    intellect: number;
    endurance: number;
    luck: number;
  };
  row: 'front' | 'back';
}

interface SquadSynergy {
  id: string;
  name: string;
  description: string;
  bonuses: { stat: string; percentBonus: number }[];
}

export class SquadBuilderPanel {
  public container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private contentItems: Phaser.GameObjects.GameObject[] = [];
  private squad: SquadHero[] = [];
  private availableHeroes: SquadHero[] = [];
  private activeSynergies: SquadSynergy[] = [];
  private powerPrediction: { partyPower: number; enemyPower: number; advantage: string } | null = null;
  private onConfirm: ((squad: SquadHero[]) => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.container = scene.add.container(x, y);
    this.buildUI();
  }

  private buildUI(): void {
    const bg = this.scene.add.rectangle(0, 0, this.width, this.height, COLORS.panelBg, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.panelBorder);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(this.width / 2, 12, 'SQUAD BUILDER', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Formation area labels
    const frontLabel = this.scene.add.text(this.width / 4, 50, 'FRONT ROW', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
    }).setOrigin(0.5, 0);
    this.container.add(frontLabel);

    const backLabel = this.scene.add.text((this.width * 3) / 4, 50, 'BACK ROW', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#4ecca3',
    }).setOrigin(0.5, 0);
    this.container.add(backLabel);

    // Divider between front and back
    const midLine = this.scene.add.rectangle(this.width / 2, 65, 1, 150, COLORS.panelBorder).setOrigin(0.5, 0);
    this.container.add(midLine);

    // Separator before synergies
    const sep = this.scene.add.rectangle(this.width / 2, 220, this.width - 20, 1, COLORS.panelBorder).setOrigin(0.5, 0);
    this.container.add(sep);
  }

  // ── Load Data ──

  loadHeroes(
    available: SquadHero[],
    onConfirm?: (squad: SquadHero[]) => void,
  ): void {
    this.availableHeroes = available;
    this.squad = [];
    this.onConfirm = onConfirm ?? null;
    this.renderContent();
  }

  private renderContent(): void {
    this.contentItems.forEach(item => item.destroy());
    this.contentItems = [];

    this.renderFormation();
    this.renderAvailableHeroes();
    this.renderSynergies();
    this.renderPowerPrediction();
    this.renderControls();
  }

  // ── T-1258: Formation Display ──

  private renderFormation(): void {
    const frontHeroes = this.squad.filter(h => h.row === 'front');
    const backHeroes = this.squad.filter(h => h.row === 'back');

    // Front row slots
    for (let i = 0; i < 3; i++) {
      const x = 30 + i * 80;
      const y = 70;
      const hero = frontHeroes[i];

      const slot = this.scene.add.rectangle(x, y, 70, 55, hero ? 0x1a2a4e : 0x0a0a1a, 0.8)
        .setOrigin(0, 0)
        .setStrokeStyle(1, hero ? COLORS.accent : COLORS.panelBorder)
        .setInteractive({ useHandCursor: true });

      if (hero) {
        slot.on('pointerdown', () => this.removeFromSquad(hero.id));
      }

      this.container.add(slot);
      this.contentItems.push(slot);

      if (hero) {
        const nameText = this.scene.add.text(x + 35, y + 8, hero.name, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textPrimary,
        }).setOrigin(0.5, 0);
        this.container.add(nameText);
        this.contentItems.push(nameText);

        const roleText = this.scene.add.text(x + 35, y + 22, hero.role, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5, 0);
        this.container.add(roleText);
        this.contentItems.push(roleText);

        const lvlText = this.scene.add.text(x + 35, y + 36, `Lv ${hero.level}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textGold,
        }).setOrigin(0.5, 0);
        this.container.add(lvlText);
        this.contentItems.push(lvlText);
      } else {
        const empty = this.scene.add.text(x + 35, y + 20, 'Empty', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5, 0);
        this.container.add(empty);
        this.contentItems.push(empty);
      }
    }

    // Back row slots
    for (let i = 0; i < 2; i++) {
      const x = this.width / 2 + 30 + i * 80;
      const y = 70;
      const hero = backHeroes[i];

      const slot = this.scene.add.rectangle(x, y, 70, 55, hero ? 0x1a2a4e : 0x0a0a1a, 0.8)
        .setOrigin(0, 0)
        .setStrokeStyle(1, hero ? 0x4ecca3 : COLORS.panelBorder)
        .setInteractive({ useHandCursor: true });

      if (hero) {
        slot.on('pointerdown', () => this.removeFromSquad(hero.id));
      }

      this.container.add(slot);
      this.contentItems.push(slot);

      if (hero) {
        const nameText = this.scene.add.text(x + 35, y + 8, hero.name, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textPrimary,
        }).setOrigin(0.5, 0);
        this.container.add(nameText);
        this.contentItems.push(nameText);

        const roleText = this.scene.add.text(x + 35, y + 22, hero.role, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5, 0);
        this.container.add(roleText);
        this.contentItems.push(roleText);

        const lvlText = this.scene.add.text(x + 35, y + 36, `Lv ${hero.level}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textGold,
        }).setOrigin(0.5, 0);
        this.container.add(lvlText);
        this.contentItems.push(lvlText);
      } else {
        const empty = this.scene.add.text(x + 35, y + 20, 'Empty', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5, 0);
        this.container.add(empty);
        this.contentItems.push(empty);
      }
    }
  }

  // ── Available Heroes ──

  private renderAvailableHeroes(): void {
    let y = 145;
    const label = this.scene.add.text(15, y, 'Available Heroes (click to add):', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
    });
    this.container.add(label);
    this.contentItems.push(label);
    y += 20;

    const inSquad = new Set(this.squad.map(h => h.id));
    const available = this.availableHeroes.filter(h => !inSquad.has(h.id));

    for (let i = 0; i < Math.min(available.length, 8); i++) {
      const hero = available[i];
      const x = 15 + (i % 4) * (this.width / 4 - 5);
      const row = Math.floor(i / 4);
      const hy = y + row * 28;

      const heroText = this.scene.add.text(x, hy, `${hero.name} (${hero.role} L${hero.level})`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.addToSquad(hero));
      this.container.add(heroText);
      this.contentItems.push(heroText);
    }
  }

  // ── T-1259, T-1260: Synergy Display ──

  private renderSynergies(): void {
    let y = 230;

    const synTitle = this.scene.add.text(15, y, 'Synergies:', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textGold,
    });
    this.container.add(synTitle);
    this.contentItems.push(synTitle);
    y += 20;

    if (this.activeSynergies.length === 0) {
      const none = this.scene.add.text(20, y, 'No synergies active. Add more heroes!', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      });
      this.container.add(none);
      this.contentItems.push(none);
    } else {
      for (const syn of this.activeSynergies) {
        const synText = this.scene.add.text(20, y, `${syn.name}: ${syn.description}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#4ecca3',
          wordWrap: { width: this.width - 40 },
        });
        this.container.add(synText);
        this.contentItems.push(synText);
        y += 18;

        for (const bonus of syn.bonuses) {
          const bonusText = this.scene.add.text(30, y, `+${bonus.percentBonus}% ${bonus.stat}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textGold,
          });
          this.container.add(bonusText);
          this.contentItems.push(bonusText);
          y += 15;
        }
      }
    }
  }

  // ── T-1308: Power Prediction ──

  private renderPowerPrediction(): void {
    if (!this.powerPrediction) return;
    const y = this.height - 100;

    const predText = this.scene.add.text(15, y, 'Power Prediction:', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
    });
    this.container.add(predText);
    this.contentItems.push(predText);

    const advColor = this.powerPrediction.advantage === 'party' ? '#4ecca3' :
      this.powerPrediction.advantage === 'enemy' ? COLORS.textAccent : COLORS.textGold;

    const detail = this.scene.add.text(15, y + 18, `Party: ${this.powerPrediction.partyPower} vs Enemy: ${this.powerPrediction.enemyPower} (${this.powerPrediction.advantage})`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: advColor,
    });
    this.container.add(detail);
    this.contentItems.push(detail);
  }

  // ── Controls ──

  private renderControls(): void {
    const y = this.height - 50;

    const confirmBtn = this.scene.add.text(this.width / 2 - 60, y, '[ Confirm Squad ]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: this.squad.length > 0 ? COLORS.textGold : COLORS.textSecondary,
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.squad.length > 0) this.onConfirm?.(this.squad);
      });
    this.container.add(confirmBtn);
    this.contentItems.push(confirmBtn);

    const clearBtn = this.scene.add.text(this.width / 2 + 80, y, '[ Clear ]', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary,
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.squad = [];
        this.activeSynergies = [];
        this.powerPrediction = null;
        this.renderContent();
      });
    this.container.add(clearBtn);
    this.contentItems.push(clearBtn);
  }

  // ── Squad Management ──

  private addToSquad(hero: SquadHero): void {
    if (this.squad.length >= 5) return;
    if (this.squad.some(h => h.id === hero.id)) return;

    // Auto-assign row: melee roles to front, ranged to back
    const meleeRoles = ['defender', 'blacksmith', 'farmer'];
    const row: 'front' | 'back' = meleeRoles.includes(hero.role.toLowerCase()) ? 'front' : 'back';

    // Check row limits
    const frontCount = this.squad.filter(h => h.row === 'front').length;
    const backCount = this.squad.filter(h => h.row === 'back').length;
    const assignedRow = row === 'front' && frontCount >= 3 ? 'back' :
      row === 'back' && backCount >= 2 ? 'front' : row;

    this.squad.push({ ...hero, row: assignedRow });
    this.updateSynergies();
    this.updatePowerPrediction();
    this.renderContent();
  }

  private removeFromSquad(heroId: string): void {
    this.squad = this.squad.filter(h => h.id !== heroId);
    this.updateSynergies();
    this.updatePowerPrediction();
    this.renderContent();
  }

  private async updateSynergies(): Promise<void> {
    if (this.squad.length === 0) {
      this.activeSynergies = [];
      return;
    }
    try {
      const roles = this.squad.map(h => h.role.toLowerCase()).join(',');
      const res = await apiClient.get(`/combat/synergies?roles=${roles}`);
      this.activeSynergies = res.synergies ?? [];
    } catch {
      this.activeSynergies = [];
    }
  }

  private async updatePowerPrediction(): Promise<void> {
    if (this.squad.length === 0) {
      this.powerPrediction = null;
      return;
    }
    try {
      const heroIds = this.squad.map(h => h.id).join(',');
      const res = await apiClient.get(`/combat/predict?heroIds=${heroIds}`);
      this.powerPrediction = res;
    } catch {
      this.powerPrediction = null;
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
