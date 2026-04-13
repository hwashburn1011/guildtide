import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { Hero, Building } from '@shared/types';
import { HeroRole, HeroTrait, BuildingType } from '@shared/enums';
import { apiClient } from '../api/client';

const ROLE_COLORS: Record<string, string> = {
  farmer: '#4ecca3',
  scout: '#4dabf7',
  merchant: '#ffd700',
  blacksmith: '#c87533',
  alchemist: '#be4bdb',
  hunter: '#e94560',
  defender: '#a0a0a0',
  mystic: '#9775fa',
  caravan_master: '#f59f00',
  archivist: '#74c0fc',
};

const TRAIT_LABELS: Record<string, string> = {
  stormborn: 'Stormborn',
  sunblessed: 'Sunblessed',
  frostward: 'Frostward',
  shrewd_trader: 'Shrewd Trader',
  lucky_forager: 'Lucky Forager',
  salvager: 'Salvager',
  hardy: 'Hardy',
  nimble: 'Nimble',
};

export class HeroRoster {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private heroes: Hero[];
  private buildings: Building[];
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private panelContainer: Phaser.GameObjects.Container | null = null;
  private onChanged: () => void;

  constructor(
    scene: Phaser.Scene,
    heroes: Hero[],
    buildings: Building[],
    onChanged: () => void,
  ) {
    this.scene = scene;
    this.heroes = heroes;
    this.buildings = buildings;
    this.onChanged = onChanged;
    this.container = scene.add.container(0, 0);
  }

  show(): void {
    // Overlay
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(100);

    this.panelContainer = this.scene.add.container(0, 0).setDepth(101);

    // Panel background
    const panelW = 900;
    const panelH = 580;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.panelContainer.add(bg);

    // Title
    this.panelContainer.add(
      this.scene.add.text(px + 20, py + 15, 'Hero Roster', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      })
    );

    // Close button
    const closeBtn = this.scene.add.text(px + panelW - 20, py + 15, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.panelContainer.add(closeBtn);

    // Recruit button
    const recruitBtn = this.scene.add.text(px + panelW - 20, py + panelH - 20, 'Recruit (50 Gold)', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textAccent,
      fontStyle: 'bold',
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    recruitBtn.on('pointerup', () => this.recruitHero());
    this.panelContainer.add(recruitBtn);

    // Hero cards
    this.renderHeroCards(px + 20, py + 55, panelW - 40, panelH - 100);
  }

  private renderHeroCards(x: number, y: number, width: number, _height: number): void {
    if (!this.panelContainer) return;

    if (this.heroes.length === 0) {
      this.panelContainer.add(
        this.scene.add.text(x + width / 2, y + 100, 'No heroes yet.\nRecruit your first hero!', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textSecondary,
          align: 'center',
        }).setOrigin(0.5)
      );
      return;
    }

    const cardH = 70;
    const gap = 8;

    this.heroes.forEach((hero, i) => {
      const cy = y + i * (cardH + gap);
      if (cy > y + 450) return; // overflow guard

      // Card bg
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(COLORS.background, 0.8);
      cardBg.fillRoundedRect(x, cy, width, cardH, 6);
      this.panelContainer!.add(cardBg);

      const roleColor = ROLE_COLORS[hero.role] || COLORS.textSecondary;

      // Name
      this.panelContainer!.add(
        this.scene.add.text(x + 10, cy + 8, hero.name, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: COLORS.textPrimary,
          fontStyle: 'bold',
        })
      );

      // Role + Level
      this.panelContainer!.add(
        this.scene.add.text(x + 10, cy + 30, `${hero.role} · Lv ${hero.level}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: roleColor,
        })
      );

      // Traits
      const traitStr = hero.traits.map((t: string) => TRAIT_LABELS[t] || t).join(', ');
      this.panelContainer!.add(
        this.scene.add.text(x + 10, cy + 48, traitStr, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: '#6a6a7a',
        })
      );

      // Stats
      const stats = hero.stats;
      this.panelContainer!.add(
        this.scene.add.text(x + 250, cy + 10, `STR ${stats.strength}  AGI ${stats.agility}  INT ${stats.intellect}`, {
          fontFamily: FONTS.primary,
          fontSize: '11px',
          color: COLORS.textSecondary,
        })
      );
      this.panelContainer!.add(
        this.scene.add.text(x + 250, cy + 26, `END ${stats.endurance}  LCK ${stats.luck}`, {
          fontFamily: FONTS.primary,
          fontSize: '11px',
          color: COLORS.textSecondary,
        })
      );

      // Assignment status
      const assignText = hero.assignment
        ? `Assigned: ${hero.assignment}`
        : 'Idle';
      this.panelContainer!.add(
        this.scene.add.text(x + 250, cy + 46, assignText, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: hero.assignment ? '#4ecca3' : '#6a6a7a',
        })
      );

      // Assign/Unassign button
      if (hero.assignment) {
        const unassignBtn = this.scene.add.text(x + width - 10, cy + cardH / 2, 'Unassign', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        unassignBtn.on('pointerup', () => this.assignHero(hero.id, null));
        this.panelContainer!.add(unassignBtn);
      } else {
        // Show available buildings to assign to
        const assignBtn = this.scene.add.text(x + width - 10, cy + cardH / 2, 'Assign ▼', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textAccent,
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        assignBtn.on('pointerup', () => this.showAssignMenu(hero, x + width - 120, cy + cardH));
        this.panelContainer!.add(assignBtn);
      }
    });
  }

  private showAssignMenu(hero: Hero, x: number, y: number): void {
    if (!this.panelContainer) return;

    // Simple dropdown of building types
    const menuBg = this.scene.add.graphics();
    menuBg.fillStyle(0x0f3460, 0.98);
    const menuItems = this.buildings.length > 0
      ? this.buildings
      : [];

    if (menuItems.length === 0) return;

    const menuH = menuItems.length * 28 + 10;
    menuBg.fillRoundedRect(x, y, 140, menuH, 4);
    menuBg.setDepth(102);
    this.panelContainer.add(menuBg);

    menuItems.forEach((building, i) => {
      const item = this.scene.add.text(x + 10, y + 5 + i * 28, building.type, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textPrimary,
      }).setInteractive({ useHandCursor: true }).setDepth(102);

      item.on('pointerover', () => item.setColor(COLORS.textGold));
      item.on('pointerout', () => item.setColor(COLORS.textPrimary));
      item.on('pointerup', () => {
        this.assignHero(hero.id, building.type);
        menuBg.destroy();
        menuItems.forEach(() => item.destroy());
      });

      this.panelContainer!.add(item);
    });
  }

  private async assignHero(heroId: string, assignment: string | null): Promise<void> {
    try {
      await apiClient.assignHero(heroId, assignment);
      // Refresh data
      const heroes = await apiClient.getHeroes();
      this.heroes = heroes;
      this.onChanged();
      // Re-render
      this.hide();
      this.show();
    } catch (err) {
      console.error('Assign error:', err);
    }
  }

  private async recruitHero(): Promise<void> {
    try {
      const result = await apiClient.recruitHero();
      this.heroes.push(result.hero);
      this.onChanged();
      // Re-render
      this.hide();
      this.show();
    } catch (err) {
      console.error('Recruit error:', err);
    }
  }

  hide(): void {
    this.overlay?.destroy();
    this.panelContainer?.destroy(true);
    this.overlay = null;
    this.panelContainer = null;
  }

  setHeroes(heroes: Hero[]): void {
    this.heroes = heroes;
  }

  setBuildings(buildings: Building[]): void {
    this.buildings = buildings;
  }
}
