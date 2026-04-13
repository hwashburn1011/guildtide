import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export interface UIToggleConfig {
  x: number;
  y: number;
  label?: string;
  isOn?: boolean;
  disabled?: boolean;
  onColor?: number;
  offColor?: number;
  onChange?: (isOn: boolean) => void;
}

/**
 * On/off toggle switch component with callback.
 */
export class UIToggle extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private knob: Phaser.GameObjects.Graphics;
  private labelText?: Phaser.GameObjects.Text;
  private isOn: boolean;
  private isDisabled: boolean;
  private onColor: number;
  private offColor: number;
  private onChange?: (isOn: boolean) => void;

  private static readonly TRACK_W = 44;
  private static readonly TRACK_H = 24;
  private static readonly KNOB_R = 9;

  constructor(scene: Phaser.Scene, config: UIToggleConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.isOn = config.isOn ?? false;
    this.isDisabled = config.disabled ?? false;
    this.onColor = config.onColor ?? COLORS.success;
    this.offColor = config.offColor ?? 0x555566;
    this.onChange = config.onChange;

    // Optional label
    if (config.label) {
      this.labelText = scene.add.text(UIToggle.TRACK_W + 10, UIToggle.TRACK_H / 2, config.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textPrimary,
      });
      this.labelText.setOrigin(0, 0.5);
      this.add(this.labelText);
    }

    // Track background
    this.bg = scene.add.graphics();
    this.add(this.bg);

    // Knob
    this.knob = scene.add.graphics();
    this.add(this.knob);

    this.draw();

    // Interaction
    const zone = scene.add.zone(UIToggle.TRACK_W / 2, UIToggle.TRACK_H / 2, UIToggle.TRACK_W, UIToggle.TRACK_H);
    zone.setInteractive({ useHandCursor: !this.isDisabled });
    zone.on('pointerdown', () => {
      if (this.isDisabled) return;
      this.isOn = !this.isOn;
      this.draw();
      this.onChange?.(this.isOn);
    });
    this.add(zone);

    if (this.isDisabled) {
      this.setAlpha(0.5);
    }
  }

  private draw(): void {
    const { TRACK_W, TRACK_H, KNOB_R } = UIToggle;
    const color = this.isOn ? this.onColor : this.offColor;

    this.bg.clear();
    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(0, 0, TRACK_W, TRACK_H, TRACK_H / 2);

    this.knob.clear();
    this.knob.fillStyle(0xffffff, 1);
    const knobX = this.isOn ? TRACK_W - KNOB_R - 3 : KNOB_R + 3;
    this.knob.fillCircle(knobX, TRACK_H / 2, KNOB_R);
  }

  getIsOn(): boolean {
    return this.isOn;
  }

  setIsOn(value: boolean): void {
    this.isOn = value;
    this.draw();
  }
}
