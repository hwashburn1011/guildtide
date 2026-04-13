/**
 * Transmog UI with appearance library and preview.
 * T-0748, T-0749: Item transmog system for visual appearance override.
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

export class ItemTransmogPanel {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private onChanged: () => void;
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

    const panelW = 850;
    const panelH = 560;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    this.container.add(
      this.scene.add.text(px + 20, py + 15, 'Transmogrification', {
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
      this.scene.add.text(px + 20, py + 45, 'Change the appearance of your equipment without changing its stats.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      })
    );

    try {
      const [inventory, templates] = await Promise.all([
        apiClient.getInventory(),
        apiClient.getItemTemplates(),
      ]);

      const halfW = (panelW - 60) / 2;

      // LEFT: Your equipment
      this.container!.add(
        this.scene.add.text(px + 20, py + 68, 'Select Item:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        })
      );

      const equippable = inventory.filter((i: any) =>
        i.template && ['weapon', 'armor', 'helmet', 'boots', 'shield', 'cloak'].includes(i.template.category)
      );

      let curY = py + 90;
      for (const item of equippable) {
        if (curY > py + panelH - 50) break;
        const t = item.template;
        const rarityColor = RARITY_COLORS[t.rarity] || COLORS.textSecondary;
        const isSelected = this.selectedItemId === item.id;
        const currentTransmog = item.metadata?.transmogId;

        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(isSelected ? 0x0f3460 : COLORS.background, 0.6);
        rowBg.fillRoundedRect(px + 20, curY, halfW, 26, 3);
        this.container!.add(rowBg);

        const displayName = currentTransmog
          ? `${t.name} (as ${templates.find((tt: any) => tt.id === currentTransmog)?.name || '?'})`
          : t.name;

        const nameText = this.scene.add.text(px + 28, curY + 5, displayName, {
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

        // Clear transmog button
        if (currentTransmog) {
          const clearBtn = this.scene.add.text(px + 20 + halfW - 8, curY + 13, 'Clear', {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: '#ff4444',
          }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
          clearBtn.on('pointerup', () => this.doTransmog(item.id, null));
          this.container!.add(clearBtn);
        }

        curY += 30;
      }

      // RIGHT: Appearance library (same category templates)
      const rightX = px + 20 + halfW + 20;
      this.container!.add(
        this.scene.add.text(rightX, py + 68, 'Appearance Library:', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textGold,
          fontStyle: 'bold',
        })
      );

      if (this.selectedItemId) {
        const selectedItem = inventory.find((i: any) => i.id === this.selectedItemId);
        if (selectedItem?.template) {
          const sameCategory = templates.filter((t: any) =>
            t.category === selectedItem.template.category && t.id !== selectedItem.templateId
          );

          curY = py + 90;
          for (const tmpl of sameCategory) {
            if (curY > py + panelH - 50) break;

            const rarityColor = RARITY_COLORS[tmpl.rarity] || COLORS.textSecondary;

            const rowBg = this.scene.add.graphics();
            rowBg.fillStyle(COLORS.background, 0.5);
            rowBg.fillRoundedRect(rightX, curY, halfW, 24, 3);
            this.container!.add(rowBg);

            this.container!.add(
              this.scene.add.text(rightX + 8, curY + 4, tmpl.name, {
                fontFamily: FONTS.primary,
                fontSize: `${FONTS.sizes.tiny}px`,
                color: rarityColor,
              })
            );

            const applyBtn = this.scene.add.text(rightX + halfW - 8, curY + 12, 'Apply', {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: COLORS.textAccent,
              fontStyle: 'bold',
            }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
            applyBtn.on('pointerup', () => this.doTransmog(this.selectedItemId!, tmpl.id));
            this.container!.add(applyBtn);

            curY += 28;
          }
        }
      } else {
        this.container!.add(
          this.scene.add.text(rightX + halfW / 2, py + 200, 'Select an item first', {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.body}px`,
            color: COLORS.textSecondary,
          }).setOrigin(0.5)
        );
      }
    } catch (err) {
      this.container.add(
        this.scene.add.text(px + panelW / 2, py + 200, 'Failed to load transmog data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#ff4444',
        }).setOrigin(0.5)
      );
    }
  }

  private async doTransmog(itemId: string, transmogTemplateId: string | null): Promise<void> {
    try {
      await apiClient.setTransmog(itemId, transmogTemplateId);
      this.showToast(transmogTemplateId ? 'Appearance changed!' : 'Appearance restored');
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Transmog failed');
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
