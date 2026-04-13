/**
 * Item set collection tracker with set bonus display.
 * T-0706, T-0708, T-0709: Item set system UI.
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

export class ItemSetPanel {
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

    const panelW = 900;
    const panelH = 600;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.98);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(bg);

    this.container.add(
      this.scene.add.text(px + 20, py + 15, 'Item Sets', {
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
      const [sets, inventory, templates] = await Promise.all([
        apiClient.getItemSets(),
        apiClient.getInventory(),
        apiClient.getItemTemplates(),
      ]);

      const ownedIds = new Set(inventory.map((i: any) => i.templateId));
      const templateMap = new Map(templates.map((t: any) => [t.id, t]));

      let curY = py + 50;
      const contentW = panelW - 40;

      for (const set of sets) {
        if (curY > py + panelH - 100) break;

        const ownedPieces = set.pieceTemplateIds.filter((id: string) => ownedIds.has(id));

        // Set header
        const setBg = this.scene.add.graphics();
        setBg.fillStyle(COLORS.background, 0.5);
        setBg.fillRoundedRect(px + 20, curY, contentW, 22, 4);
        this.container!.add(setBg);

        this.container!.add(
          this.scene.add.text(px + 28, curY + 3, `${set.name} (${ownedPieces.length}/${set.pieceTemplateIds.length})`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: ownedPieces.length >= 2 ? COLORS.textGold : COLORS.textPrimary,
            fontStyle: 'bold',
          })
        );

        this.container!.add(
          this.scene.add.text(px + 28 + contentW - 16, curY + 5, set.description, {
            fontFamily: FONTS.primary,
            fontSize: '9px',
            color: '#6a6a7a',
          }).setOrigin(1, 0)
        );

        curY += 26;

        // Pieces
        for (const pieceId of set.pieceTemplateIds) {
          const template = templateMap.get(pieceId);
          if (!template) continue;

          const owned = ownedIds.has(pieceId);
          const rarityColor = owned ? (RARITY_COLORS[template.rarity] || COLORS.textSecondary) : '#444460';

          this.container!.add(
            this.scene.add.text(px + 40, curY, `${owned ? '\u2713' : '\u2717'} ${template.name}`, {
              fontFamily: FONTS.primary,
              fontSize: `${FONTS.sizes.tiny}px`,
              color: rarityColor,
              fontStyle: owned ? 'bold' : 'normal',
            })
          );

          this.container!.add(
            this.scene.add.text(px + 280, curY, template.category, {
              fontFamily: FONTS.primary,
              fontSize: '10px',
              color: '#6a6a7a',
            })
          );

          curY += 18;
        }

        // Bonuses
        for (const bonus of set.bonuses) {
          const isActive = ownedPieces.length >= bonus.piecesRequired;

          let bonusText = `(${bonus.piecesRequired}) `;
          if (bonus.statBonuses) {
            bonusText += Object.entries(bonus.statBonuses)
              .map(([k, v]) => `+${v} ${k}`)
              .join(', ');
          }
          if (bonus.expeditionBonus) {
            bonusText += ` +${bonus.expeditionBonus}% exp`;
          }
          if (bonus.buildingBonus) {
            bonusText += ` +${Math.round(bonus.buildingBonus * 100)}% bld`;
          }
          if (bonus.specialEffect) {
            bonusText += ` | ${bonus.specialEffect}`;
          }

          this.container!.add(
            this.scene.add.text(px + 40, curY, bonusText, {
              fontFamily: FONTS.primary,
              fontSize: '10px',
              color: isActive ? '#4ecca3' : '#4a4a5a',
              fontStyle: isActive ? 'bold' : 'normal',
            })
          );

          curY += 16;
        }

        curY += 10;
      }
    } catch (err) {
      this.container.add(
        this.scene.add.text(px + panelW / 2, py + 200, 'Failed to load item sets', {
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
