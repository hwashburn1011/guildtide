import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIProgressBar } from './components/UIProgressBar';
import { BUILDING_DEFINITIONS } from '@shared/constants';
import { BuildingType } from '@shared/enums';
import type { Building, Guild } from '@shared/types';

/**
 * Shows all building types and which ones the player has built.
 * Displays collection progress.
 */
export class BuildingCollectionTracker {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(guild: Guild): void {
    if (this.modal) {
      this.modal.destroy();
    }

    this.modal = new UIModal(this.scene, {
      title: 'Building Collection',
      width: 460,
      height: 440,
      onClose: () => {
        this.modal?.destroy();
        this.modal = null;
      },
    });

    const content = this.modal.getContentContainer();
    const builtTypes = new Set(guild.buildings.map(b => b.type));
    const allTypes = Object.values(BuildingType);
    const totalBuilt = allTypes.filter(t => builtTypes.has(t)).length;

    // Collection progress
    content.add(
      this.scene.add.text(0, 0, `Collection: ${totalBuilt} / ${allTypes.length}`, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.body}px`,
        color: COLORS.textGold,
        fontStyle: 'bold',
      }),
    );

    const progressBar = new UIProgressBar(this.scene, {
      x: 0,
      y: 28,
      width: 380,
      height: 14,
      value: totalBuilt,
      maxValue: allTypes.length,
      fillColor: COLORS.gold,
      showPercent: true,
    });
    content.add(progressBar);

    // Building list
    let y = 58;
    allTypes.forEach((type) => {
      const def = BUILDING_DEFINITIONS[type];
      if (!def) return;

      const isBuilt = builtTypes.has(type);
      const building = guild.buildings.find(b => b.type === type);

      // Row
      const bg = this.scene.add.graphics();
      bg.fillStyle(isBuilt ? 0x1a3a2e : COLORS.panelBg, 0.7);
      bg.fillRoundedRect(0, y, 400, 28, 4);
      content.add(bg);

      // Icon/check
      content.add(
        this.scene.add.text(8, y + 6, isBuilt ? '\u2713' : '\u2717', {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: isBuilt ? '#4ecca3' : '#e94560',
          fontStyle: 'bold',
        }),
      );

      // Name
      content.add(
        this.scene.add.text(28, y + 6, def.name, {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: isBuilt ? COLORS.textPrimary : COLORS.textSecondary,
        }),
      );

      // Level if built
      if (building) {
        content.add(
          this.scene.add.text(380, y + 6, `Lv ${building.level}`, {
            fontFamily: FONTS.primary,
            fontSize: `${FONTS.sizes.small}px`,
            color: COLORS.textGold,
          }).setOrigin(1, 0),
        );
      }

      y += 34;
    });

    this.modal.open();
  }
}
