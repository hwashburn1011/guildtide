/**
 * Item repair UI at Workshop with cost display.
 * T-0718: Build item repair UI at Workshop with cost display.
 * T-0751: Durability warning notification before breakage.
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

export class ItemRepairPanel {
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

    const panelW = 700;
    const panelH = 500;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    this.container.add(
      this.scene.add.text(px + 20, py + 15, 'Repair Workshop', {
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
      this.scene.add.text(px + 20, py + 45, 'Repair damaged equipment. Cost depends on durability lost.', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: COLORS.textSecondary,
      })
    );

    try {
      const inventory = await apiClient.getInventory();
      const templates = await apiClient.getItemTemplates();
      const templateMap = new Map(templates.map((t: any) => [t.id, t]));

      // Filter items that have durability
      const repairable = inventory.filter((item: any) => {
        const t = templateMap.get(item.templateId);
        return t && t.durability && t.durability > 0;
      });

      if (repairable.length === 0) {
        this.container.add(
          this.scene.add.text(px + panelW / 2, py + 200, 'No items need repair.', {
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

      for (const item of repairable) {
        if (curY > py + panelH - 50) break;

        const template = templateMap.get(item.templateId);
        if (!template) continue;

        const rarityColor = RARITY_COLORS[template.rarity] || COLORS.textSecondary;
        const maxDur = template.durability || 100;
        const currentDur = item.metadata?.durability ?? maxDur;
        const durPercent = Math.round((currentDur / maxDur) * 100);
        const repairCost = Math.ceil((maxDur - currentDur) * 0.5);
        const needsRepair = currentDur < maxDur;

        // Row background
        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(COLORS.background, 0.6);
        rowBg.fillRoundedRect(px + 20, curY, contentW, 36, 4);
        this.container!.add(rowBg);

        // Name
        this.container!.add(
          this.scene.add.text(px + 28, curY + 4, template.name, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: rarityColor,
            fontStyle: 'bold',
          })
        );

        // Durability bar
        const barX = px + 200;
        const barW = 150;
        const barH = 10;

        const barBg2 = this.scene.add.graphics();
        barBg2.fillStyle(0x333355, 1);
        barBg2.fillRoundedRect(barX, curY + 7, barW, barH, 2);
        this.container!.add(barBg2);

        const fillW = Math.max(0, (durPercent / 100) * barW);
        if (fillW > 0) {
          const barFill = this.scene.add.graphics();
          const fillColor = durPercent > 50 ? 0x4ecca3 : durPercent > 20 ? 0xf5a623 : 0xff4444;
          barFill.fillStyle(fillColor, 1);
          barFill.fillRoundedRect(barX, curY + 7, fillW, barH, 2);
          this.container!.add(barFill);
        }

        // Durability text
        this.container!.add(
          this.scene.add.text(barX + barW + 8, curY + 4, `${currentDur}/${maxDur}`, {
            fontFamily: FONTS.primary,
            fontSize: '10px',
            color: durPercent > 50 ? '#4ecca3' : durPercent > 20 ? '#f5a623' : '#ff4444',
          })
        );

        // Warning indicator for low durability
        if (durPercent <= 20 && durPercent > 0) {
          this.container!.add(
            this.scene.add.text(barX + barW + 70, curY + 4, 'LOW!', {
              fontFamily: FONTS.primary,
              fontSize: '10px',
              color: '#ff4444',
              fontStyle: 'bold',
            })
          );
        } else if (currentDur === 0) {
          this.container!.add(
            this.scene.add.text(barX + barW + 70, curY + 4, 'BROKEN', {
              fontFamily: FONTS.primary,
              fontSize: '10px',
              color: '#ff0000',
              fontStyle: 'bold',
            })
          );
        }

        // Repair button with cost
        if (needsRepair) {
          const repairBtn = this.scene.add.text(px + 20 + contentW - 10, curY + 18, `Repair (${repairCost}g)`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.tiny}px`,
            color: COLORS.textAccent,
            fontStyle: 'bold',
          }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
          repairBtn.on('pointerup', () => this.doRepair(item.templateId));
          this.container!.add(repairBtn);
        } else {
          this.container!.add(
            this.scene.add.text(px + 20 + contentW - 10, curY + 18, 'Full', {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: '#4ecca3',
            }).setOrigin(1, 0.5)
          );
        }

        curY += 40;
      }

      // Repair all button
      const repairAllBtn = this.scene.add.text(px + panelW / 2, curY + 15, 'Repair All', {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textAccent,
        fontStyle: 'bold',
        backgroundColor: 'rgba(233,69,96,0.2)',
        padding: { x: 16, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      repairAllBtn.on('pointerup', () => this.doRepairAll(repairable, templateMap));
      this.container!.add(repairAllBtn);

    } catch (err) {
      this.container.add(
        this.scene.add.text(px + panelW / 2, py + 200, 'Failed to load repair data', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.body}px`,
          color: '#ff4444',
          align: 'center',
        }).setOrigin(0.5)
      );
    }
  }

  private async doRepair(templateId: string): Promise<void> {
    try {
      const result = await apiClient.repairItem(templateId);
      this.showToast(`Repaired for ${result.cost} gold`);
      this.onChanged();
      this.hide();
      this.show();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Repair failed');
    }
  }

  private async doRepairAll(items: any[], templateMap: Map<string, any>): Promise<void> {
    let totalCost = 0;
    let repaired = 0;

    for (const item of items) {
      const template = templateMap.get(item.templateId);
      if (!template) continue;

      const maxDur = template.durability || 100;
      const currentDur = item.metadata?.durability ?? maxDur;
      if (currentDur >= maxDur) continue;

      try {
        const result = await apiClient.repairItem(item.templateId);
        totalCost += result.cost;
        repaired++;
      } catch {
        // Skip items that fail to repair
      }
    }

    if (repaired > 0) {
      this.showToast(`Repaired ${repaired} items for ${totalCost} gold total`);
      this.onChanged();
    } else {
      this.showToast('Nothing to repair');
    }
    this.hide();
    this.show();
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
