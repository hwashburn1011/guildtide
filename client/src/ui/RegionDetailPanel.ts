/**
 * RegionDetailPanel — Full region detail view with biome info, resources,
 * factions, lore, landmarks, and actions.
 *
 * T-1082: Region info panel
 * T-1086: Expedition encounter tables
 * T-1087: NPC merchant inventories
 * T-1088: Region-specific weather effects
 * T-1092–T-1094: Outpost management
 * T-1097: Lore entries
 * T-1100–T-1102: Faction reputation
 * T-1119: Population display
 * T-1121: Exploration percentage
 * T-1122: Region-specific crafting recipes
 * T-1125: Region gallery entry
 * T-1129: Ambient music theme
 * T-1131: Claim system
 * T-1138–T-1139: Landmark info popup
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';

interface RegionData {
  id: string;
  name: string;
  biome: { id: string; name: string; color: number; bgColor: string; icon: string; description: string };
  climate: string;
  difficulty: number;
  dangerLevel: number;
  explorationPercent: number;
  resources: Array<{ type: string; name: string; abundance: number; depleted: boolean }>;
  factions: Array<{ id: string; name: string; disposition: string; reputation: number }>;
  lore: Array<{ id: string; title: string; text: string; discovered: boolean }>;
  landmarks: Array<{ id: string; name: string; icon: string; description: string; benefit: string; discovered: boolean }>;
  bosses: Array<{ id: string; name: string; level: number; icon: string }>;
  encounterTable: Array<{ id: string; name: string; weight: number; minLevel: number }>;
  merchantInventory: Array<{ itemId: string; name: string; price: number; stock: number }>;
  craftingRecipes: string[];
  outposts: Array<{ index: number; buildingType: string | null; level: number }>;
  outpostSlots: number;
  claimed: boolean;
  claimable: boolean;
  musicTheme: string;
  weatherOverrides: Record<string, boolean>;
  discovered: boolean;
  gridCoordinate?: string;
}

type ActionCallback = (action: string, regionId: string) => void;

export class RegionDetailPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private onAction: ActionCallback | null = null;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_WIDTH, 0);
    this.container.setDepth(100);
    this.container.setVisible(false);
  }

  setOnAction(cb: ActionCallback): void {
    this.onAction = cb;
  }

  show(data: RegionData): void {
    this.container.removeAll(true);
    this.visible = true;
    this.container.setVisible(true);

    const panelW = 360;
    const panelH = GAME_HEIGHT;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.95);
    bg.fillRect(-panelW, 0, panelW, panelH);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRect(-panelW, 0, panelW, panelH);

    this.container.add(bg);

    let y = 15;
    const x = -panelW + 16;
    const contentW = panelW - 32;

    // Close button
    const closeBtn = this.scene.add.text(-20, 10, '\u{2715}', {
      fontSize: '18px',
      color: COLORS.textSecondary,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // Region header
    const biomeColor = data.biome.bgColor || '#666666';
    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(parseInt(biomeColor.replace('#', ''), 16), 0.3);
    headerBg.fillRoundedRect(x - 4, y - 4, contentW + 8, 60, 6);
    this.container.add(headerBg);

    this.container.add(this.scene.add.text(x, y, `${data.biome.icon} ${data.name}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    }));
    y += 28;

    this.container.add(this.scene.add.text(x, y, `${data.biome.name} | ${data.climate} | ${data.gridCoordinate || ''}`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    }));
    y += 18;

    // Difficulty and danger
    const diffColor = data.difficulty <= 3 ? '#4ecca3' : data.difficulty <= 6 ? '#f5a623' : '#e94560';
    this.container.add(this.scene.add.text(x, y, `Difficulty: ${data.difficulty}/10  |  Danger: ${data.dangerLevel}/10`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: diffColor,
    }));
    y += 24;

    // Exploration bar
    this.container.add(this.scene.add.text(x, y, `Exploration: ${data.explorationPercent}%`, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    }));
    y += 14;

    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x111122, 1);
    barBg.fillRoundedRect(x, y, contentW, 8, 4);
    const barFill = this.scene.add.graphics();
    barFill.fillStyle(0x4ecca3, 1);
    barFill.fillRoundedRect(x, y, contentW * (data.explorationPercent / 100), 8, 4);
    this.container.add([barBg, barFill]);
    y += 18;

    // Description
    this.container.add(this.scene.add.text(x, y, data.biome.description, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: '#8899aa',
      fontStyle: 'italic',
      wordWrap: { width: contentW },
    }));
    y += 36;

    // T-1088: Weather overrides
    if (Object.keys(data.weatherOverrides).length > 0) {
      const overrides = Object.entries(data.weatherOverrides)
        .filter(([, v]) => !v)
        .map(([k]) => `No ${k}`)
        .join(', ');
      if (overrides) {
        this.container.add(this.scene.add.text(x, y, `Weather: ${overrides}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#5dade2',
        }));
        y += 16;
      }
    }

    // ── Resources ──
    y = this.addSection(x, y, contentW, 'Resources', () => {
      let sy = 0;
      for (const res of data.resources) {
        const abundBar = '\u{2588}'.repeat(Math.round(res.abundance * 10));
        const empty = '\u{2591}'.repeat(10 - Math.round(res.abundance * 10));
        const depletedLabel = res.depleted ? ' [DEPLETED]' : '';
        const text = this.scene.add.text(x + 8, y + sy, `${res.name} (${res.type}) ${abundBar}${empty}${depletedLabel}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: res.depleted ? '#e94560' : COLORS.textSecondary,
        });
        this.container.add(text);
        sy += 16;
      }
      return sy;
    });

    // ── Factions (T-1100, T-1101) ──
    y = this.addSection(x, y, contentW, 'Factions', () => {
      let sy = 0;
      for (const faction of data.factions) {
        const dispColor = faction.disposition === 'friendly' ? '#4ecca3'
          : faction.disposition === 'hostile' ? '#e94560' : '#f5a623';
        const repBar = Math.round((faction.reputation + 100) / 2); // 0-100
        this.container.add(this.scene.add.text(x + 8, y + sy, `${faction.name} [${faction.disposition}] Rep: ${faction.reputation}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: dispColor,
        }));
        sy += 16;
      }
      return sy;
    });

    // ── Bosses (T-1103) ──
    if (data.bosses.length > 0) {
      y = this.addSection(x, y, contentW, 'Bosses', () => {
        let sy = 0;
        for (const boss of data.bosses) {
          this.container.add(this.scene.add.text(x + 8, y + sy, `${boss.icon} ${boss.name} (Lv.${boss.level})`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#e94560',
          }));
          sy += 16;
        }
        return sy;
      });
    }

    // ── Landmarks (T-1138, T-1139) ──
    if (data.landmarks.length > 0) {
      y = this.addSection(x, y, contentW, 'Landmarks', () => {
        let sy = 0;
        for (const lm of data.landmarks) {
          const label = lm.discovered ? `${lm.icon} ${lm.name} — ${lm.benefit}` : `${lm.icon} ??? (Explore to discover)`;
          this.container.add(this.scene.add.text(x + 8, y + sy, label, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: lm.discovered ? '#ffd700' : '#555566',
          }));
          sy += 16;
        }
        return sy;
      });
    }

    // ── Lore (T-1097) ──
    const discoveredLore = data.lore.filter(l => l.discovered);
    if (discoveredLore.length > 0) {
      y = this.addSection(x, y, contentW, 'Lore', () => {
        let sy = 0;
        for (const lore of discoveredLore) {
          this.container.add(this.scene.add.text(x + 8, y + sy, lore.title, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#a0c4ff',
            fontStyle: 'bold',
          }));
          sy += 14;
          this.container.add(this.scene.add.text(x + 8, y + sy, lore.text, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: '#778899',
            wordWrap: { width: contentW - 16 },
          }));
          sy += 28;
        }
        return sy;
      });
    }

    // ── Merchants (T-1087) ──
    if (data.merchantInventory.length > 0) {
      y = this.addSection(x, y, contentW, 'Merchant', () => {
        let sy = 0;
        for (const item of data.merchantInventory.slice(0, 5)) {
          this.container.add(this.scene.add.text(x + 8, y + sy, `${item.name} — ${item.price}g (x${item.stock})`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          }));
          sy += 15;
        }
        return sy;
      });
    }

    // ── Encounters (T-1086) ──
    if (data.encounterTable.length > 0) {
      y = this.addSection(x, y, contentW, 'Encounters', () => {
        let sy = 0;
        for (const enc of data.encounterTable) {
          this.container.add(this.scene.add.text(x + 8, y + sy, `${enc.name} (Lv.${enc.minLevel}+)`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          }));
          sy += 14;
        }
        return sy;
      });
    }

    // ── Crafting Recipes (T-1122) ──
    if (data.craftingRecipes.length > 0) {
      y = this.addSection(x, y, contentW, 'Crafting', () => {
        const text = data.craftingRecipes.join(', ');
        this.container.add(this.scene.add.text(x + 8, y, text, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#a0c4ff',
          wordWrap: { width: contentW - 16 },
        }));
        return 16;
      });
    }

    // ── Outposts (T-1092–T-1094) ──
    y = this.addSection(x, y, contentW, `Outposts (${data.outposts.length}/${data.outpostSlots})`, () => {
      let sy = 0;
      for (const outpost of data.outposts) {
        this.container.add(this.scene.add.text(x + 8, y + sy, `Slot ${outpost.index + 1}: ${outpost.buildingType || 'Empty'} (Lv.${outpost.level})`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        }));
        sy += 14;
      }
      if (data.outposts.length < data.outpostSlots) {
        const buildBtn = this.createButton(x + 8, y + sy, 'Build Outpost', () => {
          this.onAction?.('buildOutpost', data.id);
        });
        this.container.add(buildBtn);
        sy += 28;
      }
      return sy || 14;
    });

    // ── Action buttons ──
    y += 8;

    // Travel button
    const travelBtn = this.createButton(x, y, 'Travel Here', () => {
      this.onAction?.('travel', data.id);
    });
    this.container.add(travelBtn);
    y += 32;

    // Explore button
    const exploreBtn = this.createButton(x, y, 'Send Expedition', () => {
      this.onAction?.('explore', data.id);
    });
    this.container.add(exploreBtn);
    y += 32;

    // Claim button
    if (data.claimable && !data.claimed && data.explorationPercent >= 50) {
      const claimBtn = this.createButton(x, y, 'Claim Region', () => {
        this.onAction?.('claim', data.id);
      });
      this.container.add(claimBtn);
      y += 32;
    }

    if (data.claimed) {
      this.container.add(this.scene.add.text(x, y, '\u{1F3F3} Territory Claimed', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#ffd700',
        fontStyle: 'bold',
      }));
    }

    // Slide in animation
    this.scene.tweens.add({
      targets: this.container,
      x: GAME_WIDTH,
      duration: 300,
      ease: 'Power2',
    });
  }

  private addSection(x: number, y: number, width: number, title: string, renderContent: () => number): number {
    // Section header
    const sep = this.scene.add.graphics();
    sep.lineStyle(1, COLORS.panelBorder, 0.5);
    sep.lineBetween(x, y, x + width, y);
    this.container.add(sep);
    y += 6;

    this.container.add(this.scene.add.text(x, y, title, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    }));
    y += 18;

    const contentHeight = renderContent();
    return y + contentHeight + 8;
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.accent, 1);
    bg.fillRoundedRect(0, 0, 140, 24, 6);

    const text = this.scene.add.text(70, 12, label, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.scene.add.zone(70, 12, 140, 24).setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);
    zone.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xff5577, 1);
      bg.fillRoundedRect(0, 0, 140, 24, 6);
    });
    zone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.accent, 1);
      bg.fillRoundedRect(0, 0, 140, 24, 6);
    });

    btn.add([bg, text, zone]);
    return btn;
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.scene.tweens.add({
      targets: this.container,
      x: GAME_WIDTH + 400,
      duration: 250,
      ease: 'Power2',
      onComplete: () => {
        this.container.setVisible(false);
      },
    });
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.container.destroy();
  }
}
