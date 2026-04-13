import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export interface UICheckboxConfig {
  x: number;
  y: number;
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

/**
 * Clickable checkbox with label, checked state, and onChange callback.
 */
export class UICheckbox extends Phaser.GameObjects.Container {
  private box: Phaser.GameObjects.Graphics;
  private checkmark: Phaser.GameObjects.Text;
  private labelText?: Phaser.GameObjects.Text;
  private isChecked: boolean;
  private isDisabled: boolean;
  private onChange?: (checked: boolean) => void;

  private static readonly BOX_SIZE = 20;

  constructor(scene: Phaser.Scene, config: UICheckboxConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.isChecked = config.checked ?? false;
    this.isDisabled = config.disabled ?? false;
    this.onChange = config.onChange;

    // Checkbox box
    this.box = scene.add.graphics();
    this.add(this.box);

    // Checkmark
    this.checkmark = scene.add.text(
      UICheckbox.BOX_SIZE / 2,
      UICheckbox.BOX_SIZE / 2,
      '\u2713',
      {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      },
    );
    this.checkmark.setOrigin(0.5);
    this.add(this.checkmark);

    // Label
    if (config.label) {
      this.labelText = scene.add.text(
        UICheckbox.BOX_SIZE + 8,
        UICheckbox.BOX_SIZE / 2,
        config.label,
        {
          fontFamily: FONTS.primary,
          fontSize: `${FONTS.sizes.small}px`,
          color: COLORS.textPrimary,
        },
      );
      this.labelText.setOrigin(0, 0.5);
      this.add(this.labelText);
    }

    this.draw();

    // Hit zone
    const hitWidth = UICheckbox.BOX_SIZE + (this.labelText ? this.labelText.width + 8 : 0);
    const zone = scene.add.zone(hitWidth / 2, UICheckbox.BOX_SIZE / 2, hitWidth, UICheckbox.BOX_SIZE);
    zone.setInteractive({ useHandCursor: !this.isDisabled });
    zone.on('pointerdown', () => {
      if (this.isDisabled) return;
      this.isChecked = !this.isChecked;
      this.draw();
      this.onChange?.(this.isChecked);
    });
    this.add(zone);

    if (this.isDisabled) {
      this.setAlpha(0.5);
    }
  }

  private draw(): void {
    const size = UICheckbox.BOX_SIZE;
    this.box.clear();
    this.box.lineStyle(2, COLORS.panelBorder, 1);
    if (this.isChecked) {
      this.box.fillStyle(COLORS.accent, 1);
    } else {
      this.box.fillStyle(0x111128, 0.8);
    }
    this.box.fillRoundedRect(0, 0, size, size, 3);
    this.box.strokeRoundedRect(0, 0, size, size, 3);
    this.checkmark.setVisible(this.isChecked);
  }

  getChecked(): boolean {
    return this.isChecked;
  }

  setChecked(value: boolean): void {
    this.isChecked = value;
    this.draw();
  }

  setLabel(text: string): void {
    this.labelText?.setText(text);
  }
}
