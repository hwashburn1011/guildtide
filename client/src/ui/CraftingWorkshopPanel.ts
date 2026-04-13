/**
 * Full crafting workshop UI with recipe browser, queue, quality display, and history.
 * T-0699 through T-0705: Crafting UI system.
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

const RARITY_COLORS: Record<string, string> = {
  common: '#a0a0b0',
  uncommon: '#4ecca3',
  rare: '#4dabf7',
  epic: '#b366ff',
  legendary: '#ffd700',
};

type CraftTab = 'recipes' | 'queue' | 'history';

export class CraftingWorkshopPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private onChanged: () => void;
  private currentTab: CraftTab = 'recipes';

  constructor(scene: Phaser.Scene, onChanged: () => void) {
    this.scene = scene;
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

    this.container = this.scene.add.container(0, 0).setDepth(101);

    const panelW = 950;
    const panelH = 620;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    // Title
    this.container.add(
      this.scene.add.text(px + 20, py + 15, 'Crafting Workshop', {
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
    this.container.add(closeBtn);

    // Tab buttons
    const tabs: Array<{ label: string; key: CraftTab }> = [
      { label: 'Recipes', key: 'recipes' },
      { label: 'Queue', key: 'queue' },
      { label: 'History', key: 'history' },
    ];

    tabs.forEach((tab, i) => {
      const btn = this.scene.add.text(px + 200 + i * 90, py + 20, tab.label, {
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
      this.container!.add(btn);
    });

    const contentX = px + 20;
    const contentY = py + 50;
    const contentW = panelW - 40;
    const contentH = panelH - 70;

    switch (this.currentTab) {
      case 'recipes':
        await this.renderRecipes(contentX, contentY, contentW, contentH);
        break;
      case 'queue':
        await this.renderQueue(contentX, contentY, contentW, contentH);
        break;
      case 'history':
        await this.renderHistory(contentX, contentY, contentW, contentH);
        break;
    }
  }

  private async renderRecipes(x: number, y: number, w: number, h: number): Promise<void> {
    if (!this.container) return;

    try {
      const recipes = await apiClient.getCraftingRecipes();
      const templates = await apiClient.getItemTemplates();
      const templateMap = new Map(templates.map((t: any) => [t.id, t]));

      let curY = y;
      for (const recipe of recipes) {
        if (curY > y + h - 50) break;

        const template = templateMap.get(recipe.resultTemplateId);
        const rarityColor = template ? RARITY_COLORS[template.rarity] || COLORS.textSecondary : COLORS.textSecondary;

        // Row background
        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(COLORS.background, 0.6);
        rowBg.fillRoundedRect(x, curY, w, 42, 4);
        this.container!.add(rowBg);

        // Name
        this.container!.add(
          this.scene.add.text(x + 8, curY + 4, template?.name || recipe.name, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: rarityColor,
            fontStyle: 'bold',
          })
        );

        // Category
        this.container!.add(
          this.scene.add.text(x + 200, curY + 4, recipe.category, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: '#6a6a7a',
          })
        );

        // Craft time
        const timeStr = recipe.craftTimeSeconds >= 60
          ? `${Math.floor(recipe.craftTimeSeconds / 60)}m ${recipe.craftTimeSeconds % 60}s`
          : `${recipe.craftTimeSeconds}s`;
        this.container!.add(
          this.scene.add.text(x + 300, curY + 4, `Time: ${timeStr}`, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: '#6a6a7a',
          })
        );

        // Cost
        const costStr = Object.entries(recipe.ingredients)
          .map(([res, amt]) => `${amt} ${res}`)
          .join(', ');
        this.container!.add(
          this.scene.add.text(x + 8, curY + 22, `Cost: ${costStr}`, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: COLORS.textSecondary,
          })
        );

        // Queue button
        const craftBtn = this.scene.add.text(x + w - 10, curY + 14, 'Queue', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textAccent,
          fontStyle: 'bold',
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        craftBtn.on('pointerup', () => this.doQueueCraft(recipe.id));
        this.container!.add(craftBtn);

        // Quick craft button
        const quickBtn = this.scene.add.text(x + w - 70, curY + 14, 'Quick', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: '#4ecca3',
          fontStyle: 'bold',
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        quickBtn.on('pointerup', () => this.doQuickCraft(recipe.resultTemplateId));
        this.container!.add(quickBtn);

        curY += 46;
      }
    } catch (err) {
      this.showError(x, y, w, 'Failed to load recipes');
    }
  }

  private async renderQueue(x: number, y: number, w: number, h: number): Promise<void> {
    if (!this.container) return;

    try {
      const state = await apiClient.getCraftingState();
      const recipes = await apiClient.getCraftingRecipes();
      const recipeMap = new Map(recipes.map((r: any) => [r.id, r]));

      if (!state.queue || state.queue.length === 0) {
        this.container!.add(
          this.scene.add.text(x + w / 2, y + 80, 'Crafting queue is empty.\nQueue items from the Recipes tab.', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.body}px`,
            color: COLORS.textSecondary,
            align: 'center',
          }).setOrigin(0.5)
        );

        // Collect button
        const collectBtn = this.scene.add.text(x + w / 2, y + 140, 'Collect Completed', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textAccent,
          fontStyle: 'bold',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        collectBtn.on('pointerup', () => this.doCollect());
        this.container!.add(collectBtn);
        return;
      }

      // Collect button at top
      const collectBtn = this.scene.add.text(x + w - 10, y, 'Collect Completed', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textAccent,
        fontStyle: 'bold',
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
      collectBtn.on('pointerup', () => this.doCollect());
      this.container!.add(collectBtn);

      let curY = y + 30;
      for (const entry of state.queue) {
        if (curY > y + h - 40) break;

        const recipe = recipeMap.get(entry.recipeId);
        const now = Date.now();
        const completeTime = new Date(entry.completesAt).getTime();
        const isComplete = completeTime <= now;

        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(isComplete ? 0x1a4a1a : COLORS.background, 0.6);
        rowBg.fillRoundedRect(x, curY, w, 36, 4);
        this.container!.add(rowBg);

        this.container!.add(
          this.scene.add.text(x + 8, curY + 5, recipe?.name || entry.recipeId, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textPrimary,
            fontStyle: 'bold',
          })
        );

        // Quality badge
        const qualityColors: Record<string, string> = {
          normal: '#a0a0b0',
          fine: '#4ecca3',
          masterwork: '#ffd700',
        };
        this.container!.add(
          this.scene.add.text(x + 200, curY + 5, entry.quality, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: qualityColors[entry.quality] || COLORS.textSecondary,
            fontStyle: 'bold',
          })
        );

        // Status
        const statusText = isComplete ? 'READY!' : `Completes: ${new Date(entry.completesAt).toLocaleTimeString()}`;
        this.container!.add(
          this.scene.add.text(x + 300, curY + 5, statusText, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: isComplete ? '#4ecca3' : '#6a6a7a',
          })
        );

        // Cancel button (only for in-progress items)
        if (!isComplete) {
          const cancelBtn = this.scene.add.text(x + w - 10, curY + 18, 'Cancel', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#ff4444',
          }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
          cancelBtn.on('pointerup', () => this.doCancelCraft(entry.recipeId));
          this.container!.add(cancelBtn);
        }

        curY += 40;
      }

      // Total crafted
      this.container!.add(
        this.scene.add.text(x, curY + 10, `Total items crafted: ${state.totalCrafted}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textSecondary,
        })
      );
    } catch (err) {
      this.showError(x, y, w, 'Failed to load crafting queue');
    }
  }

  private async renderHistory(x: number, y: number, w: number, h: number): Promise<void> {
    if (!this.container) return;

    try {
      const history = await apiClient.getCraftingHistory();
      const templates = await apiClient.getItemTemplates();
      const templateMap = new Map(templates.map((t: any) => [t.id, t]));

      if (history.length === 0) {
        this.container!.add(
          this.scene.add.text(x + w / 2, y + 80, 'No crafting history yet.', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.body}px`,
            color: COLORS.textSecondary,
            align: 'center',
          }).setOrigin(0.5)
        );
        return;
      }

      let curY = y;
      const recent = history.slice(-20).reverse();
      for (const entry of recent) {
        if (curY > y + h - 30) break;

        const template = templateMap.get(entry.resultTemplateId);
        const rarityColor = template ? RARITY_COLORS[template.rarity] || COLORS.textSecondary : COLORS.textSecondary;

        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(COLORS.background, 0.4);
        rowBg.fillRoundedRect(x, curY, w, 26, 4);
        this.container!.add(rowBg);

        this.container!.add(
          this.scene.add.text(x + 8, curY + 4, template?.name || entry.resultTemplateId, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: rarityColor,
            fontStyle: 'bold',
          })
        );

        const qualityColors: Record<string, string> = { normal: '#a0a0b0', fine: '#4ecca3', masterwork: '#ffd700' };
        this.container!.add(
          this.scene.add.text(x + 200, curY + 4, entry.quality, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: qualityColors[entry.quality] || COLORS.textSecondary,
          })
        );

        this.container!.add(
          this.scene.add.text(x + 300, curY + 4, new Date(entry.craftedAt).toLocaleDateString(), {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: '#6a6a7a',
          })
        );

        curY += 30;
      }
    } catch (err) {
      this.showError(x, y, w, 'Failed to load crafting history');
    }
  }

  private async doQueueCraft(recipeId: string): Promise<void> {
    try {
      await apiClient.queueCraft(recipeId);
      this.onChanged();
      this.currentTab = 'queue';
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Queue failed');
    }
  }

  private async doQuickCraft(templateId: string): Promise<void> {
    try {
      await apiClient.craftItem(templateId);
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Craft failed');
    }
  }

  private async doCollect(): Promise<void> {
    try {
      const result = await apiClient.collectCrafting();
      if (result.collected && result.collected.length > 0) {
        const names = result.collected.map((c: any) => `${c.templateId} (${c.quality})`).join(', ');
        this.showToast(`Collected: ${names}`);
      } else {
        this.showToast('Nothing ready to collect');
      }
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Collect failed');
    }
  }

  private async doCancelCraft(recipeId: string): Promise<void> {
    try {
      await apiClient.cancelCrafting(recipeId);
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Cancel failed');
    }
  }

  private showError(x: number, y: number, w: number, msg: string): void {
    if (!this.container) return;
    this.container.add(
      this.scene.add.text(x + w / 2, y + 80, msg, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: '#ff4444',
        align: 'center',
      }).setOrigin(0.5)
    );
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
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
