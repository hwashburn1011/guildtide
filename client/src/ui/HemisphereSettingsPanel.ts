/**
 * HemisphereSettingsPanel — Player hemisphere selection affecting season calculation.
 *
 * T-0954: Hemisphere selection in player settings (affects season)
 */
import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../config';
import { UIModal } from './components/UIModal';
import { UIButton } from './components/UIButton';

type Hemisphere = 'north' | 'south';

const HEMISPHERE_INFO: Record<Hemisphere, { label: string; description: string; seasons: string }> = {
  north: {
    label: 'Northern Hemisphere',
    description: 'North America, Europe, and most of Asia',
    seasons: 'Spring: Mar-May | Summer: Jun-Aug | Autumn: Sep-Nov | Winter: Dec-Feb',
  },
  south: {
    label: 'Southern Hemisphere',
    description: 'South America, Australia, and southern Africa',
    seasons: 'Spring: Sep-Nov | Summer: Dec-Feb | Autumn: Mar-May | Winter: Jun-Aug',
  },
};

export class HemisphereSettingsPanel {
  private scene: Phaser.Scene;
  private modal: UIModal | null = null;
  private onSelect: (hemisphere: Hemisphere) => void;

  constructor(scene: Phaser.Scene, onSelect: (hemisphere: Hemisphere) => void) {
    this.scene = scene;
    this.onSelect = onSelect;
  }

  show(currentHemisphere: Hemisphere): void {
    this.hide();

    this.modal = new UIModal(this.scene, {
      title: 'Season Settings',
      width: 460, height: 320,
      onClose: () => { this.modal?.destroy(); this.modal = null; },
    });

    const content = this.modal.getContentContainer();
    let y = 0;

    content.add(this.scene.add.text(0, y, 'Select your hemisphere to synchronize seasons with your real-world location.', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.small}px`,
      color: COLORS.textSecondary, wordWrap: { width: 420 },
    }));
    y += 35;

    for (const hemisphere of ['north', 'south'] as Hemisphere[]) {
      const info = HEMISPHERE_INFO[hemisphere];
      const isSelected = hemisphere === currentHemisphere;

      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(isSelected ? 0x1a3a2e : COLORS.panelBg, 0.9);
      cardBg.fillRoundedRect(0, y, 420, 80, 6);
      cardBg.lineStyle(2, isSelected ? COLORS.gold : COLORS.panelBorder);
      cardBg.strokeRoundedRect(0, y, 420, 80, 6);
      content.add(cardBg);

      // Label
      content.add(this.scene.add.text(12, y + 8, info.label, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.body}px`,
        color: isSelected ? COLORS.textGold : COLORS.textPrimary,
        fontStyle: 'bold',
      }));

      // Description
      content.add(this.scene.add.text(12, y + 30, info.description, {
        fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`, color: COLORS.textSecondary,
      }));

      // Season cycle
      content.add(this.scene.add.text(12, y + 48, info.seasons, {
        fontFamily: FONTS.primary, fontSize: '10px', color: '#888',
      }));

      // Selected indicator or select button
      if (isSelected) {
        content.add(this.scene.add.text(380, y + 30, '✓', {
          fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.heading}px`,
          color: '#4ecca3', fontStyle: 'bold',
        }).setOrigin(0.5));
      } else {
        const btn = new UIButton(this.scene, {
          x: 340, y: y + 25, width: 70, height: 30,
          text: 'Select', variant: 'secondary', fontSize: FONTS.sizes.tiny,
          onClick: () => {
            this.onSelect(hemisphere);
            this.show(hemisphere);
          },
        });
        content.add(btn);
      }

      y += 90;
    }

    // Note
    content.add(this.scene.add.text(0, y + 5, 'This affects seasonal events, crop cycles, and visual themes.', {
      fontFamily: FONTS.primary, fontSize: `${FONTS.sizes.tiny}px`,
      color: '#666', fontStyle: 'italic',
    }));

    this.modal.open();
  }

  hide(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
