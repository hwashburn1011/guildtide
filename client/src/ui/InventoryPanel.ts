import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import type { Hero } from '@shared/types';

const RARITY_COLORS: Record<string, string> = {
  common: '#a0a0b0',
  uncommon: '#4ecca3',
  rare: '#4dabf7',
  legendary: '#ffd700',
};

const CATEGORY_LABELS: Record<string, string> = {
  weapon: 'Weapons',
  armor: 'Armor',
  charm: 'Charms',
  tool: 'Tools',
  relic: 'Relics',
  seed: 'Seeds',
  trade_permit: 'Trade Permits',
  transport_upgrade: 'Transport',
};

const CATEGORY_TO_SLOT: Record<string, string> = {
  weapon: 'weapon',
  armor: 'armor',
  charm: 'charm',
  tool: 'tool',
};

type TabMode = 'inventory' | 'craft';

export class InventoryPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private panelContainer: Phaser.GameObjects.Container | null = null;
  private heroes: Hero[];
  private onChanged: () => void;
  private currentTab: TabMode = 'inventory';

  constructor(
    scene: Phaser.Scene,
    heroes: Hero[],
    onChanged: () => void,
  ) {
    this.scene = scene;
    this.heroes = heroes;
    this.onChanged = onChanged;
  }

  async show(): Promise<void> {
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(100);

    this.panelContainer = this.scene.add.container(0, 0).setDepth(101);

    const panelW = 950;
    const panelH = 600;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.panelContainer.add(bg);

    // Title
    this.panelContainer.add(
      this.scene.add.text(px + 20, py + 15, 'Inventory', {
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

    // Tab buttons
    const invTab = this.scene.add.text(px + 160, py + 20, 'Items', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: this.currentTab === 'inventory' ? COLORS.textGold : COLORS.textSecondary,
      fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    invTab.on('pointerup', () => {
      this.currentTab = 'inventory';
      this.hide();
      this.show();
    });
    this.panelContainer.add(invTab);

    const craftTab = this.scene.add.text(px + 230, py + 20, 'Craft', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: this.currentTab === 'craft' ? COLORS.textGold : COLORS.textSecondary,
      fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true });
    craftTab.on('pointerup', () => {
      this.currentTab = 'craft';
      this.hide();
      this.show();
    });
    this.panelContainer.add(craftTab);

    if (this.currentTab === 'inventory') {
      await this.renderInventory(px + 20, py + 50, panelW - 40, panelH - 70);
    } else {
      await this.renderCraftTab(px + 20, py + 50, panelW - 40, panelH - 70);
    }
  }

  private async renderInventory(x: number, y: number, width: number, height: number): Promise<void> {
    if (!this.panelContainer) return;

    try {
      const inventory = await apiClient.getInventory();

      if (inventory.length === 0) {
        this.panelContainer.add(
          this.scene.add.text(x + width / 2, y + 100, 'No items yet.\nCraft or find items on expeditions!', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.body}px`,
            color: COLORS.textSecondary,
            align: 'center',
          }).setOrigin(0.5)
        );
        return;
      }

      // Group by category
      const grouped: Record<string, any[]> = {};
      for (const item of inventory) {
        const cat = item.template?.category || 'unknown';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      }

      let curY = y;
      for (const [category, items] of Object.entries(grouped)) {
        if (curY > y + height - 40) break;

        // Category header
        const label = CATEGORY_LABELS[category] || category;
        this.panelContainer.add(
          this.scene.add.text(x, curY, label, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textGold,
            fontStyle: 'bold',
          })
        );
        curY += 22;

        for (const item of items) {
          if (curY > y + height - 30) break;
          const template = item.template;
          if (!template) continue;

          const rarityColor = RARITY_COLORS[template.rarity] || COLORS.textSecondary;

          // Item row background
          const rowBg = this.scene.add.graphics();
          rowBg.fillStyle(COLORS.background, 0.6);
          rowBg.fillRoundedRect(x, curY, width, 28, 4);
          this.panelContainer.add(rowBg);

          // Name with rarity color
          this.panelContainer.add(
            this.scene.add.text(x + 8, curY + 5, `${template.name}`, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: rarityColor,
              fontStyle: 'bold',
            })
          );

          // Quantity
          this.panelContainer.add(
            this.scene.add.text(x + 200, curY + 5, `x${item.quantity}`, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: COLORS.textSecondary,
            })
          );

          // Description (truncated)
          const desc = template.description.length > 50
            ? template.description.substring(0, 47) + '...'
            : template.description;
          this.panelContainer.add(
            this.scene.add.text(x + 250, curY + 5, desc, {
              fontFamily: FONTS.primary,
              fontSize: '10px',
              color: '#6a6a7a',
            })
          );

          // Effects summary
          const effects: string[] = [];
          if (template.effects.statBonuses) {
            const stats = Object.entries(template.effects.statBonuses)
              .map(([k, v]) => `+${v} ${k.substring(0, 3).toUpperCase()}`)
              .join(' ');
            effects.push(stats);
          }
          if (template.effects.expeditionBonus) {
            effects.push(`+${template.effects.expeditionBonus}% exp`);
          }
          if (template.effects.buildingBonus) {
            effects.push(`+${Math.round(template.effects.buildingBonus * 100)}% bld`);
          }

          // Equip button (only for equippable categories)
          const slot = CATEGORY_TO_SLOT[template.category];
          if (slot) {
            const equipBtn = this.scene.add.text(x + width - 10, curY + 14, 'Equip', {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: COLORS.textAccent,
              fontStyle: 'bold',
            }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
            equipBtn.on('pointerup', () => this.showHeroPicker(item.id, slot, x + width - 160, curY + 28));
            this.panelContainer.add(equipBtn);
          }

          curY += 32;
        }
        curY += 8;
      }
    } catch (err) {
      this.panelContainer.add(
        this.scene.add.text(x + width / 2, y + 100, 'Failed to load inventory', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#ff4444',
          align: 'center',
        }).setOrigin(0.5)
      );
    }
  }

  private async renderCraftTab(x: number, y: number, width: number, height: number): Promise<void> {
    if (!this.panelContainer) return;

    try {
      const templates = await apiClient.getItemTemplates();
      const craftable = templates.filter((t: any) => t.craftable);

      let curY = y;
      for (const template of craftable) {
        if (curY > y + height - 40) break;

        const rarityColor = RARITY_COLORS[template.rarity] || COLORS.textSecondary;

        // Row bg
        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(COLORS.background, 0.6);
        rowBg.fillRoundedRect(x, curY, width, 36, 4);
        this.panelContainer.add(rowBg);

        // Name
        this.panelContainer.add(
          this.scene.add.text(x + 8, curY + 4, template.name, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: rarityColor,
            fontStyle: 'bold',
          })
        );

        // Category tag
        const catLabel = CATEGORY_LABELS[template.category] || template.category;
        this.panelContainer.add(
          this.scene.add.text(x + 180, curY + 4, catLabel, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: '#6a6a7a',
          })
        );

        // Cost
        if (template.craftCost) {
          const costStr = Object.entries(template.craftCost)
            .map(([res, amt]) => `${amt} ${res}`)
            .join(', ');
          this.panelContainer.add(
            this.scene.add.text(x + 8, curY + 20, `Cost: ${costStr}`, {
              fontFamily: FONTS.primary,
              fontSize: '10px',
              color: COLORS.textSecondary,
            })
          );
        }

        // Craft button
        const craftBtn = this.scene.add.text(x + width - 10, curY + 18, 'Craft', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textAccent,
          fontStyle: 'bold',
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        craftBtn.on('pointerup', () => this.doCraft(template.id));
        this.panelContainer.add(craftBtn);

        curY += 40;
      }
    } catch (err) {
      this.panelContainer.add(
        this.scene.add.text(x + width / 2, y + 100, 'Failed to load craft recipes', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#ff4444',
          align: 'center',
        }).setOrigin(0.5)
      );
    }
  }

  private showHeroPicker(itemId: string, slot: string, x: number, y: number): void {
    if (!this.panelContainer) return;

    if (this.heroes.length === 0) return;

    const menuBg = this.scene.add.graphics();
    menuBg.fillStyle(0x0f3460, 0.98);
    const menuH = this.heroes.length * 26 + 10;
    menuBg.fillRoundedRect(x, y, 160, menuH, 4);
    menuBg.setDepth(102);
    this.panelContainer.add(menuBg);

    this.heroes.forEach((hero, i) => {
      const item = this.scene.add.text(x + 10, y + 5 + i * 26, `${hero.name} (${hero.role})`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textPrimary,
      }).setInteractive({ useHandCursor: true }).setDepth(102);

      item.on('pointerover', () => item.setColor(COLORS.textGold));
      item.on('pointerout', () => item.setColor(COLORS.textPrimary));
      item.on('pointerup', () => this.doEquip(hero.id, itemId, slot));

      this.panelContainer!.add(item);
    });
  }

  private async doEquip(heroId: string, itemId: string, slot: string): Promise<void> {
    try {
      await apiClient.equipItem(heroId, itemId, slot);
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Equip failed');
    }
  }

  private async doCraft(templateId: string): Promise<void> {
    try {
      await apiClient.craftItem(templateId);
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Craft failed');
    }
  }

  private showToast(message: string): void {
    const toast = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, message, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ff4444',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(200);

    this.scene.time.delayedCall(3000, () => toast.destroy());
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
}
