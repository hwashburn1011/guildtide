/**
 * Full inventory panel with grid layout, category tabs, sorting, filtering,
 * search, item tooltips, equip, sell, salvage, lock, upgrade, and comparison.
 *
 * T-0688 through T-0694, T-0728 through T-0732, T-0739, T-0743, T-0758.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';
import { ItemCompareTooltip } from './ItemCompareTooltip';
import type { Hero } from '@shared/types';

const RARITY_COLORS: Record<string, string> = {
  common: '#a0a0b0',
  uncommon: '#4ecca3',
  rare: '#4dabf7',
  epic: '#b366ff',
  legendary: '#ffd700',
};

const RARITY_BORDERS: Record<string, number> = {
  common: 0x606070,
  uncommon: 0x4ecca3,
  rare: 0x4dabf7,
  epic: 0xb366ff,
  legendary: 0xffd700,
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
  consumable: 'Consumables',
  material: 'Materials',
  gem: 'Gems',
  helmet: 'Helmets',
  boots: 'Boots',
  shield: 'Shields',
  ring: 'Rings',
  amulet: 'Amulets',
  belt: 'Belts',
  cloak: 'Cloaks',
};

const EQUIPPABLE_SLOTS: Record<string, string> = {
  weapon: 'weapon',
  armor: 'armor',
  charm: 'charm',
  tool: 'tool',
  helmet: 'helmet',
  boots: 'boots',
  shield: 'shield',
  ring: 'ring',
  amulet: 'amulet',
  belt: 'belt',
  cloak: 'cloak',
};

type TabMode = 'inventory' | 'craft' | 'collection';
type SortMode = 'type' | 'rarity' | 'name' | 'value';

export class InventoryPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private panelContainer: Phaser.GameObjects.Container | null = null;
  private heroes: Hero[];
  private onChanged: () => void;
  private currentTab: TabMode = 'inventory';
  private sortBy: SortMode = 'type';
  private filterCategory: string = '';
  private searchQuery: string = '';
  private compareTooltip: ItemCompareTooltip;

  constructor(scene: Phaser.Scene, heroes: Hero[], onChanged: () => void) {
    this.scene = scene;
    this.heroes = heroes;
    this.onChanged = onChanged;
    this.compareTooltip = new ItemCompareTooltip(scene);
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

    const panelW = 1000;
    const panelH = 640;
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
      this.scene.add.text(px + 20, py + 12, 'Inventory', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      })
    );

    // Close button
    const closeBtn = this.scene.add.text(px + panelW - 20, py + 12, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.panelContainer.add(closeBtn);

    // Tab buttons
    const tabs: Array<{ label: string; key: TabMode }> = [
      { label: 'Items', key: 'inventory' },
      { label: 'Craft', key: 'craft' },
      { label: 'Collection', key: 'collection' },
    ];
    tabs.forEach((tab, i) => {
      const btn = this.scene.add.text(px + 160 + i * 80, py + 18, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: this.currentTab === tab.key ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });
      btn.on('pointerup', () => {
        this.currentTab = tab.key;
        this.hide();
        this.show();
      });
      this.panelContainer!.add(btn);
    });

    const contentX = px + 20;
    const contentY = py + 45;
    const contentW = panelW - 40;
    const contentH = panelH - 65;

    switch (this.currentTab) {
      case 'inventory':
        await this.renderInventory(contentX, contentY, contentW, contentH);
        break;
      case 'craft':
        await this.renderCraftTab(contentX, contentY, contentW, contentH);
        break;
      case 'collection':
        await this.renderCollectionTab(contentX, contentY, contentW, contentH);
        break;
    }
  }

  private async renderInventory(x: number, y: number, width: number, height: number): Promise<void> {
    if (!this.panelContainer) return;

    // Sort/filter bar
    const sortLabels: Array<{ label: string; key: SortMode }> = [
      { label: 'Type', key: 'type' },
      { label: 'Rarity', key: 'rarity' },
      { label: 'Name', key: 'name' },
      { label: 'Value', key: 'value' },
    ];
    this.panelContainer.add(
      this.scene.add.text(x, y, 'Sort:', {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: COLORS.textSecondary,
      })
    );
    sortLabels.forEach((s, i) => {
      const btn = this.scene.add.text(x + 35 + i * 55, y, s.label, {
        fontFamily: FONTS.primary,
        fontSize: '10px',
        color: this.sortBy === s.key ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: this.sortBy === s.key ? 'bold' : 'normal',
      }).setInteractive({ useHandCursor: true });
      btn.on('pointerup', () => {
        this.sortBy = s.key;
        this.hide();
        this.show();
      });
      this.panelContainer!.add(btn);
    });

    // Capacity
    try {
      const capacity = await apiClient.getInventoryCapacity();
      this.panelContainer.add(
        this.scene.add.text(x + width - 10, y, `${capacity.used}/${capacity.max}`, {
          fontFamily: FONTS.primary,
          fontSize: '10px',
          color: capacity.used >= capacity.max ? '#ff4444' : COLORS.textSecondary,
        }).setOrigin(1, 0)
      );
    } catch { /* skip */ }

    try {
      const inventory = await apiClient.getInventory({
        sortBy: this.sortBy,
        category: this.filterCategory || undefined,
        rarity: undefined,
        search: this.searchQuery || undefined,
      });

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

      let curY = y + 18;
      for (const [category, items] of Object.entries(grouped)) {
        if (curY > y + height - 50) break;

        const label = CATEGORY_LABELS[category] || category;
        this.panelContainer.add(
          this.scene.add.text(x, curY, label, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textGold,
            fontStyle: 'bold',
          })
        );
        curY += 20;

        for (const item of items) {
          if (curY > y + height - 40) break;
          const template = item.template;
          if (!template) continue;

          const rarityColor = RARITY_COLORS[template.rarity] || COLORS.textSecondary;
          const borderColor = RARITY_BORDERS[template.rarity] || 0x606070;
          const isLocked = item.metadata?.locked;

          // Row with rarity-colored left border
          const rowBg = this.scene.add.graphics();
          rowBg.fillStyle(COLORS.background, 0.6);
          rowBg.fillRoundedRect(x, curY, width, 28, 4);
          rowBg.lineStyle(2, borderColor);
          rowBg.lineBetween(x, curY + 2, x, curY + 26);
          this.panelContainer.add(rowBg);

          // Lock indicator
          if (isLocked) {
            this.panelContainer.add(
              this.scene.add.text(x + 6, curY + 5, '\u{1F512}', {
                fontFamily: FONTS.primary,
                fontSize: '10px',
                color: '#ffd700',
              })
            );
          }

          // Name
          this.panelContainer.add(
            this.scene.add.text(x + (isLocked ? 22 : 8), curY + 5, template.name, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: rarityColor,
              fontStyle: 'bold',
            })
          );

          // Quantity
          this.panelContainer.add(
            this.scene.add.text(x + 180, curY + 5, `x${item.quantity}`, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: COLORS.textSecondary,
            })
          );

          // Stats summary
          const effects: string[] = [];
          if (template.effects.statBonuses) {
            const stats = Object.entries(template.effects.statBonuses)
              .map(([k, v]: [string, any]) => `+${v} ${k.substring(0, 3).toUpperCase()}`)
              .join(' ');
            effects.push(stats);
          }
          if (template.effects.expeditionBonus) effects.push(`+${template.effects.expeditionBonus}% exp`);
          if (template.effects.buildingBonus) effects.push(`+${Math.round(template.effects.buildingBonus * 100)}% bld`);

          this.panelContainer.add(
            this.scene.add.text(x + 220, curY + 5, effects.join(' | '), {
              fontFamily: FONTS.primary,
              fontSize: '10px',
              color: '#6a6a7a',
            })
          );

          // Value
          if (template.sellValue) {
            this.panelContainer.add(
              this.scene.add.text(x + 550, curY + 5, `${template.sellValue}g`, {
                fontFamily: FONTS.primary,
                fontSize: '10px',
                color: '#c0a050',
              })
            );
          }

          // Action buttons (right side)
          let btnX = x + width - 10;

          // Equip button
          const slot = EQUIPPABLE_SLOTS[template.category];
          if (slot) {
            const equipBtn = this.scene.add.text(btnX, curY + 14, 'Equip', {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: COLORS.textAccent,
              fontStyle: 'bold',
            }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
            equipBtn.on('pointerup', () => this.showHeroPicker(item.id, slot, btnX - 160, curY + 28));
            this.panelContainer.add(equipBtn);
            btnX -= 45;
          }

          // Sell button
          const sellBtn = this.scene.add.text(btnX, curY + 14, 'Sell', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#f5a623',
          }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
          sellBtn.on('pointerup', () => this.doSell(item.id));
          this.panelContainer.add(sellBtn);
          btnX -= 35;

          // Salvage button
          const salvageBtn = this.scene.add.text(btnX, curY + 14, 'Salv', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#7fa8c9',
          }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
          salvageBtn.on('pointerup', () => this.doSalvage(item.id));
          this.panelContainer.add(salvageBtn);
          btnX -= 35;

          // Lock button
          const lockBtn = this.scene.add.text(btnX, curY + 14, isLocked ? 'Unlk' : 'Lock', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: isLocked ? '#4ecca3' : '#6a6a7a',
          }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
          lockBtn.on('pointerup', () => this.doToggleLock(item.id));
          this.panelContainer.add(lockBtn);

          // Upgrade button (if has 3+)
          if (item.quantity >= 3) {
            const upgradeBtn = this.scene.add.text(btnX - 35, curY + 14, 'Upgr', {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: '#b366ff',
            }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
            upgradeBtn.on('pointerup', () => this.doUpgrade(item.id));
            this.panelContainer.add(upgradeBtn);
          }

          curY += 32;
        }
        curY += 6;
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
        if (curY > y + height - 50) break;

        const rarityColor = RARITY_COLORS[template.rarity] || COLORS.textSecondary;

        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(COLORS.background, 0.6);
        rowBg.fillRoundedRect(x, curY, width, 36, 4);
        this.panelContainer.add(rowBg);

        this.panelContainer.add(
          this.scene.add.text(x + 8, curY + 4, template.name, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: rarityColor,
            fontStyle: 'bold',
          })
        );

        const catLabel = CATEGORY_LABELS[template.category] || template.category;
        this.panelContainer.add(
          this.scene.add.text(x + 180, curY + 4, catLabel, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: '#6a6a7a',
          })
        );

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

  private async renderCollectionTab(x: number, y: number, width: number, height: number): Promise<void> {
    if (!this.panelContainer) return;

    try {
      const collection = await apiClient.getItemCollection();

      this.panelContainer.add(
        this.scene.add.text(x, y, 'Collection Progress', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        })
      );

      let curY = y + 24;
      for (const [category, stats] of Object.entries(collection)) {
        if (curY > y + height - 30) break;

        const label = CATEGORY_LABELS[category] || category;
        const barW = 200;

        this.panelContainer.add(
          this.scene.add.text(x, curY, `${label}:`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textPrimary,
          })
        );

        // Progress bar
        const barBg = this.scene.add.graphics();
        barBg.fillStyle(0x333355, 1);
        barBg.fillRoundedRect(x + 140, curY, barW, 16, 3);
        this.panelContainer.add(barBg);

        const fillW = Math.max(0, (stats.percent / 100) * barW);
        if (fillW > 0) {
          const barFill = this.scene.add.graphics();
          barFill.fillStyle(stats.percent === 100 ? 0xffd700 : 0x4ecca3, 1);
          barFill.fillRoundedRect(x + 140, curY, fillW, 16, 3);
          this.panelContainer.add(barFill);
        }

        this.panelContainer.add(
          this.scene.add.text(x + 140 + barW / 2, curY + 2, `${stats.owned}/${stats.total} (${stats.percent}%)`, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: '#ffffff',
            fontStyle: 'bold',
          }).setOrigin(0.5, 0)
        );

        curY += 26;
      }

      // Item lore section
      curY += 10;
      this.panelContainer.add(
        this.scene.add.text(x, curY, 'Discovered Lore', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        })
      );
      curY += 22;

      try {
        const lore = await apiClient.getItemLore();
        for (const entry of lore) {
          if (curY > y + height - 40) break;

          this.panelContainer.add(
            this.scene.add.text(x + 8, curY, entry.name, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: COLORS.textGold,
              fontStyle: 'bold',
            })
          );
          curY += 16;

          this.panelContainer.add(
            this.scene.add.text(x + 16, curY, `"${entry.lore}"`, {
              fontFamily: FONTS.primary,
              fontSize: '10px',
              color: '#8a7a5a',
              wordWrap: { width: width - 40 },
            })
          );
          curY += 24;
        }
      } catch { /* skip lore errors */ }
    } catch (err) {
      this.panelContainer.add(
        this.scene.add.text(x + width / 2, y + 100, 'Failed to load collection', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#ff4444',
          align: 'center',
        }).setOrigin(0.5)
      );
    }
  }

  private showHeroPicker(itemId: string, slot: string, x: number, y: number): void {
    if (!this.panelContainer || this.heroes.length === 0) return;

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

  private async doSell(itemId: string): Promise<void> {
    try {
      const result = await apiClient.sellItems([{ itemId, quantity: 1 }]);
      this.showToast(`Sold for ${result.totalGold} gold`);
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Sell failed');
    }
  }

  private async doSalvage(itemId: string): Promise<void> {
    try {
      const result = await apiClient.salvageItem(itemId, 1);
      const recoveredStr = Object.entries(result.recovered)
        .map(([r, a]) => `${a} ${r}`)
        .join(', ');
      this.showToast(`Salvaged: ${recoveredStr}`);
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Salvage failed');
    }
  }

  private async doToggleLock(itemId: string): Promise<void> {
    try {
      const result = await apiClient.toggleItemLock(itemId);
      this.showToast(result.locked ? 'Item locked' : 'Item unlocked');
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Lock failed');
    }
  }

  private async doUpgrade(itemId: string): Promise<void> {
    try {
      await apiClient.upgradeItem(itemId);
      this.showToast('Item upgraded!');
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Upgrade failed');
    }
  }

  private showToast(message: string): void {
    const toast = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, message, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.small}px`,
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(200);
    this.scene.time.delayedCall(3000, () => toast.destroy());
  }

  hide(): void {
    this.compareTooltip.hide();
    this.overlay?.destroy();
    this.panelContainer?.destroy(true);
    this.overlay = null;
    this.panelContainer = null;
  }

  setHeroes(heroes: Hero[]): void {
    this.heroes = heroes;
  }
}
