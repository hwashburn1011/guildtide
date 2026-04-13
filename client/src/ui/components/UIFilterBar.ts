import * as Phaser from 'phaser';
import { COLORS, FONTS } from '../../config';

export interface FilterTag {
  key: string;
  label: string;
}

export interface UIFilterBarConfig {
  x: number;
  y: number;
  tags: FilterTag[];
  gap?: number;
  activeColor?: number;
  inactiveColor?: number;
  onChange?: (activeKeys: string[]) => void;
}

/**
 * Row of filter tags. Click to toggle active. Shows active filter count.
 */
export class UIFilterBar extends Phaser.GameObjects.Container {
  private tags: FilterTag[];
  private activeKeys: Set<string> = new Set();
  private gap: number;
  private activeColor: number;
  private inactiveColor: number;
  private onChangeCallback?: (activeKeys: string[]) => void;
  private tagContainers: Phaser.GameObjects.Container[] = [];
  private countText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: UIFilterBarConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.tags = config.tags;
    this.gap = config.gap ?? 8;
    this.activeColor = config.activeColor ?? COLORS.accent;
    this.inactiveColor = config.inactiveColor ?? 0x2a2a4e;
    this.onChangeCallback = config.onChange;

    // Active count label
    this.countText = scene.add.text(0, -20, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.tiny}px`,
      color: COLORS.textSecondary,
    });
    this.add(this.countText);

    this.buildTags();
    this.updateCountText();
  }

  private buildTags(): void {
    this.tagContainers.forEach((c) => c.destroy());
    this.tagContainers = [];

    let xOff = 0;
    this.tags.forEach((tag) => {
      const isActive = this.activeKeys.has(tag.key);
      const container = this.scene.add.container(xOff, 0);

      // Tag background
      const bg = this.scene.add.graphics();
      const color = isActive ? this.activeColor : this.inactiveColor;
      const textObj = this.scene.add.text(0, 0, tag.label, {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.tiny}px`,
        color: isActive ? '#ffffff' : COLORS.textSecondary,
        fontStyle: isActive ? 'bold' : 'normal',
        padding: { x: 10, y: 5 },
      });
      const w = textObj.width;
      const h = textObj.height;

      bg.fillStyle(color, isActive ? 1 : 0.6);
      bg.fillRoundedRect(0, 0, w, h, h / 2);
      if (isActive) {
        bg.lineStyle(1, 0xffffff, 0.3);
        bg.strokeRoundedRect(0, 0, w, h, h / 2);
      }

      container.add(bg);
      container.add(textObj);

      // Hit zone
      const zone = this.scene.add.zone(w / 2, h / 2, w, h);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        if (this.activeKeys.has(tag.key)) {
          this.activeKeys.delete(tag.key);
        } else {
          this.activeKeys.add(tag.key);
        }
        this.buildTags();
        this.updateCountText();
        this.onChangeCallback?.(this.getActiveKeys());
      });
      container.add(zone);

      this.add(container);
      this.tagContainers.push(container);

      xOff += w + this.gap;
    });
  }

  private updateCountText(): void {
    const count = this.activeKeys.size;
    this.countText.setText(count > 0 ? `${count} filter${count > 1 ? 's' : ''} active` : '');
  }

  getActiveKeys(): string[] {
    return Array.from(this.activeKeys);
  }

  setActiveKeys(keys: string[]): void {
    this.activeKeys = new Set(keys);
    this.buildTags();
    this.updateCountText();
  }

  clearFilters(): void {
    this.activeKeys.clear();
    this.buildTags();
    this.updateCountText();
    this.onChangeCallback?.(this.getActiveKeys());
  }
}
