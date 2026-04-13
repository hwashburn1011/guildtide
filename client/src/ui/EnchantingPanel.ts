/**
 * Enchanting UI panel with enchantment selection, gem socketing, and cost display.
 * T-0712, T-0715, T-0716: Enchanting and gem socketing UI.
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

type EnchantTab = 'enchant' | 'socket';

export class EnchantingPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private onChanged: () => void;
  private currentTab: EnchantTab = 'enchant';
  private selectedItemId: string | null = null;

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

    const panelW = 900;
    const panelH = 580;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    // Title
    this.container.add(
      this.scene.add.text(px + 20, py + 15, 'Enchanting & Socketing', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.heading}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      })
    );

    // Close
    const closeBtn = this.scene.add.text(px + panelW - 20, py + 15, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    // Tabs
    const tabs: Array<{ label: string; key: EnchantTab }> = [
      { label: 'Enchant', key: 'enchant' },
      { label: 'Socket Gems', key: 'socket' },
    ];
    tabs.forEach((tab, i) => {
      const btn = this.scene.add.text(px + 260 + i * 110, py + 20, tab.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: this.currentTab === tab.key ? COLORS.textGold : COLORS.textSecondary,
        fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });
      btn.on('pointerup', () => {
        this.currentTab = tab.key;
        this.selectedItemId = null;
        this.hide();
        this.show();
      });
      this.container!.add(btn);
    });

    const cx = px + 20;
    const cy = py + 50;
    const cw = panelW - 40;
    const ch = panelH - 70;

    if (this.currentTab === 'enchant') {
      await this.renderEnchantTab(cx, cy, cw, ch);
    } else {
      await this.renderSocketTab(cx, cy, cw, ch);
    }
  }

  private async renderEnchantTab(x: number, y: number, w: number, h: number): Promise<void> {
    if (!this.container) return;

    try {
      const [enchantments, inventory] = await Promise.all([
        apiClient.getEnchantments(),
        apiClient.getInventory(),
      ]);

      // Left side: equippable items
      const leftW = w * 0.4;
      this.container!.add(
        this.scene.add.text(x, y, 'Select Item:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        })
      );

      const equippable = inventory.filter((i: any) =>
        i.template && ['weapon', 'armor', 'charm', 'tool', 'helmet', 'boots', 'shield', 'ring', 'amulet', 'belt', 'cloak'].includes(i.template.category)
      );

      let curY = y + 22;
      for (const item of equippable) {
        if (curY > y + h - 30) break;
        const t = item.template;
        const rarityColor = RARITY_COLORS[t.rarity] || COLORS.textSecondary;
        const isSelected = this.selectedItemId === item.id;

        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(isSelected ? 0x0f3460 : COLORS.background, 0.6);
        rowBg.fillRoundedRect(x, curY, leftW - 10, 24, 3);
        this.container!.add(rowBg);

        const nameText = this.scene.add.text(x + 6, curY + 3, `${t.name} x${item.quantity}`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: rarityColor,
          fontStyle: isSelected ? 'bold' : 'normal',
        }).setInteractive({ useHandCursor: true });
        nameText.on('pointerup', () => {
          this.selectedItemId = item.id;
          this.hide();
          this.show();
        });
        this.container!.add(nameText);

        curY += 28;
      }

      // Right side: available enchantments
      const rightX = x + leftW + 10;
      const rightW = w - leftW - 10;
      this.container!.add(
        this.scene.add.text(rightX, y, 'Available Enchantments:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        })
      );

      curY = y + 22;
      for (const ench of enchantments) {
        if (curY > y + h - 40) break;

        const rarityColor = RARITY_COLORS[ench.rarity] || COLORS.textSecondary;

        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(COLORS.background, 0.5);
        rowBg.fillRoundedRect(rightX, curY, rightW, 36, 3);
        this.container!.add(rowBg);

        this.container!.add(
          this.scene.add.text(rightX + 6, curY + 3, ench.name, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: rarityColor,
            fontStyle: 'bold',
          })
        );

        this.container!.add(
          this.scene.add.text(rightX + 6, curY + 18, `${ench.essenceCost} essence, ${ench.goldCost} gold | ${ench.applicableSlots.join(', ')}`, {
            fontFamily: FONTS.primary,
            fontSize: '9px',
            color: '#6a6a7a',
          })
        );

        // Effects summary
        const effectStr = Object.entries(ench.effects)
          .map(([k, v]) => `+${v} ${k}`)
          .join(', ');
        this.container!.add(
          this.scene.add.text(rightX + rightW - 150, curY + 3, effectStr, {
            fontFamily: FONTS.primary,
            fontSize: '9px',
            color: COLORS.textSecondary,
          })
        );

        if (this.selectedItemId) {
          const applyBtn = this.scene.add.text(rightX + rightW - 8, curY + 18, 'Apply', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textAccent,
            fontStyle: 'bold',
          }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
          applyBtn.on('pointerup', () => this.doEnchant(this.selectedItemId!, ench.id));
          this.container!.add(applyBtn);
        }

        curY += 40;
      }
    } catch (err) {
      this.showError(x, y, w, 'Failed to load enchanting data');
    }
  }

  private async renderSocketTab(x: number, y: number, w: number, h: number): Promise<void> {
    if (!this.container) return;

    try {
      const [inventory, gemEffects] = await Promise.all([
        apiClient.getInventory(),
        apiClient.getGemEffects(),
      ]);

      // Items with sockets
      const socketed = inventory.filter((i: any) => i.template && (i.template.sockets || 0) > 0);
      const gems = inventory.filter((i: any) => i.template && i.template.category === 'gem');

      // Left: items with sockets
      const leftW = w * 0.5;
      this.container!.add(
        this.scene.add.text(x, y, 'Items with Sockets:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        })
      );

      let curY = y + 22;
      for (const item of socketed) {
        if (curY > y + h - 40) break;
        const t = item.template;
        const rarityColor = RARITY_COLORS[t.rarity] || COLORS.textSecondary;
        const sockets = t.sockets || 0;
        const filledSockets = item.metadata?.socketedGems?.length || 0;
        const isSelected = this.selectedItemId === item.id;

        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(isSelected ? 0x0f3460 : COLORS.background, 0.6);
        rowBg.fillRoundedRect(x, curY, leftW - 10, 28, 3);
        this.container!.add(rowBg);

        const nameText = this.scene.add.text(x + 6, curY + 5, `${t.name} [${filledSockets}/${sockets} sockets]`, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.tiny}px`,
          color: rarityColor,
          fontStyle: isSelected ? 'bold' : 'normal',
        }).setInteractive({ useHandCursor: true });
        nameText.on('pointerup', () => {
          this.selectedItemId = item.id;
          this.hide();
          this.show();
        });
        this.container!.add(nameText);

        curY += 32;
      }

      // Right: available gems
      const rightX = x + leftW + 10;
      const rightW = w - leftW - 10;
      this.container!.add(
        this.scene.add.text(rightX, y, 'Available Gems:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        })
      );

      curY = y + 22;
      for (const gem of gems) {
        if (curY > y + h - 30) break;
        const t = gem.template;
        const rarityColor = RARITY_COLORS[t.rarity] || COLORS.textSecondary;

        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(COLORS.background, 0.5);
        rowBg.fillRoundedRect(rightX, curY, rightW, 26, 3);
        this.container!.add(rowBg);

        // Effects
        const effectStr = t.effects?.statBonuses
          ? Object.entries(t.effects.statBonuses).map(([k, v]) => `+${v} ${k}`).join(', ')
          : '';

        this.container!.add(
          this.scene.add.text(rightX + 6, curY + 5, `${t.name} x${gem.quantity} | ${effectStr}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: rarityColor,
          })
        );

        if (this.selectedItemId) {
          const socketBtn = this.scene.add.text(rightX + rightW - 8, curY + 13, 'Socket', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textAccent,
            fontStyle: 'bold',
          }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
          socketBtn.on('pointerup', () => this.doSocketGem(this.selectedItemId!, gem.id));
          this.container!.add(socketBtn);
        }

        curY += 30;
      }
    } catch (err) {
      this.showError(x, y, w, 'Failed to load socket data');
    }
  }

  private async doEnchant(itemId: string, enchantmentId: string): Promise<void> {
    try {
      await apiClient.enchantItem(itemId, enchantmentId);
      this.showToast('Enchantment applied!');
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Enchant failed');
    }
  }

  private async doSocketGem(itemId: string, gemItemId: string): Promise<void> {
    try {
      // Find next available socket index
      const inventory = await apiClient.getInventory();
      const item = inventory.find((i: any) => i.id === itemId);
      const filledSockets = item?.metadata?.socketedGems?.map((g: any) => g.socketIndex) || [];
      const maxSockets = item?.template?.sockets || 0;

      let socketIndex = 0;
      for (let i = 0; i < maxSockets; i++) {
        if (!filledSockets.includes(i)) {
          socketIndex = i;
          break;
        }
      }

      await apiClient.socketGem(itemId, gemItemId, socketIndex);
      this.showToast('Gem socketed!');
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Socket failed');
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
