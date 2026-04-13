import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { apiClient } from '../api/client';

/**
 * Quick-equip UI for swapping gear sets and equipment optimization.
 * T-0438: Hero quick-equip UI for swapping gear sets
 * T-0436: Auto-assignment / equipment loadout optimization suggestions
 */

const SLOT_ICONS: Record<string, string> = {
  weapon: '⚔', armor: '🛡', charm: '💎', tool: '🔧',
};

const SLOT_COLORS: Record<string, string> = {
  weapon: '#e94560', armor: '#4dabf7', charm: '#9775fa', tool: '#4ecca3',
};

export class HeroQuickEquipPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private heroId: string;
  private onChanged: () => void;

  constructor(scene: Phaser.Scene, heroId: string, onChanged: () => void) {
    this.scene = scene;
    this.heroId = heroId;
    this.onChanged = onChanged;
  }

  async show(): Promise<void> {
    const [hero, inventory] = await Promise.all([
      apiClient.getHeroDetail(this.heroId),
      apiClient.getInventory(),
    ]);
    if (!hero) return;

    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.overlay.setDepth(300);

    this.container = this.scene.add.container(0, 0).setDepth(301);

    const panelW = 600;
    const panelH = 420;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    this.container.add(this.scene.add.text(px + 20, py + 15, `${hero.name} - Equipment`, {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`, color: COLORS.textGold, fontStyle: 'bold',
    }));

    const closeBtn = this.scene.add.text(px + panelW - 20, py + 15, 'X', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`, color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.hide());
    this.container.add(closeBtn);

    const equipment = hero.equipment || {};
    const slots = ['weapon', 'armor', 'charm', 'tool'];
    let sy = py + 55;

    for (const slot of slots) {
      const currentItem = equipment[slot];
      const icon = SLOT_ICONS[slot] || '';
      const slotColor = SLOT_COLORS[slot] || '#a0a0b0';

      // Slot card
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(COLORS.background, 0.7);
      cardBg.fillRoundedRect(px + 15, sy, panelW - 30, 70, 6);
      this.container.add(cardBg);

      // Slot icon + name
      this.container.add(this.scene.add.text(px + 25, sy + 8,
        `${icon} ${slot.charAt(0).toUpperCase() + slot.slice(1)}`, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: slotColor, fontStyle: 'bold',
      }));

      // Current equipped
      this.container.add(this.scene.add.text(px + 25, sy + 30,
        currentItem ? `Equipped: ${currentItem}` : 'Empty', {
        fontFamily: FONTS.primary, fontSize: '12px', color: currentItem ? COLORS.textPrimary : '#6a6a7a',
      }));

      // Unequip button
      if (currentItem) {
        const unequipBtn = this.scene.add.text(px + panelW - 30, sy + 15, 'Unequip', {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: COLORS.textSecondary,
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        unequipBtn.on('pointerup', async () => {
          try {
            await apiClient.unequipItem(this.heroId, slot);
            this.onChanged();
            this.hide();
            this.show();
          } catch (err) {
            console.error('Unequip error:', err);
          }
        });
        this.container.add(unequipBtn);
      }

      // Show available items for this slot
      const availableItems = inventory.filter((item: any) =>
        item.slot === slot || item.category === slot
      );

      if (availableItems.length > 0) {
        let itemX = px + 25;
        const itemY = sy + 48;

        for (const item of availableItems.slice(0, 4)) {
          const itemBtn = this.scene.add.text(itemX, itemY, item.name || item.templateId, {
            fontFamily: FONTS.primary, fontSize: '10px', color: COLORS.textAccent,
            backgroundColor: '#1a1a3e', padding: { x: 4, y: 2 },
          }).setInteractive({ useHandCursor: true });
          itemBtn.on('pointerup', async () => {
            try {
              await apiClient.equipItem(this.heroId, item.id, slot);
              this.onChanged();
              this.hide();
              this.show();
            } catch (err) {
              console.error('Equip error:', err);
            }
          });
          this.container.add(itemBtn);
          itemX += itemBtn.width + 8;
        }
      }

      sy += 78;
    }

    // Equip recommended button
    const autoEquipBtn = this.scene.add.text(px + panelW / 2, py + panelH - 35, 'Equip Recommended', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`, color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    autoEquipBtn.on('pointerover', () => autoEquipBtn.setColor('#ffe066'));
    autoEquipBtn.on('pointerout', () => autoEquipBtn.setColor('#ffd700'));
    autoEquipBtn.on('pointerup', async () => {
      // Auto-equip best items for each slot
      for (const slot of slots) {
        const available = inventory.filter((item: any) =>
          (item.slot === slot || item.category === slot)
        );
        if (available.length > 0 && !equipment[slot]) {
          try {
            await apiClient.equipItem(this.heroId, available[0].id, slot);
          } catch { /* skip */ }
        }
      }
      this.onChanged();
      this.hide();
      this.show();
    });
    this.container.add(autoEquipBtn);
  }

  hide(): void {
    this.overlay?.destroy();
    this.container?.destroy(true);
    this.overlay = null;
    this.container = null;
  }
}
