/**
 * Item achievement system panel (collect all legendaries, craft N items, etc.)
 * T-0738: Item achievement system.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

interface ItemAchievement {
  id: string;
  name: string;
  description: string;
  category: 'collector' | 'crafter' | 'enchanter' | 'salvager' | 'trader';
  requirement: number;
  current: number;
  unlocked: boolean;
}

export class ItemAchievementPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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

    this.container = this.scene.add.container(0, 0).setDepth(101);

    const panelW = 700;
    const panelH = 550;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    this.container.add(
      this.scene.add.text(px + 20, py + 15, 'Item Achievements', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      })
    );

    const closeBtn = this.scene.add.text(px + panelW - 20, py + 15, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    try {
      // Build achievements from collection and crafting data
      const [collection, craftingState] = await Promise.all([
        apiClient.getItemCollection(),
        apiClient.getCraftingState(),
      ]);

      const totalOwned = Object.values(collection).reduce((s, c: any) => s + c.owned, 0);
      const totalItems = Object.values(collection).reduce((s, c: any) => s + c.total, 0);

      const achievements: ItemAchievement[] = [
        {
          id: 'ach_first_item', name: 'First Find', description: 'Own your first item',
          category: 'collector', requirement: 1, current: totalOwned, unlocked: totalOwned >= 1,
        },
        {
          id: 'ach_item_10', name: 'Budding Collector', description: 'Own 10 unique items',
          category: 'collector', requirement: 10, current: totalOwned, unlocked: totalOwned >= 10,
        },
        {
          id: 'ach_item_25', name: 'Avid Collector', description: 'Own 25 unique items',
          category: 'collector', requirement: 25, current: totalOwned, unlocked: totalOwned >= 25,
        },
        {
          id: 'ach_item_50', name: 'Hoarder', description: 'Own 50 unique items',
          category: 'collector', requirement: 50, current: totalOwned, unlocked: totalOwned >= 50,
        },
        {
          id: 'ach_item_all', name: 'Completionist', description: 'Own every item in the game',
          category: 'collector', requirement: totalItems, current: totalOwned, unlocked: totalOwned >= totalItems,
        },
        {
          id: 'ach_craft_1', name: 'First Craft', description: 'Craft your first item',
          category: 'crafter', requirement: 1, current: craftingState.totalCrafted || 0,
          unlocked: (craftingState.totalCrafted || 0) >= 1,
        },
        {
          id: 'ach_craft_10', name: 'Apprentice Smith', description: 'Craft 10 items',
          category: 'crafter', requirement: 10, current: craftingState.totalCrafted || 0,
          unlocked: (craftingState.totalCrafted || 0) >= 10,
        },
        {
          id: 'ach_craft_50', name: 'Journeyman Crafter', description: 'Craft 50 items',
          category: 'crafter', requirement: 50, current: craftingState.totalCrafted || 0,
          unlocked: (craftingState.totalCrafted || 0) >= 50,
        },
        {
          id: 'ach_craft_100', name: 'Master Artisan', description: 'Craft 100 items',
          category: 'crafter', requirement: 100, current: craftingState.totalCrafted || 0,
          unlocked: (craftingState.totalCrafted || 0) >= 100,
        },
        {
          id: 'ach_legendary_1', name: 'Legendary Hunter', description: 'Discover a legendary item',
          category: 'collector', requirement: 1,
          current: collection['legendary']?.owned || collection['weapon']?.owned || 0,
          unlocked: false, // Would need to track per-rarity
        },
        {
          id: 'ach_set_complete', name: 'Set Collector', description: 'Complete an item set',
          category: 'collector', requirement: 1, current: 0, unlocked: false,
        },
        {
          id: 'ach_gems_5', name: 'Gem Collector', description: 'Collect 5 different gems',
          category: 'collector', requirement: 5,
          current: collection['gem']?.owned || 0,
          unlocked: (collection['gem']?.owned || 0) >= 5,
        },
      ];

      let curY = py + 50;
      const contentW = panelW - 40;

      // Category headers
      const categories = ['collector', 'crafter', 'enchanter'];
      const categoryLabels: Record<string, string> = {
        collector: 'Collection',
        crafter: 'Crafting',
        enchanter: 'Enchanting',
      };

      for (const cat of categories) {
        const catAchievements = achievements.filter(a => a.category === cat);
        if (catAchievements.length === 0) continue;
        if (curY > py + panelH - 60) break;

        this.container.add(
          this.scene.add.text(px + 20, curY, categoryLabels[cat] || cat, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textGold,
            fontStyle: 'bold',
          })
        );
        curY += 22;

        for (const ach of catAchievements) {
          if (curY > py + panelH - 40) break;

          const rowBg = this.scene.add.graphics();
          rowBg.fillStyle(ach.unlocked ? 0x1a3a1a : COLORS.background, 0.5);
          rowBg.fillRoundedRect(px + 20, curY, contentW, 28, 4);
          this.container.add(rowBg);

          // Status icon
          this.container.add(
            this.scene.add.text(px + 28, curY + 5, ach.unlocked ? '\u2713' : '\u2717', {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: ach.unlocked ? '#4ecca3' : '#ff4444',
              fontStyle: 'bold',
            })
          );

          // Name
          this.container.add(
            this.scene.add.text(px + 48, curY + 5, ach.name, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: ach.unlocked ? COLORS.textGold : COLORS.textPrimary,
              fontStyle: 'bold',
            })
          );

          // Description
          this.container.add(
            this.scene.add.text(px + 200, curY + 5, ach.description, {
              fontFamily: FONTS.primary,
              fontSize: '10px',
              color: '#6a6a7a',
            })
          );

          // Progress
          const progressStr = `${Math.min(ach.current, ach.requirement)}/${ach.requirement}`;
          this.container.add(
            this.scene.add.text(px + 20 + contentW - 10, curY + 5, progressStr, {
              fontFamily: FONTS.primary,
              fontSize: '10px',
              color: ach.unlocked ? '#4ecca3' : COLORS.textSecondary,
            }).setOrigin(1, 0)
          );

          curY += 32;
        }
        curY += 6;
      }

      // Summary
      const unlockedCount = achievements.filter(a => a.unlocked).length;
      this.container.add(
        this.scene.add.text(px + panelW / 2, py + panelH - 25, `${unlockedCount}/${achievements.length} achievements unlocked`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textSecondary,
        }).setOrigin(0.5)
      );
    } catch (err) {
      this.container.add(
        this.scene.add.text(px + panelW / 2, py + 200, 'Failed to load achievements', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#ff4444',
          align: 'center',
        }).setOrigin(0.5)
      );
    }
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
