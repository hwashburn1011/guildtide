/**
 * Item salvage/disenchant UI with material recovery preview.
 * T-0719, T-0720: Salvage system with material preview.
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

export class ItemSalvagePanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private onChanged: () => void;

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

    const panelW = 800;
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
      this.scene.add.text(px + 20, py + 15, 'Salvage Workshop', {
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

    this.container.add(
      this.scene.add.text(px + 20, py + 45, 'Break down items to recover crafting materials. Locked items are protected.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      })
    );

    try {
      const inventory = await apiClient.getInventory();
      const templates = await apiClient.getItemTemplates();
      const templateMap = new Map(templates.map((t: any) => [t.id, t]));

      // Filter items that can be salvaged (have salvage yield and not locked)
      const salvageable = inventory.filter((item: any) => {
        const t = templateMap.get(item.templateId);
        if (!t || !t.salvageYield) return false;
        if (item.metadata?.locked) return false;
        return Object.keys(t.salvageYield).length > 0;
      });

      if (salvageable.length === 0) {
        this.container.add(
          this.scene.add.text(px + panelW / 2, py + 200, 'No salvageable items in inventory.\n(Locked items are excluded)', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.body}px`,
            color: COLORS.textSecondary,
            align: 'center',
          }).setOrigin(0.5)
        );
        return;
      }

      let curY = py + 68;
      const contentW = panelW - 40;

      // Header
      this.container.add(
        this.scene.add.text(px + 28, curY, 'Item', {
          fontFamily: FONTS.primary, fontSize: '10px', color: '#6a6a7a', fontStyle: 'bold',
        })
      );
      this.container.add(
        this.scene.add.text(px + 200, curY, 'Qty', {
          fontFamily: FONTS.primary, fontSize: '10px', color: '#6a6a7a', fontStyle: 'bold',
        })
      );
      this.container.add(
        this.scene.add.text(px + 240, curY, 'Recovery Preview', {
          fontFamily: FONTS.primary, fontSize: '10px', color: '#6a6a7a', fontStyle: 'bold',
        })
      );
      curY += 18;

      for (const item of salvageable) {
        if (curY > py + panelH - 50) break;

        const template = templateMap.get(item.templateId);
        if (!template) continue;

        const rarityColor = RARITY_COLORS[template.rarity] || COLORS.textSecondary;

        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(COLORS.background, 0.5);
        rowBg.fillRoundedRect(px + 20, curY, contentW, 30, 4);
        this.container!.add(rowBg);

        // Name
        this.container!.add(
          this.scene.add.text(px + 28, curY + 6, template.name, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: rarityColor,
            fontStyle: 'bold',
          })
        );

        // Quantity
        this.container!.add(
          this.scene.add.text(px + 200, curY + 6, `x${item.quantity}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textSecondary,
          })
        );

        // Recovery preview
        const yields = template.salvageYield || {};
        const yieldStr = Object.entries(yields)
          .map(([res, amt]: [string, any]) => `${amt} ${res}`)
          .join(', ');
        this.container!.add(
          this.scene.add.text(px + 240, curY + 6, yieldStr || 'none', {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: '#f5a623',
          })
        );

        // Salvage 1 button
        const salvageBtn = this.scene.add.text(px + 20 + contentW - 10, curY + 15, 'Salvage 1', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: COLORS.textAccent,
          fontStyle: 'bold',
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        salvageBtn.on('pointerup', () => this.doSalvage(item.id, 1));
        this.container!.add(salvageBtn);

        // Salvage all button (if multiple)
        if (item.quantity > 1) {
          const salvageAllBtn = this.scene.add.text(px + 20 + contentW - 80, curY + 15, `Salv All (${item.quantity})`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: '#7fa8c9',
          }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
          salvageAllBtn.on('pointerup', () => this.doSalvage(item.id, item.quantity));
          this.container!.add(salvageAllBtn);
        }

        curY += 34;
      }
    } catch (err) {
      this.container.add(
        this.scene.add.text(px + panelW / 2, py + 200, 'Failed to load salvage data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#ff4444',
          align: 'center',
        }).setOrigin(0.5)
      );
    }
  }

  private async doSalvage(itemId: string, quantity: number): Promise<void> {
    try {
      const result = await apiClient.salvageItem(itemId, quantity);
      const recoveredStr = Object.entries(result.recovered)
        .map(([r, a]) => `${a} ${r}`)
        .join(', ');
      this.showToast(`Recovered: ${recoveredStr}`);
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Salvage failed');
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
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
