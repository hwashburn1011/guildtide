import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export type ValidationState = 'valid' | 'invalid' | 'neutral';

export interface UIFormInputConfig {
  x: number;
  y: number;
  width?: number;
  label?: string;
  placeholder?: string;
  value?: string;
  validationState?: ValidationState;
  errorMessage?: string;
  onChange?: (value: string) => void;
}

const STATE_BORDER: Record<ValidationState, number> = {
  valid: COLORS.success,
  invalid: COLORS.danger,
  neutral: COLORS.panelBorder,
};

/**
 * Text input with label, placeholder, error message display, and validation state.
 * Wraps a Phaser DOM element for native text input.
 */
export class UIFormInput extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private labelText?: Phaser.GameObjects.Text;
  private errorText: Phaser.GameObjects.Text;
  private inputElement: Phaser.GameObjects.DOMElement;
  private inputWidth: number;
  private validationState: ValidationState;
  private onChange?: (value: string) => void;

  constructor(scene: Phaser.Scene, config: UIFormInputConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.inputWidth = config.width ?? 240;
    this.validationState = config.validationState ?? 'neutral';
    this.onChange = config.onChange;

    let yOffset = 0;

    // Label
    if (config.label) {
      this.labelText = scene.add.text(0, 0, config.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      });
      this.add(this.labelText);
      yOffset = 20;
    }

    // Background / border
    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.drawBg(yOffset);

    // DOM input element
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = config.placeholder ?? '';
    input.value = config.value ?? '';
    input.style.width = `${this.inputWidth - 16}px`;
    input.style.height = '28px';
    input.style.border = 'none';
    input.style.outline = 'none';
    input.style.background = 'transparent';
    input.style.color = '#ffffff';
    input.style.fontFamily = FONTS.primary;
    input.style.fontSize = `${FONTS.sizes.small}px`;

    input.addEventListener('input', () => {
      this.onChange?.(input.value);
    });

    this.inputElement = scene.add.dom(this.inputWidth / 2, yOffset + 18, input);
    this.add(this.inputElement);

    // Error message
    this.errorText = scene.add.text(0, yOffset + 38, config.errorMessage ?? '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: '#e94560',
    });
    this.errorText.setVisible(this.validationState === 'invalid' && !!config.errorMessage);
    this.add(this.errorText);
  }

  private drawBg(yOffset: number): void {
    this.bg.clear();
    const borderColor = STATE_BORDER[this.validationState];
    this.bg.lineStyle(2, borderColor, 1);
    this.bg.fillStyle(0x111128, 0.8);
    this.bg.fillRoundedRect(0, yOffset, this.inputWidth, 36, 4);
    this.bg.strokeRoundedRect(0, yOffset, this.inputWidth, 36, 4);
  }

  getValue(): string {
    const el = this.inputElement.node as HTMLInputElement;
    return el.value;
  }

  setValue(value: string): void {
    const el = this.inputElement.node as HTMLInputElement;
    el.value = value;
  }

  setValidationState(state: ValidationState, errorMessage?: string): void {
    this.validationState = state;
    const yOffset = this.labelText ? 20 : 0;
    this.drawBg(yOffset);
    if (errorMessage !== undefined) {
      this.errorText.setText(errorMessage);
    }
    this.errorText.setVisible(state === 'invalid' && this.errorText.text.length > 0);
  }

  setLabel(text: string): void {
    this.labelText?.setText(text);
  }
}
