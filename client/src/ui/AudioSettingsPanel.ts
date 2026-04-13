import * as Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { AudioManager, AudioCategory } from '../audio/AudioManager';
import { SoundEffects, SFXType } from '../audio/SoundEffects';

interface SliderConfig {
  label: string;
  category: AudioCategory;
  y: number;
}

/**
 * Audio settings panel with per-category volume sliders and mute toggles.
 * Can be opened as an overlay from any scene.
 */
export class AudioSettingsPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private audioManager: AudioManager;
  private sfx: SoundEffects;
  private sliderGraphics: Map<AudioCategory, Phaser.GameObjects.Graphics> = new Map();
  private sliderHandles: Map<AudioCategory, Phaser.GameObjects.Graphics> = new Map();
  private muteTexts: Map<AudioCategory, Phaser.GameObjects.Text> = new Map();
  private valueTexts: Map<AudioCategory, Phaser.GameObjects.Text> = new Map();
  private visible = false;
  private unsubscribe: (() => void) | null = null;

  private readonly PANEL_WIDTH = 420;
  private readonly PANEL_HEIGHT = 400;
  private readonly SLIDER_WIDTH = 200;
  private readonly SLIDER_HEIGHT = 8;
  private readonly HANDLE_SIZE = 16;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.audioManager = AudioManager.getInstance();
    this.sfx = new SoundEffects();
    this.container = scene.add.container(
      (GAME_WIDTH - this.PANEL_WIDTH) / 2,
      (GAME_HEIGHT - this.PANEL_HEIGHT) / 2,
    );
    this.container.setDepth(1000);
    this.container.setVisible(false);

    this.buildPanel();

    // Listen for external settings changes
    this.unsubscribe = this.audioManager.onSettingsChange(() => {
      this.updateSliders();
    });
  }

  private buildPanel(): void {
    // Backdrop
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.6);
    backdrop.fillRect(
      -(GAME_WIDTH - this.PANEL_WIDTH) / 2,
      -(GAME_HEIGHT - this.PANEL_HEIGHT) / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
    );
    backdrop.setInteractive(
      new Phaser.Geom.Rectangle(
        -(GAME_WIDTH - this.PANEL_WIDTH) / 2,
        -(GAME_HEIGHT - this.PANEL_HEIGHT) / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    backdrop.on('pointerup', () => this.hide());
    this.container.add(backdrop);

    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.panelBg, 0.95);
    bg.fillRoundedRect(0, 0, this.PANEL_WIDTH, this.PANEL_HEIGHT, 12);
    bg.lineStyle(2, COLORS.panelBorder);
    bg.strokeRoundedRect(0, 0, this.PANEL_WIDTH, this.PANEL_HEIGHT, 12);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(this.PANEL_WIDTH / 2, 20, 'Audio Settings', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.heading}px`,
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Close button
    const closeBtn = this.scene.add.text(this.PANEL_WIDTH - 15, 10, 'X', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textSecondary,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => {
      this.sfx.playClick();
      this.hide();
    });
    closeBtn.on('pointerover', () => closeBtn.setColor(COLORS.textPrimary));
    closeBtn.on('pointerout', () => closeBtn.setColor(COLORS.textSecondary));
    this.container.add(closeBtn);

    // Global mute toggle
    const globalMuteY = 55;
    const globalMuteBtn = this.scene.add.text(this.PANEL_WIDTH / 2, globalMuteY, '', {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    this.updateGlobalMuteText(globalMuteBtn);
    globalMuteBtn.on('pointerup', () => {
      this.audioManager.toggleGlobalMute();
      this.updateGlobalMuteText(globalMuteBtn);
      this.sfx.playClick();
    });
    this.container.add(globalMuteBtn);

    // Category sliders
    const sliders: SliderConfig[] = [
      { label: 'Master', category: AudioCategory.MASTER, y: 100 },
      { label: 'Music', category: AudioCategory.MUSIC, y: 155 },
      { label: 'Sound FX', category: AudioCategory.SFX, y: 210 },
      { label: 'Ambient', category: AudioCategory.AMBIENT, y: 265 },
      { label: 'UI', category: AudioCategory.UI, y: 320 },
    ];

    for (const slider of sliders) {
      this.buildSlider(slider);
    }
  }

  private buildSlider(config: SliderConfig): void {
    const { label, category, y } = config;
    const sliderX = 130;

    // Label
    const labelText = this.scene.add.text(20, y + 4, label, {
      fontFamily: FONTS.primary,
      fontSize: `${FONTS.sizes.body}px`,
      color: COLORS.textPrimary,
    });
    this.container.add(labelText);

    // Slider track
    const track = this.scene.add.graphics();
    track.fillStyle(0x333355, 1);
    track.fillRoundedRect(sliderX, y + 8, this.SLIDER_WIDTH, this.SLIDER_HEIGHT, 4);
    this.container.add(track);

    // Slider fill
    const fill = this.scene.add.graphics();
    this.sliderGraphics.set(category, fill);
    this.container.add(fill);

    // Handle
    const handle = this.scene.add.graphics();
    this.sliderHandles.set(category, handle);
    this.container.add(handle);

    // Value text
    const vol = this.audioManager.getVolume(category);
    const valueText = this.scene.add.text(
      sliderX + this.SLIDER_WIDTH + 10,
      y + 4,
      `${Math.round(vol * 100)}%`,
      {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: COLORS.textSecondary,
      },
    );
    this.valueTexts.set(category, valueText);
    this.container.add(valueText);

    // Mute toggle
    const muteText = this.scene.add.text(
      sliderX + this.SLIDER_WIDTH + 55,
      y + 4,
      this.audioManager.isMuted(category) ? 'Unmute' : 'Mute',
      {
        fontFamily: FONTS.primary,
        fontSize: `${FONTS.sizes.small}px`,
        color: this.audioManager.isMuted(category) ? COLORS.textAccent : COLORS.textSecondary,
      },
    ).setInteractive({ useHandCursor: true });
    muteText.on('pointerup', () => {
      this.audioManager.toggleMute(category);
      const muted = this.audioManager.isMuted(category);
      muteText.setText(muted ? 'Unmute' : 'Mute');
      muteText.setColor(muted ? COLORS.textAccent : COLORS.textSecondary);
      this.sfx.playClick();
    });
    this.muteTexts.set(category, muteText);
    this.container.add(muteText);

    // Interactive slider zone
    const hitZone = this.scene.add.zone(
      sliderX + this.SLIDER_WIDTH / 2,
      y + this.SLIDER_HEIGHT / 2 + 4,
      this.SLIDER_WIDTH + this.HANDLE_SIZE,
      this.HANDLE_SIZE * 2,
    ).setInteractive({ useHandCursor: true });
    this.container.add(hitZone);

    let dragging = false;

    const updateFromPointer = (pointerX: number): void => {
      const localX = pointerX - this.container.x - sliderX;
      const ratio = Phaser.Math.Clamp(localX / this.SLIDER_WIDTH, 0, 1);
      this.audioManager.setVolume(category, ratio);
      this.drawSlider(category, sliderX, y);
    };

    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragging = true;
      updateFromPointer(pointer.x);
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (dragging) {
        updateFromPointer(pointer.x);
      }
    });

    this.scene.input.on('pointerup', () => {
      if (dragging) {
        dragging = false;
        this.sfx.playClick();
      }
    });

    // Initial draw
    this.drawSlider(category, sliderX, y);
  }

  private drawSlider(category: AudioCategory, x: number, y: number): void {
    const vol = this.audioManager.getVolume(category);
    const fillWidth = vol * this.SLIDER_WIDTH;

    const fill = this.sliderGraphics.get(category);
    if (fill) {
      fill.clear();
      fill.fillStyle(COLORS.accent, 1);
      fill.fillRoundedRect(x, y + 8, fillWidth, this.SLIDER_HEIGHT, 4);
    }

    const handle = this.sliderHandles.get(category);
    if (handle) {
      handle.clear();
      handle.fillStyle(0xffffff, 1);
      handle.fillCircle(
        x + fillWidth,
        y + 8 + this.SLIDER_HEIGHT / 2,
        this.HANDLE_SIZE / 2,
      );
    }

    const valueText = this.valueTexts.get(category);
    if (valueText) {
      valueText.setText(`${Math.round(vol * 100)}%`);
    }
  }

  private updateSliders(): void {
    const categories = [
      AudioCategory.MASTER,
      AudioCategory.MUSIC,
      AudioCategory.SFX,
      AudioCategory.AMBIENT,
      AudioCategory.UI,
    ];
    const sliderX = 130;
    const baseYs = [100, 155, 210, 265, 320];

    categories.forEach((cat, i) => {
      this.drawSlider(cat, sliderX, baseYs[i]);
    });
  }

  private updateGlobalMuteText(btn: Phaser.GameObjects.Text): void {
    const muted = this.audioManager.isGlobalMute();
    btn.setText(muted ? 'All Audio: MUTED (click to unmute)' : 'All Audio: ON (click to mute)');
    btn.setColor(muted ? COLORS.textAccent : '#4ecca3');
  }

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
    this.updateSliders();
    this.sfx.play(SFXType.UI_MODAL_OPEN);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
    this.sfx.play(SFXType.UI_MODAL_CLOSE);
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.container.destroy();
  }
}
